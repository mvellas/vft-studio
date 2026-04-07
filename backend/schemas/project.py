"""Pydantic v2 frozen schemas for Project CRUD."""

from pydantic import BaseModel, ConfigDict


class ProjectCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    description: str = ""
    context_notes: str = ""


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str | None = None
    description: str | None = None
    context_notes: str | None = None
    idf_purpose: str | None = None
    idf_perspective: str | None = None
    idf_scope: str | None = None
    decision_statement: str | None = None
    qualitative_modeling_tech: str | None = None
    stakeholder_config: str | None = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    name: str
    description: str
    context_notes: str
    created_at: str
    updated_at: str
    phase_status: int
    current_step: str
    qualitative_modeling_tech: str
    stakeholder_config: str
    idf_purpose: str
    idf_perspective: str
    idf_scope: str
    idf_documented_at: str | None
    decision_statement: str
    decision_statement_validated: int
    phase1_completed: int
    phase2_completed: int
    phase3_completed: int
    archived: int
    archived_at: str | None
