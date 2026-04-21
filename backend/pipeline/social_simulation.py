"""SocialSimulationEngine — persistent social dynamics before the War Room."""
from __future__ import annotations

import json
import re
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import SocialParticipantMemory, SocialSimulationRun


@dataclass
class SimulationState:
    participant_name: str
    participant_kind: str
    stakeholder_id: str | None = None
    role: str = ""
    profile: str = ""
    interests: str = ""
    latest_position: str = ""
    stance_score: int = 0
    coalition_tag: str = ""
    concerns: list[str] = field(default_factory=list)
    alliances: set[str] = field(default_factory=set)
    conflicts: set[str] = field(default_factory=set)
    vote: dict = field(default_factory=dict)
    trajectory: list[dict] = field(default_factory=list)


class SocialSimulationEngine:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        stakeholders: list[dict],
        session: AsyncSession,
        pipeline_run_id: str | None = None,
        rounds: int = 2,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.stakeholders = stakeholders
        self.session = session
        self.pipeline_run_id = pipeline_run_id
        self.rounds = rounds
        self._states: dict[str, SimulationState] = {}
        self._events: list[dict] = []

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "simulation_start", "data": {"rounds": self.rounds}}
        await self._load_memory()
        self._seed_states()

        for round_num in range(1, self.rounds + 1):
            for state in self._states.values():
                update = await self._simulate_round_for_state(state, round_num)
                self._apply_update(state, update, round_num)

            coalition_summary = self._compute_coalitions()
            voting_summary = self._compute_voting_summary()
            payload = {
                "round": round_num,
                "participants_count": len(self._states),
                "coalitions": coalition_summary,
                "votes": voting_summary,
                "top_conflicts": self._top_conflicts(),
            }
            self._events.append(payload)
            yield {"event": "simulation_round_complete", "data": payload}

        await self._persist_memory()
        yield {"event": "simulation_done", "data": self.snapshot()}

    def snapshot(self) -> dict:
        coalition_summary = self._compute_coalitions()
        return {
            "participants": [
                {
                    "name": state.participant_name,
                    "kind": state.participant_kind,
                    "role": state.role,
                    "latest_position": state.latest_position,
                    "stance_score": state.stance_score,
                    "coalition_tag": state.coalition_tag,
                    "concerns": list(state.concerns),
                    "alliances": sorted(state.alliances),
                    "conflicts": sorted(state.conflicts),
                    "vote": state.vote,
                    "trajectory": list(state.trajectory),
                }
                for state in self._states.values()
            ],
            "coalitions": coalition_summary,
            "votes": self._compute_voting_summary(),
            "top_conflicts": self._top_conflicts(),
            "events": list(self._events),
        }

    async def _load_memory(self) -> None:
        result = await self.session.execute(
            select(SocialParticipantMemory).where(SocialParticipantMemory.project_id == self.project_id)
        )
        for row in result.scalars().all():
            self._states[row.participant_name] = SimulationState(
                participant_name=row.participant_name,
                participant_kind=row.participant_kind,
                stakeholder_id=row.stakeholder_id,
                latest_position=row.latest_position,
                stance_score=row.stance_score,
                coalition_tag=row.coalition_tag,
                concerns=self._loads_list(row.concerns_json),
                alliances=set(self._loads_list(row.alliances_json)),
                conflicts=set(self._loads_list(row.conflicts_json)),
                vote=self._loads_dict(row.vote_json),
                trajectory=self._loads_list(row.trajectory_json),
            )

    def _seed_states(self) -> None:
        for stakeholder in self.stakeholders:
            existing = self._states.get(stakeholder["name"])
            if existing:
                existing.role = stakeholder.get("role", existing.role)
                existing.profile = stakeholder.get("profile", existing.profile)
                existing.interests = stakeholder.get("interests", existing.interests)
                existing.stakeholder_id = stakeholder.get("id")
                continue
            self._states[stakeholder["name"]] = SimulationState(
                participant_name=stakeholder["name"],
                participant_kind="stakeholder",
                stakeholder_id=stakeholder.get("id"),
                role=stakeholder.get("role", ""),
                profile=stakeholder.get("profile", ""),
                interests=stakeholder.get("interests", ""),
            )

    async def _simulate_round_for_state(self, state: SimulationState, round_num: int) -> dict:
        prompt = (
            f"Projeto: {self.project_name}\n"
            f"Rodada de simulação: {round_num}\n"
            f"Memória anterior: {state.latest_position or '(sem posição)'}\n"
            f"Interesses: {state.interests or '(não informados)'}\n"
            f"Contexto técnico:\n{self._phase_context_excerpt()}\n\n"
            "Responda neste formato exato:\n"
            "POSITION: <posição resumida>\n"
            "STANCE: <-2 a 2>\n"
            "ALLIES: <nomes separados por vírgula>\n"
            "CONFLICTS: <nomes separados por vírgula>\n"
            "CONCERNS: <preocupações separadas por vírgula>\n"
            "VOTE: <approve|approve_with_conditions|delay|reject>\n"
            "RATIONALE: <uma frase curta>"
        )
        system = (
            f"Você é {state.participant_name}, participante de uma simulação social persistente. "
            f"Seu papel é {state.role or 'stakeholder'}. "
            f"Perfil: {state.profile or '(não informado)'}. "
            "Responda de forma consistente com sua memória anterior e seus interesses."
        )
        agent = BaseAgent(model="claude-sonnet-4-6", system=system)
        raw = ""
        async for chunk in agent.stream([{"role": "user", "content": prompt}]):
            raw += chunk
        return self._parse_response(raw)

    def _apply_update(self, state: SimulationState, update: dict, round_num: int) -> None:
        stance_delta = max(-2, min(2, int(update.get("stance", 0))))
        state.stance_score = max(-10, min(10, state.stance_score + stance_delta))
        state.latest_position = update.get("position", state.latest_position)
        state.concerns = self._merge_unique(state.concerns, update.get("concerns", []))
        state.alliances.update(update.get("allies", []))
        state.conflicts.update(update.get("conflicts", []))
        state.vote = {
            "choice": update.get("vote", "approve_with_conditions"),
            "rationale": update.get("rationale", ""),
            "round": round_num,
        }
        state.trajectory.append({
            "round": round_num,
            "position": state.latest_position,
            "stance_score": state.stance_score,
            "vote": state.vote.get("choice", ""),
        })

    def _compute_coalitions(self) -> list[dict]:
        coalition_map: dict[str, list[str]] = {}
        for state in self._states.values():
            group = sorted([state.participant_name, *state.alliances])[:3]
            tag = "solo" if len(group) == 1 else "+".join(group[:2])
            state.coalition_tag = tag
            coalition_map.setdefault(tag, []).append(state.participant_name)
        return [
            {"tag": tag, "members": sorted(set(members))}
            for tag, members in coalition_map.items()
        ]

    def _compute_voting_summary(self) -> dict[str, int]:
        counts = {
            "approve": 0,
            "approve_with_conditions": 0,
            "delay": 0,
            "reject": 0,
        }
        for state in self._states.values():
            choice = state.vote.get("choice", "approve_with_conditions")
            counts[choice] = counts.get(choice, 0) + 1
        return counts

    def _top_conflicts(self) -> list[str]:
        conflicts: set[str] = set()
        for state in self._states.values():
            for other in state.conflicts:
                pair = " vs ".join(sorted([state.participant_name, other]))
                conflicts.add(pair)
        return sorted(conflicts)[:5]

    async def _persist_memory(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        result = await self.session.execute(
            select(SocialParticipantMemory).where(SocialParticipantMemory.project_id == self.project_id)
        )
        existing = {row.participant_name: row for row in result.scalars().all()}
        for state in self._states.values():
            row = existing.get(state.participant_name)
            if row is None:
                row = SocialParticipantMemory(
                    id=str(uuid.uuid4()),
                    project_id=self.project_id,
                    stakeholder_id=state.stakeholder_id,
                    participant_name=state.participant_name,
                    participant_kind=state.participant_kind,
                    updated_at=now,
                )
                self.session.add(row)
            row.stakeholder_id = state.stakeholder_id
            row.participant_kind = state.participant_kind
            row.latest_position = state.latest_position
            row.stance_score = state.stance_score
            row.coalition_tag = state.coalition_tag
            row.concerns_json = json.dumps(state.concerns, ensure_ascii=True)
            row.alliances_json = json.dumps(sorted(state.alliances), ensure_ascii=True)
            row.conflicts_json = json.dumps(sorted(state.conflicts), ensure_ascii=True)
            row.vote_json = json.dumps(state.vote, ensure_ascii=True)
            row.trajectory_json = json.dumps(state.trajectory, ensure_ascii=True)
            row.updated_at = now

        run = SocialSimulationRun(
            id=str(uuid.uuid4()),
            project_id=self.project_id,
            pipeline_run_id=self.pipeline_run_id,
            rounds_count=self.rounds,
            summary_json=json.dumps(self.snapshot(), ensure_ascii=True),
            created_at=now,
        )
        self.session.add(run)
        await self.session.commit()

    def _parse_response(self, raw: str) -> dict:
        return {
            "position": self._extract_line(raw, "POSITION") or "Precisa de salvaguardas adicionais antes de convergir.",
            "stance": self._parse_int(self._extract_line(raw, "STANCE"), default=0),
            "allies": self._split_csv(self._extract_line(raw, "ALLIES")),
            "conflicts": self._split_csv(self._extract_line(raw, "CONFLICTS")),
            "concerns": self._split_csv(self._extract_line(raw, "CONCERNS")),
            "vote": (self._extract_line(raw, "VOTE") or "approve_with_conditions").strip().lower(),
            "rationale": self._extract_line(raw, "RATIONALE") or "",
        }

    def _phase_context_excerpt(self) -> str:
        parts: list[str] = []
        for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]:
            content = self.phase_outputs.get(name, "").strip()
            if content:
                parts.append(f"{name}: {content[:400]}")
        return "\n\n".join(parts) if parts else "(sem contexto técnico)"

    @staticmethod
    def _extract_line(raw: str, label: str) -> str:
        match = re.search(rf"{label}:\s*(.+)", raw, flags=re.IGNORECASE)
        return match.group(1).strip() if match else ""

    @staticmethod
    def _split_csv(value: str) -> list[str]:
        if not value:
            return []
        return [item.strip() for item in value.split(",") if item.strip() and item.strip().lower() != "none"]

    @staticmethod
    def _parse_int(value: str, default: int = 0) -> int:
        try:
            return int(value)
        except Exception:
            return default

    @staticmethod
    def _loads_list(value: str) -> list:
        try:
            data = json.loads(value or "[]")
            return data if isinstance(data, list) else []
        except Exception:
            return []

    @staticmethod
    def _loads_dict(value: str) -> dict:
        try:
            data = json.loads(value or "{}")
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    @staticmethod
    def _merge_unique(current: list[str], incoming: list[str]) -> list[str]:
        merged = list(current)
        for item in incoming:
            if item not in merged:
                merged.append(item)
        return merged
