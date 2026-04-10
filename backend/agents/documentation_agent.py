"""
backend/agents/documentation_agent.py
=======================================
SCRIBE — the VFT documentation agent.

SCRIBE generates structured Markdown reports from a project's full state,
summarizing all phases, decisions, objectives, alternatives, and the
Consequences Matrix.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import (
    Alternative,
    AlternativeConsequence,
    Attribute,
    Objective,
    Project,
    Stakeholder,
    StepCompletion,
)

_SYSTEM = """You are SCRIBE, the VFT Studio documentation agent. Your role is to generate clear,
structured Markdown reports that summarize the VFT (Value-Focused Thinking) process decisions.
Respond only with the Markdown document — no preamble, no explanation."""


class DocumentationAgent(BaseAgent):
    """SCRIBE — generates Markdown documentation for a VFT project."""

    def __init__(self, model: str = "claude-sonnet-4-6") -> None:
        super().__init__(model=model, system=_SYSTEM)

    @staticmethod
    async def build_project_report(project_id: str, session: AsyncSession) -> str:
        """Build a complete Markdown report string from DB state."""
        project = await session.get(Project, project_id)
        if project is None:
            return "# Erro\nProjeto não encontrado."

        # Load stakeholders
        s_result = await session.execute(
            select(Stakeholder).where(Stakeholder.project_id == project_id).order_by(Stakeholder.order_index)
        )
        stakeholders = s_result.scalars().all()

        # Load objectives
        o_result = await session.execute(
            select(Objective)
            .where(Objective.project_id == project_id, Objective.deleted == 0)
            .order_by(Objective.order_index)
        )
        objectives = o_result.scalars().all()

        # Load attributes
        fund_ids = [o.id for o in objectives if o.witi_classification == "fundamental"]
        attr_map: dict[str, Attribute] = {}
        if fund_ids:
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

        # Load consequences
        cons_map: dict[str, dict[str, str]] = {}  # alt_id → {obj_id: value_text}
        if alternatives:
            alt_ids = [a.id for a in alternatives]
            c_result = await session.execute(
                select(AlternativeConsequence).where(AlternativeConsequence.alternative_id.in_(alt_ids))
            )
            for cons in c_result.scalars().all():
                if cons.alternative_id not in cons_map:
                    cons_map[cons.alternative_id] = {}
                cons_map[cons.alternative_id][cons.objective_id] = cons.value_text

        # Load step completions
        sc_result = await session.execute(
            select(StepCompletion).where(StepCompletion.project_id == project_id).order_by(StepCompletion.step_id)
        )
        completed_steps = [sc.step_id for sc in sc_result.scalars().all()]

        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        lines = []

        # Header
        lines.append(f"# Relatório VFT: {project.name}")
        lines.append(f"\n*Gerado em: {now}*\n")
        lines.append("---\n")

        # Phase 1: Initial Decision Frame
        lines.append("## Fase 1 — Enquadramento Inicial da Decisão\n")
        lines.append(f"**Propósito:** {project.idf_purpose or '(não preenchido)'}\n")
        lines.append(f"**Perspectiva:** {project.idf_perspective or '(não preenchido)'}\n")
        lines.append(f"**Escopo:** {project.idf_scope or '(não preenchido)'}\n")
        lines.append(f"**Decision Statement:** {project.decision_statement or '(não gerado)'}\n")
        lines.append(f"**Validado:** {'Sim' if project.decision_statement_validated else 'Não'}\n")

        # Stakeholders
        lines.append("\n### Stakeholders\n")
        if stakeholders:
            lines.append("| Nome | Papel | Decisor |")
            lines.append("|------|-------|---------|")
            for s in stakeholders:
                dm = "✓" if s.is_decision_maker else ""
                lines.append(f"| {s.name} | {s.role} | {dm} |")
        else:
            lines.append("*Nenhum stakeholder identificado.*")

        # Phase 2: Objectives
        lines.append("\n---\n")
        lines.append("## Fase 2 — Objetivos de Decisão\n")

        fundamentals = [o for o in objectives if o.witi_classification == "fundamental"]
        means_objs = [o for o in objectives if o.witi_classification == "means"]
        strategic = [o for o in objectives if o.witi_classification == "strategic"]

        if fundamentals:
            lines.append(f"### Objetivos Fundamentais ({len(fundamentals)})\n")
            for obj in fundamentals:
                attr = attr_map.get(obj.id)
                lines.append(f"**{obj.statement}**")
                if attr:
                    lines.append(f"- Atributo: {attr.description} (tipo: {attr.attr_type})")
                    lines.append(f"- Escala: {attr.scale_description or '(não definida)'}")
                lines.append("")
        else:
            lines.append("*Nenhum objetivo fundamental classificado.*\n")

        if means_objs:
            lines.append(f"\n### Objetivos Meios ({len(means_objs)})\n")
            for obj in means_objs:
                lines.append(f"- {obj.statement}")

        if strategic:
            lines.append(f"\n### Objetivos Estratégicos ({len(strategic)})\n")
            for obj in strategic:
                lines.append(f"- {obj.statement}")

        # Phase 3: Alternatives and Consequences Matrix
        lines.append("\n---\n")
        lines.append("## Fase 3 — Alternativas e Matriz de Consequências\n")

        if alternatives:
            lines.append(f"### Alternativas ({len(alternatives)})\n")
            for alt in alternatives:
                sq = " *(Status Quo)*" if alt.is_status_quo else ""
                lines.append(f"**{alt.name}**{sq}")
                if alt.description:
                    lines.append(f"> {alt.description}")
                lines.append("")

            # Consequences Matrix
            if fundamentals and cons_map:
                lines.append("\n### Matriz de Consequências\n")
                header = "| Alternativa | " + " | ".join(
                    f.statement[:30] + ("..." if len(f.statement) > 30 else "") for f in fundamentals
                ) + " |"
                sep = "|---" * (len(fundamentals) + 1) + "|"
                lines.append(header)
                lines.append(sep)
                for alt in alternatives:
                    cells = []
                    alt_cons = cons_map.get(alt.id, {})
                    for obj in fundamentals:
                        val = alt_cons.get(obj.id, "")
                        cells.append(val[:60] + ("..." if len(val) > 60 else "") if val else "—")
                    lines.append(f"| {alt.name} | " + " | ".join(cells) + " |")
        else:
            lines.append("*Nenhuma alternativa definida.*\n")

        # Progress summary
        lines.append("\n---\n")
        lines.append("## Progresso\n")
        lines.append(f"- Passos concluídos: {len(completed_steps)}/33")
        lines.append(f"- Fase 1: {'✓ Completa' if project.phase1_completed else '○ Em andamento'}")
        lines.append(f"- Fase 2: {'✓ Completa' if project.phase2_completed else '○ Em andamento'}")
        lines.append(f"- Fase 3: {'✓ Completa' if project.phase3_completed else '○ Em andamento'}")

        lines.append("\n---\n")
        lines.append("*Relatório gerado por SCRIBE — VFT Studio*")

        return "\n".join(lines)
