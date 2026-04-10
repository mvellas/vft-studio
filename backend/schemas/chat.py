"""Pydantic schemas for the chat API."""

from pydantic import BaseModel, ConfigDict


class ChatMessageRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    message: str
    project_id: str
    agent_type: str = "facilitator"  # facilitator, phase1_specialist, phase2_specialist, stakeholder_simulation, etc.
    context: dict = {}
    stakeholder_id: str | None = None


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)
    id: str
    session_id: str
    project_id: str
    role: str
    agent_name: str
    content: str
    timestamp: str
    phase: int | None = None
    step: str | None = None
