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

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.db.base import init_db
from backend.api import projects, stakeholders, phases, chat, frame, decision_frame, objectives, axiom, attributes

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(application: FastAPI):
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


# StaticFiles MUST be mounted last — after all API routers.
# See Pitfall 2 in 01-RESEARCH.md: mounting before routers shadows all API paths.
if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
