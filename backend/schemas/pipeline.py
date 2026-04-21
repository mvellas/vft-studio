from __future__ import annotations
from typing import Any

from pydantic import BaseModel, Field


class PipelineRunRequest(BaseModel):
    project_id: str
    problem_description: str | None = None


class PipelineRunResponse(BaseModel):
    id: str
    project_id: str
    status: str
    report_md: str
    created_at: str
    completed_at: str | None

    model_config = {"from_attributes": True}


class PipelineTurnResponse(BaseModel):
    id: str
    run_id: str
    agent_name: str
    phase_label: str
    turn_type: str
    content: str
    sequence: int

    model_config = {"from_attributes": True}


class SocialSimulationResponse(BaseModel):
    id: str
    project_id: str
    pipeline_run_id: str | None
    rounds_count: int
    created_at: str
    summary: dict[str, Any] = Field(default_factory=dict)
