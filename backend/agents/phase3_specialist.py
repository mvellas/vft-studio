"""
backend/agents/phase3_specialist.py
=====================================
Phase 3 Specialist agent (NOVA) for VFT Studio.

NOVA is the AI backbone for Phase 3 — helping generate and evaluate decision
alternatives, build the Consequences Matrix, and perform dominance analysis.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import Alternative, Attribute, Objective, Project, Stakeholder

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "phase3_specialist.md"
_MAX_FIELD_LEN = 500
_MAX_OBJ_LEN = 200


def _truncate(text: str, max_len: int = _MAX_FIELD_LEN) -> str:
    """Truncate text to prevent prompt overflow."""
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "...[truncated]"


class Phase3SpecialistAgent(BaseAgent):
    """NOVA — Phase 3 Specialist for VFT Alternatives work."""

    def __init__(self, project_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system)
        self.project_context = project_context

    def _render_prompt(self, ctx: dict) -> str:
        """Load prompt template and substitute context placeholders."""
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", "(not provided)"))
            .replace("{{IDF}}", ctx.get("idf_summary", "(not started)"))
            .replace("{{OBJECTIVES_AND_ATTRIBUTES}}", ctx.get("objectives_and_attributes_md", "(none yet)"))
            .replace("{{ALTERNATIVES_LIST}}", ctx.get("alternatives_md", "(none yet)"))
        )

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "Phase3SpecialistAgent":
        """Build a NOVA agent from a project ID by loading DB context."""
        project = await session.get(Project, project_id)
        if project is None:
            raise ValueError(f"Project {project_id!r} not found.")

        # Load stakeholders
        s_result = await session.execute(
            select(Stakeholder)
            .where(Stakeholder.project_id == project_id)
            .order_by(Stakeholder.order_index)
        )
        stakeholders = s_result.scalars().all()

        # Load fundamental objectives with attributes
        o_result = await session.execute(
            select(Objective)
            .where(
                Objective.project_id == project_id,
                Objective.deleted == 0,
                Objective.witi_classification == "fundamental",
            )
            .order_by(Objective.order_index)
        )
        fundamentals = o_result.scalars().all()

        # Load attributes for fundamentals
        attr_map: dict[str, Attribute] = {}
        if fundamentals:
            fund_ids = [f.id for f in fundamentals]
            a_result = await session.execute(
                select(Attribute).where(Attribute.objective_id.in_(fund_ids))
            )
            for attr in a_result.scalars().all():
                attr_map[attr.objective_id] = attr

        # Load alternatives
        alt_result = await session.execute(
            select(Alternative)
            .where(Alternative.project_id == project_id, Alternative.deleted == 0)
            .order_by(Alternative.order_index)
        )
        alternatives = alt_result.scalars().all()

        # Build objectives + attributes markdown
        if fundamentals:
            lines = []
            for obj in fundamentals:
                attr = attr_map.get(obj.id)
                attr_info = ""
                if attr:
                    attr_info = f" [Atributo: {_truncate(attr.description, 150)}, tipo={attr.attr_type}]"
                lines.append(f"- {_truncate(obj.statement, _MAX_OBJ_LEN)}{attr_info}")
            objectives_and_attributes_md = "\n".join(lines)
        else:
            objectives_and_attributes_md = "(nenhum objetivo fundamental definido ainda)"

        # Build alternatives markdown
        if alternatives:
            alt_lines = []
            for alt in alternatives:
                sq_flag = " [Status Quo]" if alt.is_status_quo else ""
                desc = f": {_truncate(alt.description, 200)}" if alt.description else ""
                alt_lines.append(f"- **{alt.name}**{sq_flag}{desc}")
            alternatives_md = "\n".join(alt_lines)
        else:
            alternatives_md = "(nenhuma alternativa definida ainda)"

        # Build project summary
        project_summary = (
            f"Name: {_truncate(project.name)}\n"
            f"Description: {_truncate(project.description)}\n"
        )

        # Build IDF summary
        idf_summary = (
            f"Purpose: {_truncate(project.idf_purpose)}\n"
            f"Perspective: {_truncate(project.idf_perspective)}\n"
            f"Scope: {_truncate(project.idf_scope)}\n"
            f"DS: {_truncate(project.decision_statement)}"
        )

        context = {
            "project_summary": project_summary,
            "idf_summary": idf_summary,
            "objectives_and_attributes_md": objectives_and_attributes_md,
            "alternatives_md": alternatives_md,
        }

        return cls(project_context=context, model=model)
