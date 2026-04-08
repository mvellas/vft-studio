"""Pydantic v2 frozen schemas for Decision Frame (IDF) CRUD."""

from pydantic import BaseModel, ConfigDict


class IDFUpdate(BaseModel):
    model_config = ConfigDict(frozen=True)

    idf_purpose: str | None = None
    idf_perspective: str | None = None
    idf_scope: str | None = None
    decision_statement: str | None = None
    decision_statement_validated: int | None = None


class IDFResponse(BaseModel):
    model_config = ConfigDict(frozen=True, from_attributes=True)

    idf_purpose: str
    idf_perspective: str
    idf_scope: str
    idf_documented_at: str | None
    decision_statement: str
    decision_statement_validated: int
