"""Phase 2 business logic — gate validation for VFT Phase 2 completion."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.models import Attribute, Objective, Project


async def check_phase2_gate(project_id: str, session: AsyncSession) -> bool:
    """Check if all Phase 2 completion criteria are met.

    Returns True if gate passes (sets project.phase2_completed=1), False otherwise.

    Criteria:
      1. At least 1 fundamental objective exists (witi_classification == "fundamental")
      2. Every fundamental objective has an attribute defined
    """
    # Load all non-deleted fundamental objectives for the project
    fund_result = await session.execute(
        select(Objective).where(
            Objective.project_id == project_id,
            Objective.witi_classification == "fundamental",
            Objective.deleted == 0,
        )
    )
    fundamentals = fund_result.scalars().all()

    # Gate fails if there are no fundamental objectives
    if len(fundamentals) == 0:
        return False

    # Load all attributes whose objective_id is among the fundamentals
    fundamental_ids = [f.id for f in fundamentals]
    attr_result = await session.execute(
        select(Attribute).where(Attribute.objective_id.in_(fundamental_ids))
    )
    attributes = attr_result.scalars().all()

    # Gate fails if not every fundamental has an attribute
    if len(attributes) != len(fundamentals):
        return False

    # All checks pass — mark Phase 2 as completed
    project = await session.get(Project, project_id)
    if project is not None:
        project.phase2_completed = 1
        await session.commit()

    return True
