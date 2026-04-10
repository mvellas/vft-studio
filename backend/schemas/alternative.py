"""Pydantic v2 schemas for Alternative and AlternativeConsequence."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class AlternativeCreate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    description: str = ""
    source: str = "manual"
    is_status_quo: int = 0
    order_index: int = 0


class AlternativeUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str | None = None
    description: str | None = None
    source: str | None = None
    is_status_quo: int | None = None
    order_index: int | None = None


class AlternativeResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    project_id: str
    name: str
    description: str
    source: str
    source_stakeholder_id: str | None
    is_status_quo: int
    order_index: int
    created_at: str
    updated_at: str
    deleted: int


class ConsequenceUpsert(BaseModel):
    model_config = ConfigDict(frozen=True)

    objective_id: str
    value_text: str = ""
    attribute_level_id: str | None = None


class ConsequenceResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    id: str
    alternative_id: str
    objective_id: str
    project_id: str
    value_text: str
    attribute_level_id: str | None
    created_at: str
    updated_at: str


class AlternativeWithConsequences(BaseModel):
    model_config = ConfigDict(frozen=True)

    alternative: AlternativeResponse
    consequences: list[ConsequenceResponse]


class NovaSuggestRequest(BaseModel):
    model_config = ConfigDict(frozen=True)

    alternative_id: str
