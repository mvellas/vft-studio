"""
tests/test_documents_api.py
============================
Integration tests for the documents API.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
import asyncio

from backend.app import app
from backend.db.base import Base, get_session

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture
def client():
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _init():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    loop = asyncio.new_event_loop()
    loop.run_until_complete(_init())

    async def override_get_session():
        async with TestSessionLocal() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()
    loop.run_until_complete(test_engine.dispose())
    loop.close()


@pytest.fixture
def project_id(client):
    r = client.post("/api/projects", json={"name": "Test Project", "description": "desc"})
    assert r.status_code == 201
    return r.json()["id"]


class TestDocumentsAPI:
    def test_create_document_text(self, client, project_id):
        r = client.post(
            f"/api/projects/{project_id}/documents",
            json={
                "title": "Lei 12.608",
                "doc_type": "legal_text",
                "content_text": "Esta lei dispõe sobre proteção civil.",
            },
        )
        assert r.status_code == 201
        data = r.json()
        assert data["title"] == "Lei 12.608"
        assert data["doc_type"] == "legal_text"
        assert data["project_id"] == project_id

    def test_list_documents(self, client, project_id):
        client.post(f"/api/projects/{project_id}/documents", json={"title": "Doc 1", "doc_type": "report", "content_text": "text"})
        client.post(f"/api/projects/{project_id}/documents", json={"title": "Doc 2", "doc_type": "report", "content_text": "text"})
        r = client.get(f"/api/projects/{project_id}/documents")
        assert r.status_code == 200
        assert len(r.json()) == 2

    def test_delete_document(self, client, project_id):
        r = client.post(f"/api/projects/{project_id}/documents", json={"title": "ToDelete", "doc_type": "other", "content_text": "x"})
        doc_id = r.json()["id"]
        del_r = client.delete(f"/api/projects/{project_id}/documents/{doc_id}")
        assert del_r.status_code == 204
        list_r = client.get(f"/api/projects/{project_id}/documents")
        assert all(d["id"] != doc_id for d in list_r.json())

    def test_upload_pdf_too_large_rejected(self, client, project_id):
        big_content = b"x" * (21 * 1024 * 1024)
        r = client.post(
            f"/api/projects/{project_id}/documents/upload",
            files={"file": ("big.pdf", big_content, "application/pdf")},
            data={"title": "Big", "doc_type": "report"},
        )
        assert r.status_code == 413
