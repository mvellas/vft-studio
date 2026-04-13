"""PipelineOrchestrator — runs VFT phases sequentially, yields SSE-ready dicts."""
from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent, ToolAwareAgent, ToolUseEvent, ToolResultEvent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.phase3_specialist import Phase3SpecialistAgent
from backend.agents.analyst_agent import AnalystAgent


_PHASES = [
    {
        "agent_type": "phase1_specialist",
        "agent_name": "FRAME",
        "phase_label": "Fase 1 — Stakeholders",
        "prompt_suffix": (
            "Realize uma análise completa dos stakeholders deste projeto VFT. "
            "Identifique todos os envolvidos, seus papéis, interesses e influências. "
            "Use ferramentas de pesquisa se necessário."
        ),
    },
    {
        "agent_type": "phase2_specialist",
        "agent_name": "AXIOM",
        "phase_label": "Fase 2 — Valores e Objetivos",
        "prompt_suffix": (
            "Com base nos stakeholders identificados na Fase 1, elabore a hierarquia "
            "completa de valores e objetivos. Distinga objetivos fundamentais de objetivos-meios."
        ),
    },
    {
        "agent_type": "phase3_specialist",
        "agent_name": "NOVA",
        "phase_label": "Fase 3 — Alternativas",
        "prompt_suffix": (
            "Com base nos objetivos da Fase 2, gere e avalie alternativas criativas. "
            "Analise trade-offs entre as alternativas em relação aos objetivos fundamentais."
        ),
    },
]

_ANALYST_PHASE = {
    "agent_type": "analyst",
    "agent_name": "ANALYST",
    "phase_label": "Fase 4 — Evidências Documentais",
    "prompt_suffix": (
        "Faça uma cross-referência entre os documentos disponíveis e os achados das fases anteriores. "
        "Identifique evidências, lacunas e possíveis contradições."
    ),
}

_AGENT_CLASS_MAP = {
    "phase1_specialist": Phase1SpecialistAgent,
    "phase2_specialist": Phase2SpecialistAgent,
    "phase3_specialist": Phase3SpecialistAgent,
    "analyst": AnalystAgent,
}


class PipelineOrchestrator:
    def __init__(
        self,
        project: object,
        documents: list,
        session: AsyncSession,
    ) -> None:
        self.project = project
        self.documents = documents
        self.session = session
        self._phase_outputs: dict[str, str] = {}

    async def run(self) -> AsyncIterator[dict]:
        phases = list(_PHASES)
        if self.documents:
            phases.append(_ANALYST_PHASE)

        for phase_cfg in phases:
            agent_type = phase_cfg["agent_type"]
            agent_name = phase_cfg["agent_name"]
            phase_label = phase_cfg["phase_label"]

            yield {"event": "agent_start", "data": {
                "agent": agent_type,
                "agent_name": agent_name,
                "phase_label": phase_label,
                "status": "running",
            }}

            prompt = self._build_prompt(phase_cfg)
            messages = [{"role": "user", "content": prompt}]

            AgentCls = _AGENT_CLASS_MAP[agent_type]
            try:
                if agent_type == "analyst":
                    agent = await AgentCls.from_project_id(self.project.id, None, self.session)
                else:
                    agent = await AgentCls.from_project_id(self.project.id, self.session)
            except Exception:
                agent = BaseAgent(model="claude-sonnet-4-6", system="")

            full_text = ""
            if isinstance(agent, ToolAwareAgent):
                async for event in agent.stream_with_tools(messages):
                    if isinstance(event, ToolUseEvent):
                        query = event.input.get("query", "")
                        yield {"event": "agent_delta", "data": {
                            "agent": agent_type,
                            "agent_name": agent_name,
                            "text": f"\n_[Pesquisando: {query}]_\n",
                        }}
                    elif isinstance(event, ToolResultEvent):
                        pass
                    else:
                        full_text += event
                        yield {"event": "agent_delta", "data": {
                            "agent": agent_type,
                            "agent_name": agent_name,
                            "text": event,
                        }}
            else:
                async for chunk in agent.stream(messages):
                    full_text += chunk
                    yield {"event": "agent_delta", "data": {
                        "agent": agent_type,
                        "agent_name": agent_name,
                        "text": chunk,
                    }}

            self._phase_outputs[agent_name] = full_text
            yield {"event": "agent_done", "data": {
                "agent": agent_type,
                "agent_name": agent_name,
                "phase_label": phase_label,
                "content": full_text,
            }}

    def _build_prompt(self, phase_cfg: dict) -> str:
        agent_name = phase_cfg["agent_name"]
        suffix = phase_cfg["prompt_suffix"]
        project_context = (
            f"Projeto: {self.project.name}\n"
            f"Descrição: {self.project.description or '(sem descrição)'}\n"
        )
        prior = ""
        if self._phase_outputs:
            prior = "\n\n## Contexto das fases anteriores\n"
            prior += (
                "IMPORTANTE: use os outputs abaixo como fonte primária de contexto. "
                "Se campos do IDF ou lista de stakeholders aparecerem vazios no seu contexto interno, "
                "extraia essas informações diretamente dos outputs do FRAME abaixo — "
                "NÃO solicite essas informações ao usuário.\n"
            )
            for name, content in self._phase_outputs.items():
                prior += f"\n### {name}\n{content[:8000]}\n"
        doc_context = ""
        if self.documents and agent_name == "ANALYST":
            doc_context = "\n\n## Documentos disponíveis\n"
            for doc in self.documents[:5]:
                doc_context += f"\n### {doc.title}\n{doc.content_text[:1500]}\n"
        return f"{project_context}{prior}{doc_context}\n\n{suffix}"

    @property
    def phase_outputs(self) -> dict[str, str]:
        return dict(self._phase_outputs)
