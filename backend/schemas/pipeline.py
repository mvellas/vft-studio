from __future__ import annotations
from pydantic import BaseModel


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
