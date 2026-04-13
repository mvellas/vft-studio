"""
backend/app.py
==============
FastAPI application factory for VFT Studio.

Architecture notes:
- All routers are included BEFORE StaticFiles mount (Pitfall 2 prevention).
- CORS allows local origins only (127.0.0.1 and localhost with any port).
- StaticFiles mount is guarded: only mounted when frontend/dist/ exists.
- lifespan calls init_db() from backend.db.base to create all tables.
"""
from __future__ import annotations

import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.db.base import init_db
from backend.api import projects, stakeholders, phases, chat, frame, decision_frame, objectives, axiom, attributes, alternatives, export, settings, documents
from backend.api.pipeline import router as pipeline_router
from backend.api.settings import _KEYRING_SERVICE, _KEYRING_USERNAME, _BRAVE_KEYRING_USERNAME

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


def _load_api_key_from_keychain() -> None:
    """On startup: load API key from macOS Keychain into env if not already set."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    try:
        import keyring
        key = keyring.get_password(_KEYRING_SERVICE, _KEYRING_USERNAME)
        if key:
            os.environ["ANTHROPIC_API_KEY"] = key
    except Exception:
        pass


def _load_brave_key_from_keychain() -> None:
    """On startup: load Brave Search API key from macOS Keychain into env."""
    if os.environ.get("BRAVE_SEARCH_API_KEY"):
        return
    try:
        import keyring
        key = keyring.get_password(_KEYRING_SERVICE, _BRAVE_KEYRING_USERNAME)
        if key:
            os.environ["BRAVE_SEARCH_API_KEY"] = key
    except Exception:
        pass


@asynccontextmanager
async def lifespan(application: FastAPI):
    _load_api_key_from_keychain()
    _load_brave_key_from_keychain()
    await init_db()
    yield


app = FastAPI(title="VFT Studio", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://127\.0\.0\.1(:\d+)?|http://localhost(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# Routers MUST be included before StaticFiles mount.
app.include_router(projects.router, prefix="/api")
app.include_router(stakeholders.router, prefix="/api")
app.include_router(phases.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(frame.router, prefix="/api")
app.include_router(decision_frame.router, prefix="/api")
app.include_router(objectives.router, prefix="/api")
app.include_router(axiom.router, prefix="/api")
app.include_router(attributes.router, prefix="/api")
app.include_router(alternatives.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(settings.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(pipeline_router, prefix="/api")


# StaticFiles MUST be mounted last — after all API routers.
# See Pitfall 2 in 01-RESEARCH.md: mounting before routers shadows all API paths.
if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
