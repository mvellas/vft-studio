"""
backend/api/export.py
======================
Export endpoint — generates Markdown report via SCRIBE.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Project
from backend.agents.documentation_agent import DocumentationAgent

router = APIRouter(tags=["export"])


@router.get("/projects/{project_id}/export/markdown", response_class=PlainTextResponse)
async def export_markdown(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> str:
    """Generate and return a Markdown report for the project via SCRIBE."""
    project = await session.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    report = await DocumentationAgent.build_project_report(project_id, session)
    return report
