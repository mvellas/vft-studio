"""ReportGenerator — ARIA synthesizes final markdown report."""
from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import FacilitatorAgent


_REPORT_SYSTEM = """You are ARIA, a VFT (Value-Focused Thinking) facilitator.
Generate a comprehensive final analysis report in Portuguese (PT-BR) using the
structure provided. Be analytical, cite specific findings from each agent,
and provide actionable recommendations. Use markdown formatting."""


_REPORT_PROMPT_TEMPLATE = """Gere o relatório final da análise VFT para o projeto '{name}'.

## Achados dos agentes

### FRAME (Stakeholders)
{frame}

### AXIOM (Valores e Objetivos)
{axiom}

### NOVA (Alternativas)
{nova}

{analyst_section}

## Transcrição da War Room
{war_room}

---

Gere o relatório completo com esta estrutura exata:

# Análise VFT — {name}

## 1. Contexto e Problema
## 2. Stakeholders Identificados
## 3. Hierarquia de Valores e Objetivos
## 4. Alternativas Avaliadas
## 5. Evidências Documentais
## 6. Síntese da War Room
## 7. Recomendação Final
## 8. Próximos Passos VFT
"""


class ReportGenerator:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        war_room_transcript: str,
        session: AsyncSession,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.war_room_transcript = war_room_transcript
        self.session = session

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "report_start", "data": {}}

        analyst_section = ""
        if "ANALYST" in self.phase_outputs:
            analyst_section = f"### ANALYST (Evidências Documentais)\n{self.phase_outputs['ANALYST'][:2000]}"

        prompt = _REPORT_PROMPT_TEMPLATE.format(
            name=self.project_name,
            frame=self.phase_outputs.get("FRAME", "N/A")[:2000],
            axiom=self.phase_outputs.get("AXIOM", "N/A")[:2000],
            nova=self.phase_outputs.get("NOVA", "N/A")[:2000],
            analyst_section=analyst_section,
            war_room=self.war_room_transcript[:3000],
        )

        try:
            agent = await FacilitatorAgent.from_project_id(self.project_id, self.session)
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system=_REPORT_SYSTEM)

        full_report = ""
        messages = [{"role": "user", "content": prompt}]

        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools(messages):
                if isinstance(event, str):
                    full_report += event
                    yield {"event": "report_delta", "data": {"text": event}}
        else:
            async for chunk in agent.stream(messages):
                full_report += chunk
                yield {"event": "report_delta", "data": {"text": chunk}}

        yield {"event": "report_done", "data": {"report_md": full_report}}
