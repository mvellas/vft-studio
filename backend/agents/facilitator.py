"""
backend/agents/facilitator.py
==============================
ARIA — the VFT master facilitator agent.

ARIA guides users through all 33 steps of the VFT process, helps with
process navigation, and knows when to delegate to specialist agents.
"""
from __future__ import annotations

from pathlib import Path

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.api.settings import get_brave_api_key
from backend.db.models import Alternative, Document, Objective, PipelineRun, Project, StepCompletion, Stakeholder
from backend.tools.brave_search import brave_search

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "facilitator.md"
_MAX_FIELD_LEN = 500

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": (
        "Search the web for current legislation, public data, academic references, "
        "and other information relevant to the VFT decision context. "
        "Use when the user asks about specific laws, regulations, or external context "
        "that may not be in the project data. Always cite sources in your response."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query in the most specific terms possible.",
            }
        },
        "required": ["query"],
    },
}


def _truncate(text: str, max_len: int = _MAX_FIELD_LEN) -> str:
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len] + "...[truncated]"


class FacilitatorAgent(ToolAwareAgent):
    """ARIA — Master VFT Facilitator with optional web search."""

    def __init__(self, project_context: dict, model: str = "claude-opus-4-6") -> None:
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
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", "(not provided)"))
            .replace("{{PROCESS_STATUS}}", ctx.get("process_status", "(not loaded)"))
            .replace("{{STAKEHOLDERS_LIST}}", ctx.get("stakeholders_md", "(none identified yet)"))
            .replace("{{VFT_COMPLETENESS}}", ctx.get("vft_completeness", "(not assessed)"))
            .replace("{{LATEST_REPORT}}", ctx.get("latest_report", "(no full AI report generated yet)"))
        )

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-opus-4-6",
    ) -> "FacilitatorAgent":
        """Build ARIA agent from a project ID by loading DB context."""
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

        # Load completed steps
        sc_result = await session.execute(
            select(StepCompletion)
            .where(StepCompletion.project_id == project_id)
            .order_by(StepCompletion.step_id)
        )
        completed_steps = sc_result.scalars().all()

        objectives_result = await session.execute(
            select(Objective)
            .where(Objective.project_id == project_id, Objective.deleted == 0)
            .order_by(Objective.order_index)
        )
        objectives = objectives_result.scalars().all()

        alternatives_result = await session.execute(
            select(Alternative)
            .where(Alternative.project_id == project_id, Alternative.deleted == 0)
            .order_by(Alternative.order_index)
        )
        alternatives = alternatives_result.scalars().all()

        documents_result = await session.execute(
            select(Document)
            .where(Document.project_id == project_id)
        )
        documents = documents_result.scalars().all()

        latest_run_result = await session.execute(
            select(PipelineRun)
            .where(PipelineRun.project_id == project_id, PipelineRun.status == "done")
            .order_by(PipelineRun.created_at.desc())
            .limit(1)
        )
        latest_run = latest_run_result.scalar_one_or_none()

        # Build project summary
        project_summary = (
            f"Nome: {_truncate(project.name)}\n"
            f"Descrição: {_truncate(project.description)}\n"
            f"Fase atual: {project.phase_status}\n"
            f"Passo atual: {project.current_step}\n"
            f"Declaração de decisão: {_truncate(project.decision_statement)}\n"
            f"Propósito IDF: {_truncate(project.idf_purpose)}\n"
            f"Perspectiva IDF: {_truncate(project.idf_perspective)}\n"
            f"Escopo IDF: {_truncate(project.idf_scope)}\n"
            f"Fase 1 completa: {'Sim' if project.phase1_completed else 'Não'}\n"
            f"Fase 2 completa: {'Sim' if project.phase2_completed else 'Não'}\n"
            f"Fase 3 completa: {'Sim' if project.phase3_completed else 'Não'}"
        )

        # Build process status
        completed_ids = [sc.step_id for sc in completed_steps]
        if completed_ids:
            process_status = f"Passos concluídos: {', '.join(completed_ids)}\nPasso atual: {project.current_step}"
        else:
            process_status = f"Nenhum passo concluído ainda. Iniciando em: {project.current_step}"

        # Build stakeholders markdown
        if stakeholders:
            lines = []
            for s in stakeholders:
                dm_flag = " [Decisor]" if s.is_decision_maker else ""
                lines.append(f"- **{s.name}** ({s.role}){dm_flag}")
            stakeholders_md = "\n".join(lines)
        else:
            stakeholders_md = "(nenhum stakeholder identificado ainda)"

        fundamental_count = sum(1 for objective in objectives if objective.witi_classification == "fundamental")
        means_count = sum(1 for objective in objectives if objective.witi_classification == "means")
        attribute_ready_count = sum(1 for objective in objectives if objective.coc_q1_result)
        vft_completeness = (
            f"Stakeholders persistidos: {len(stakeholders)}\n"
            f"Documentos persistidos: {len(documents)}\n"
            f"Objetivos persistidos: {len(objectives)}\n"
            f"Objetivos fundamentais: {fundamental_count}\n"
            f"Objetivos meios: {means_count}\n"
            f"Objetivos com atributo/CoC: {attribute_ready_count}\n"
            f"Alternativas persistidas: {len(alternatives)}\n"
            f"Relatório IA completo disponível: {'Sim' if latest_run and latest_run.report_md else 'Não'}"
        )

        context = {
            "project_summary": project_summary,
            "process_status": process_status,
            "stakeholders_md": stakeholders_md,
            "vft_completeness": vft_completeness,
            "latest_report": _truncate(latest_run.report_md if latest_run else "", 12000) or "(nenhum relatório final armazenado)",
        }

        return cls(project_context=context, model=model)
