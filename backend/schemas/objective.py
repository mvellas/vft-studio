"""Pydantic v2 frozen schemas for Objective CRUD and causal link management."""

from pydantic import BaseModel, ConfigDict


class ObjectiveCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    statement: str
    source_stakeholder_id: str | None = None
    raw_value: str = ""
    type: str = "uncategorized"
    order_index: int = 0


class ObjectiveUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    statement: str | None = None
    raw_value: str | None = None
    type: str | None = None
    witi_question: str | None = None
    witi_answer: str | None = None
    witi_classification: str | None = None
    witi_implies_objective_id: str | None = None
    is_fundamental_candidate: int | None = None
    coc_q1_answer: str | None = None
    coc_q1_result: str | None = None
    coc_q2_answer: str | None = None
    coc_q2_result: str | None = None
    coc_refinement_needed: int | None = None
    refined_statement: str | None = None
    parent_id: str | None = None
    hierarchy_level: int | None = None
    order_index: int | None = None


class ObjectiveResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    project_id: str
    statement: str
    source_stakeholder_id: str | None
    raw_value: str
    type: str
    witi_question: str
    witi_answer: str
    witi_classification: str
    witi_implies_objective_id: str | None
    is_fundamental_candidate: int
    coc_q1_answer: str
    coc_q1_result: str
    coc_q2_answer: str
    coc_q2_result: str
    coc_refinement_needed: int
    refined_statement: str | None
    parent_id: str | None
    hierarchy_level: int
    order_index: int
    created_at: str
    updated_at: str
    deleted: int
    deleted_at: str | None


class CausalLinkCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    from_obj: str
    to_obj: str
    label: str = ""


class CausalLinkResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    from_obj: str
    to_obj: str
    project_id: str
    label: str
    created_at: str


class NetworkResponse(BaseModel):
    model_config = ConfigDict(frozen=True)

    nodes: list[ObjectiveResponse]
    edges: list[CausalLinkResponse]
