# Phase 1: Foundation - Research

**Researched:** 2026-04-07
**Domain:** PyWebView + FastAPI + SQLAlchemy 2.0 + React/Vite/Tailwind v4 + Zustand + Anthropic SDK SSE
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FOUND-01 | `python main.py` inicia FastAPI na porta dinâmica e abre janela PyWebView nativa | PyWebView 6.1 + uvicorn Server pattern from fda-jam-sim — proven working |
| FOUND-02 | Frontend React/Vite serve em dev mode; build produz `dist/` embutido no app | Vite 8.x + StaticFiles mount — identical to fda-jam-sim pattern |
| FOUND-03 | SQLite criado em `~/VFTStudio/db.sqlite` com todas as tabelas no primeiro boot | SQLAlchemy 2.0.49 + aiosqlite + create_all on startup |
| FOUND-04 | Alembic migrations versionadas; schema aplicado automaticamente | Alembic 1.18.4 — async engine config verified |
| FOUND-05 | BaseRepository genérico com get/list/create/update/soft_delete | SQLAlchemy 2.0 select() + AsyncSession pattern |
| FOUND-06 | Pydantic schemas frozen=True para todas as entidades | Pydantic v2 model_config = ConfigDict(frozen=True) |
| FOUND-07 | CRUD completo de projetos | FastAPI router + BaseRepository |
| FOUND-08 | CRUD completo de stakeholders com campo `elicitation_mode` | FastAPI router + BaseRepository |
| FOUND-09 | AppShell layout: sidebar + área de conteúdo + painel de chat lateral | React 19 + Tailwind v4 CSS grid/flex layout |
| FOUND-10 | ProjectList screen com ProjectCard e NewProjectWizard (3 passos) | Zustand + React Query v5 |
| FOUND-11 | Zustand stores (projectStore, chatStore, uiStore) com immer middleware | Zustand 5.0.12 + immer 11.1.4 |
| FOUND-12 | API client HTTP com base URL do servidor local e error interceptors | axios 1.14.0 — proven in existing projects |
| FOUND-13 | BaseAgent com invoke() + stream() (AsyncGenerator SSE); retry 3x exponential | Anthropic SDK 0.91.0 AsyncAnthropic client |
| FOUND-14 | POST /api/chat/message retorna SSE stream; EventSource no frontend | FastAPI 0.135.3 built-in EventSourceResponse (fastapi.sse) |
| PHASE-01 | ProcessManager com 33 StepConfigs completos | Python dataclass/enum — pure logic, no external lib needed |
| PHASE-02 | GET /api/projects/{id}/phase/current | FastAPI router + ProcessManager |
| PHASE-03 | POST /api/projects/{id}/phase/step/complete | FastAPI router + ProcessManager + DB persistence |
| PHASE-04 | StepGuide component: card O QUÊ/POR QUÊ/COMO | React component + Tailwind |
| PHASE-05 | PhaseProgress component: barra 3 fases + passos | React component + Tailwind |
</phase_requirements>

---

## Summary

VFT Studio Phase 1 builds the complete application skeleton: a macOS native window (PyWebView 6.1) serving a FastAPI backend (0.135.3) with SQLite via SQLAlchemy 2.0 async, a React 19/Vite 8/Tailwind v4 frontend, and the Anthropic SDK's streaming interface exposed as SSE. The reference implementation is `fda-jam-sim` (same repo, same developer) — all of the core PyWebView + uvicorn threading patterns are proven and can be copied verbatim. The only significant differences from the reference are: database layer (SQLAlchemy 2.0 async + Alembic, not present in fda-jam-sim), Zustand stores, and Anthropic SDK integration.

The stack is entirely stable and well-documented. Every library has been version-verified against PyPI/npm as of 2026-04-07. The fda-jam-sim `main.py` and `api/server.py` are authoritative blueprints for the desktop scaffolding. No library substitutions are warranted; all decisions are locked in PROJECT.md.

**Primary recommendation:** Copy fda-jam-sim's `main.py` + `api/server.py` patterns exactly. Add SQLAlchemy 2.0 async layer + Alembic on top. Use FastAPI's built-in `fastapi.sse.EventSourceResponse` (0.135.3+) — do not add sse-starlette.

---

## Standard Stack

