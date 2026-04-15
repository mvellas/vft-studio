"""
main.py
=======
Application entry point for VFT Studio (pywebview + FastAPI native desktop app).

Usage:
    python main.py

Architecture
------------
- Frontend (React+Vite) is pre-built to frontend/dist/ before starting the server.
- FastAPI + uvicorn run in a daemon thread with their own asyncio event loop.
  (Signal handlers cannot be installed in non-main threads — loop="none" is required.)
- A threading.Event gates window creation until the server is confirmed ready.
- pywebview.start() blocks the main thread (macOS Cocoa requirement).
- Window close sets server.should_exit = True for graceful shutdown.

Pattern source: fda-jam-sim/main.py (same developer, proven in production).
"""
from __future__ import annotations

import asyncio
import socket
import subprocess
import sys
import threading
from pathlib import Path

import uvicorn
import webview
from dotenv import load_dotenv

load_dotenv()

FRONTEND_DIR = Path(__file__).parent / "frontend"


# ---------------------------------------------------------------------------
# Frontend build helper
# ---------------------------------------------------------------------------

def _build_frontend() -> None:
    """Run npm run build in frontend/ if dist/index.html is missing."""
    dist = FRONTEND_DIR / "dist" / "index.html"
    if not dist.exists():
        print("Building frontend...")
        subprocess.run(
            ["npm", "run", "build"],
            cwd=str(FRONTEND_DIR),
            check=True,
            capture_output=True,
        )
        print("Frontend built.")


# ---------------------------------------------------------------------------
# Dynamic port allocation
# ---------------------------------------------------------------------------

def find_free_port() -> int:
    """Bind to port 0 and immediately release to obtain a free OS-assigned port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


# ---------------------------------------------------------------------------
# Uvicorn daemon thread
# ---------------------------------------------------------------------------

def _run_server(
    config: uvicorn.Config,
    ready_event: threading.Event,
    server_ref_box: list,
) -> None:
    """Run uvicorn in a dedicated thread with its own asyncio event loop.

    Uses server.serve() (uvicorn 0.29+). A monitor coroutine polls
    server.started and fires ready_event before handing off to serve().
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = uvicorn.Server(config)
    server_ref_box[0] = server

    async def _monitor() -> None:
        while not server.started:
            await asyncio.sleep(0.05)
        ready_event.set()

    async def _serve() -> None:
        asyncio.create_task(_monitor())
        await server.serve()

    loop.run_until_complete(_serve())


# ---------------------------------------------------------------------------
# Application entry point
# ---------------------------------------------------------------------------

def start_app() -> None:
    """Build frontend, start uvicorn in background, open pywebview window."""
    _build_frontend()

    # Import after load_dotenv() so settings read correct env vars.
    from backend.app import app as fastapi_app  # noqa: PLC0415

    ready_event = threading.Event()
    server_ref_box: list = [None]

    port = find_free_port()
    config = uvicorn.Config(
        fastapi_app,
        host="127.0.0.1",
        port=port,
        loop="none",       # Critical: prevents signal handler in non-main thread
        log_level="warning",
    )

    t = threading.Thread(
        target=_run_server,
        args=(config, ready_event, server_ref_box),
        daemon=True,
    )
    t.start()

    if not ready_event.wait(timeout=10):
        print("ERROR: Server failed to start within 10 seconds.", file=sys.stderr)
        sys.exit(1)
    print(f"Server ready on port {port}")

    window = webview.create_window(
        "VFT Studio",
        f"http://127.0.0.1:{port}/",
        width=1400,
        height=900,
        min_size=(1280, 800),
        resizable=True,
        background_color="#F8FAFC",
    )

    def _on_closed() -> None:
        server = server_ref_box[0]
        if server:
            server.should_exit = True

    window.events.closed += _on_closed

    webview.start(debug=False)


if __name__ == "__main__":
    start_app()
