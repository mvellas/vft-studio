"""FastAPI router for Project CRUD, including import/export (FOUND-07)."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.base import get_session
from backend.db.models import Project, Stakeholder, StepCompletion
from backend.db.repository import BaseRepository
from backend.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

EXPORT_SCHEMA_VERSION = "1.0"

router = APIRouter(prefix="/projects", tags=["projects"])


def _project_response(project: Project) -> ProjectResponse:
    return ProjectResponse.model_validate(project)


@router.get("", response_model=list[ProjectResponse])
async def list_projects(session: AsyncSession = Depends(get_session)) -> list[ProjectResponse]:
    """List all non-archived projects ordered by updated_at desc."""
    result = await session.execute(
        select(Project)
        .where(Project.archived == 0)
        .order_by(Project.updated_at.desc())
    )
    projects = result.scalars().all()
    return [_project_response(p) for p in projects]


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """Create a new project."""
    repo = BaseRepository(Project, session)
    project = await repo.create(
        name=body.name,
        description=body.description,
        context_notes=body.context_notes,
    )
    return _project_response(project)


@router.get("/import", include_in_schema=False)
async def import_route_placeholder() -> None:
    """Placeholder to prevent /import being shadowed by /{project_id}."""
    raise HTTPException(status_code=405, detail="Use POST /projects/import")


@router.post("/import", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def import_project(
    bundle: dict,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """Import a .vft bundle and create a new project from it."""
    version = bundle.get("version")
    if version != EXPORT_SCHEMA_VERSION:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Unsupported bundle version: {version!r}. Expected {EXPORT_SCHEMA_VERSION!r}.",
        )

    raw_project: dict = bundle.get("project", {})
    if not raw_project.get("name"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bundle missing project.name.",
        )

    # Create new project with fresh ID and suffixed name
    project_repo = BaseRepository(Project, session)
    now = datetime.now(timezone.utc).isoformat()
    new_project_id = str(uuid.uuid4())

    copyable_fields = {
        "description", "context_notes", "qualitative_modeling_tech",
        "stakeholder_config", "idf_purpose", "idf_perspective", "idf_scope",
        "idf_documented_at", "decision_statement", "decision_statement_validated",
        "org_documents_text", "current_step", "phase_status",
        "phase1_completed", "phase2_completed", "phase3_completed",
    }
    project_data = {k: v for k, v in raw_project.items() if k in copyable_fields}
    project_data["name"] = raw_project["name"] + " (Imported)"

    project = await project_repo.create(**project_data)

    # Re-create stakeholders with new IDs, mapping old → new
    stakeholder_id_map: dict[str, str] = {}
    for raw_stk in bundle.get("stakeholders", []):
        stk_repo = BaseRepository(Stakeholder, session)
        stk_fields = {
            k: v for k, v in raw_stk.items()
            if k not in {"id", "project_id", "created_at", "updated_at"}
        }
        new_stk = await stk_repo.create(project_id=project.id, **stk_fields)
        stakeholder_id_map[raw_stk["id"]] = new_stk.id

    # Re-create step completions with new IDs
    for raw_sc in bundle.get("step_completions", []):
        sc_repo = BaseRepository(StepCompletion, session)
        sc_fields = {
            k: v for k, v in raw_sc.items()
            if k not in {"id", "project_id", "created_at", "updated_at"}
        }
        await sc_repo.create(project_id=project.id, **sc_fields)

    await session.commit()
    await session.refresh(project)
    return _project_response(project)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """Get a project by ID."""
    repo = BaseRepository(Project, session)
    project = await repo.get(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    return _project_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """Update non-None fields of a project."""
    repo = BaseRepository(Project, session)
    existing = await repo.get(project_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        return _project_response(existing)
    updated = await repo.update(project_id, **updates)
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    await session.commit()
    return _project_response(updated)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Soft-delete (archive) a project."""
    repo = BaseRepository(Project, session)
    existing = await repo.get(project_id)
    if existing is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")
    await repo.soft_delete(project_id)
    await session.commit()


@router.post("/{project_id}/duplicate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> ProjectResponse:
    """Duplicate a project including its IDF fields."""
    repo = BaseRepository(Project, session)
    original = await repo.get(project_id)
    if original is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    copyable_fields = {
        "description", "context_notes", "qualitative_modeling_tech",
        "stakeholder_config", "idf_purpose", "idf_perspective", "idf_scope",
        "idf_documented_at", "decision_statement", "decision_statement_validated",
        "org_documents_text",
    }
    copy_data = {field: getattr(original, field) for field in copyable_fields}
    copy_data["name"] = f"{original.name} (Copy)"

    new_project = await repo.create(**copy_data)
    await session.commit()
    await session.refresh(new_project)
    return _project_response(new_project)


@router.get("/{project_id}/export")
async def export_project(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> Response:
    """Export full project as a .vft JSON bundle."""
    repo = BaseRepository(Project, session)
    project = await repo.get(project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")

    stk_repo = BaseRepository(Stakeholder, session)
    stakeholders = await stk_repo.list(project_id=project_id)

    sc_repo = BaseRepository(StepCompletion, session)
    step_completions = await sc_repo.list(project_id=project_id)

    def _model_to_dict(obj) -> dict:
        return {
            col.key: getattr(obj, col.key)
            for col in obj.__table__.columns
        }

    bundle = {
        "version": EXPORT_SCHEMA_VERSION,
        "project": _model_to_dict(project),
        "stakeholders": [_model_to_dict(s) for s in stakeholders],
        "step_completions": [_model_to_dict(sc) for sc in step_completions],
    }

    safe_name = "".join(c if c.isalnum() or c in " _-" else "_" for c in project.name)
    filename = f"{safe_name}.vft.json"

    return Response(
        content=json.dumps(bundle, ensure_ascii=False, indent=2),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