### Core — Backend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pywebview | 6.1 | macOS native window serving local HTTP | Proven in fda-jam-sim; lightweight, no Chromium bundle |
| fastapi | 0.135.3 | HTTP API + SSE + StaticFiles | Built-in EventSourceResponse in 0.135+; proven |
| uvicorn[standard] | 0.44.0 | ASGI server in daemon thread | Required by fda-jam-sim pattern |
| sqlalchemy[asyncio] | 2.0.49 | Async ORM | Only ORM with full SQLite async + Mapped[] types |
| aiosqlite | latest | SQLite async driver | Required by SQLAlchemy async + SQLite |
| alembic | 1.18.4 | Schema migrations | Standard for SQLAlchemy projects |
| pydantic | 2.12.5 | Schemas with frozen=True | Used by FastAPI; v2 ConfigDict API |
| anthropic | 0.91.0 | Claude API + async streaming | Official SDK with AsyncAnthropic + stream() |
| keyring | latest | macOS Keychain for API key | Phase 1 only stores key via env; Keychain deferred to Phase 7 |

### Core — Frontend
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.2.4 | UI framework | Latest stable; same as fda-jam-sim |
| vite | 8.0.7 | Dev server + build | Fast HMR; StaticFiles-compatible dist/ output |
| @vitejs/plugin-react | 6.0.1 | React transform | Standard React+Vite plugin |
| typescript | 6.0.2 | Type safety | Required by project constraints |
| tailwindcss | 4.2.2 | Utility CSS | v4 via @tailwindcss/vite plugin — no postcss/autoprefixer needed |
| @tailwindcss/vite | latest | Tailwind v4 Vite integration | Replaces postcss setup entirely in v4 |
| zustand | 5.0.12 | Client state | Minimal; immer middleware for immutable updates |
| immer | 11.1.4 | Immutable state updates | Required by FOUND-11 constraint |
| @tanstack/react-query | 5.96.2 | Server state / async data | Standard for React + REST API projects |
| axios | 1.14.0 | HTTP client | Interceptors for error handling; FOUND-12 |
| lucide-react | 1.7.0 | Icons | Already in fda-jam-sim |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @fontsource/inter | ^5.x | Font | Clean PT-BR readable font |
| python-dotenv | latest | .env loading in dev | Local dev only; prod reads env directly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| fastapi.sse.EventSourceResponse | sse-starlette | sse-starlette adds a dependency; FastAPI 0.135+ has it built-in |
| aiosqlite | psycopg / asyncpg | Postgres would require a server; SQLite is offline-first by design |
| Zustand + immer | Redux Toolkit | Redux is heavier; Zustand is sufficient and locked by project |
| axios | fetch API | fetch lacks interceptors; axios has better error handling DX |

**Installation — backend:**
```bash
pip install fastapi[standard] uvicorn[standard] pywebview sqlalchemy[asyncio] aiosqlite alembic pydantic python-dotenv anthropic keyring
```

**Installation — frontend:**
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install tailwindcss @tailwindcss/vite zustand immer @tanstack/react-query axios lucide-react @fontsource/inter
```

---

## Architecture Patterns

### Recommended Project Structure
```
vft-studio/
├── main.py                    # Entry point: build frontend, start uvicorn, open window
├── pyproject.toml             # Python project metadata + dev deps
├── .env.example               # ANTHROPIC_API_KEY placeholder
├── alembic.ini                # Alembic config pointing to ~/VFTStudio/db.sqlite
├── alembic/
│   ├── env.py                 # Async Alembic env with SQLAlchemy metadata
│   └── versions/              # Migration files
├── app/
│   ├── __init__.py
│   ├── server.py              # FastAPI app factory: CORS + routers + StaticFiles
│   ├── database.py            # Engine, AsyncSession, Base = DeclarativeBase
│   ├── models/                # SQLAlchemy ORM models (one file per domain)
│   │   ├── project.py
│   │   ├── stakeholder.py
│   │   └── phase_step.py
│   ├── schemas/               # Pydantic schemas frozen=True (one file per domain)
│   │   ├── project.py
│   │   ├── stakeholder.py
│   │   └── phase_step.py
│   ├── repositories/
│   │   ├── base.py            # BaseRepository[T]
│   │   ├── project.py
│   │   └── stakeholder.py
│   ├── routers/
│   │   ├── projects.py
│   │   ├── stakeholders.py
│   │   ├── phase.py
│   │   └── chat.py
│   ├── engine/
│   │   └── process_manager.py # ProcessManager + 33 StepConfigs
│   └── agents/
│       └── base_agent.py      # BaseAgent: invoke() + stream()
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css          # @import "tailwindcss";
    │   ├── api/
    │   │   └── client.ts      # axios instance with base URL + interceptors
    │   ├── stores/
    │   │   ├── projectStore.ts
    │   │   ├── chatStore.ts
    │   │   └── uiStore.ts
    │   ├── components/
    │   │   ├── layout/
    │   │   │   └── AppShell.tsx
    │   │   ├── project/
    │   │   │   ├── ProjectList.tsx
    │   │   │   ├── ProjectCard.tsx
    │   │   │   └── NewProjectWizard.tsx
    │   │   └── phase/
    │   │       ├── StepGuide.tsx
    │   │       └── PhaseProgress.tsx
    │   └── types/
    │       └── index.ts
    └── dist/                  # Built by `npm run build`, served by StaticFiles
