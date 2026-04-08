"""FastAPI router for Decision Frame (IDF) GET/PUT under a project."""
from __future__ import annotations

from datetime import datetime, timezone

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


@router.post("/document", response_model=dict)
async def document_decision_frame(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> dict:
    """Stamp idf_documented_at on the project, confirming the IDF is complete."""
    repo = BaseRepository(Project, session)
    project = await repo.get(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    missing = [
        field
        for field in ("idf_purpose", "idf_perspective", "idf_scope")
        if not getattr(project, field, "").strip()
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "IDF incompleto: todos os campos (purpose, perspective, scope) "
                "devem estar preenchidos."
            ),
        )

    timestamp = datetime.now(timezone.utc).isoformat()
    updated = await repo.update(project_id, idf_documented_at=timestamp)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    await session.commit()
    return {"ok": True, "idf_documented_at": timestamp}
