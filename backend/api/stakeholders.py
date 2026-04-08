"""FastAPI router for Stakeholder CRUD under a project."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.base import get_session
from backend.db.models import Project, Stakeholder
from backend.db.repository import BaseRepository
from backend.schemas.stakeholder import StakeholderCreate, StakeholderResponse, StakeholderUpdate
from backend.services.phase1_service import update_stakeholder_config

router = APIRouter(
    prefix="/projects/{project_id}/stakeholders",
    tags=["stakeholders"],
)


async def _require_project(project_id: str, session: AsyncSession) -> None:
    """Raise 404 if project does not exist."""
    result = await session.execute(
        select(Project).where(Project.id == project_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")


@router.get("", response_model=list[StakeholderResponse])
async def list_stakeholders(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[StakeholderResponse]:
    """List stakeholders for a project ordered by order_index."""
    await _require_project(project_id, session)
    result = await session.execute(
        select(Stakeholder)
        .where(Stakeholder.project_id == project_id)
        .order_by(Stakeholder.order_index)
    )
    stakeholders = result.scalars().all()
    return [StakeholderResponse.model_validate(s) for s in stakeholders]


@router.post("", response_model=StakeholderResponse, status_code=status.HTTP_201_CREATED)
async def create_stakeholder(
    project_id: str,
    body: StakeholderCreate,
    session: AsyncSession = Depends(get_session),
) -> StakeholderResponse:
    """Create a stakeholder under a project."""
    await _require_project(project_id, session)
    repo = BaseRepository(Stakeholder, session)
    stakeholder = await repo.create(
        project_id=project_id,
        name=body.name,
        role=body.role,
        is_decision_maker=body.is_decision_maker,
        profile=body.profile,
        interests=body.interests,
        elicitation_mode=body.elicitation_mode,
    )
    await session.commit()
    await update_stakeholder_config(project_id, session)
    await session.commit()
    await session.refresh(stakeholder)
    return StakeholderResponse.model_validate(stakeholder)


@router.patch("/{stakeholder_id}", response_model=StakeholderResponse)
async def update_stakeholder(
    project_id: str,
    stakeholder_id: str,
    body: StakeholderUpdate,
    session: AsyncSession = Depends(get_session),
) -> StakeholderResponse:
    """Update non-None fields of a stakeholder."""
    await _require_project(project_id, session)
    repo = BaseRepository(Stakeholder, session)
    existing = await repo.get(stakeholder_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stakeholder not found.")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return StakeholderResponse.model_validate(existing)
    updated = await repo.update(stakeholder_id, **updates)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stakeholder not found.")
    await session.commit()
    await update_stakeholder_config(project_id, session)
    await session.commit()
    return StakeholderResponse.model_validate(updated)


@router.delete("/{stakeholder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_stakeholder(
    project_id: str,
    stakeholder_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete a stakeholder."""
    await _require_project(project_id, session)
    repo = BaseRepository(Stakeholder, session)
    existing = await repo.get(stakeholder_id)
    if existing is None or existing.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stakeholder not found.")
    await session.delete(existing)
    await session.commit()
    await update_stakeholder_config(project_id, session)
    await session.commit()
