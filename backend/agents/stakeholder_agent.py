"""
backend/agents/stakeholder_agent.py
=====================================
Stakeholder Simulation agent for VFT Studio.

This agent simulates a specific stakeholder's perspective during Phase 2
objective elicitation, responding to VFT Device questions in character.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import Project, Stakeholder

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "stakeholder.md"


def _safe(value: str | None, default: str = "") -> str:
    """Return value or default for None/empty."""
    return value if value else default


class StakeholderSimulationAgent(BaseAgent):
    """Simulates a specific stakeholder for VFT Device-guided interviews."""

    def __init__(self, stakeholder_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._render_prompt(stakeholder_context)
        super().__init__(model=model, system=system)
        self.stakeholder_context = stakeholder_context

    def _render_prompt(self, ctx: dict) -> str:
        """Load prompt template and substitute stakeholder context placeholders."""
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{STAKEHOLDER_NAME}}", ctx.get("name", "(unknown)"))
            .replace("{{STAKEHOLDER_ROLE}}", ctx.get("role", "(unknown)"))
            .replace("{{IS_DM}}", "Sim" if ctx.get("is_decision_maker") else "Não")
            .replace("{{STAKEHOLDER_PROFILE}}", ctx.get("profile", "(not specified)"))
            .replace("{{STAKEHOLDER_INTERESTS}}", ctx.get("interests", "(not specified)"))
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_context", "(not provided)"))
            .replace("{{DECISION_STATEMENT}}", ctx.get("decision_statement", "(not defined)"))
            .replace("{{IDF_PURPOSE}}", ctx.get("idf_purpose", "(not defined)"))
            .replace("{{IDF_SCOPE}}", ctx.get("idf_scope", "(not defined)"))
        )

    @classmethod
    async def from_stakeholder_id(
        cls,
        stakeholder_id: str,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "StakeholderSimulationAgent":
        """Build a StakeholderSimulationAgent from DB by stakeholder and project IDs."""
        stakeholder = await session.get(Stakeholder, stakeholder_id)
        if stakeholder is None:
            raise ValueError(f"Stakeholder {stakeholder_id!r} not found.")

        project = await session.get(Project, project_id)
        if project is None:
            raise ValueError(f"Project {project_id!r} not found.")

        project_context = (
            f"Nome: {project.name}\n"
            f"Descrição: {_safe(project.description, '(não especificada)')}"
        )

        context = {
            "name": stakeholder.name,
            "role": stakeholder.role,
            "is_decision_maker": stakeholder.is_decision_maker,
            "profile": _safe(stakeholder.profile, "(não especificado)"),
            "interests": _safe(stakeholder.interests, "(não especificados)"),
            "project_context": project_context,
            "decision_statement": _safe(project.decision_statement, "(não definido)"),
            "idf_purpose": _safe(project.idf_purpose, "(não definido)"),
            "idf_scope": _safe(project.idf_scope, "(não definido)"),
        }

        return cls(stakeholder_context=context, model=model)
