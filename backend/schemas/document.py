"""
backend/schemas/document.py
============================
Pydantic schemas for Document CRUD and responses.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


DOC_TYPES = [
    "official_speech", "policy_document", "report",
    "academic_paper", "news_article", "minutes", "legal_text", "other",
]


class DocumentCreate(BaseModel):
    model_config = ConfigDict(frozen=True)
    title: str
    doc_type: str
    date_reference: str | None = None
    source: str = ""
    content_text: str = ""
    stakeholder_id: str | None = None
    file_name: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    stakeholder_id: str | None
    title: str
    doc_type: str
    date_reference: str | None
    source: str
    content_text: str
    file_name: str | None
    created_at: str
