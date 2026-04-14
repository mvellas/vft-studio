"""RouterAgent — lightweight Haiku agent that picks which agent should respond."""
from __future__ import annotations

import asyncio
import json

import anthropic


_MENTION_MAP = {
    "@ARIA": "facilitator",
    "@FRAME": "phase1_specialist",
    "@AXIOM": "phase2_specialist",
    "@NOVA": "phase3_specialist",
    "@ANALYST": "analyst",
}

_SYSTEM = """You are a routing agent. Given a project phase and a user message, decide which agent should respond.
Return ONLY valid JSON: {"agent_type": "<agent>"} — no other text.

Rules:
- phase 1 or mentions stakeholders → phase1_specialist
- phase 2 or mentions values/objectives/WITI → phase2_specialist
- phase 3 or mentions alternatives/trade-offs → phase3_specialist
- mentions documents/sources/evidence → analyst
- default / facilitation / general questions → facilitator
"""


class RouterAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic()

    async def invoke(
        self,
        phase: int,
        recent_turns: list[dict],
        user_message: str,
    ) -> str:
        # @mention override — no API call needed
        for mention, agent_type in _MENTION_MAP.items():
            if mention in user_message:
                return agent_type

        context = "\n".join(
            f"{t['role']}: {t['content'][:120]}" for t in recent_turns[-3:]
        )
        user_content = (
            f"Current phase: {phase}\n"
            f"Recent conversation:\n{context}\n"
            f"User message: {user_message}"
        )

        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=64,
                system=_SYSTEM,
                messages=[{"role": "user", "content": user_content}],
            ),
        )

        text = response.content[0].text.strip()
        try:
            data = json.loads(text)
            return data.get("agent_type", "facilitator")
        except (json.JSONDecodeError, AttributeError):
            return "facilitator"
