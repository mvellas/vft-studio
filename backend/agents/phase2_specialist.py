"""
backend/agents/phase2_specialist.py
=====================================
Phase 2 Specialist agent (AXIOM) for VFT Studio.

AXIOM is the AI backbone for Phase 2 — helping elicit and classify decision
objectives using VFT Devices, WITI Test, and Control of Consequences.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import Objective, Project, Stakeholder

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "phase2_specialist.md"
_MAX_FIELD_LEN = 500
_MAX_OBJ_LEN = 200


def _truncate(text: str, max_len: int = _MAX_FIELD_LEN) -> str:
    """Truncate text to prevent prompt overflow (research pitfall #4)."""
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "...[truncated]"


class Phase2SpecialistAgent(BaseAgent):
    """AXIOM — Phase 2 Specialist for VFT Decision Objectives work."""

    def __init__(self, project_context: dict, model: str = "claude-opus-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system)
        self.project_context = project_context

    def _render_prompt(self, ctx: dict) -> str:
        """Load prompt template and substitute context placeholders."""
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", "(not provided)"))
            .replace("{{OBJECTIVES_LIST}}", ctx.get("objectives_md", "(none yet)"))
            .replace("{{IDF}}", ctx.get("idf_summary", "(not started)"))
            .replace("{{STAKEHOLDERS_LIST}}", ctx.get("stakeholders_md", "(none identified yet)"))
        )

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-opus-4-6",
    ) -> "Phase2SpecialistAgent":
        """Build an AXIOM agent from a project ID by loading DB context."""
        # Load project
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

        # Load objectives
        o_result = await session.execute(
            select(Objective)
            .where(Objective.project_id == project_id, Objective.deleted == 0)
            .order_by(Objective.order_index)
        )
        objectives = o_result.scalars().all()

        # Build objectives markdown list
        if objectives:
            obj_lines = [
                f"- [{o.type}] {_truncate(o.statement, _MAX_OBJ_LEN)}"
                for o in objectives
            ]
            objectives_md = "\n".join(obj_lines)
        else:
            objectives_md = "(none yet)"

        # Build project summary
        project_summary = (
            f"Name: {_truncate(project.name)}\n"
            f"Description: {_truncate(project.description)}\n"
            f"Qualitative Modeling Tech: {_truncate(project.qualitative_modeling_tech)}"
        )

        # Build IDF summary
        idf_summary = (
            f"Purpose: {_truncate(project.idf_purpose)}\n"
            f"Perspective: {_truncate(project.idf_perspective)}\n"
            f"Scope: {_truncate(project.idf_scope)}\n"
            f"DS: {_truncate(project.decision_statement)}"
        )

        # Build stakeholders markdown list
        if stakeholders:
            lines = []
            for s in stakeholders:
                dm_flag = " [Decision Maker]" if s.is_decision_maker else ""
                interests = _truncate(s.interests) if s.interests else "(not specified)"
                lines.append(
                    f"- **{s.name}** ({s.role}){dm_flag}\n  Interests: {interests}"
                )
            stakeholders_md = "\n".join(lines)
        else:
            stakeholders_md = "(none identified yet)"

        context = {
            "project_summary": project_summary,
            "objectives_md": objectives_md,
            "idf_summary": idf_summary,
            "stakeholders_md": stakeholders_md,
        }

        return cls(project_context=context, model=model)
