"""
backend/app.py
==============
FastAPI application factory for VFT Studio.

Architecture notes:
- All routers are included BEFORE StaticFiles mount (Pitfall 2 prevention).
- CORS allows local origins only (127.0.0.1 and localhost with any port).
- StaticFiles mount is guarded: only mounted when frontend/dist/ exists.
- lifespan calls init_db() placeholder; actual DB setup in Plan 02.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"


async def _init_db() -> None:
    """Placeholder for DB initialisation — implemented in Plan 02."""
    pass


@asynccontextmanager
async def lifespan(application: FastAPI):
    await _init_db()
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


# StaticFiles MUST be mounted last — after all API routers.
# See Pitfall 2 in 01-RESEARCH.md: mounting before routers shadows all API paths.
if FRONTEND_DIST.exists():
    app.mount(
        "/",
        StaticFiles(directory=str(FRONTEND_DIST), html=True),
        name="frontend",
    )
