"""Pydantic schemas for the chat API."""

from pydantic import BaseModel, ConfigDict


class ChatMessageRequest(BaseModel):
    model_config = ConfigDict(frozen=True)
    message: str
    project_id: str
    agent_type: str = "facilitator"  # facilitator, phase1_specialist, etc.
    context: dict = {}


class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(frozen=True)
    id: str
    role: str
    agent_name: str
    content: str
    timestamp: str
