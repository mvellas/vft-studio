"""FastAPI router for Decision Frame (IDF) GET/PUT under a project."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Project
from backend.db.repository import BaseRepository
from backend.schemas.decision_frame import IDFUpdate, IDFResponse

router = APIRouter(
    prefix="/projects/{project_id}/decision-frame",
    tags=["decision-frame"],
)


@router.get("", response_model=IDFResponse)
async def get_decision_frame(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> IDFResponse:
    """Return the current IDF (Purpose/Perspective/Scope) for a project."""
    project = await BaseRepository(Project, session).get(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return IDFResponse(
        idf_purpose=project.idf_purpose,
        idf_perspective=project.idf_perspective,
        idf_scope=project.idf_scope,
        idf_documented_at=project.idf_documented_at,
    )


@router.put("", response_model=dict)
async def update_decision_frame(
    project_id: str,
    body: IDFUpdate,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Save IDF fields (only non-None fields are updated)."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return {"ok": True}
    repo = BaseRepository(Project, session)
    updated = await repo.update(project_id, **updates)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    await session.commit()
    return {"ok": True}