```

### Pattern 1: PyWebView + uvicorn threading (from fda-jam-sim)
**What:** FastAPI runs in a daemon thread with its own asyncio loop. `webview.start()` blocks the main thread (macOS Cocoa requirement).
**When to use:** Always — this is the only correct pattern for PyWebView on macOS.
```python
# Source: fda-jam-sim/main.py (proven pattern)
def _run_server(config, ready_event, server_ref_box):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    server = uvicorn.Server(config)
    server_ref_box[0] = server

    async def _monitor():
        while not server.started:
            await asyncio.sleep(0.05)
        ready_event.set()

    async def _serve():
        asyncio.create_task(_monitor())
        await server.serve()

    loop.run_until_complete(_serve())

# In start_app():
config = uvicorn.Config(fastapi_app, host="127.0.0.1", port=port, loop="none", log_level="warning")
# loop="none" prevents signal handler installation in non-main thread
```

### Pattern 2: SQLAlchemy 2.0 Async + BaseRepository
**What:** Typed async repository over AsyncSession. All queries use `select()` — no `.query()` (deprecated in 2.0).
**When to use:** Every database operation in the app.
```python
# Source: SQLAlchemy 2.0 docs (verified current)
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from typing import Generic, TypeVar, Sequence
from sqlalchemy import select

class Base(AsyncAttrs, DeclarativeBase):
    pass

T = TypeVar("T", bound=Base)

class BaseRepository(Generic[T]):
    def __init__(self, session: AsyncSession, model: type[T]):
        self.session = session
        self.model = model

    async def get(self, id: int) -> T | None:
        return await self.session.get(self.model, id)

    async def list(self, **filters) -> Sequence[T]:
        stmt = select(self.model).filter_by(**filters)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, **kwargs) -> T:
        obj = self.model(**kwargs)
        self.session.add(obj)
        await self.session.flush()
        await self.session.refresh(obj)
        return obj

    async def soft_delete(self, id: int) -> None:
        obj = await self.get(id)
        if obj:
            obj.archived_at = datetime.utcnow()  # noqa: DTZ003
            await self.session.flush()
```

### Pattern 3: FastAPI SSE streaming (FOUND-14)
**What:** FastAPI 0.135.3 ships `fastapi.sse.EventSourceResponse`. Yields `ServerSentEvent` objects from async generator.
**When to use:** POST /api/chat/message and any streaming endpoint.
```python
# Source: FastAPI 0.135+ built-in SSE (fastapi.tiangolo.com/tutorial/server-sent-events)
from fastapi import APIRouter
from fastapi.responses import EventSourceResponse
from fastapi.sse import ServerSentEvent

router = APIRouter()

@router.post("/api/chat/message", response_class=EventSourceResponse)
async def chat_message(body: ChatMessageRequest):
    async def generate():
        async for chunk in agent.stream(body.message, body.context):
            yield ServerSentEvent(data=chunk, event="delta")
        yield ServerSentEvent(data="[DONE]", event="done")
    return EventSourceResponse(generate())
```

### Pattern 4: Anthropic SDK async streaming (FOUND-13)
**What:** `AsyncAnthropic` client with `client.messages.stream()` context manager. Yields text chunks.
**When to use:** BaseAgent.stream() method.
```python
# Source: Anthropic SDK 0.91.0 docs (platform.claude.com/docs/en/build-with-claude/streaming)
from anthropic import AsyncAnthropic
import asyncio

