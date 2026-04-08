"""FastAPI router for Phase Engine endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import StepCompletion
from backend.engine.process_manager import ProcessManager
from backend.schemas.phase import (
    CurrentStepResponse,
    StepCompleteRequest,
    StepCompleteResponse,
    StepOverviewItem,
)
from backend.services.phase_service import PhaseService

router = APIRouter(
    prefix="/projects/{project_id}/phase",
    tags=["phases"],
)

_process_manager = ProcessManager()


@router.get("/current", response_model=CurrentStepResponse)
async def get_current_step(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> CurrentStepResponse:
    """Return the current step with full metadata and progress information."""
    service = PhaseService(session)
    return await service.get_current_step(project_id)


@router.post("/step/complete", response_model=StepCompleteResponse)
async def complete_step(
    project_id: str,
    body: StepCompleteRequest,
    session: AsyncSession = Depends(get_session),
) -> StepCompleteResponse:
    """Mark the current step as complete, persist data, and advance to the next step."""
    service = PhaseService(session)
    # Read current step from the service to determine which step to complete
    current = await service.get_current_step(project_id)
    return await service.complete_step(
        project_id=project_id,
        step_id=current.step.id,
        data=body.data,
        notes=body.notes,
    )


@router.get("/overview", response_model=list[StepOverviewItem])
async def get_phase_overview(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[StepOverviewItem]:
    """Return all applicable steps for the project with completion and current status."""
    service = PhaseService(session)
    current_response = await service.get_current_step(project_id)
    current_step_id = current_response.step.id
    completed_ids = set(current_response.completed_steps)

    # Load project config for filtering
    from backend.db.models import Project
    from backend.db.repository import BaseRepository
    repo = BaseRepository(Project, session)
    project = await repo.get(project_id)
    if project is None:
        return []

    applicable = _process_manager.get_steps_for_config(
        project.stakeholder_config,
        project.qualitative_modeling_tech,
    )

    return [
        StepOverviewItem(
            id=s.id,
            phase=s.phase,
            name=s.name,
            form_type=s.form_type,
            is_conditional=s.is_conditional,
            requires_ai=s.requires_ai,
            is_completed=s.id in completed_ids,
            is_current=s.id == current_step_id,
        )
        for s in applicable
    ]
