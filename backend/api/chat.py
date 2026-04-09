"""
backend/api/chat.py
===================
SSE streaming chat endpoint. POST /api/chat/message returns a Server-Sent
Events stream with 'delta' events for each token and a 'done' event when
complete. Both user and assistant messages are persisted to the database.
"""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy.ext.asyncio import AsyncSession

import uuid

from backend.db.base import get_session
from backend.db.models import ChatMessage, ChatSession
from backend.db.repository import BaseRepository
from backend.schemas.chat import ChatMessageRequest
from backend.agents.base_agent import BaseAgent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.stakeholder_agent import StakeholderSimulationAgent

router = APIRouter(tags=["chat"])

AGENT_CONFIGS: dict[str, dict] = {
    "facilitator": {
        "model": "claude-sonnet-4-6",
        "name": "ARIA",
        "system": (
            "You are ARIA, a VFT (Value-Focused Thinking) facilitator. "
            "Help the user navigate the VFT process. "
            "Respond in Portuguese (PT-BR)."
        ),
    },
    "phase1_specialist": {
        "model": "claude-sonnet-4-6",
        "name": "FRAME",
        "system": "",  # dynamically loaded from DB via Phase1SpecialistAgent.from_project_id
    },
    "phase2_specialist": {
        "model": "claude-opus-4-6",
        "name": "AXIOM",
        "system": "",  # dynamically loaded from DB via Phase2SpecialistAgent.from_project_id
    },
    "stakeholder_simulation": {
        "model": "claude-sonnet-4-6",
        "name": "",  # name set dynamically from stakeholder record
        "system": "",  # dynamically loaded from DB via StakeholderSimulationAgent.from_stakeholder_id
    },
}


@router.post("/chat/message", response_class=EventSourceResponse)
async def chat_message(
    body: ChatMessageRequest,
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    config = AGENT_CONFIGS.get(body.agent_type, AGENT_CONFIGS["facilitator"])

    # Route to context-aware agents loaded from DB
    if body.agent_type == "phase1_specialist":
        try:
            agent = await Phase1SpecialistAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif body.agent_type == "phase2_specialist":
        try:
            agent = await Phase2SpecialistAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif body.agent_type == "stakeholder_simulation" and body.stakeholder_id:
        try:
            agent = await StakeholderSimulationAgent.from_stakeholder_id(
                body.stakeholder_id, body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    else:
        agent = BaseAgent(model=config["model"], system=config["system"])

    msg_repo: BaseRepository[ChatMessage] = BaseRepository(ChatMessage, session)
    session_repo: BaseRepository[ChatSession] = BaseRepository(ChatSession, session)

    # Get or create active chat session
    # Note: ChatSession lacks updated_at, so we create it directly instead of
    # using session_repo.create() which auto-injects updated_at.
    sessions = await session_repo.list(project_id=body.project_id, is_active=1)
    if sessions:
        chat_session = sessions[0]
    else:
        now = datetime.now(timezone.utc).isoformat()
        chat_session = ChatSession(
            id=str(uuid.uuid4()),
            project_id=body.project_id,
            created_at=now,
            is_active=1,
        )
        session.add(chat_session)
        await session.flush()
        await session.refresh(chat_session)

    # Persist user message
    await msg_repo.create(
        session_id=chat_session.id,
        project_id=body.project_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        role="user",
        agent_name="User",
        content=body.message,
    )

    messages = [{"role": "user", "content": body.message}]

    async def generate():
        full_response = ""
        try:
            async for chunk in agent.stream(messages):
                full_response += chunk
                yield ServerSentEvent(data=chunk, event="delta")
        except Exception as exc:
            yield ServerSentEvent(data=str(exc), event="error")
            return

        # Persist assistant message
        await msg_repo.create(
            session_id=chat_session.id,
            project_id=body.project_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            role=body.agent_type,
            agent_name=config["name"],
            content=full_response,
        )
        await session.commit()

        yield ServerSentEvent(data="[DONE]", event="done")

    return EventSourceResponse(generate())
