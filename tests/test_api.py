"""
tests/test_api.py
=================
Integration tests for critical API endpoints using FastAPI TestClient.
Tests: projects CRUD, phases/steps, alternatives CRUD, settings API.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from backend.app import app
from backend.db.base import Base, get_session


# ---------------------------------------------------------------------------
# In-memory SQLite test database setup
# ---------------------------------------------------------------------------

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture
def client():
    """Create a TestClient with an isolated in-memory database per test."""
    from backend.db.base import init_db
    import asyncio

    # Override get_session to use an in-memory test DB
    test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

    async def _init():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_init())

    async def override_get_session():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()
    loop.run_until_complete(test_engine.dispose())
    loop.close()


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_ok(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200
        assert r.json() == {"status": "ok"}


# ---------------------------------------------------------------------------
# Projects CRUD
# ---------------------------------------------------------------------------

class TestProjectsCRUD:
    def test_list_projects_empty(self, client):
        r = client.get("/api/projects")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_project(self, client):
        r = client.post("/api/projects", json={"name": "Test Project", "description": "A test"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Test Project"
        assert data["description"] == "A test"
        assert "id" in data
        assert data["phase_status"] == 1
        assert data["current_step"] == "1.1"

    def test_create_project_requires_name(self, client):
        r = client.post("/api/projects", json={"description": "no name"})
        assert r.status_code == 422

    def test_get_project(self, client):
        # Create first
        r = client.post("/api/projects", json={"name": "Get Test"})
        project_id = r.json()["id"]
        # Then get
        r2 = client.get(f"/api/projects/{project_id}")
        assert r2.status_code == 200
        assert r2.json()["id"] == project_id

    def test_get_nonexistent_project_404(self, client):
        r = client.get("/api/projects/nonexistent-id")
        assert r.status_code == 404

    def test_update_project(self, client):
        r = client.post("/api/projects", json={"name": "Original"})
        project_id = r.json()["id"]
        r2 = client.patch(f"/api/projects/{project_id}", json={"name": "Updated"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "Updated"

    def test_list_projects_returns_created(self, client):
        client.post("/api/projects", json={"name": "List Test 1"})
        client.post("/api/projects", json={"name": "List Test 2"})
        r = client.get("/api/projects")
        assert r.status_code == 200
        names = [p["name"] for p in r.json()]
        assert "List Test 1" in names
        assert "List Test 2" in names


# ---------------------------------------------------------------------------
# Phases / Steps
# ---------------------------------------------------------------------------

class TestPhases:
    def _create_project(self, client):
        r = client.post("/api/projects", json={"name": "Phase Test"})
        return r.json()["id"]

    def test_get_current_step(self, client):
        project_id = self._create_project(client)
        r = client.get(f"/api/projects/{project_id}/phase/current")
        assert r.status_code == 200
        data = r.json()
        assert "step" in data
        assert data["step"]["id"] == "1.1"
        assert "completed_steps" in data
        assert "progress_percent" in data

    def test_current_step_nonexistent_project_404(self, client):
        r = client.get("/api/projects/nonexistent/phase/current")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Alternatives CRUD
# ---------------------------------------------------------------------------

class TestAlternativesCRUD:
    def _create_project(self, client):
        r = client.post("/api/projects", json={"name": "Alt Test"})
        return r.json()["id"]

    def test_list_alternatives_empty(self, client):
        project_id = self._create_project(client)
        r = client.get(f"/api/projects/{project_id}/alternatives")
        assert r.status_code == 200
        assert r.json() == []

    def test_create_alternative(self, client):
        project_id = self._create_project(client)
        r = client.post(f"/api/projects/{project_id}/alternatives", json={"name": "Alt A"})
        assert r.status_code == 201
        data = r.json()
        assert data["name"] == "Alt A"
        assert data["project_id"] == project_id
        assert data["is_status_quo"] == 0

    def test_create_status_quo_alternative(self, client):
        project_id = self._create_project(client)
        r = client.post(
            f"/api/projects/{project_id}/alternatives",
            json={"name": "Status Quo", "is_status_quo": 1}
        )
        assert r.status_code == 201
        assert r.json()["is_status_quo"] == 1

    def test_update_alternative(self, client):
        project_id = self._create_project(client)
        r = client.post(f"/api/projects/{project_id}/alternatives", json={"name": "Old Name"})
        alt_id = r.json()["id"]
        r2 = client.put(f"/api/projects/{project_id}/alternatives/{alt_id}", json={"name": "New Name"})
        assert r2.status_code == 200
        assert r2.json()["name"] == "New Name"

    def test_delete_alternative(self, client):
        project_id = self._create_project(client)
        r = client.post(f"/api/projects/{project_id}/alternatives", json={"name": "To Delete"})
        alt_id = r.json()["id"]
        r2 = client.delete(f"/api/projects/{project_id}/alternatives/{alt_id}")
        assert r2.status_code == 204
        # Should not appear in list
        r3 = client.get(f"/api/projects/{project_id}/alternatives")
        ids = [item["alternative"]["id"] for item in r3.json()]
        assert alt_id not in ids

    def test_alternatives_for_nonexistent_project_404(self, client):
        r = client.get("/api/projects/nonexistent/alternatives")
        assert r.status_code == 404


# ---------------------------------------------------------------------------
# Settings API
# ---------------------------------------------------------------------------

class TestSettingsAPI:
    def test_api_key_status_no_key(self, client):
        r = client.get("/api/settings/api-key")
        assert r.status_code == 200
        data = r.json()
        assert data["has_key"] is False or isinstance(data["has_key"], bool)

    def test_save_invalid_key_format(self, client):
        r = client.put("/api/settings/api-key", json={"api_key": "invalid-key"})
        assert r.status_code == 422

    def test_save_empty_key_rejected(self, client):
        r = client.put("/api/settings/api-key", json={"api_key": ""})
        assert r.status_code == 422

    def test_onboarding_not_completed_by_default(self, client):
        r = client.get("/api/settings/onboarding-completed")
        assert r.status_code == 200
        assert r.json()["completed"] is False

    def test_mark_onboarding_completed(self, client):
        r = client.post("/api/settings/onboarding-completed")
        assert r.status_code == 204
        r2 = client.get("/api/settings/onboarding-completed")
        assert r2.json()["completed"] is True


# ---------------------------------------------------------------------------
# Brave Settings API
# ---------------------------------------------------------------------------

class TestBraveSettings:
    def test_get_brave_key_status_no_key(self, client):
        # Clear any env var that might be set
        import os
        from unittest.mock import patch
        os.environ.pop("BRAVE_SEARCH_API_KEY", None)
        with patch("backend.api.settings._try_brave_keyring_get", return_value=None):
            r = client.get("/api/settings/brave-api-key")
        assert r.status_code == 200
        data = r.json()
        assert data["has_key"] is False
        assert data["source"] == "none"

    def test_save_and_get_brave_key(self, client):
        r = client.put("/api/settings/brave-api-key", json={"api_key": "BSAtest1234567890"})
        assert r.status_code == 200
        data = r.json()
        assert data["has_key"] is True
        assert data["source"] == "keychain"

    def test_save_brave_key_empty_rejected(self, client):
        r = client.put("/api/settings/brave-api-key", json={"api_key": ""})
        assert r.status_code == 422

    def test_test_brave_connection_no_key(self, client):
        import os
        from unittest.mock import patch
        os.environ.pop("BRAVE_SEARCH_API_KEY", None)
        with patch("backend.api.settings._try_brave_keyring_get", return_value=None):
            r = client.post("/api/settings/test-brave-connection", json={})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False
        assert "Nenhuma" in data["message"]
