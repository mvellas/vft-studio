---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [fastapi, pywebview, uvicorn, react, vite, tailwindcss, typescript, python]

# Dependency graph
requires: []
provides:
  - "python main.py entry point: uvicorn daemon thread + pywebview window (fda-jam-sim pattern)"
  - "backend/app.py: FastAPI app factory with CORS, lifespan, /api/health, StaticFiles mount"
  - "backend/config.py: Pydantic BaseSettings (VFT_ prefix)"
  - "frontend: React 19 + Vite + Tailwind v4 + zustand + react-query + axios scaffold"
  - "pyproject.toml: all Python dependencies declared"
  - "frontend/package.json: all Node dependencies declared"
affects: [02-database, 03-vft-phase1, 04-vft-phase2, 05-vft-phase3, 06-visualizations, 07-polish]

# Tech tracking
tech-stack:
  added:
    - "fastapi 0.135.3 + uvicorn 0.44.0 (Python ASGI)"
    - "pywebview 6.1 (native macOS window)"
    - "pydantic-settings (BaseSettings with env_prefix)"
    - "python-dotenv (dev .env loading)"
    - "react 19 + vite 8 + @vitejs/plugin-react"
    - "tailwindcss 4.x + @tailwindcss/vite (NO postcss, NO tailwind.config)"
    - "zustand 5 + immer (state management)"
    - "@tanstack/react-query 5 (server state)"
    - "axios 1.x (HTTP client)"
    - "lucide-react (icons)"
    - "@fontsource/inter (Inter font)"
  patterns:
    - "PyWebView + uvicorn threading: daemon thread with own asyncio loop, loop=none, ready_event gate"
    - "StaticFiles mounted LAST in FastAPI app (after all API routers) to prevent route shadowing"
    - "CORS allow_origin_regex for 127.0.0.1/localhost with any port"
    - "Tailwind v4 via Vite plugin: @import tailwindcss in CSS, no config files"
    - "find_free_port(): socket.bind(127.0.0.1, 0) dynamic port allocation"

key-files:
  created:
    - main.py
    - pyproject.toml
    - .env.example
    - .gitignore
    - backend/__init__.py
    - backend/app.py
    - backend/config.py
    - frontend/package.json
    - frontend/vite.config.ts
    - frontend/src/App.tsx
    - frontend/src/index.css
    - frontend/src/main.tsx
  modified: []

key-decisions:
  - "Copied fda-jam-sim PyWebView+uvicorn threading pattern verbatim — proven, no signal-handler bugs"
  - "Tailwind v4 via @tailwindcss/vite: no postcss.config, no tailwind.config (v4 Vite-native approach)"
  - "StaticFiles mount guarded by FRONTEND_DIST.exists() — allows backend to start without built frontend"
  - "Used anaconda3 base python for imports — project has no venv yet (future plan: add venv/uv)"
  - "pydantic-settings added to pyproject.toml dependencies (required by backend/config.py)"

patterns-established:
  - "Pattern: FastAPI app factory in backend/app.py, entry point in main.py"
  - "Pattern: loop=none in uvicorn.Config when running in non-main thread"
  - "Pattern: threading.Event gates webview.create_window until server.started"

requirements-completed: [FOUND-01, FOUND-02]

# Metrics
duration: 5min
completed: 2026-04-07
---

# Phase 1 Plan 1: Foundation Scaffold Summary

**PyWebView + FastAPI desktop app shell with React/Vite/Tailwind v4 frontend: `from backend.app import app` imports, `npm run build` produces dist/, threading pattern from fda-jam-sim**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-07T19:47:13Z
- **Completed:** 2026-04-07T19:53:12Z
- **Tasks:** 2
- **Files modified:** 12 created

