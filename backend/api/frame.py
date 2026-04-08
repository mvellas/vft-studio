"""
backend/api/frame.py
=====================
FRAME API endpoints for Phase 1 VFT operations:
  POST /api/projects/{project_id}/frame/generate-ds   — generate a Decision Statement suggestion
  POST /api/projects/{project_id}/frame/validate-idf  — validate IDF completeness and clarity
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.agents.phase1_specialist import Phase1SpecialistAgent

router = APIRouter(
    prefix="/projects/{project_id}/frame",
    tags=["frame"],
)


# ---------------------------------------------------------------------------
# Request / Response schemas (frozen = immutable)
# ---------------------------------------------------------------------------

class DSGenerateRequest(BaseModel, frozen=True):
    """Optional hint to guide Decision Statement generation."""
    hint: str = ""


class DSResponse(BaseModel, frozen=True):
    """Generated Decision Statement suggestion."""
    decision_statement: str


class IDFValidateRequest(BaseModel, frozen=True):
    """IDF fields to validate."""
    purpose: str = ""
    perspective: str = ""
    scope: str = ""


class IDFValidateResponse(BaseModel, frozen=True):
    """Validation feedback from FRAME."""
    feedback: str
    is_valid: bool


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/generate-ds", response_model=DSResponse)
async def generate_decision_statement(
    project_id: str,
    body: DSGenerateRequest,
    session: AsyncSession = Depends(get_session),
) -> DSResponse:
    """Generate a Decision Statement suggestion based on project context."""
    try:
        agent = await Phase1SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    hint_section = f"\n\nAdditional hint from user: {body.hint}" if body.hint else ""
    prompt = (
        "Based on the project context, stakeholders, and IDF draft provided in your system prompt, "
        "generate a concise Decision Statement following the structure:\n"
        "  'Decidir [qual/como/se/quando] + [ação]'\n\n"
        "Return ONLY the Decision Statement — one sentence, no explanation."
        + hint_section
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])
    return DSResponse(decision_statement=response.strip())


@router.post("/validate-idf", response_model=IDFValidateResponse)
async def validate_idf(
    project_id: str,
    body: IDFValidateRequest,
    session: AsyncSession = Depends(get_session),
) -> IDFValidateResponse:
    """Validate the three IDF fields for completeness, clarity, and consistency."""
    try:
        agent = await Phase1SpecialistAgent.from_project_id(project_id, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))

    idf_text = (
        f"Purpose: {body.purpose or '(empty)'}\n"
        f"Perspective: {body.perspective or '(empty)'}\n"
        f"Scope: {body.scope or '(empty)'}"
    )

    prompt = (
        "Validate the following Initial Decision Frame (IDF) for:\n"
        "1. Completeness — are all three elements (Purpose, Perspective, Scope) present and non-trivial?\n"
        "2. Clarity — is each element unambiguous and specific enough to guide Phase 2?\n"
        "3. Consistency — do the three elements align with each other and the project context?\n\n"
        f"{idf_text}\n\n"
        "Respond in this exact format (two lines):\n"
        "VALID: yes|no\n"
        "FEEDBACK: <one concise paragraph explaining issues found or confirming readiness>"
    )

    response = await agent.invoke([{"role": "user", "content": prompt}])

    # Parse structured response
    is_valid = False
    feedback = response.strip()

    for line in response.splitlines():
        line_stripped = line.strip()
        if line_stripped.upper().startswith("VALID:"):
            val = line_stripped.split(":", 1)[-1].strip().lower()
            is_valid = val == "yes"
        elif line_stripped.upper().startswith("FEEDBACK:"):
            feedback = line_stripped.split(":", 1)[-1].strip()

    return IDFValidateResponse(feedback=feedback, is_valid=is_valid)