class BaseAgent:
    def __init__(self, model: str, system: str):
        self.client = AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
        self.model = model
        self.system = system

    async def invoke(self, messages: list[dict]) -> str:
        for attempt in range(3):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=self.system,
                    messages=messages,
                )
                return response.content[0].text
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def stream(self, messages: list[dict]):
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=4096,
            system=self.system,
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
```

### Pattern 5: Zustand + immer store (FOUND-11)
**What:** Zustand 5 with immer middleware for mutable-style updates that are immutable under the hood.
**When to use:** All three stores: projectStore, chatStore, uiStore.
```typescript
// Source: zustand 5 docs (zustand.docs.pmnd.rs/reference/middlewares/immer)
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  setActiveProject: (id: string) => void
  addProject: (project: Project) => void
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    projects: [],
    activeProjectId: null,
    setActiveProject: (id) => set((state) => { state.activeProjectId = id }),
    addProject: (project) => set((state) => { state.projects.push(project) }),
  }))
)
```

### Pattern 6: Tailwind v4 + Vite setup
**What:** Tailwind v4 uses `@tailwindcss/vite` plugin — no tailwind.config.js, no postcss.config, no autoprefixer.
**When to use:** Initial frontend scaffold. Critical: v4 setup is DIFFERENT from v3.
```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```
```css
/* src/index.css */
@import "tailwindcss";
```

### Pattern 7: Pydantic v2 frozen schemas (FOUND-06)
**What:** Use `model_config = ConfigDict(frozen=True)` — NOT `class Config: frozen = True` (deprecated in v2).
```python
# Source: Pydantic v2 docs
from pydantic import BaseModel, ConfigDict

class ProjectSchema(BaseModel):
    model_config = ConfigDict(frozen=True)
    id: int
    name: str
    archived_at: datetime | None = None
```

### Anti-Patterns to Avoid
- **`loop="asyncio"` in uvicorn.Config inside a thread:** Causes signal handler installation failure. Must use `loop="none"`.
- **Using `.query()` API with SQLAlchemy 2.0:** Deprecated. Always use `select()`.
- **`class Config: frozen = True` in Pydantic v2:** Deprecated syntax. Use `model_config = ConfigDict(frozen=True)`.
- **Mounting StaticFiles before API routes:** FastAPI must include routers before mounting `StaticFiles` at `/`, or API routes are shadowed.
- **Installing sse-starlette alongside FastAPI 0.135+:** Redundant; use `from fastapi.sse import ServerSentEvent`.
- **Tailwind v4 with postcss.config:** v4 uses Vite plugin, not PostCSS pipeline. Adding postcss causes conflicts.
- **`webview.start()` in a non-main thread:** Cocoa requirement — pywebview.start() MUST run on main thread.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema migrations | Custom migration scripts | Alembic | Handles rollback, branching, env-specific configs |
| State immutability in React | Manual spread operators | Zustand + immer | Prevents mutation bugs; handles nested state safely |
| Retry with backoff | Custom retry loop | Built into BaseAgent + asyncio.sleep | exponential backoff edge cases (jitter, max wait) |
| Server readiness gate | Thread.sleep poll | `server.started` poll via asyncio (fda-jam-sim pattern) | Race-free; no arbitrary sleep |
| Dynamic port allocation | Port config file | `socket.bind(("127.0.0.1", 0))` and release | OS-guaranteed free port |
| CSS theming system | Custom CSS variables manually | Tailwind v4 CSS theme vars (`@theme`) | v4 exposes all tokens as CSS custom properties automatically |

**Key insight:** The fda-jam-sim repo already solved the hardest problem in this phase (desktop threading, port management, window lifecycle). Reuse every line of that pattern.

---

## Common Pitfalls

### Pitfall 1: uvicorn signal handlers in daemon thread
**What goes wrong:** Uvicorn raises `ValueError: signal only works in main thread` on startup.
**Why it happens:** Python's `signal.signal()` can only be called from the main thread. Uvicorn's default `loop="auto"` installs signal handlers.
**How to avoid:** Always pass `loop="none"` to `uvicorn.Config` when running in a daemon thread.
**Warning signs:** Immediate crash on `python main.py` with signal-related traceback.

### Pitfall 2: StaticFiles shadows API routes
**What goes wrong:** All API requests return 404 or the HTML file.
**Why it happens:** `app.mount("/", StaticFiles(...))` intercepts ALL requests if mounted before routers.
**How to avoid:** Include all routers BEFORE mounting StaticFiles. Pattern in fda-jam-sim `server.py` is correct.
**Warning signs:** `GET /api/health` returns 404 after adding StaticFiles.

### Pitfall 3: Alembic async env.py misconfiguration
**What goes wrong:** Alembic migrations run but create tables in wrong location or fail with "no module" error.
**Why it happens:** Default `alembic.ini` uses sync URL; async SQLAlchemy needs `sqlalchemy.url` with `+aiosqlite` and `env.py` using `run_async_migrations()`.
**How to avoid:** Configure `alembic/env.py` with `asyncio.run(run_async_migrations())` and import the same `Base.metadata` used in models.

### Pitfall 4: PyWebView window blank on first open
**What goes wrong:** Window opens but shows blank page or connection refused.
**Why it happens:** Window created before uvicorn is ready.
**How to avoid:** Gate window creation on `ready_event.wait(timeout=10)` — the fda-jam-sim threading pattern with `_monitor()` coroutine.

### Pitfall 5: Tailwind v4 CSS not applied
**What goes wrong:** App renders unstyled.
**Why it happens:** Using v3 setup (postcss.config.js + `tailwind.config.js` + `@tailwind base/components/utilities`) with a v4 install.
**How to avoid:** v4 setup = `@tailwindcss/vite` plugin + `@import "tailwindcss"` in CSS. No config files required.

### Pitfall 6: Pydantic v2 validation errors with frozen schemas
**What goes wrong:** `TypeError: 'ProjectSchema' object does not support item assignment` when trying to update a schema instance.
**Why it happens:** frozen=True is correct behavior — schemas are read-only by design.
**How to avoid:** Never mutate schema objects. Use `.model_copy(update={...})` if a modified copy is needed.

### Pitfall 7: SQLAlchemy lazy loading in async context
**What goes wrong:** `MissingGreenlet` or `greenlet_spawn has not been called` error when accessing a relationship attribute outside the session.
**Why it happens:** Async SQLAlchemy disables implicit lazy loading. Any relationship access outside the session context raises this error.
**How to avoid:** Use `selectinload()` or `joinedload()` on all relationships in queries. Never access relationship attributes after `session.close()`.

---

## Code Examples

### Alembic async env.py
```python
# Source: SQLAlchemy 2.0 asyncio docs (docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html)
import asyncio
from logging.config import fileConfig
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context
from app.database import Base
from app import models  # noqa: F401 — imports all models so metadata is populated

