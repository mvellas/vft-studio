"""WarRoomOrchestrator — 3-act structured debate between VFT agents."""
from __future__ import annotations

import logging
from typing import AsyncIterator

from anthropic import AsyncAnthropic
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent

logger = logging.getLogger(__name__)

# War room uses lightweight stateless agents — no DB context needed,
# the phase outputs are injected directly into each prompt.
_AGENT_SYSTEMS: dict[str, str] = {
    "FRAME": (
        "Você é FRAME, especialista em mapeamento de stakeholders e análise de poder "
        "no contexto do processo VFT (Value-Focused Thinking). Seja direto e analítico."
    ),
    "AXIOM": (
        "Você é AXIOM, especialista em elicitação de valores e hierarquia de objetivos "
        "no processo VFT. Seja rigoroso e socrático."
    ),
    "NOVA": (
        "Você é NOVA, especialista em análise de alternativas e matriz de consequências "
        "no processo VFT. Seja pragmático e orientado a decisão."
    ),
    "ANALYST": (
        "Você é ANALYST, especialista em análise documental e evidências no contexto VFT. "
        "Baseie-se em fatos e evidências concretas."
    ),
    "ARIA": (
        "Você é ARIA, facilitadora experiente do processo VFT. "
        "Sua função na War Room é mediar o debate, identificar tensões e sintetizar perspectivas. "
        "Seja concisa e precisa."
    ),
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
        self._client = AsyncAnthropic()

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "war_room_start", "data": {}}

        participants = [
            name for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]
            if name in self.phase_outputs and self.phase_outputs[name].strip()
        ]

        try:
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
                try:
                    async for event in self._agent_speak_safe(agent_name, act=1):
                        yield event
                except Exception as exc:
                    logger.warning("War room Act 1 — %s falhou: %s", agent_name, exc)
                    yield {"event": "war_room_turn", "data": {
                        "speaker": agent_name, "agent_name": agent_name,
                        "text": f"[{agent_name} não pôde responder neste turno]",
                        "is_delta": False, "act": 1,
                    }}

            # Act 2: Two debate rounds mediated by ARIA
            for round_num in range(1, 3):
                try:
                    aria_question = await self._aria_question(round_num)
                except Exception as exc:
                    logger.warning("War room ARIA question round %d falhou: %s", round_num, exc)
                    aria_question = "Com base nas perspectivas apresentadas, quais são as principais tensões a resolver?"

                yield {"event": "war_room_turn", "data": {
                    "speaker": "ARIA", "agent_name": "ARIA",
                    "text": aria_question, "is_delta": False, "act": 2,
                }}
                self._transcript.append({"speaker": "ARIA", "text": aria_question})

                for agent_name in participants:
                    try:
                        async for event in self._debate_speak_safe(agent_name, aria_question, round_num):
                            yield event
                    except Exception as exc:
                        logger.warning("War room Act 2 round %d — %s falhou: %s", round_num, agent_name, exc)
                        yield {"event": "war_room_turn", "data": {
                            "speaker": agent_name, "agent_name": agent_name,
                            "text": f"[{agent_name} não pôde responder neste turno]",
                            "is_delta": False, "act": 2,
                        }}

        except Exception as exc:
            logger.error("War room falhou inesperadamente: %s", exc)

        finally:
            # ALWAYS emit war_room_done — nunca deixar o pipeline pendurado
            yield {"event": "war_room_done", "data": {}}

    def get_transcript(self) -> str:
        return "\n\n".join(
            f"**{t['speaker']}:** {t['text']}" for t in self._transcript
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _agent_speak_safe(self, agent_name: str, act: int) -> AsyncIterator[dict]:
        """Act 1 presentation — agent summarises its own phase output."""
        phase_text = self.phase_outputs.get(agent_name, "")[:2000]
        prompt = (
            f"Você está na War Room do projeto '{self.project_name}'. "
            f"Apresente em 2-3 parágrafos seu principal achado da análise:\n\n{phase_text}"
        )
        full_text = ""
        async for chunk in self._stream_agent(agent_name, prompt):
            full_text += chunk
            yield {"event": "war_room_turn", "data": {
                "speaker": agent_name, "agent_name": agent_name,
                "text": chunk, "is_delta": True, "act": act,
            }}
        self._transcript.append({"speaker": agent_name, "text": full_text})

    async def _debate_speak_safe(
        self, agent_name: str, aria_question: str, round_num: int
    ) -> AsyncIterator[dict]:
        """Act 2 debate response."""
        transcript_snippet = self._transcript_text()
        phase_text = self.phase_outputs.get(agent_name, "")[:600]
        prompt = (
            f"War Room — projeto '{self.project_name}'. Rodada {round_num}.\n\n"
            f"Transcrição recente:\n{transcript_snippet}\n\n"
            f"Seu achado original (resumo):\n{phase_text}\n\n"
            f"Pergunta da ARIA: {aria_question}\n\n"
            "Responda em 2 parágrafos. Pode concordar, discordar ou complementar."
        )
        full_text = ""
        async for chunk in self._stream_agent(agent_name, prompt):
            full_text += chunk
            yield {"event": "war_room_turn", "data": {
                "speaker": agent_name, "agent_name": agent_name,
                "text": chunk, "is_delta": True, "act": 2,
            }}
        self._transcript.append({"speaker": agent_name, "text": full_text})

    async def _aria_question(self, round_num: int) -> str:
        """ARIA generates a synthesis question between rounds."""
        transcript = self._transcript_text()
        if round_num == 1:
            instruction = (
                "Com base nas apresentações, formule UMA pergunta de síntese concisa "
                "que force os agentes a confrontar suas perspectivas mais divergentes."
            )
        else:
            instruction = (
                "Identifique a principal tensão do debate e formule UMA pergunta final "
                "que aponte para a síntese ou resolução dessa tensão."
            )
        prompt = (
            f"Você é ARIA, mediadora da War Room do projeto '{self.project_name}'.\n\n"
            f"Transcrição:\n{transcript}\n\n{instruction}\n\n"
            "Responda com APENAS a pergunta, sem introdução."
        )
        response = ""
        async for chunk in self._stream_agent("ARIA", prompt):
            response += chunk
        return response

    async def _stream_agent(self, agent_name: str, prompt: str) -> AsyncIterator[str]:
        """Stream a single agent turn using a lightweight stateless BaseAgent."""
        system = _AGENT_SYSTEMS.get(agent_name, "Você é um especialista em VFT.")
        agent = BaseAgent(model="claude-sonnet-4-6", system=system)
        async for chunk in agent.stream([{"role": "user", "content": prompt}]):
            yield chunk

    def _transcript_text(self) -> str:
        """Return the last N turns of the transcript to keep prompts bounded."""
        recent = self._transcript[-6:]  # last 6 turns max
        return "\n".join(f"{t['speaker']}: {t['text'][:300]}" for t in recent)
