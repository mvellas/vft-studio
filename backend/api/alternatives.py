"""
backend/api/alternatives.py
============================
Alternatives and ConsequencesMatrix CRUD for VFT Studio Phase 3.
Handles alternative creation/management and consequence upserts
for the alternatives × objectives matrix.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Alternative, AlternativeConsequence, Attribute, Objective, Project
from backend.schemas.alternative import (
    AlternativeCreate,
    AlternativeResponse,
    AlternativeUpdate,
    AlternativeWithConsequences,
    ConsequenceResponse,
    ConsequenceUpsert,
    NovaSuggestRequest,
)

router = APIRouter(
    prefix="/projects/{project_id}/alternatives",
    tags=["alternatives"],
)


async def _require_project(project_id: str, session: AsyncSession) -> Project:
    """Raise 404 if project does not exist."""
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return project


@router.get("", response_model=list[AlternativeWithConsequences])
async def list_alternatives(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[AlternativeWithConsequences]:
    """List all alternatives with their consequences for a project."""
    await _require_project(project_id, session)

    alt_result = await session.execute(
        select(Alternative)
        .where(Alternative.project_id == project_id, Alternative.deleted == 0)
        .order_by(Alternative.order_index)
    )
    alternatives = alt_result.scalars().all()

    output = []
    for alt in alternatives:
        cons_result = await session.execute(
            select(AlternativeConsequence)
            .where(AlternativeConsequence.alternative_id == alt.id)
        )
        consequences = cons_result.scalars().all()
        output.append(
            AlternativeWithConsequences(
                alternative=AlternativeResponse.model_validate(alt),
                consequences=[ConsequenceResponse.model_validate(c) for c in consequences],
            )
        )
    return output


@router.post("", response_model=AlternativeResponse, status_code=status.HTTP_201_CREATED)
async def create_alternative(
    project_id: str,
    body: AlternativeCreate,
    session: AsyncSession = Depends(get_session),
) -> AlternativeResponse:
    """Create a new alternative."""
    await _require_project(project_id, session)

    now = datetime.now(timezone.utc).isoformat()
    alt = Alternative(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=body.name,
        description=body.description,
        source=body.source,
        is_status_quo=body.is_status_quo,
        order_index=body.order_index,
        created_at=now,
        updated_at=now,
    )
    session.add(alt)
    await session.commit()
    await session.refresh(alt)
    return AlternativeResponse.model_validate(alt)


@router.put("/{alternative_id}", response_model=AlternativeResponse)
async def update_alternative(
    project_id: str,
    alternative_id: str,
    body: AlternativeUpdate,
    session: AsyncSession = Depends(get_session),
) -> AlternativeResponse:
    """Update an alternative's fields."""
    await _require_project(project_id, session)

    alt = await session.get(Alternative, alternative_id)
    if alt is None or alt.project_id != project_id or alt.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alternative not found.")

    now = datetime.now(timezone.utc).isoformat()
    if body.name is not None:
        alt.name = body.name
    if body.description is not None:
        alt.description = body.description
    if body.source is not None:
        alt.source = body.source
    if body.is_status_quo is not None:
        alt.is_status_quo = body.is_status_quo
    if body.order_index is not None:
        alt.order_index = body.order_index
    alt.updated_at = now

    await session.commit()
    await session.refresh(alt)
    return AlternativeResponse.model_validate(alt)


@router.delete("/{alternative_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alternative(
    project_id: str,
    alternative_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Soft-delete an alternative."""
    await _require_project(project_id, session)

    alt = await session.get(Alternative, alternative_id)
    if alt is None or alt.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alternative not found.")

    alt.deleted = 1
    alt.updated_at = datetime.now(timezone.utc).isoformat()
    await session.commit()


@router.put("/{alternative_id}/consequences/{objective_id}", response_model=ConsequenceResponse)
async def upsert_consequence(
    project_id: str,
    alternative_id: str,
    objective_id: str,
    body: ConsequenceUpsert,
    session: AsyncSession = Depends(get_session),
) -> ConsequenceResponse:
    """Create or update a consequence for a specific alternative × objective cell."""
    await _require_project(project_id, session)

    alt = await session.get(Alternative, alternative_id)
    if alt is None or alt.project_id != project_id or alt.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alternative not found.")

    obj = await session.get(Objective, objective_id)
    if obj is None or obj.project_id != project_id or obj.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    now = datetime.now(timezone.utc).isoformat()

    # Try to find existing consequence
    result = await session.execute(
        select(AlternativeConsequence).where(
            AlternativeConsequence.alternative_id == alternative_id,
            AlternativeConsequence.objective_id == objective_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.value_text = body.value_text
        existing.attribute_level_id = body.attribute_level_id
        existing.updated_at = now
        await session.commit()
        await session.refresh(existing)
        return ConsequenceResponse.model_validate(existing)
    else:
        consequence = AlternativeConsequence(
            id=str(uuid.uuid4()),
            alternative_id=alternative_id,
            objective_id=objective_id,
            project_id=project_id,
            value_text=body.value_text,
            attribute_level_id=body.attribute_level_id,
            created_at=now,
            updated_at=now,
        )
        session.add(consequence)
        await session.commit()
        await session.refresh(consequence)
        return ConsequenceResponse.model_validate(consequence)


@router.post("/{alternative_id}/suggest-consequences")
async def suggest_consequences(
    project_id: str,
    alternative_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Use NOVA to suggest consequences for an alternative across all fundamental objectives."""
    from backend.agents.phase3_specialist import Phase3SpecialistAgent

    await _require_project(project_id, session)

    alt = await session.get(Alternative, alternative_id)
    if alt is None or alt.project_id != project_id or alt.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alternative not found.")

    # Load fundamental objectives with attributes
    obj_result = await session.execute(
        select(Objective).where(
            Objective.project_id == project_id,
            Objective.deleted == 0,
            Objective.witi_classification == "fundamental",
        ).order_by(Objective.order_index)
    )
    fundamentals = obj_result.scalars().all()

    if not fundamentals:
        return {"suggestions": []}

    agent = await Phase3SpecialistAgent.from_project_id(project_id, session)

    obj_list = "\n".join([f"- [{obj.id}] {obj.statement}" for obj in fundamentals])
    prompt = (
        f"Alternativa: **{alt.name}**\n"
        f"Descrição: {alt.description or '(sem descrição)'}\n\n"
        f"Para cada objetivo fundamental abaixo, sugira uma consequência concisa (1-2 frases) "
        f"de como esta alternativa se comporta em relação a este objetivo.\n\n"
        f"Objetivos:\n{obj_list}\n\n"
        f"Responda em JSON com o formato:\n"
        f'[{{"objective_id": "...", "value_text": "..."}}]'
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])

    # Parse JSON response safely
    import json
    import re
    suggestions = []
    try:
        match = re.search(r'\[.*\]', response, re.DOTALL)
        if match:
            suggestions = json.loads(match.group(0))
    except (json.JSONDecodeError, AttributeError):
        suggestions = []

    return {"suggestions": suggestions}
