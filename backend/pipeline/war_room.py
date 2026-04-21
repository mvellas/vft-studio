"""WarRoomOrchestrator — debate estruturado entre especialistas e stakeholders."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import AsyncIterator

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


@dataclass
class ParticipantMemory:
    name: str
    kind: str
    role: str = ""
    latest_position: str = ""
    concerns: list[str] = field(default_factory=list)
    alliances: set[str] = field(default_factory=set)
    conflicts: set[str] = field(default_factory=set)
    turns: list[str] = field(default_factory=list)


class WarRoomOrchestrator:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        stakeholders: list[dict] | None,
        simulation_context: dict | None,
        session: AsyncSession,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.stakeholders = stakeholders or []
        self.simulation_context = simulation_context or {}
        self.session = session
        self._transcript: list[dict] = []
        self._memory: dict[str, ParticipantMemory] = {}

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "war_room_start", "data": {}}

        participants = self._build_participants()
        self._initialize_memory(participants)

        try:
            # Act 1: ARIA opens + each agent presents
            stakeholder_names = [p["name"] for p in participants if p["kind"] == "stakeholder"]
            stakeholder_suffix = ""
            if stakeholder_names:
                stakeholder_suffix = (
                    " Também ouviremos os stakeholders simulados: "
                    + ", ".join(stakeholder_names)
                    + "."
                )
            aria_open = (
                f"Bem-vindos à War Room do projeto '{self.project_name}'. "
                "Cada agente apresentará seu principal achado. "
                "Em seguida, debateremos as tensões e sínteses identificadas."
                + stakeholder_suffix
            )
            yield {"event": "war_room_turn", "data": {
                "speaker": "ARIA", "agent_name": "ARIA",
                "text": aria_open, "is_delta": False, "act": 1,
            }}
            self._transcript.append({"speaker": "ARIA", "text": aria_open})
            yield {"event": "war_room_turn_complete", "data": {
                "speaker": "ARIA",
                "agent_name": "ARIA",
                "text": aria_open,
                "act": 1,
            }}

            for participant in participants:
                speaker = participant["name"]
                try:
                    async for event in self._agent_speak_safe(participant, act=1):
                        yield event
                except Exception as exc:
                    logger.warning("War room Act 1 — %s falhou: %s", speaker, exc)
                    yield {"event": "war_room_turn", "data": {
                        "speaker": speaker, "agent_name": speaker,
                        "text": f"[{speaker} não pôde responder neste turno]",
                        "is_delta": False, "act": 1,
                    }}
                    yield {"event": "war_room_turn_complete", "data": {
                        "speaker": speaker,
                        "agent_name": speaker,
                        "text": f"[{speaker} não pôde responder neste turno]",
                        "act": 1,
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
                yield {"event": "war_room_turn_complete", "data": {
                    "speaker": "ARIA",
                    "agent_name": "ARIA",
                    "text": aria_question,
                    "act": 2,
                }}

                for participant in participants:
                    speaker = participant["name"]
                    try:
                        async for event in self._debate_speak_safe(participant, aria_question, round_num):
                            yield event
                    except Exception as exc:
                        logger.warning("War room Act 2 round %d — %s falhou: %s", round_num, speaker, exc)
                        yield {"event": "war_room_turn", "data": {
                            "speaker": speaker, "agent_name": speaker,
                            "text": f"[{speaker} não pôde responder neste turno]",
                            "is_delta": False, "act": 2,
                        }}
                        yield {"event": "war_room_turn_complete", "data": {
                            "speaker": speaker,
                            "agent_name": speaker,
                            "text": f"[{speaker} não pôde responder neste turno]",
                            "act": 2,
                        }}

            # Act 3: ARIA fecha com síntese social antes do relatório final
            try:
                aria_closing = await self._aria_closing_synthesis()
            except Exception as exc:
                logger.warning("War room closing synthesis falhou: %s", exc)
                aria_closing = (
                    "Síntese final: há tensões relevantes entre perspectivas técnicas e interesses dos stakeholders, "
                    "mas já existem pontos claros de convergência para orientar a recomendação final."
                )

            yield {"event": "war_room_turn", "data": {
                "speaker": "ARIA", "agent_name": "ARIA",
                "text": aria_closing, "is_delta": False, "act": 3,
            }}
            self._transcript.append({"speaker": "ARIA", "text": aria_closing})
            yield {"event": "war_room_turn_complete", "data": {
                "speaker": "ARIA",
                "agent_name": "ARIA",
                "text": aria_closing,
                "act": 3,
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

    def get_social_summary(self) -> str:
        return self._social_snapshot()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_participants(self) -> list[dict]:
        participants: list[dict] = []
        for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]:
            if name in self.phase_outputs and self.phase_outputs[name].strip():
                participants.append({"kind": "specialist", "name": name})
        simulation_participants = {
            item["name"]: item for item in self.simulation_context.get("participants", [])
            if isinstance(item, dict) and item.get("name")
        }
        for stakeholder in self.stakeholders:
            merged = {**simulation_participants.get(stakeholder["name"], {}), **stakeholder}
            participants.append({"kind": "stakeholder", **merged})
        return participants

    def _initialize_memory(self, participants: list[dict]) -> None:
        for participant in participants:
            memory = ParticipantMemory(
                name=participant["name"],
                kind=participant["kind"],
                role=participant.get("role", ""),
                latest_position=participant.get("latest_position", ""),
                concerns=list(participant.get("concerns", [])),
                alliances=set(participant.get("alliances", [])),
                conflicts=set(participant.get("conflicts", [])),
                turns=[entry.get("position", "") for entry in participant.get("trajectory", []) if isinstance(entry, dict)],
            )
            self._memory[participant["name"]] = memory

    async def _agent_speak_safe(self, participant: dict, act: int) -> AsyncIterator[dict]:
        """Act 1 presentation — agent summarises its own phase output."""
        speaker = participant["name"]
        if participant["kind"] == "stakeholder":
            prompt = self._stakeholder_opening_prompt(participant)
        else:
            phase_text = self.phase_outputs.get(speaker, "")[:2000]
            prompt = (
                f"Você está na War Room do projeto '{self.project_name}'. "
                f"Apresente em 2-3 parágrafos seu principal achado da análise:\n\n{phase_text}"
            )
        full_text = ""
        async for chunk in self._stream_agent(participant, prompt):
            full_text += chunk
            yield {"event": "war_room_turn", "data": {
                "speaker": speaker, "agent_name": speaker,
                "text": chunk, "is_delta": True, "act": act,
            }}
        self._transcript.append({"speaker": speaker, "text": full_text})
        self._remember_turn(speaker, full_text)
        yield {"event": "war_room_turn_complete", "data": {
            "speaker": speaker,
            "agent_name": speaker,
            "text": full_text,
            "act": act,
        }}

    async def _debate_speak_safe(
        self, participant: dict, aria_question: str, round_num: int
    ) -> AsyncIterator[dict]:
        """Act 2 debate response."""
        speaker = participant["name"]
        transcript_snippet = self._transcript_text()
        if participant["kind"] == "stakeholder":
            prompt = self._stakeholder_debate_prompt(participant, aria_question, transcript_snippet, round_num)
        else:
            phase_text = self.phase_outputs.get(speaker, "")[:600]
            prompt = (
                f"War Room — projeto '{self.project_name}'. Rodada {round_num}.\n\n"
                f"Transcrição recente:\n{transcript_snippet}\n\n"
                f"Seu achado original (resumo):\n{phase_text}\n\n"
                f"Pergunta da ARIA: {aria_question}\n\n"
                "Responda em 2 parágrafos. Pode concordar, discordar ou complementar."
            )
        full_text = ""
        async for chunk in self._stream_agent(participant, prompt):
            full_text += chunk
            yield {"event": "war_room_turn", "data": {
                "speaker": speaker, "agent_name": speaker,
                "text": chunk, "is_delta": True, "act": 2,
            }}
        self._transcript.append({"speaker": speaker, "text": full_text})
        self._remember_turn(speaker, full_text)
        yield {"event": "war_room_turn_complete", "data": {
            "speaker": speaker,
            "agent_name": speaker,
            "text": full_text,
            "act": 2,
        }}

    async def _aria_question(self, round_num: int) -> str:
        """ARIA generates a synthesis question between rounds."""
        transcript = self._transcript_text()
        social_snapshot = self._social_snapshot()
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
            f"Transcrição:\n{transcript}\n\n"
            f"Mapa social atual:\n{social_snapshot}\n\n"
            f"{instruction}\n\n"
            "Responda com APENAS a pergunta, sem introdução."
        )
        response = ""
        async for chunk in self._stream_agent({"kind": "specialist", "name": "ARIA"}, prompt):
            response += chunk
        return response

    async def _stream_agent(self, participant: dict, prompt: str) -> AsyncIterator[str]:
        """Stream a single agent turn using a lightweight stateless BaseAgent."""
        if participant["kind"] == "stakeholder":
            system = self._stakeholder_system(participant)
        else:
            system = _AGENT_SYSTEMS.get(participant["name"], "Você é um especialista em VFT.")
        agent = BaseAgent(model="claude-sonnet-4-6", system=system)
        async for chunk in agent.stream([{"role": "user", "content": prompt}]):
            yield chunk

    def _transcript_text(self) -> str:
        """Return the last N turns of the transcript to keep prompts bounded."""
        recent = self._transcript[-6:]  # last 6 turns max
        return "\n".join(f"{t['speaker']}: {t['text'][:300]}" for t in recent)

    def _stakeholder_system(self, participant: dict) -> str:
        return (
            f"Você é {participant['name']}, um stakeholder do projeto '{self.project_name}'. "
            f"Seu papel é: {participant.get('role', 'stakeholder')}. "
            f"Perfil: {participant.get('profile', '(não especificado)')}. "
            f"Interesses e preocupações: {participant.get('interests', '(não especificados)')}. "
            f"Coalizão atual: {participant.get('coalition_tag', '(sem coalizão definida)')}. "
            f"Último voto registrado: {participant.get('vote', {}).get('choice', '(sem voto)')}. "
            "Responda em primeira pessoa, com linguagem clara, prática e coerente com seus interesses. "
            "Você não é um especialista neutro; você representa sua própria perspectiva."
        )

    def _stakeholder_opening_prompt(self, participant: dict) -> str:
        phase_context = self._phase_context_excerpt()
        return (
            f"Você está entrando na War Room do projeto '{self.project_name}'.\n\n"
            f"Resumo técnico do caso:\n{phase_context}\n\n"
            "Apresente em 2 parágrafos como esta situação afeta você, o que mais importa para sua perspectiva "
            "e qual tensão você enxerga nas análises feitas até aqui."
        )

    def _stakeholder_debate_prompt(
        self,
        participant: dict,
        aria_question: str,
        transcript_snippet: str,
        round_num: int,
    ) -> str:
        phase_context = self._phase_context_excerpt()
        personal_memory = self._participant_memory_text(participant["name"])
        tension_map = self._tension_map_for(participant["name"])
        return (
            f"War Room — projeto '{self.project_name}'. Rodada {round_num}.\n\n"
            f"Resumo técnico do caso:\n{phase_context}\n\n"
            f"Sua memória social acumulada:\n{personal_memory}\n\n"
            f"Tensões e alinhamentos percebidos:\n{tension_map}\n\n"
            f"Transcrição recente:\n{transcript_snippet}\n\n"
            f"Pergunta da ARIA: {aria_question}\n\n"
            "Responda em 2 parágrafos a partir da sua posição de stakeholder. "
            "Você pode concordar, discordar, pedir salvaguardas ou evidenciar riscos."
        )

    def _phase_context_excerpt(self) -> str:
        parts: list[str] = []
        for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]:
            content = self.phase_outputs.get(name, "").strip()
            if content:
                parts.append(f"{name}: {content[:500]}")
        coalitions = self.simulation_context.get("coalitions", [])
        votes = self.simulation_context.get("votes", {})
        if coalitions:
            parts.append(f"Coalizões simuladas: {coalitions}")
        if votes:
            parts.append(f"Resumo de votos prévios: {votes}")
        return "\n\n".join(parts) if parts else "(sem contexto técnico disponível)"

    def _remember_turn(self, speaker: str, text: str) -> None:
        memory = self._memory.get(speaker)
        if not memory:
            return
        compact = " ".join(text.split())
        if compact:
            memory.latest_position = compact[:280]
            memory.turns.append(compact[:280])

        lower = compact.lower()
        concern_terms = ["risco", "custo", "prazo", "segurança", "impacto", "viabilidade", "governança", "conflito"]
        for term in concern_terms:
            if term in lower and term not in memory.concerns:
                memory.concerns.append(term)

        for other_name, other_memory in self._memory.items():
            if other_name == speaker:
                continue
            marker = other_name.lower()
            if marker in lower and any(token in lower for token in ["concord", "alinh", "apoio", "converg"]):
                memory.alliances.add(other_name)
                other_memory.alliances.add(speaker)
            if marker in lower and any(token in lower for token in ["discord", "diverg", "tensão", "oposição", "conflit"]):
                memory.conflicts.add(other_name)
                other_memory.conflicts.add(speaker)

    def _participant_memory_text(self, name: str) -> str:
        memory = self._memory.get(name)
        if not memory:
            return "(sem memória acumulada)"

        concerns = ", ".join(memory.concerns[:4]) if memory.concerns else "nenhuma preocupação explícita ainda"
        alliances = ", ".join(sorted(memory.alliances)) if memory.alliances else "nenhum alinhamento explícito"
        conflicts = ", ".join(sorted(memory.conflicts)) if memory.conflicts else "nenhum conflito explícito"
        latest = memory.latest_position or "sem posição registrada"
        return (
            f"Última posição: {latest}\n"
            f"Preocupações: {concerns}\n"
            f"Alinhamentos: {alliances}\n"
            f"Conflitos: {conflicts}"
        )

    def _social_snapshot(self) -> str:
        lines: list[str] = []
        for memory in self._memory.values():
            concerns = ", ".join(memory.concerns[:3]) if memory.concerns else "sem preocupação dominante"
            alliances = ", ".join(sorted(memory.alliances)) if memory.alliances else "sem alianças claras"
            conflicts = ", ".join(sorted(memory.conflicts)) if memory.conflicts else "sem conflitos claros"
            latest = memory.latest_position or "sem fala registrada"
            lines.append(
                f"- {memory.name} ({memory.kind}/{memory.role or 'n/a'}): {latest}. "
                f"Preocupações: {concerns}. Alinhamentos: {alliances}. Conflitos: {conflicts}."
            )
        return "\n".join(lines) if lines else "(sem mapa social disponível)"

    def _tension_map_for(self, name: str) -> str:
        memory = self._memory.get(name)
        if not memory:
            return "(sem tensões registradas)"
        allies = ", ".join(sorted(memory.alliances)) if memory.alliances else "ninguém explicitamente"
        conflicts = ", ".join(sorted(memory.conflicts)) if memory.conflicts else "ninguém explicitamente"
        return f"Aliados percebidos: {allies}. Fontes de tensão: {conflicts}."

    async def _aria_closing_synthesis(self) -> str:
        transcript = self._transcript_text()
        social_snapshot = self._social_snapshot()
        prompt = (
            f"Você é ARIA, facilitadora da War Room do projeto '{self.project_name}'.\n\n"
            f"Transcrição recente:\n{transcript}\n\n"
            f"Mapa social consolidado:\n{social_snapshot}\n\n"
            "Escreva uma síntese final em 2 parágrafos curtos. "
            "O primeiro deve destacar convergências e o segundo deve destacar tensões ainda abertas."
        )
        response = ""
        async for chunk in self._stream_agent({"kind": "specialist", "name": "ARIA"}, prompt):
            response += chunk
        return response
