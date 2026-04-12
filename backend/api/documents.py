"""
backend/api/documents.py
=========================
Documents CRUD + file upload endpoint.
Supports JSON body (text paste) and multipart/form-data (file upload).
Files: PDF -> text extraction via pypdf; images -> base64 stored as content_text marker.
Max file size: 20 MB.
"""
from __future__ import annotations

import base64
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Document
from backend.db.repository import BaseRepository
from backend.schemas.document import DocumentCreate, DocumentResponse

router = APIRouter(tags=["documents"])

_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _extract_text_from_pdf(data: bytes) -> str:
    """Extract all text from a PDF binary. Returns empty string on failure."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text)
        return "\n\n".join(pages)
    except Exception:
        return ""


def _encode_image_for_storage(data: bytes, mime_type: str) -> str:
    """Store image as a base64 marker for the ANALYST agent to embed as multimodal block."""
    b64 = base64.b64encode(data).decode("utf-8")
    return f"__IMAGE_BASE64__{mime_type}::{b64}"


@router.post(
    "/projects/{project_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    project_id: str,
    body: DocumentCreate,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Create a document from pasted text or pre-extracted content."""
    repo: BaseRepository[Document] = BaseRepository(Document, session)
    doc = await repo.create(
        project_id=project_id,
        stakeholder_id=body.stakeholder_id,
        title=body.title,
        doc_type=body.doc_type,
        date_reference=body.date_reference,
        source=body.source,
        content_text=body.content_text,
        file_name=body.file_name,
    )
    await session.commit()
    await session.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post(
    "/projects/{project_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    title: str = Form(...),
    doc_type: str = Form(...),
    date_reference: str | None = Form(default=None),
    source: str = Form(default=""),
    stakeholder_id: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Upload a file (PDF, TXT, image). Extracts text and stores it."""
    data = await file.read()
    if len(data) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 20 MB limit.")

    mime = file.content_type or ""
    file_name = file.filename or "upload"

    if mime == "application/pdf" or file_name.lower().endswith(".pdf"):
        content_text = _extract_text_from_pdf(data)
    elif mime in ("text/plain", "text/markdown") or file_name.lower().endswith((".txt", ".md")):
        content_text = data.decode("utf-8", errors="replace")
    elif mime.startswith("image/"):
        content_text = _encode_image_for_storage(data, mime)
    else:
        content_text = data.decode("utf-8", errors="replace")

    repo: BaseRepository[Document] = BaseRepository(Document, session)
    doc = await repo.create(
        project_id=project_id,
        stakeholder_id=stakeholder_id,
        title=title,
        doc_type=doc_type,
        date_reference=date_reference,
        source=source,
        content_text=content_text,
        file_name=file_name,
    )
    await session.commit()
    await session.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get(
    "/projects/{project_id}/documents",
    response_model=list[DocumentResponse],
)
async def list_documents(
    project_id: str,
    stakeholder_id: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[DocumentResponse]:
    """List documents for a project. Filter by stakeholder_id if provided."""
    stmt = select(Document).where(Document.project_id == project_id)
    if stakeholder_id:
        stmt = stmt.where(Document.stakeholder_id == stakeholder_id)
    else:
        stmt = stmt.where(Document.stakeholder_id.is_(None))
    stmt = stmt.order_by(Document.created_at.desc())
    result = await session.execute(stmt)
    docs = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.delete(
    "/projects/{project_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    project_id: str,
    doc_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document."""
    doc = await session.get(Document, doc_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found.")
    await session.delete(doc)
    await session.commit()
