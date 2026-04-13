"""WarRoomOrchestrator — 3-act structured debate between VFT agents."""
from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import FacilitatorAgent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.phase3_specialist import Phase3SpecialistAgent
from backend.agents.analyst_agent import AnalystAgent


_AGENT_NAME_MAP = {
    "ARIA": "facilitator",
    "FRAME": "phase1_specialist",
    "AXIOM": "phase2_specialist",
    "NOVA": "phase3_specialist",
    "ANALYST": "analyst",
}

_AGENT_CLASS_MAP = {
    "facilitator": FacilitatorAgent,
    "phase1_specialist": Phase1SpecialistAgent,
    "phase2_specialist": Phase2SpecialistAgent,
    "phase3_specialist": Phase3SpecialistAgent,
    "analyst": AnalystAgent,
}


class WarRoomOrchestrator:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        session: AsyncSession,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.session = session
        self._transcript: list[dict] = []

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "war_room_start", "data": {}}

        participants = [name for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]
                        if name in self.phase_outputs]

        # Act 1: ARIA opens + each agent presents
        aria_open = (
            f"Bem-vindos à War Room do projeto '{self.project_name}'. "
            "Cada agente apresentará seu principal achado. "
            "Em seguida, debateremos as tensões e sínteses identificadas."
        )
        yield {"event": "war_room_turn", "data": {
            "speaker": "ARIA", "agent_name": "ARIA",
            "text": aria_open, "is_delta": False, "act": 1,
        }}
        self._transcript.append({"speaker": "ARIA", "text": aria_open})

        for agent_name in participants:
            prompt = self._presentation_prompt(agent_name)
            async for turn_event in self._agent_speak(agent_name, prompt, act=1):
                yield turn_event

        # Act 2: Two debate rounds mediated by ARIA
        for round_num in range(1, 3):
            aria_question = await self._aria_synthesis_question(round_num)
            yield {"event": "war_room_turn", "data": {
                "speaker": "ARIA", "agent_name": "ARIA",
                "text": aria_question, "is_delta": False, "act": 2,
            }}
            self._transcript.append({"speaker": "ARIA", "text": aria_question})

            for agent_name in participants:
                prompt = self._debate_prompt(agent_name, aria_question)
                async for turn_event in self._agent_speak(agent_name, prompt, act=2):
                    yield turn_event

        yield {"event": "war_room_done", "data": {}}

    def get_transcript(self) -> str:
        return "\n\n".join(
            f"**{t['speaker']}:** {t['text']}" for t in self._transcript
        )

    def _presentation_prompt(self, agent_name: str) -> str:
        output = self.phase_outputs.get(agent_name, "")[:1500]
        return (
            f"Você está na War Room do projeto '{self.project_name}'. "
            f"Apresente em 1-2 parágrafos seu principal achado da análise:\n\n{output}"
        )

    def _debate_prompt(self, agent_name: str, question: str) -> str:
        transcript = self._transcript_text()
        output = self.phase_outputs.get(agent_name, "")[:800]
        return (
            f"War Room — '{self.project_name}'. Debate em andamento.\n\n"
            f"Transcrição até agora:\n{transcript}\n\n"
            f"Seu achado original:\n{output}\n\n"
            f"Pergunta da ARIA: {question}\n\n"
            "Responda em 1-2 parágrafos. Pode concordar, discordar ou complementar os outros agentes."
        )

    async def _aria_synthesis_question(self, round_num: int) -> str:
        transcript = self._transcript_text()
        if round_num == 1:
            base = (
                "Com base nas apresentações, formule UMA pergunta de síntese que "
                "force os agentes a confrontar suas perspectivas mais divergentes."
            )
        else:
            base = (
                "Identifique a principal tensão que emergiu do debate e formule "
                "UMA pergunta final que aponte para a síntese ou resolução dessa tensão."
            )
        prompt = (
            f"Você é ARIA, mediadora da War Room do projeto '{self.project_name}'.\n\n"
            f"Transcrição:\n{transcript}\n\n{base}"
        )
        try:
            agent = await FacilitatorAgent.from_project_id(self.project_id, self.session)
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system="")

        response = ""
        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools([{"role": "user", "content": prompt}]):
                if isinstance(event, str):
                    response += event
        else:
            async for chunk in agent.stream([{"role": "user", "content": prompt}]):
                response += chunk
        return response

    async def _agent_speak(
        self, agent_name: str, prompt: str, act: int
    ) -> AsyncIterator[dict]:
        agent_type = _AGENT_NAME_MAP.get(agent_name, "facilitator")
        AgentCls = _AGENT_CLASS_MAP.get(agent_type, FacilitatorAgent)
        try:
            agent = await AgentCls.from_project_id(self.project_id, self.session)
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system="")

        full_text = ""
        messages = [{"role": "user", "content": prompt}]

        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools(messages):
                if isinstance(event, str):
                    full_text += event
                    yield {"event": "war_room_turn", "data": {
                        "speaker": agent_name, "agent_name": agent_name,
                        "text": event, "is_delta": True, "act": act,
                    }}
        else:
            async for chunk in agent.stream(messages):
                full_text += chunk
                yield {"event": "war_room_turn", "data": {
                    "speaker": agent_name, "agent_name": agent_name,
                    "text": chunk, "is_delta": True, "act": act,
                }}

        self._transcript.append({"speaker": agent_name, "text": full_text})

    def _transcript_text(self) -> str:
        return "\n".join(f"{t['speaker']}: {t['text'][:400]}" for t in self._transcript)
