"""
backend/api/axiom.py
=====================
AXIOM action endpoints for Phase 2 VFT operations:
  POST /api/projects/{project_id}/axiom/extract-values      — extract values from org text
  POST /api/projects/{project_id}/axiom/witi-classify       — WITI Test classification
  POST /api/projects/{project_id}/axiom/coc-evaluate        — Control of Consequences evaluation
  POST /api/projects/{project_id}/axiom/suggest-attributes  — suggest attribute for fundamental obj
  POST /api/projects/{project_id}/axiom/suggest-category    — suggest objective type category
  POST /api/projects/{project_id}/axiom/stakeholder/{id}/interview (SSE) — stakeholder simulation
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

import uuid

from backend.db.base import get_session
from backend.db.models import Objective, ObjectiveCausalLink, Project
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.stakeholder_agent import StakeholderSimulationAgent
from backend.schemas.objective import CausalLinkResponse, ObjectiveResponse

router = APIRouter(
    prefix="/projects/{project_id}/axiom",
    tags=["axiom"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Request schemas (frozen = immutable)
# ---------------------------------------------------------------------------

class ExtractValuesRequest(BaseModel, frozen=True):
    text: str


class WITIClassifyRequest(BaseModel, frozen=True):
    objective_id: str
    why_answer: str


class CoCEvaluateRequest(BaseModel, frozen=True):
    objective_id: str
    q1_answer: str
    q2_answer: str


class SuggestAttributesRequest(BaseModel, frozen=True):
    objective_id: str


class SuggestCategoryRequest(BaseModel, frozen=True):
    objective_id: str


class InterviewRequest(BaseModel, frozen=True):
    message: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/extract-values")
async def extract_values(
    project_id: str,
    body: ExtractValuesRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Extract values and objectives from organizational text using AXIOM."""
    try:
        agent = await Phase2SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    prompt = (
        f"Extraia valores e objetivos deste texto organizacional:\n\n{body.text}\n\n"
        "Retorne cada valor/objetivo como uma lista numerada, com o texto do objetivo e "
        "uma breve nota sobre a que stakeholder ou contexto ele se refere."
    )
    response = await agent.invoke([{"role": "user", "content": prompt}])
    return {"values": response.strip()}


@router.post("/witi-classify", response_model=ObjectiveResponse)
async def witi_classify(
    project_id: str,
    body: WITIClassifyRequest,
    session: AsyncSession = Depends(get_session),
) -> ObjectiveResponse:
    """
    Apply WITI Test to classify an objective as means/fundamental/strategic/other.
    Updates the objective in DB and creates a causal link if classification is 'means'.
    """
    # Load objective
    objective = await session.get(Objective, body.objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    # Load all existing objectives for context
    o_result = await session.execute(
        select(Objective)
        .where(Objective.project_id == project_id, Objective.deleted == 0)
    )
    all_objectives = o_result.scalars().all()
    objectives_list = "\n".join(
        f"- ID: {o.id} | [{o.type}] {o.statement[:150]}"
        for o in all_objectives
        if o.id != objective.id
    )

    try:
        agent = await Phase2SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    prompt = (
        f"Aplique o Teste WITI ao seguinte objetivo:\n\n"
        f"Objetivo: {objective.statement}\n\n"
        f"Resposta 'Por que isso é importante?': {body.why_answer}\n\n"
        f"Objetivos existentes no projeto (para referência do IMPLIES_OBJECTIVE):\n{objectives_list or '(nenhum ainda)'}\n\n"
        "Responda no formato exato:\n"
        "CLASSIFICATION: means|fundamental|strategic|other\n"
        "IMPLIES_OBJECTIVE: {id do objetivo que este 'means' implica, ou null}\n"
        "REASONING: {uma explicação concisa}"
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])

    # Parse structured response
    classification = "other"
    implies_id: str | None = None
    reasoning = ""

    for line in response.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("CLASSIFICATION:"):
            classification = stripped.split(":", 1)[-1].strip().lower()
        elif stripped.upper().startswith("IMPLIES_OBJECTIVE:"):
            val = stripped.split(":", 1)[-1].strip()
            implies_id = None if val.lower() in ("null", "none", "") else val
        elif stripped.upper().startswith("REASONING:"):
            reasoning = stripped.split(":", 1)[-1].strip()

    # Update objective in DB
    objective.witi_question = "Por que isso é importante?"
    objective.witi_answer = body.why_answer
    objective.witi_classification = classification
    objective.witi_implies_objective_id = implies_id
    objective.updated_at = _now_iso()

    # If means and valid implies_id → set type and create causal link
    if classification == "means":
        objective.type = "means"
        if implies_id:
            # Validate target objective exists
            target = await session.get(Objective, implies_id)
            if target and target.project_id == project_id and not target.deleted:
                link = ObjectiveCausalLink(
                    id=str(uuid.uuid4()),
                    from_obj=objective.id,
                    to_obj=implies_id,
                    project_id=project_id,
                    label="implies",
                    created_at=_now_iso(),
                )
                session.add(link)
                try:
                    await session.flush()
                except IntegrityError:
                    await session.rollback()
                    # Link already exists — that's fine, continue

    # If fundamental → set candidate flag
    if classification == "fundamental":
        objective.type = "fundamental"
        objective.is_fundamental_candidate = 1

    await session.commit()
    await session.refresh(objective)
    return ObjectiveResponse.model_validate(objective)


