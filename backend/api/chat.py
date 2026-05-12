"""
backend/api/chat.py
===================
SSE streaming chat endpoint. POST /api/chat/message returns a Server-Sent
Events stream with 'delta' events for each token and a 'done' event when
complete. Both user and assistant messages are persisted to the database.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

import uuid

from backend.db.base import get_session
from backend.db.models import ChatMessage, ChatSession
from backend.db.repository import BaseRepository
from backend.schemas.chat import ChatMessageRequest, ChatMessageResponse
from backend.agents.base_agent import AIServiceError, BaseAgent, ToolAwareAgent, ToolUseEvent, ToolResultEvent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.facilitator import FacilitatorAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.phase3_specialist import Phase3SpecialistAgent
from backend.agents.stakeholder_agent import StakeholderSimulationAgent
from backend.agents.analyst_agent import AnalystAgent
from backend.agents.router_agent import RouterAgent

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
    "phase3_specialist": {
        "model": "claude-sonnet-4-6",
        "name": "NOVA",
        "system": "",  # dynamically loaded from DB via Phase3SpecialistAgent.from_project_id
    },
    "stakeholder_simulation": {
        "model": "claude-sonnet-4-6",
        "name": "",  # name set dynamically from stakeholder record
        "system": "",  # dynamically loaded from DB via StakeholderSimulationAgent.from_stakeholder_id
    },
    "analyst": {
        "model": "claude-sonnet-4-6",
        "name": "ANALYST",
        "system": "",  # dynamically loaded from DB
    },
}


@router.post("/chat/message", response_class=EventSourceResponse)
async def chat_message(
    body: ChatMessageRequest,
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    # Resolve agent via RouterAgent when agent_type is "auto"
    resolved_agent_type = body.agent_type
    if body.agent_type in ("auto", "", None):
        router = RouterAgent()
        phase = body.phase or 1
        history_result = await session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == body.project_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(6)
        )
        recent_rows = list(reversed(history_result.scalars().all()))
        recent_turns = [
            {"role": "user" if m.role == "user" else "assistant", "content": m.content}
            for m in recent_rows
        ]
        resolved_agent_type = await router.invoke(
            phase=phase,
            recent_turns=recent_turns,
            user_message=body.message,
        )

    config = AGENT_CONFIGS.get(resolved_agent_type, AGENT_CONFIGS["facilitator"])

    # Route to context-aware agents loaded from DB
    if resolved_agent_type == "facilitator":
        try:
            agent = await FacilitatorAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif resolved_agent_type == "phase1_specialist":
        try:
            agent = await Phase1SpecialistAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif resolved_agent_type == "phase2_specialist":
        try:
            agent = await Phase2SpecialistAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif resolved_agent_type == "phase3_specialist":
        try:
            agent = await Phase3SpecialistAgent.from_project_id(
                body.project_id, session, model=config["model"]
            )
        except ValueError:
            agent = BaseAgent(model=config["model"], system=config["system"])
    elif resolved_agent_type == "stakeholder_simulation" and body.stakeholder_id:
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
            if isinstance(agent, ToolAwareAgent):
                async for event in agent.stream_with_tools(messages):
                    if isinstance(event, ToolUseEvent):
                        data = json.dumps({"name": event.name, "query": event.input.get("query", "")})
                        yield ServerSentEvent(data=data, event="tool_use")
                    elif isinstance(event, ToolResultEvent):
                        data = json.dumps({"name": event.name, **event.metadata})
                        yield ServerSentEvent(data=data, event="tool_result")
                    else:  # str
                        full_response += event
                        yield ServerSentEvent(data=event, event="delta")
            else:
                async for chunk in agent.stream(messages):
                    full_response += chunk
                    yield ServerSentEvent(data=chunk, event="delta")
        except AIServiceError as exc:
            yield ServerSentEvent(data=exc.user_message, event="error")
            return
        except Exception:
            yield ServerSentEvent(
                data="Falha inesperada ao falar com a IA. Tente novamente em instantes.",
                event="error",
            )
            return

        await msg_repo.create(
            session_id=chat_session.id,
            project_id=body.project_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            role=resolved_agent_type,
            agent_name=config["name"],
            content=full_response,
        )
        await session.commit()

        yield ServerSentEvent(
            data=json.dumps({"agent_type": resolved_agent_type, "agent_name": config["name"]}),
            event="done",
        )

    return EventSourceResponse(generate())


@router.get("/chat/history", response_model=list[ChatMessageResponse])
async def chat_history(
    project_id: str = Query(...),
    agent_type: str = Query(default="facilitator"),
    limit: int = Query(default=50, le=200),
    session: AsyncSession = Depends(get_session),
) -> list[ChatMessageResponse]:
    """Return the last N chat messages for a project/agent combination."""
    config = AGENT_CONFIGS.get(agent_type, AGENT_CONFIGS["facilitator"])
    agent_name = config["name"]

    # Load messages: user messages + messages from this agent
    result = await session.execute(
        select(ChatMessage)
        .where(
            ChatMessage.project_id == project_id,
            # Include user messages and this agent's messages
        )
        .order_by(ChatMessage.timestamp.desc())
        .limit(limit * 2)  # fetch extra to filter
    )
    all_messages = result.scalars().all()

    # Filter to messages belonging to this agent conversation
    filtered = [
        m for m in all_messages
        if m.role == "user" or m.agent_name == agent_name
    ][:limit]

    # Return in chronological order
    filtered.reverse()

    return [ChatMessageResponse.model_validate(m) for m in filtered]


@router.delete("/chat/history", status_code=204)
async def clear_chat_history(
    project_id: str = Query(...),
    agent_type: str = Query(default="facilitator"),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete all chat messages for a project/agent combination."""
    config = AGENT_CONFIGS.get(agent_type, AGENT_CONFIGS["facilitator"])
    agent_name = config["name"]

    await session.execute(
        delete(ChatMessage).where(
            ChatMessage.project_id == project_id,
            ChatMessage.agent_name.in_([agent_name, "User"]),
        )
    )
    await session.commit()