## Accomplishments
- PyWebView + uvicorn threading entry point (`main.py`) copied from fda-jam-sim with `find_free_port`, `_run_server`, `ready_event` gate
- FastAPI app factory (`backend/app.py`) with CORS, async lifespan, `/api/health`, StaticFiles mount (guarded, last)
- Pydantic BaseSettings config with `VFT_` prefix and all required settings
- React 19 + Vite 8 + Tailwind v4 frontend scaffold building successfully via `@tailwindcss/vite` plugin
- All Python and Node dependencies declared in `pyproject.toml` and `frontend/package.json`

## Task Commits

1. **Task 1: Python backend scaffold** - `9371aab` (feat)
2. **Task 2: React/Vite/Tailwind v4 frontend scaffold** - `c2359ac` (feat)

## Files Created/Modified
- `main.py` - Entry point: find_free_port + _run_server daemon thread + webview.create_window + webview.start
- `pyproject.toml` - Python project with all dependencies (fastapi, uvicorn, pywebview, sqlalchemy, alembic, anthropic, etc.)
- `.env.example` - ANTHROPIC_API_KEY, VFT_DATA_DIR, VFT_DEV_MODE template
- `.gitignore` - Python, Node, macOS, IDE artifacts excluded
- `backend/__init__.py` - Empty package marker
- `backend/app.py` - FastAPI app: CORS regex + lifespan + /api/health + StaticFiles (last)
- `backend/config.py` - Pydantic BaseSettings with VFT_ prefix, data_dir, dev_mode
- `frontend/vite.config.ts` - Tailwind v4 plugin + /api proxy
- `frontend/src/index.css` - @import tailwindcss + Inter font imports + @theme
- `frontend/src/App.tsx` - Minimal placeholder (VFT Studio heading + subheading)
- `frontend/src/main.tsx` - React 19 createRoot pattern

## Decisions Made
- Copied fda-jam-sim `main.py` threading pattern verbatim: `loop="none"` prevents signal-handler crash in non-main thread
- Tailwind v4 via `@tailwindcss/vite`: no `postcss.config`, no `tailwind.config` — v4 is Vite-native
- StaticFiles mount guarded: `if FRONTEND_DIST.exists()` allows backend to start without pre-built frontend in dev
- `pydantic-settings` added as explicit dependency (required for `BaseSettings`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added pydantic-settings to pyproject.toml**
- **Found during:** Task 1 (backend/config.py creation)
- **Issue:** Plan specified `pydantic>=2.12.5` but `pydantic-settings` is a separate package required by `BaseSettings`
- **Fix:** Added `pydantic-settings` to pyproject.toml dependencies
- **Files modified:** pyproject.toml
- **Verification:** `from backend.app import app` imports successfully (pydantic_settings import in config.py works)
- **Committed in:** `9371aab` (Task 1 commit)

**2. [Rule 3 - Blocking] Created .gitignore to prevent node_modules/pycache commit**
- **Found during:** Task 2 (post-commit check)
- **Issue:** No .gitignore existed; node_modules/, __pycache__/, dist/ would pollute git history
- **Fix:** Created .gitignore covering Python, Node, macOS, and IDE artifacts
- **Files modified:** .gitignore (new)
- **Committed in:** `c2359ac` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 3 - blocking)
**Impact on plan:** Both auto-fixes necessary for correct operation. No scope creep.

## Issues Encountered
- System Python 3.14 lacks fastapi — installed via anaconda3 base env. Future plan should establish a project venv or document which Python to use.

## User Setup Required
None - no external service configuration required. (ANTHROPIC_API_KEY needed for AI features in later plans, not Plan 01.)

## Next Phase Readiness
- Backend FastAPI app importable: `from backend.app import app` prints "VFT Studio"
- Frontend build verified: `npm run build` produces `dist/index.html`
- `python main.py` will open native macOS window showing React app (requires pywebview installed in runtime Python)
- Plan 02 (database layer) can proceed: `backend/app.py` has placeholder `_init_db()` ready to be wired to SQLAlchemy

---
*Phase: 01-foundation*
*Completed: 2026-04-07*
