"""Pydantic v2 frozen schemas for Phase Engine API responses."""

from pydantic import BaseModel, ConfigDict


class StepConfigResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    phase: int
    name: str
    description: str
    why: str
    how: str
    reference: str
    form_type: str
    requires_ai: bool


class CurrentStepResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    step: StepConfigResponse
    completed_steps: list[str]
    total_steps: int
    progress_percent: float


class StepCompleteRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    data: dict = {}
    notes: str = ""


class StepCompleteResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    completed_step_id: str
    next_step: StepConfigResponse | None
    can_proceed: bool


class StepOverviewItem(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    phase: int
    name: str
    form_type: str
    is_conditional: bool
    requires_ai: bool
    is_completed: bool
    is_current: bool