config = context.config
fileConfig(config.config_file_name)
target_metadata = Base.metadata

def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()

async def run_async_migrations():
    engine = create_async_engine(config.get_main_option("sqlalchemy.url"))
    async with engine.begin() as conn:
        await conn.run_sync(do_run_migrations)
    await engine.dispose()

def run_migrations_online():
    asyncio.run(run_async_migrations())

run_migrations_online()
```

### Database setup with data directory
```python
# app/database.py
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncAttrs, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

DATA_DIR = Path.home() / "VFTStudio"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "db.sqlite"
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

class Base(AsyncAttrs, DeclarativeBase):
    pass

async def get_session():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
```

### FastAPI app factory with lifespan
```python
# app/server.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.database import init_db
from app.routers import projects, stakeholders, phase, chat

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="VFT Studio", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://127\.0\.0\.1(:\d+)?|http://localhost(:\d+)?",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router, prefix="/api")
app.include_router(stakeholders.router, prefix="/api")
app.include_router(phase.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/api/health")
def health():
    return {"status": "ok"}

# StaticFiles MUST be mounted last
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
```

### Axios API client with base URL injection
```typescript
// src/api/client.ts
import axios from 'axios'

// In PyWebView the app is served from the dynamic port; window.location.origin works for both dev and prod
const BASE_URL = import.meta.env.VITE_API_URL ?? window.location.origin

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail ?? error.message ?? 'Unknown error'
    console.error('[API Error]', message)
    return Promise.reject(new Error(message))
  }
)
```

### EventSource frontend for SSE (FOUND-14)
```typescript
// src/api/chat.ts
export function streamChatMessage(
  message: string,
  context: Record<string, unknown>,
  onDelta: (text: string) => void,
  onDone: () => void,
): () => void {
  // POST first to get stream ID, then EventSource; or use fetch + ReadableStream
  const ctrl = new AbortController()
  fetch(`${BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, context }),
    signal: ctrl.signal,
  }).then(async (res) => {
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) { onDone(); break }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') { onDone(); return }
          onDelta(data)
        }
      }
    }
  })
  return () => ctrl.abort()
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sse-starlette` library | `fastapi.sse.EventSourceResponse` built-in | FastAPI 0.135.0 (2025) | One fewer dependency; Pydantic serialization on Rust side |
| Tailwind `postcss.config.js` + `tailwind.config.js` | `@tailwindcss/vite` plugin + `@import "tailwindcss"` | Tailwind v4.0 (2025) | No config files needed; much faster builds |
| `class Config: frozen = True` | `model_config = ConfigDict(frozen=True)` | Pydantic v2 (2023) | Old syntax still works but deprecated |
| SQLAlchemy `Base = declarative_base()` | `class Base(AsyncAttrs, DeclarativeBase): pass` | SQLAlchemy 2.0 | Required for async; typed `Mapped[]` annotations |
| Uvicorn `loop="asyncio"` anywhere | `loop="none"` in daemon threads | uvicorn 0.29+ | Signal handler bug prevention |

**Deprecated/outdated:**
- `create_engine` (sync) with `aiosqlite`: Use `create_async_engine` with `AsyncSession`.
- `app.on_event("startup")`: Replaced by `lifespan` context manager in FastAPI.
- Zustand v4 `devtools` wrapping order: v5 has simplified middleware composition.

---

## Open Questions

1. **Tailwind v4 dark mode configuration**
   - What we know: v4 uses CSS custom properties; dark mode via `@variant dark` or media query
   - What's unclear: Exact syntax for switching dark/light programmatically via a class toggle (needed by Phase 7)
   - Recommendation: Implement with CSS media query in Phase 1; refine toggle in Phase 7

2. **PyWebView 6.1 CORS for dev mode hot reload**
   - What we know: In production, frontend is StaticFiles — same origin. In dev, Vite runs on a different port.
   - What's unclear: Whether CORS `allow_origin_regex` is sufficient or if pywebview needs additional config for dev reload
   - Recommendation: During dev, run backend separately with `uvicorn app.server:app --reload` and use `VITE_API_URL=http://127.0.0.1:{port}` env var in frontend

3. **Alembic with `~/VFTStudio/db.sqlite` (user home path)**
   - What we know: Alembic's `alembic.ini` uses a static `sqlalchemy.url`; home directory path varies per machine
   - What's unclear: Best way to inject dynamic path into Alembic (env var vs env.py override)
   - Recommendation: Override `config.set_main_option("sqlalchemy.url", ...)` in `alembic/env.py` using `Path.home()` — do not hardcode in `alembic.ini`

---

## Sources

### Primary (HIGH confidence)
- fda-jam-sim/main.py + api/server.py — proven PyWebView + uvicorn threading pattern (same developer, same stack)
- PyPI pywebview 6.1, fastapi 0.135.3, sqlalchemy 2.0.49, alembic 1.18.4, pydantic 2.12.5, anthropic 0.91.0, uvicorn 0.44.0 — version-verified 2026-04-07
- npm zustand 5.0.12, immer 11.1.4, react 19.2.4, vite 8.0.7, tailwindcss 4.2.2 — version-verified 2026-04-07

### Secondary (MEDIUM confidence)
- [Anthropic Streaming Docs](https://platform.claude.com/docs/en/build-with-claude/streaming) — verified AsyncAnthropic stream() API
- [FastAPI SSE tutorial](https://fastapi.tiangolo.com/tutorial/server-sent-events/) — EventSourceResponse in 0.135+
- [SQLAlchemy asyncio docs](https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html) — AsyncAttrs + DeclarativeBase pattern
- [Tailwind v4 blog announcement](https://tailwindcss.com/blog/tailwindcss-v4) — vite plugin setup confirmed
- [Zustand immer docs](https://zustand.docs.pmnd.rs/reference/middlewares/immer) — v5 middleware API

### Tertiary (LOW confidence)
- None — all findings verified against official sources or the reference codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions verified against PyPI/npm 2026-04-07; fda-jam-sim is a working reference
- Architecture: HIGH — fda-jam-sim patterns are proven; SQLAlchemy 2.0 async pattern verified against official docs
- Pitfalls: HIGH — most pitfalls come from fda-jam-sim docstring commentary (first-hand experience) + official migration guides

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable ecosystem; pywebview and anthropic SDK update frequently)
