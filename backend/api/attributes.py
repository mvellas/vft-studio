"""FastAPI router for Attribute and AttributeLevel CRUD under a project."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Attribute, AttributeLevel, Objective, Project
from backend.schemas.attribute import (
    AttributeCreate,
    AttributeLevelCreate,
    AttributeLevelResponse,
    AttributeLevelUpdate,
    AttributeResponse,
    AttributeUpdate,
    AttributeWithLevelsResponse,
)

router = APIRouter(
    prefix="/projects/{project_id}/attributes",
    tags=["attributes"],
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _require_project(project_id: str, session: AsyncSession) -> None:
    """Raise 404 if project does not exist."""
    result = await session.execute(
        select(Project).where(Project.id == project_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found.")


async def _load_levels(attribute_id: str, session: AsyncSession) -> list[AttributeLevelResponse]:
    """Load all levels for an attribute ordered by order_index."""
    result = await session.execute(
        select(AttributeLevel)
        .where(AttributeLevel.attribute_id == attribute_id)
        .order_by(AttributeLevel.order_index)
    )
    return [AttributeLevelResponse.model_validate(lv) for lv in result.scalars().all()]


@router.get("", response_model=list[AttributeWithLevelsResponse])
async def list_attributes(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[AttributeWithLevelsResponse]:
    """List all attributes for a project, each with its levels."""
    await _require_project(project_id, session)
    result = await session.execute(
        select(Attribute).where(Attribute.project_id == project_id)
    )
    attributes = result.scalars().all()

    output: list[AttributeWithLevelsResponse] = []
    for attr in attributes:
        levels = await _load_levels(attr.id, session)
        output.append(
            AttributeWithLevelsResponse(
                attribute=AttributeResponse.model_validate(attr),
                levels=levels,
            )
        )
    return output


@router.get("/{attribute_id}", response_model=AttributeWithLevelsResponse)
async def get_attribute(
    project_id: str,
    attribute_id: str,
    session: AsyncSession = Depends(get_session),
) -> AttributeWithLevelsResponse:
    """Return a single attribute with its levels."""
    await _require_project(project_id, session)
    attr = await session.get(Attribute, attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")
    levels = await _load_levels(attribute_id, session)
    return AttributeWithLevelsResponse(
        attribute=AttributeResponse.model_validate(attr),
        levels=levels,
    )


@router.post("", response_model=AttributeResponse, status_code=status.HTTP_201_CREATED)
async def create_attribute(
    project_id: str,
    body: AttributeCreate,
    session: AsyncSession = Depends(get_session),
) -> AttributeResponse:
    """Create an attribute for a project's objective."""
    await _require_project(project_id, session)

    # Validate objective exists and belongs to project
    objective = await session.get(Objective, body.objective_id)
    if objective is None or objective.project_id != project_id or objective.deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Objective {body.objective_id!r} not found.",
        )

    # Validate attr_type
    valid_types = {"natural", "constructed", "proxy"}
    if body.attr_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"attr_type must be one of: {', '.join(sorted(valid_types))}",
        )

    now = _now_iso()
    attribute = Attribute(
        id=str(uuid.uuid4()),
        objective_id=body.objective_id,
        project_id=project_id,
        attr_type=body.attr_type,
        description=body.description,
        scale_description=body.scale_description,
        prop_unambiguous=0,
        prop_comprehensive=0,
        prop_direct=0,
        prop_operational=0,
        prop_understandable=0,
        created_at=now,
        updated_at=now,
    )
    session.add(attribute)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Attribute already exists for this objective.",
        )

    await session.refresh(attribute)
    return AttributeResponse.model_validate(attribute)


@router.put("/{attribute_id}", response_model=AttributeResponse)
async def update_attribute(
    project_id: str,
    attribute_id: str,
    body: AttributeUpdate,
    session: AsyncSession = Depends(get_session),
) -> AttributeResponse:
    """Update non-None fields of an attribute."""
    await _require_project(project_id, session)
    attr = await session.get(Attribute, attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field, value in updates.items():
        setattr(attr, field, value)
    attr.updated_at = _now_iso()

    await session.commit()
    await session.refresh(attr)
    return AttributeResponse.model_validate(attr)


@router.delete("/{attribute_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attribute(
    project_id: str,
    attribute_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete an attribute and cascade-delete its levels."""
    await _require_project(project_id, session)
    attr = await session.get(Attribute, attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")

    # Cascade-delete levels
    levels_result = await session.execute(
        select(AttributeLevel).where(AttributeLevel.attribute_id == attribute_id)
    )
    for level in levels_result.scalars().all():
        await session.delete(level)

    await session.delete(attr)
    await session.commit()


@router.post(
    "/{attribute_id}/levels",
    response_model=AttributeLevelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_level(
    project_id: str,
    attribute_id: str,
    body: AttributeLevelCreate,
    session: AsyncSession = Depends(get_session),
) -> AttributeLevelResponse:
    """Create a level for an attribute."""
    await _require_project(project_id, session)
    attr = await session.get(Attribute, attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")

    level = AttributeLevel(
        id=str(uuid.uuid4()),
        attribute_id=attribute_id,
        label=body.label,
        description=body.description,
        order_index=body.order_index,
        created_at=_now_iso(),
    )
    session.add(level)
    await session.commit()
    await session.refresh(level)
    return AttributeLevelResponse.model_validate(level)


@router.put("/levels/{level_id}", response_model=AttributeLevelResponse)
async def update_level(
    project_id: str,
    level_id: str,
    body: AttributeLevelUpdate,
    session: AsyncSession = Depends(get_session),
) -> AttributeLevelResponse:
    """Update non-None fields of an attribute level."""
    await _require_project(project_id, session)
    level = await session.get(AttributeLevel, level_id)
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found.")

    # Verify the level's attribute belongs to this project
    attr = await session.get(Attribute, level.attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found.")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for field, value in updates.items():
        setattr(level, field, value)

    await session.commit()
    await session.refresh(level)
    return AttributeLevelResponse.model_validate(level)


@router.delete("/levels/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_level(
    project_id: str,
    level_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard-delete an attribute level."""
    await _require_project(project_id, session)
    level = await session.get(AttributeLevel, level_id)
    if level is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found.")

    attr = await session.get(Attribute, level.attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Level not found.")

    await session.delete(level)
    await session.commit()


@router.put("/{attribute_id}/levels/reorder", status_code=status.HTTP_200_OK)
async def reorder_levels(
    project_id: str,
    attribute_id: str,
    body: dict[str, Any] = Body(...),
    session: AsyncSession = Depends(get_session),
) -> dict[str, str]:
    """Reorder attribute levels. Body: {"level_ids": [id1, id2, ...]}"""
    await _require_project(project_id, session)
    attr = await session.get(Attribute, attribute_id)
    if attr is None or attr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attribute not found.")

    level_ids: list[str] = body.get("level_ids", [])
    for idx, level_id in enumerate(level_ids):
        level = await session.get(AttributeLevel, level_id)
        if level is not None and level.attribute_id == attribute_id:
            level.order_index = idx

    await session.commit()
    return {"status": "ok"}
