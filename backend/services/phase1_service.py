"""Phase 1 business logic — stakeholder config computation and project updates."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Project, Stakeholder
from backend.db.repository import BaseRepository


def compute_stakeholder_config(stakeholders: list) -> str:
    """Compute the IDF variant string based on stakeholder composition.

    Returns:
        "multi_dm_multi"   — 2+ decision makers (IDF steps 1.4-1.5)
        "single_dm_multi"  — 1 DM + multiple stakeholders (IDF step 1.3)
        "single_dm_single" — 1 DM only (IDF step 1.2)
    """
    dm_count = sum(1 for s in stakeholders if s.is_decision_maker)
    total_count = len(stakeholders)

    if dm_count > 1:
        return "multi_dm_multi"
    elif total_count > 1:
        return "single_dm_multi"
    else:
        return "single_dm_single"


async def update_stakeholder_config(project_id: str, session: AsyncSession) -> str:
    """Recompute stakeholder_config for a project and persist it.

    Loads all stakeholders for the project, runs compute_stakeholder_config,
    and writes the result to Project.stakeholder_config via BaseRepository.update.

    Returns the computed config string.
    """
    result = await session.execute(
        select(Stakeholder).where(Stakeholder.project_id == project_id)
    )
    stakeholders = list(result.scalars().all())

    config = compute_stakeholder_config(stakeholders)

    repo: BaseRepository[Project] = BaseRepository(Project, session)
    await repo.update(project_id, stakeholder_config=config)

    return config
