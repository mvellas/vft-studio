"""PhaseService — business logic for VFT phase/step progression."""
from __future__ import annotations

import json

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Project, StepCompletion
from backend.db.repository import BaseRepository
from backend.engine.process_manager import ProcessManager
from backend.schemas.phase import (
    CurrentStepResponse,
    StepCompleteResponse,
    StepConfigResponse,
)

_process_manager = ProcessManager()


def _to_step_config_response(step_config) -> StepConfigResponse:
    return StepConfigResponse(
        id=step_config.id,
        phase=step_config.phase,
        name=step_config.name,
        description=step_config.description,
        why=step_config.why,
        how=step_config.how,
        reference=step_config.reference,
        form_type=step_config.form_type,
        requires_ai=step_config.requires_ai,
    )


class PhaseService:
    """Phase navigation service — stateless, session-scoped."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_project_or_404(self, project_id: str) -> Project:
        repo = BaseRepository(Project, self._session)
        project = await repo.get(project_id)
        if project is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Project {project_id!r} not found.",
            )
        return project

    async def get_current_step(self, project_id: str) -> CurrentStepResponse:
        """Return the current step with completion progress for a project."""
        project = await self._get_project_or_404(project_id)

        step_config = _process_manager.get_step(project.current_step)
        if step_config is None:
            # Fallback to first step if current_step is invalid
            applicable = _process_manager.get_steps_for_config(
                project.stakeholder_config, project.qualitative_modeling_tech
            )
            if not applicable:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No applicable steps for project configuration.",
                )
            step_config = applicable[0]

        # Count completed steps for this project
        result = await self._session.execute(
            select(StepCompletion).where(StepCompletion.project_id == project_id)
        )
        completions = result.scalars().all()
        completed_step_ids = [c.step_id for c in completions]

        applicable_steps = _process_manager.get_steps_for_config(
            project.stakeholder_config, project.qualitative_modeling_tech
        )
        total = len(applicable_steps)
        completed_count = sum(
            1 for s in applicable_steps if s.id in completed_step_ids
        )
        progress = round((completed_count / total) * 100, 1) if total > 0 else 0.0

        return CurrentStepResponse(
            step=_to_step_config_response(step_config),
            completed_steps=completed_step_ids,
            total_steps=total,
            progress_percent=progress,
        )

    async def complete_step(
        self,
        project_id: str,
        step_id: str,
        data: dict,
        notes: str,
    ) -> StepCompleteResponse:
        """Validate and record step completion, then advance to next step."""
        project = await self._get_project_or_404(project_id)

        # Validate that step_id matches the project's current step
        if project.current_step != step_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Cannot complete step {step_id!r}: "
                    f"project is currently on step {project.current_step!r}."
                ),
            )

        step_config = _process_manager.get_step(step_id)
        if step_config is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Step {step_id!r} does not exist.",
            )

        # Check if already completed (idempotent)
        existing_result = await self._session.execute(
            select(StepCompletion).where(
                StepCompletion.project_id == project_id,
                StepCompletion.step_id == step_id,
            )
        )
        if existing_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Step {step_id!r} is already completed.",
            )

        # Persist step completion
        sc_repo = BaseRepository(StepCompletion, self._session)
        await sc_repo.create(
            project_id=project_id,
            step_id=step_id,
            completed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
            data_json=json.dumps(data),
            notes=notes,
        )

        # Determine next step
        next_config = _process_manager.get_next_step(
            step_id,
            project.stakeholder_config,
            project.qualitative_modeling_tech,
        )

        # Advance project to next step (or mark phase complete)
        project_repo = BaseRepository(Project, self._session)
        if next_config is not None:
            await project_repo.update(project_id, current_step=next_config.id)
        else:
            # All steps completed — update phase_status
            await project_repo.update(project_id, phase_status=4)

        await self._session.commit()

        return StepCompleteResponse(
            completed_step_id=step_id,
            next_step=_to_step_config_response(next_config) if next_config else None,
            can_proceed=next_config is not None,
        )
