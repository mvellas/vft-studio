"""
backend/api/objectives.py
==========================
Objectives CRUD router for VFT Studio Phase 2.
Handles create/read/update/soft-delete and causal link management
including DFS-based cycle detection.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import AsyncGenerator

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Objective, ObjectiveCausalLink, Project
from backend.schemas.objective import (
    CausalLinkCreate,
    CausalLinkResponse,
    NetworkResponse,
    ObjectiveCreate,
    ObjectiveResponse,
    ObjectiveUpdate,
)

router = APIRouter(
    prefix="/projects/{project_id}/objectives",
    tags=["objectives"],
)


async def _require_project(project_id: str, session: AsyncSession) -> None:
    """Raise 404 if project does not exist."""
    result = await session.execute(
        select(Project).where(Project.id == project_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")


async def _has_cycle(
    session: AsyncSession,
    project_id: str,
    from_obj: str,
    to_obj: str,
) -> bool:
    """
    Detect if adding edge (from_obj → to_obj) would create a cycle.

    Uses DFS starting from to_obj. If we can reach from_obj following
    existing edges plus the proposed edge, a cycle would be created.
    Returns True if adding this edge creates a cycle.
    """
    # Load all existing causal links for the project
    result = await session.execute(
        select(ObjectiveCausalLink).where(ObjectiveCausalLink.project_id == project_id)
    )
    existing_links = result.scalars().all()

    # Build adjacency list from existing links
    adjacency: dict[str, list[str]] = {}
    for link in existing_links:
        adjacency.setdefault(link.from_obj, []).append(link.to_obj)

    # Add the proposed edge
    adjacency.setdefault(from_obj, []).append(to_obj)

    # DFS from to_obj to see if we can reach from_obj
    visited: set[str] = set()
    stack = [to_obj]

    while stack:
        node = stack.pop()
        if node == from_obj:
            return True
        if node in visited:
            continue
        visited.add(node)
        for neighbor in adjacency.get(node, []):
            if neighbor not in visited:
                stack.append(neighbor)

    return False


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[ObjectiveResponse])
async def list_objectives(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[ObjectiveResponse]:
    """List non-deleted objectives for a project ordered by order_index."""
    await _require_project(project_id, session)
    result = await session.execute(
        select(Objective)
        .where(Objective.project_id == project_id, Objective.deleted == 0)
        .order_by(Objective.order_index)
    )
    objectives = result.scalars().all()
    return [ObjectiveResponse.model_validate(o) for o in objectives]


@router.get("/network", response_model=NetworkResponse)
async def get_network(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> NetworkResponse:
    """Return the objective network (nodes + causal link edges) for a project."""
    await _require_project(project_id, session)

    obj_result = await session.execute(
        select(Objective)
        .where(Objective.project_id == project_id, Objective.deleted == 0)
        .order_by(Objective.order_index)
    )
    objectives = obj_result.scalars().all()

    link_result = await session.execute(
        select(ObjectiveCausalLink).where(ObjectiveCausalLink.project_id == project_id)
    )
    links = link_result.scalars().all()

    return NetworkResponse(
        nodes=[ObjectiveResponse.model_validate(o) for o in objectives],
        edges=[CausalLinkResponse.model_validate(lnk) for lnk in links],
    )


@router.post("", response_model=ObjectiveResponse, status_code=status.HTTP_201_CREATED)
async def create_objective(
    project_id: str,
    body: ObjectiveCreate,
    session: AsyncSession = Depends(get_session),
) -> ObjectiveResponse:
    """Create a new objective under a project."""
    await _require_project(project_id, session)
    now = _now_iso()
    objective = Objective(
        id=str(uuid.uuid4()),
        project_id=project_id,
        statement=body.statement,
        source_stakeholder_id=body.source_stakeholder_id,
        raw_value=body.raw_value,
        type=body.type,
        order_index=body.order_index,
        created_at=now,
        updated_at=now,
    )
    session.add(objective)
    await session.commit()
    await session.refresh(objective)
    return ObjectiveResponse.model_validate(objective)


@router.put("/{objective_id}", response_model=ObjectiveResponse)
async def update_objective(
    project_id: str,
    objective_id: str,
    body: ObjectiveUpdate,
    session: AsyncSession = Depends(get_session),
) -> ObjectiveResponse:
    """Update non-None fields of an objective."""
    await _require_project(project_id, session)
    objective = await session.get(Objective, objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field, value in updates.items():
        setattr(objective, field, value)
    objective.updated_at = _now_iso()

    await session.commit()
    await session.refresh(objective)
    return ObjectiveResponse.model_validate(objective)


@router.delete("/{objective_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_objective(
    project_id: str,
    objective_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Soft-delete an objective (sets deleted=1, deleted_at)."""
    await _require_project(project_id, session)
    objective = await session.get(Objective, objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Objective not found.")

    objective.deleted = 1
    objective.deleted_at = _now_iso()
    await session.commit()


@router.post(
    "/{objective_id}/causal-link",
    response_model=CausalLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_causal_link(
    project_id: str,
    objective_id: str,
    body: CausalLinkCreate,
    session: AsyncSession = Depends(get_session),
) -> CausalLinkResponse:
    """
    Create a causal link between two objectives.
    Validates existence of both objectives, detects cycles, enforces uniqueness.
    """
    await _require_project(project_id, session)

    # Validate from_obj exists and not deleted
    from_objective = await session.get(Objective, body.from_obj)
    if from_objective is None or from_objective.project_id != project_id or from_objective.deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Source objective {body.from_obj!r} not found.",
        )

    # Validate to_obj exists and not deleted
    to_objective = await session.get(Objective, body.to_obj)
    if to_objective is None or to_objective.project_id != project_id or to_objective.deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Target objective {body.to_obj!r} not found.",
        )

    # Prevent self-loops
    if body.from_obj == body.to_obj:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Self-loops are not allowed.",
        )

    # DFS cycle detection
    if await _has_cycle(session, project_id, body.from_obj, body.to_obj):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Adding this link would create a cycle in the objective graph.",
        )

    # Create the causal link
    link = ObjectiveCausalLink(
        id=str(uuid.uuid4()),
        from_obj=body.from_obj,
        to_obj=body.to_obj,
        project_id=project_id,
        label=body.label,
        created_at=_now_iso(),
    )
    session.add(link)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A causal link between these objectives already exists.",
        )

    await session.refresh(link)
    return CausalLinkResponse.model_validate(link)


@router.delete("/causal-link/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_causal_link(
    project_id: str,
    link_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete a causal link."""
    await _require_project(project_id, session)
    link = await session.get(ObjectiveCausalLink, link_id)
    if link is None or link.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Causal link not found.")

    await session.delete(link)
    await session.commit()
