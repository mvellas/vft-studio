# VFT Studio

Decision analysis tool built on the **Value-Focused Thinking (VFT)** methodology by Ralph Keeney. It guides facilitators and analysts through a structured multi-phase process — from stakeholder mapping to value hierarchy construction — assisted by specialized AI agents.

---

## Features

- **Guided VFT workflow** — 9-step process across phases (Stakeholders → Objectives → Alternatives → Evaluation → Synthesis)
- **Multi-agent AI** — ARIA (facilitator), FRAME (analyst), AXIOM (strategist), NOVA (synthesis), ANALYST (document proxy)
- **Web search** — agents perform live Brave Search queries and cite sources inline
- **Proxy documental** — upload PDFs/documents; ANALYST extracts stakeholder values and positions
- **Streaming chat** — real-time SSE token streaming with tool-use indicators
- **Resizable panels** — drag to resize sidebar and chat panel
- **Phase 3 specialization** — dedicated UI for value hierarchy construction and weight elicitation

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI + SQLAlchemy (async) + SQLite + Alembic |
| AI | Anthropic Claude (claude-sonnet-4-6) via `anthropic` SDK |
| Search | Brave Search API |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS + Zustand |
| Desktop | pywebview (wraps FastAPI + React as a native window) |
| Package mgr | uv (Python), npm (Node) |

---

## Setup

### Prerequisites

- Python ≥ 3.12
- Node.js ≥ 18
- [uv](https://docs.astral.sh/uv/) (`pip install uv`)

### 1. Clone & install

```bash
git clone <repo-url>
cd vft-studio

# Python dependencies
uv sync

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=BSA...       # optional — enables web search
DATABASE_URL=sqlite+aiosqlite:///./vft_studio.db
```

### 3. Run database migrations

```bash
uv run alembic upgrade head
```

### 4. Start

**Desktop app (pywebview):**
```bash
uv run python main.py
```

**Development mode (hot reload):**
```bash
# Terminal 1 — backend
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
vft-studio/
├── backend/
│   ├── agents/          # AI agent definitions (ARIA, FRAME, AXIOM, NOVA, ANALYST)
│   ├── api/             # FastAPI routers (chat, phases, projects, documents, settings)
│   ├── db/              # SQLAlchemy models + Alembic migrations
│   ├── repositories/    # Repository pattern — data access layer
│   └── tools/           # Tool implementations (brave_search)
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios API clients
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks (useChat, useResize)
│   │   ├── stores/      # Zustand state stores
│   │   └── types/       # TypeScript interfaces
│   └── vite.config.ts
├── tests/               # pytest test suite (backend)
├── docs/                # Planning docs and ADRs
├── main.py              # Desktop entry point (pywebview)
└── alembic.ini
```

---

## AI Agents

| Agent | Type | Role |
|---|---|---|
| ARIA | `facilitator` | Guides the VFT process step by step |
| FRAME | `analyst` | Structured analysis and frameworks |
| AXIOM | `strategist` | Strategic perspective and trade-offs |
| NOVA | `synthesis` | Synthesis and decision recommendation |
| ANALYST | `analyst` | Documental proxy — extracts values from uploaded documents |

All agents use `ToolAwareAgent` — capable of calling `web_search` (Brave API) and streaming results back token by token.

---

## Running Tests

```bash
uv run pytest
```

Coverage report:
```bash
uv run pytest --cov=backend --cov-report=term-missing
```

---

## License

MIT