@router.post("/coc-evaluate", response_model=ObjectiveResponse)
async def coc_evaluate(
    project_id: str,
    body: CoCEvaluateRequest,
    session: AsyncSession = Depends(get_session),
) -> ObjectiveResponse:
    """
    Apply Control of Consequences (CoC) evaluation to a fundamental objective.
    Updates coc_* fields in DB.
    """
    objective = await session.get(Objective, body.objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    try:
        agent = await Phase2SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    prompt = (
        f"Aplique o teste de Controle de Consequências (CoC) ao seguinte objetivo fundamental:\n\n"
        f"Objetivo: {objective.statement}\n\n"
        f"Escopo da Decisão (IDF): {project.idf_scope or '(não definido)'}\n"
        f"Resposta Q1 ('Esta decisão controla as consequências deste objetivo?'): {body.q1_answer}\n"
        f"Resposta Q2 ('Este objetivo é interno ou externo à decisão?'): {body.q2_answer}\n\n"
        "Responda no formato exato:\n"
        "Q1_RESULT: aligned|misaligned\n"
        "Q2_RESULT: internal|external\n"
        "REFINEMENT_NEEDED: yes|no\n"
        "REFINED_STATEMENT: {declaração refinada sugerida, ou null}\n"
        "REASONING: {uma explicação concisa}"
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])

    # Parse structured response
    q1_result = ""
    q2_result = ""
    refinement_needed = 0
    refined_statement: str | None = None

    for line in response.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("Q1_RESULT:"):
            q1_result = stripped.split(":", 1)[-1].strip().lower()
        elif stripped.upper().startswith("Q2_RESULT:"):
            q2_result = stripped.split(":", 1)[-1].strip().lower()
        elif stripped.upper().startswith("REFINEMENT_NEEDED:"):
            val = stripped.split(":", 1)[-1].strip().lower()
            refinement_needed = 1 if val == "yes" else 0
        elif stripped.upper().startswith("REFINED_STATEMENT:"):
            val = stripped.split(":", 1)[-1].strip()
            refined_statement = None if val.lower() in ("null", "none", "") else val

    # Update objective in DB
    objective.coc_q1_answer = body.q1_answer
    objective.coc_q1_result = q1_result
    objective.coc_q2_answer = body.q2_answer
    objective.coc_q2_result = q2_result
    objective.coc_refinement_needed = refinement_needed
    objective.refined_statement = refined_statement
    objective.updated_at = _now_iso()

    await session.commit()
    await session.refresh(objective)
    return ObjectiveResponse.model_validate(objective)


@router.post("/suggest-attributes")
async def suggest_attributes(
    project_id: str,
    body: SuggestAttributesRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Suggest attribute type, description, and scale for a fundamental objective."""
    objective = await session.get(Objective, body.objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    try:
        agent = await Phase2SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    prompt = (
        f"Para o seguinte objetivo fundamental, sugira um atributo de medição:\n\n"
        f"Objetivo: {objective.statement}\n\n"
        "Sugira:\n"
        "- ATTR_TYPE: natural (diretamente mensurável) | constructed (escala construída) | proxy (indicador indireto)\n"
        "- DESCRIPTION: uma descrição clara do atributo\n"
        "- SCALE_DESCRIPTION: como a escala seria definida (níveis, unidades, etc.)\n\n"
        "Responda de forma concisa e prática."
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])
    return {"suggestion": response.strip()}


@router.post("/suggest-category")
async def suggest_category(
    project_id: str,
    body: SuggestCategoryRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """
    Suggest a type category for an objective (means/fundamental/strategic/other).
    Does NOT update DB — returns suggestion only for user to decide.
    """
    objective = await session.get(Objective, body.objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    # Load all objectives for context
    o_result = await session.execute(
        select(Objective)
        .where(Objective.project_id == project_id, Objective.deleted == 0)
    )
    all_objectives = o_result.scalars().all()
    objectives_md = "\n".join(
        f"- [{o.type}] {o.statement[:150]}"
        for o in all_objectives
        if o.id != objective.id
    )

    try:
        agent = await Phase2SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    prompt = (
        f"Analise este objetivo e classifique-o. "
        f"Objetivo: {objective.statement}\n\n"
        f"Objetivos existentes no projeto:\n{objectives_md or '(nenhum ainda)'}\n\n"
        "Retorne:\n"
        "TYPE: means|fundamental|strategic|other\n"
        "REASONING: {explicação concisa}"
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])

    # Parse response
    suggested_type = "other"
    reasoning = response.strip()

    for line in response.splitlines():
        stripped = line.strip()
        if stripped.upper().startswith("TYPE:"):
            suggested_type = stripped.split(":", 1)[-1].strip().lower()
        elif stripped.upper().startswith("REASONING:"):
            reasoning = stripped.split(":", 1)[-1].strip()

    return {"suggested_type": suggested_type, "reasoning": reasoning}


@router.post("/stakeholder/{stakeholder_id}/interview", response_class=EventSourceResponse)
async def stakeholder_interview(
    project_id: str,
    stakeholder_id: str,
    body: InterviewRequest,
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    """SSE endpoint to conduct a VFT Device interview with a simulated stakeholder."""
    try:
        agent = await StakeholderSimulationAgent.from_stakeholder_id(
            stakeholder_id, project_id, session
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    messages = [{"role": "user", "content": body.message}]

    async def generate():
        try:
            async for chunk in agent.stream(messages):
                yield ServerSentEvent(data=chunk, event="delta")
        except Exception as exc:
            yield ServerSentEvent(data=str(exc), event="error")
            return
        yield ServerSentEvent(data="[DONE]", event="done")

    return EventSourceResponse(generate())
