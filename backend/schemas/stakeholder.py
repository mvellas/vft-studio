"""Pydantic v2 frozen schemas for Stakeholder CRUD."""

from pydantic import BaseModel, ConfigDict


class StakeholderCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    role: str  # 'decision_authority'|'customer'|'owner'|'user'|'consumer'
    is_decision_maker: int = 0
    profile: str = ""
    interests: str = ""
    elicitation_mode: str = "interview"


class StakeholderUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str | None = None
    role: str | None = None
    is_decision_maker: int | None = None
    profile: str | None = None
    interests: str | None = None
    elicitation_mode: str | None = None
    interview_status: str | None = None
    interview_notes: str | None = None
    order_index: int | None = None


class StakeholderResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    project_id: str
    name: str
    role: str
    is_decision_maker: int
    profile: str
    interests: str
    elicitation_mode: str
    interview_status: str
    interview_notes: str
    order_index: int
    created_at: str
    updated_at: str
