"""
backend/agents/phase1_specialist.py
=====================================
Phase 1 Specialist agent (FRAME) for VFT Studio.

FRAME is the AI backbone for Phase 1 — helping define the Initial Decision
Frame (IDF) and generate/validate the Decision Statement.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import WEB_SEARCH_TOOL
from backend.api.settings import get_brave_api_key
from backend.db.models import Project, Stakeholder
from backend.tools.brave_search import brave_search

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "phase1_specialist.md"
_MAX_FIELD_LEN = 500


def _truncate(text: str) -> str:
    """Truncate text to 500 chars to prevent prompt overflow (research pitfall #4)."""
    if len(text) <= _MAX_FIELD_LEN:
        return text
    return text[:_MAX_FIELD_LEN] + "...[truncated]"


class Phase1SpecialistAgent(ToolAwareAgent):
    """FRAME — Phase 1 Specialist for IDF and Decision Statement work."""

    def __init__(self, project_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])
        self.project_context = project_context

    async def execute_tool(self, name: str, tool_input: dict) -> tuple[str, dict]:
        if name == "web_search":
            query = tool_input.get("query", "")
            api_key = get_brave_api_key()
            result_text, count = await brave_search(query, api_key=api_key)
            return result_text, {"count": count, "query": query}
        return f"Tool '{name}' not implemented.", {}

    def _render_prompt(self, ctx: dict) -> str:
        """Load prompt template and substitute context placeholders."""
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", "(not provided)"))
            .replace("{{STAKEHOLDERS_LIST}}", ctx.get("stakeholders_md", "(none identified yet)"))
            .replace("{{IDF_DRAFT}}", ctx.get("idf_draft", "(not started)"))
        )

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "Phase1SpecialistAgent":
        """Build a FRAME agent from a project ID by loading DB context."""
        # Load project
        result = await session.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise ValueError(f"Project {project_id!r} not found.")

        # Load stakeholders
        s_result = await session.execute(
            select(Stakeholder)
            .where(Stakeholder.project_id == project_id)
            .order_by(Stakeholder.order_index)
        )
        stakeholders = s_result.scalars().all()

        # Build project summary
        project_summary = (
            f"Name: {_truncate(project.name)}\n"
            f"Description: {_truncate(project.description)}\n"
            f"Context Notes: {_truncate(project.context_notes)}\n"
            f"Current Step: {project.current_step}"
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

        # Build IDF draft
        idf_parts = []
        if project.idf_purpose:
            idf_parts.append(f"**Purpose:** {_truncate(project.idf_purpose)}")
        if project.idf_perspective:
            idf_parts.append(f"**Perspective:** {_truncate(project.idf_perspective)}")
        if project.idf_scope:
            idf_parts.append(f"**Scope:** {_truncate(project.idf_scope)}")
        idf_draft = "\n".join(idf_parts) if idf_parts else "(not started)"

        context = {
            "project_summary": project_summary,
            "stakeholders_md": stakeholders_md,
            "idf_draft": idf_draft,
        }

        return cls(project_context=context, model=model)
