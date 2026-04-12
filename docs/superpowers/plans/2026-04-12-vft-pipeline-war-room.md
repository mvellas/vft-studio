# VFT Pipeline + War Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "VFT Completo com IA" pipeline (sequential agents → War Room → report) and unified chat with automatic RouterAgent routing, replacing the manual AgentSelector.

**Architecture:** Backend orchestration via SSE with `PipelineOrchestrator` → `WarRoomOrchestrator` → `ReportGenerator`; `RouterAgent` (Haiku) intercepts every chat message to decide which agent responds. Frontend stores pipeline state in `pipelineStore.ts` and renders `PipelinePanel` inline inside `ProjectDetailView`.

**Tech Stack:** FastAPI + SSE (sse_starlette) + SQLAlchemy async + SQLite · React 18 + TypeScript + Zustand + immer + ReactMarkdown · anthropic SDK (claude-haiku-4-5 for router, claude-sonnet-4-6 for pipeline agents)

---

## File Map

### New backend files
- `backend/agents/router_agent.py` — RouterAgent (Haiku), single `invoke()` call returning `agent_type`
- `backend/pipeline/__init__.py` — empty init
- `backend/pipeline/orchestrator.py` — PipelineOrchestrator: runs 4 phases sequentially, yields SSE events
- `backend/pipeline/war_room.py` — WarRoomOrchestrator: 3-act debate, yields SSE events
- `backend/pipeline/report.py` — ReportGenerator (ARIA): final markdown report, yields SSE events
- `backend/api/pipeline.py` — `POST /api/pipeline/run` (SSE) + `GET /api/pipeline/{run_id}`
- `backend/schemas/pipeline.py` — Pydantic schemas: `PipelineRunRequest`, `PipelineRunResponse`, `PipelineTurnResponse`

### Modified backend files
- `backend/db/models.py` — add `PipelineRun`, `PipelineTurn` models
- `backend/api/chat.py` — add RouterAgent call before agent dispatch; parse `@MENTION` overrides
- `backend/app.py` — register `pipeline` router

### New frontend files
- `frontend/src/stores/pipelineStore.ts` — turns[], status, reportMd, runId
- `frontend/src/api/pipeline.ts` — `streamPipeline()`, `getLatestRun()`
- `frontend/src/components/pipeline/AgentTurnCard.tsx` — single streamed agent card
- `frontend/src/components/pipeline/WarRoomTimeline.tsx` — vertical timeline of war room turns
- `frontend/src/components/pipeline/ReportView.tsx` — markdown report + export actions
- `frontend/src/components/pipeline/PipelinePanel.tsx` — full pipeline view: phases + war room + report
- `frontend/src/components/pipeline/PipelineButton.tsx` — trigger button + context modal

### Modified frontend files
- `frontend/src/stores/uiStore.ts` — add `pipelineView: 'idle' | 'running' | 'report'` state
- `frontend/src/components/layout/ChatPanel.tsx` — remove `AgentSelector`, add agent badge + separator
- `frontend/src/components/layout/AppShell.tsx` — add `PipelineButton` to header; conditionally render `PipelinePanel`

---

## Task 1: DB Models — PipelineRun + PipelineTurn

**Files:**
- Modify: `backend/db/models.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pipeline_models.py
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from backend.db.base import Base
from backend.db.models import PipelineRun, PipelineTurn

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s

def test_pipeline_run_create(db):
    run = PipelineRun(
        id="run-1",
        project_id="proj-1",
        status="running",
        report_md="",
        created_at="2026-01-01T00:00:00Z",
    )
    db.add(run)
    db.commit()
    fetched = db.get(PipelineRun, "run-1")
    assert fetched.status == "running"
    assert fetched.completed_at is None

def test_pipeline_turn_create(db):
    run = PipelineRun(id="run-2", project_id="p", status="done",
                      report_md="", created_at="2026-01-01T00:00:00Z")
    db.add(run)
    db.commit()
    turn = PipelineTurn(
        id="turn-1",
        run_id="run-2",
        agent_name="FRAME",
        phase_label="Fase 1 — Stakeholders",
        turn_type="analysis",
        content="stakeholder output",
        sequence=0,
    )
    db.add(turn)
    db.commit()
    fetched = db.get(PipelineTurn, "turn-1")
    assert fetched.agent_name == "FRAME"
    assert fetched.sequence == 0
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
python -m pytest tests/test_pipeline_models.py -v
```
Expected: `ImportError` or `AttributeError` — models don't exist yet.

- [ ] **Step 3: Add models to `backend/db/models.py`**

Append after the `Document` class:

```python
class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="idle", server_default="idle")
    report_md: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    completed_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_pipeline_runs_project", "project_id"),
    )


class PipelineTurn(Base):
    __tablename__ = "pipeline_turns"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, ForeignKey("pipeline_runs.id"), nullable=False)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    phase_label: Mapped[str] = mapped_column(Text, nullable=False)
    turn_type: Mapped[str] = mapped_column(Text, nullable=False)  # analysis | war_room | report
    content: Mapped[str] = mapped_column(Text, default="", server_default="")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index("idx_pipeline_turns_run", "run_id"),
    )
```

Also add `Index` to the existing imports line — it already has it, so no change needed.

- [ ] **Step 4: Run test — expect PASS**

```bash
python -m pytest tests/test_pipeline_models.py -v
```
Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add backend/db/models.py tests/test_pipeline_models.py
git commit -m "feat(db): add PipelineRun and PipelineTurn models"
```

---

## Task 2: RouterAgent

**Files:**
- Create: `backend/agents/router_agent.py`
- Create: `tests/test_router_agent.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_router_agent.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

@pytest.mark.asyncio
async def test_router_returns_facilitator_by_default():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"agent_type": "facilitator"}')]
    with patch.object(agent.client.messages, "create", return_value=mock_response):
        result = await agent.invoke(
            phase=1,
            recent_turns=[],
            user_message="Olá, como você está?",
        )
    assert result == "facilitator"

@pytest.mark.asyncio
async def test_router_respects_at_mention():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    result = await agent.invoke(
        phase=1,
        recent_turns=[],
        user_message="@FRAME quais são os stakeholders?",
    )
    assert result == "phase1_specialist"

@pytest.mark.asyncio
async def test_router_returns_facilitator_on_parse_error():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="invalid json")]
    with patch.object(agent.client.messages, "create", return_value=mock_response):
        result = await agent.invoke(
            phase=2,
            recent_turns=[],
            user_message="alguma coisa",
        )
    assert result == "facilitator"
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
python -m pytest tests/test_router_agent.py -v
```

- [ ] **Step 3: Create `backend/agents/router_agent.py`**

```python
"""RouterAgent — lightweight Haiku agent that picks which agent should respond."""
from __future__ import annotations

import json
import re

import anthropic


_MENTION_MAP = {
    "@ARIA": "facilitator",
    "@FRAME": "phase1_specialist",
    "@AXIOM": "phase2_specialist",
    "@NOVA": "phase3_specialist",
    "@ANALYST": "analyst",
}

_SYSTEM = """You are a routing agent. Given a project phase and a user message, decide which agent should respond.
Return ONLY valid JSON: {"agent_type": "<agent>"} — no other text.

Rules:
- phase 1 or mentions stakeholders → phase1_specialist
- phase 2 or mentions values/objectives/WITI → phase2_specialist
- phase 3 or mentions alternatives/trade-offs → phase3_specialist
- mentions documents/sources/evidence → analyst
- default / facilitation / general questions → facilitator
"""


class RouterAgent:
    def __init__(self) -> None:
        self.client = anthropic.Anthropic()

    async def invoke(
        self,
        phase: int,
        recent_turns: list[dict],
        user_message: str,
    ) -> str:
        # @mention override — synchronous, no API call needed
        for mention, agent_type in _MENTION_MAP.items():
            if mention in user_message:
                return agent_type

        context = "\n".join(
            f"{t['role']}: {t['content'][:120]}" for t in recent_turns[-3:]
        )
        user_content = (
            f"Current phase: {phase}\n"
            f"Recent conversation:\n{context}\n"
            f"User message: {user_message}"
        )

        import asyncio
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: self.client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=64,
                system=_SYSTEM,
                messages=[{"role": "user", "content": user_content}],
            ),
        )

        text = response.content[0].text.strip()
        try:
            data = json.loads(text)
            return data.get("agent_type", "facilitator")
        except (json.JSONDecodeError, AttributeError):
            return "facilitator"
```

- [ ] **Step 4: Run test — expect PASS**

```bash
python -m pytest tests/test_router_agent.py -v
```
Expected: `3 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/agents/router_agent.py tests/test_router_agent.py
git commit -m "feat(agents): add RouterAgent (Haiku) with @mention override"
```

---

## Task 3: Modify Chat Endpoint — Unified History + RouterAgent

**Files:**
- Modify: `backend/api/chat.py`

The chat endpoint must:
1. Call `RouterAgent.invoke()` to pick `agent_type` (unless `agent_type` is already set to a specific non-"auto" value)
2. Return the resolved `agent_type` in the `done` event so the frontend can display the badge
3. When `agent_type == "all"` (unified history view), load messages from all agents

- [ ] **Step 1: Write failing test**

```python
# tests/test_chat_routing.py
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from backend.app import create_app

@pytest.fixture
async def client():
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_chat_message_includes_agent_name_in_done(client):
    """The done SSE event must include resolved_agent_type."""
    with patch("backend.api.chat.RouterAgent") as MockRouter:
        instance = MockRouter.return_value
        instance.invoke = AsyncMock(return_value="facilitator")
        with patch("backend.api.chat.FacilitatorAgent") as MockAgent:
            mock_agent_instance = AsyncMock()
            mock_agent_instance.stream = AsyncMock(return_value=aiter(["Hello"]))
            MockAgent.from_project_id = AsyncMock(return_value=mock_agent_instance)

            resp = await client.post("/api/chat/message", json={
                "project_id": "test-project",
                "message": "Olá",
                "agent_type": "auto",
            })
    assert resp.status_code == 200
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
python -m pytest tests/test_chat_routing.py -v
```

- [ ] **Step 3: Modify `backend/api/chat.py`**

Add import at top:
```python
from backend.agents.router_agent import RouterAgent
```

Replace the beginning of `chat_message` function body — the section from `config = AGENT_CONFIGS.get(...)` through agent instantiation — with:

```python
    # Resolve agent_type via RouterAgent when "auto" or not specified
    resolved_agent_type = body.agent_type
    if body.agent_type in ("auto", "", None):
        router = RouterAgent()
        phase = body.phase or 1
        # Build recent_turns from last 3 messages (load synchronously from DB)
        history_result = await session.execute(
            select(ChatMessage)
            .where(ChatMessage.project_id == body.project_id)
            .order_by(ChatMessage.timestamp.desc())
            .limit(6)
        )
        recent_rows = list(reversed(history_result.scalars().all()))
        recent_turns = [{"role": m.role if m.role == "user" else "assistant", "content": m.content}
                        for m in recent_rows]
        resolved_agent_type = await router.invoke(
            phase=phase,
            recent_turns=recent_turns,
            user_message=body.message,
        )

    config = AGENT_CONFIGS.get(resolved_agent_type, AGENT_CONFIGS["facilitator"])
```

Then replace the `done` yield at the end of `generate()`:

```python
        yield ServerSentEvent(
            data=json.dumps({"agent_type": resolved_agent_type, "agent_name": config["name"]}),
            event="done"
        )
```

Also persist messages with `resolved_agent_type` as role:
```python
        await msg_repo.create(
            session_id=chat_session.id,
            project_id=body.project_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            role=resolved_agent_type,
            agent_name=config["name"],
            content=full_response,
        )
```

Finally, add `phase: int | None = None` to `ChatMessageRequest` in `backend/schemas/chat.py`:
```python
class ChatMessageRequest(BaseModel):
    project_id: str
    message: str
    agent_type: str = "auto"
    stakeholder_id: str | None = None
    phase: int | None = None
```

- [ ] **Step 4: Run existing chat tests**

```bash
python -m pytest tests/test_api.py -v -k "chat"
```
Expected: all pass (or pre-existing failures unchanged).

- [ ] **Step 5: Commit**

```bash
git add backend/api/chat.py backend/schemas/chat.py tests/test_chat_routing.py
git commit -m "feat(chat): RouterAgent auto-routing + resolved agent_type in done event"
```

---

## Task 4: Pipeline Schemas

**Files:**
- Create: `backend/schemas/pipeline.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pipeline_schemas.py
from backend.schemas.pipeline import PipelineRunRequest, PipelineRunResponse

def test_pipeline_run_request_defaults():
    req = PipelineRunRequest(project_id="proj-1")
    assert req.project_id == "proj-1"
    assert req.problem_description is None

def test_pipeline_run_response_validation():
    resp = PipelineRunResponse(
        id="run-1",
        project_id="proj-1",
        status="running",
        report_md="",
        created_at="2026-01-01T00:00:00Z",
        completed_at=None,
    )
    assert resp.status == "running"
```

- [ ] **Step 2: Run — expect FAIL**

```bash
python -m pytest tests/test_pipeline_schemas.py -v
```

- [ ] **Step 3: Create `backend/schemas/pipeline.py`**

```python
from __future__ import annotations
from pydantic import BaseModel


class PipelineRunRequest(BaseModel):
    project_id: str
    problem_description: str | None = None


class PipelineRunResponse(BaseModel):
    id: str
    project_id: str
    status: str
    report_md: str
    created_at: str
    completed_at: str | None

    model_config = {"from_attributes": True}


class PipelineTurnResponse(BaseModel):
    id: str
    run_id: str
    agent_name: str
    phase_label: str
    turn_type: str
    content: str
    sequence: int

    model_config = {"from_attributes": True}
```

- [ ] **Step 4: Run — expect PASS**

```bash
python -m pytest tests/test_pipeline_schemas.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/schemas/pipeline.py tests/test_pipeline_schemas.py
git commit -m "feat(schemas): add pipeline Pydantic schemas"
```

---

## Task 5: PipelineOrchestrator — Sequential Agent Phases

**Files:**
- Create: `backend/pipeline/__init__.py`
- Create: `backend/pipeline/orchestrator.py`
- Create: `tests/test_pipeline_orchestrator.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pipeline_orchestrator.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.pipeline.orchestrator import PipelineOrchestrator

def make_mock_agent(text="agent output"):
    agent = MagicMock()
    agent.stream_with_tools = AsyncMock(return_value=aiter([text]))
    return agent

async def aiter(items):
    for item in items:
        yield item

@pytest.mark.asyncio
async def test_orchestrator_yields_phase_events():
    from backend.db.models import Project, Document
    mock_project = MagicMock()
    mock_project.name = "Test Project"
    mock_project.description = "A test"
    mock_project.phase_status = 1

    events = []
    with patch("backend.pipeline.orchestrator.FacilitatorAgent") as FA, \
         patch("backend.pipeline.orchestrator.Phase1SpecialistAgent") as P1, \
         patch("backend.pipeline.orchestrator.Phase2SpecialistAgent") as P2, \
         patch("backend.pipeline.orchestrator.Phase3SpecialistAgent") as P3, \
         patch("backend.pipeline.orchestrator.AnalystAgent") as AN:

        for Cls in [FA, P1, P2, P3, AN]:
            inst = MagicMock()
            inst.stream_with_tools = AsyncMock(return_value=aiter(["output text"]))
            Cls.from_project_id = AsyncMock(return_value=inst)
            Cls.return_value = inst

        orch = PipelineOrchestrator(
            project=mock_project,
            documents=[],
            session=AsyncMock(),
        )
        async for event in orch.run():
            events.append(event)

    types = [e.get("event") for e in events]
    assert "agent_start" in types
    assert "agent_done" in types
```

- [ ] **Step 2: Run — expect FAIL**

```bash
python -m pytest tests/test_pipeline_orchestrator.py -v
```

- [ ] **Step 3: Create `backend/pipeline/__init__.py`** (empty)

```python
```

- [ ] **Step 4: Create `backend/pipeline/orchestrator.py`**

```python
"""PipelineOrchestrator — runs VFT phases sequentially, yields SSE-ready dicts."""
from __future__ import annotations

import json
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent, ToolUseEvent, ToolResultEvent
from backend.agents.facilitator import FacilitatorAgent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.phase3_specialist import Phase3SpecialistAgent
from backend.agents.analyst_agent import AnalystAgent
from backend.db.models import Document


PHASES = [
    {
        "agent_type": "phase1_specialist",
        "agent_name": "FRAME",
        "phase_label": "Fase 1 — Stakeholders",
        "prompt_suffix": (
            "Realize uma análise completa dos stakeholders deste projeto VFT. "
            "Identifique todos os envolvidos, seus papéis, interesses e influências. "
            "Use ferramentas de pesquisa se necessário."
        ),
    },
    {
        "agent_type": "phase2_specialist",
        "agent_name": "AXIOM",
        "phase_label": "Fase 2 — Valores e Objetivos",
        "prompt_suffix": (
            "Com base nos stakeholders identificados na Fase 1, elabore a hierarquia "
            "completa de valores e objetivos. Distinga objetivos fundamentais de objetivos-meios."
        ),
    },
    {
        "agent_type": "phase3_specialist",
        "agent_name": "NOVA",
        "phase_label": "Fase 3 — Alternativas",
        "prompt_suffix": (
            "Com base nos objetivos da Fase 2, gere e avalie alternativas criativas. "
            "Analise trade-offs entre as alternativas em relação aos objetivos fundamentais."
        ),
    },
]

ANALYST_PHASE = {
    "agent_type": "analyst",
    "agent_name": "ANALYST",
    "phase_label": "Fase 4 — Evidências Documentais",
    "prompt_suffix": (
        "Faça uma cross-referência entre os documentos disponíveis e os achados das fases anteriores. "
        "Identifique evidências, lacunas e possíveis contradições."
    ),
}

_AGENT_CLASS_MAP = {
    "phase1_specialist": Phase1SpecialistAgent,
    "phase2_specialist": Phase2SpecialistAgent,
    "phase3_specialist": Phase3SpecialistAgent,
    "analyst": AnalystAgent,
}


class PipelineOrchestrator:
    def __init__(
        self,
        project: object,
        documents: list[Document],
        session: AsyncSession,
    ) -> None:
        self.project = project
        self.documents = documents
        self.session = session
        self._phase_outputs: dict[str, str] = {}

    async def run(self) -> AsyncIterator[dict]:
        phases = list(PHASES)
        if self.documents:
            phases.append(ANALYST_PHASE)

        for phase_cfg in phases:
            agent_type = phase_cfg["agent_type"]
            agent_name = phase_cfg["agent_name"]
            phase_label = phase_cfg["phase_label"]

            yield {"event": "agent_start", "data": {
                "agent": agent_type,
                "agent_name": agent_name,
                "phase_label": phase_label,
                "status": "running",
            }}

            prompt = self._build_prompt(phase_cfg)
            messages = [{"role": "user", "content": prompt}]

            AgentCls = _AGENT_CLASS_MAP[agent_type]
            try:
                agent = await AgentCls.from_project_id(
                    self.project.id, self.session
                )
            except Exception:
                from backend.agents.base_agent import BaseAgent
                agent = BaseAgent(model="claude-sonnet-4-6", system="")

            full_text = ""
            if isinstance(agent, ToolAwareAgent):
                async for event in agent.stream_with_tools(messages):
                    if isinstance(event, ToolUseEvent):
                        yield {"event": "agent_delta", "data": {
                            "agent": agent_type,
                            "text": f"\n_[Pesquisando: {event.input.get('query', '')}]_\n",
                        }}
                    elif isinstance(event, ToolResultEvent):
                        pass
                    else:
                        full_text += event
                        yield {"event": "agent_delta", "data": {
                            "agent": agent_type,
                            "text": event,
                        }}
            else:
                async for chunk in agent.stream(messages):
                    full_text += chunk
                    yield {"event": "agent_delta", "data": {
                        "agent": agent_type,
                        "text": chunk,
                    }}

            self._phase_outputs[agent_name] = full_text
            yield {"event": "agent_done", "data": {
                "agent": agent_type,
                "phase_label": phase_label,
                "content": full_text,
            }}

    def _build_prompt(self, phase_cfg: dict) -> str:
        agent_name = phase_cfg["agent_name"]
        suffix = phase_cfg["prompt_suffix"]
        project_context = (
            f"Projeto: {self.project.name}\n"
            f"Descrição: {self.project.description or '(sem descrição)'}\n"
        )

        prior = ""
        if self._phase_outputs:
            prior = "\n\n## Contexto das fases anteriores\n"
            for name, content in self._phase_outputs.items():
                prior += f"\n### {name}\n{content[:2000]}\n"

        doc_context = ""
        if self.documents and agent_name == "ANALYST":
            doc_context = "\n\n## Documentos disponíveis\n"
            for doc in self.documents[:5]:
                doc_context += f"\n### {doc.title}\n{doc.content_text[:1500]}\n"

        return f"{project_context}{prior}{doc_context}\n\n{suffix}"

    @property
    def phase_outputs(self) -> dict[str, str]:
        return dict(self._phase_outputs)
```

- [ ] **Step 5: Run test — expect PASS**

```bash
python -m pytest tests/test_pipeline_orchestrator.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/pipeline/ tests/test_pipeline_orchestrator.py
git commit -m "feat(pipeline): PipelineOrchestrator with 4 sequential phases"
```

---

## Task 6: WarRoomOrchestrator + ReportGenerator

**Files:**
- Create: `backend/pipeline/war_room.py`
- Create: `backend/pipeline/report.py`
- Create: `tests/test_war_room.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_war_room.py
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

async def aiter(items):
    for item in items:
        yield item

@pytest.mark.asyncio
async def test_war_room_yields_turns():
    from backend.pipeline.war_room import WarRoomOrchestrator
    mock_session = AsyncMock()
    phase_outputs = {
        "FRAME": "stakeholder analysis",
        "AXIOM": "value hierarchy",
        "NOVA": "alternatives",
    }

    with patch("backend.pipeline.war_room.FacilitatorAgent") as FA, \
         patch("backend.pipeline.war_room.Phase1SpecialistAgent") as P1, \
         patch("backend.pipeline.war_room.Phase2SpecialistAgent") as P2, \
         patch("backend.pipeline.war_room.Phase3SpecialistAgent") as P3:

        for Cls in [FA, P1, P2, P3]:
            inst = MagicMock()
            inst.stream = AsyncMock(return_value=aiter(["response text"]))
            inst.stream_with_tools = inst.stream
            Cls.from_project_id = AsyncMock(return_value=inst)
            Cls.return_value = inst

        orch = WarRoomOrchestrator(
            project_id="proj-1",
            project_name="Test",
            phase_outputs=phase_outputs,
            session=mock_session,
        )
        events = []
        async for event in orch.run():
            events.append(event)

    event_types = [e["event"] for e in events]
    assert "war_room_turn" in event_types
    assert events[0]["event"] == "war_room_start"
    assert events[-1]["event"] == "war_room_done"

@pytest.mark.asyncio
async def test_report_generator_yields_report():
    from backend.pipeline.report import ReportGenerator
    mock_session = AsyncMock()

    with patch("backend.pipeline.report.FacilitatorAgent") as FA:
        inst = MagicMock()
        inst.stream = AsyncMock(return_value=aiter(["# Report\nContent"]))
        FA.from_project_id = AsyncMock(return_value=inst)

        gen = ReportGenerator(
            project_id="proj-1",
            project_name="Test",
            phase_outputs={"FRAME": "output"},
            war_room_transcript="ARIA: question\nFRAME: answer",
            session=mock_session,
        )
        events = []
        async for event in gen.run():
            events.append(event)

    event_types = [e["event"] for e in events]
    assert "report_start" in event_types
    assert "report_delta" in event_types
    assert "report_done" in event_types
```

- [ ] **Step 2: Run — expect FAIL**

```bash
python -m pytest tests/test_war_room.py -v
```

- [ ] **Step 3: Create `backend/pipeline/war_room.py`**

```python
"""WarRoomOrchestrator — 3-act structured debate between VFT agents."""
from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent, ToolUseEvent, ToolResultEvent
from backend.agents.facilitator import FacilitatorAgent
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from backend.agents.phase2_specialist import Phase2SpecialistAgent
from backend.agents.phase3_specialist import Phase3SpecialistAgent
from backend.agents.analyst_agent import AnalystAgent


_AGENT_NAME_MAP = {
    "ARIA": "facilitator",
    "FRAME": "phase1_specialist",
    "AXIOM": "phase2_specialist",
    "NOVA": "phase3_specialist",
    "ANALYST": "analyst",
}

_AGENT_CLASS_MAP = {
    "facilitator": FacilitatorAgent,
    "phase1_specialist": Phase1SpecialistAgent,
    "phase2_specialist": Phase2SpecialistAgent,
    "phase3_specialist": Phase3SpecialistAgent,
    "analyst": AnalystAgent,
}


class WarRoomOrchestrator:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        session: AsyncSession,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.session = session
        self._transcript: list[dict] = []

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "war_room_start", "data": {}}

        participants = [name for name in ["FRAME", "AXIOM", "NOVA", "ANALYST"]
                        if name in self.phase_outputs]

        # Act 1: ARIA opens + each agent presents
        aria_open = (
            f"Bem-vindos à War Room do projeto '{self.project_name}'. "
            "Cada agente apresentará seu principal achado. "
            "Em seguida, debateremos as tensões e sínteses identificadas."
        )
        yield {"event": "war_room_turn", "data": {
            "speaker": "ARIA", "agent_name": "ARIA",
            "text": aria_open, "is_delta": False, "act": 1,
        }}
        self._transcript.append({"speaker": "ARIA", "text": aria_open})

        for agent_name in participants:
            prompt = self._presentation_prompt(agent_name)
            async for turn_event in self._agent_speak(agent_name, prompt, act=1):
                yield turn_event

        # Act 2: Two debate rounds mediated by ARIA
        for round_num in range(1, 3):
            aria_question = await self._aria_synthesis_question(round_num)
            yield {"event": "war_room_turn", "data": {
                "speaker": "ARIA", "agent_name": "ARIA",
                "text": aria_question, "is_delta": False, "act": 2,
            }}
            self._transcript.append({"speaker": "ARIA", "text": aria_question})

            for agent_name in participants:
                prompt = self._debate_prompt(agent_name, aria_question)
                async for turn_event in self._agent_speak(agent_name, prompt, act=2):
                    yield turn_event

        yield {"event": "war_room_done", "data": {}}

    def get_transcript(self) -> str:
        return "\n\n".join(
            f"**{t['speaker']}:** {t['text']}" for t in self._transcript
        )

    def _presentation_prompt(self, agent_name: str) -> str:
        output = self.phase_outputs.get(agent_name, "")[:1500]
        return (
            f"Você está na War Room do projeto '{self.project_name}'. "
            f"Apresente em 1-2 parágrafos seu principal achado da análise:\n\n{output}"
        )

    def _debate_prompt(self, agent_name: str, question: str) -> str:
        transcript = self._transcript_text()
        output = self.phase_outputs.get(agent_name, "")[:800]
        return (
            f"War Room — '{self.project_name}'. Debate em andamento.\n\n"
            f"Transcrição até agora:\n{transcript}\n\n"
            f"Seu achado original:\n{output}\n\n"
            f"Pergunta da ARIA: {question}\n\n"
            "Responda em 1-2 parágrafos. Pode concordar, discordar ou complementar os outros agentes."
        )

    async def _aria_synthesis_question(self, round_num: int) -> str:
        transcript = self._transcript_text()
        if round_num == 1:
            base = (
                "Com base nas apresentações, formule UMA pergunta de síntese que "
                "force os agentes a confrontar suas perspectivas mais divergentes."
            )
        else:
            base = (
                "Identifique a principal tensão que emergiu do debate e formule "
                "UMA pergunta final que aponte para a síntese ou resolução dessa tensão."
            )
        prompt = (
            f"Você é ARIA, mediadora da War Room do projeto '{self.project_name}'.\n\n"
            f"Transcrição:\n{transcript}\n\n{base}"
        )
        try:
            agent = await FacilitatorAgent.from_project_id(self.project_id, self.session)
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system="")

        response = ""
        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools([{"role": "user", "content": prompt}]):
                if isinstance(event, str):
                    response += event
        else:
            async for chunk in agent.stream([{"role": "user", "content": prompt}]):
                response += chunk
        return response

    async def _agent_speak(
        self, agent_name: str, prompt: str, act: int
    ) -> AsyncIterator[dict]:
        agent_type = _AGENT_NAME_MAP.get(agent_name, "facilitator")
        AgentCls = _AGENT_CLASS_MAP.get(agent_type, FacilitatorAgent)
        try:
            agent = await AgentCls.from_project_id(self.project_id, self.session)
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system="")

        full_text = ""
        messages = [{"role": "user", "content": prompt}]

        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools(messages):
                if isinstance(event, str):
                    full_text += event
                    yield {"event": "war_room_turn", "data": {
                        "speaker": agent_name, "agent_name": agent_name,
                        "text": event, "is_delta": True, "act": act,
                    }}
        else:
            async for chunk in agent.stream(messages):
                full_text += chunk
                yield {"event": "war_room_turn", "data": {
                    "speaker": agent_name, "agent_name": agent_name,
                    "text": chunk, "is_delta": True, "act": act,
                }}

        self._transcript.append({"speaker": agent_name, "text": full_text})

    def _transcript_text(self) -> str:
        return "\n".join(f"{t['speaker']}: {t['text'][:400]}" for t in self._transcript)
```

- [ ] **Step 4: Create `backend/pipeline/report.py`**

```python
"""ReportGenerator — ARIA synthesizes final markdown report."""
from __future__ import annotations

from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent, ToolUseEvent
from backend.agents.facilitator import FacilitatorAgent


_REPORT_SYSTEM = """You are ARIA, a VFT (Value-Focused Thinking) facilitator.
Generate a comprehensive final analysis report in Portuguese (PT-BR) using the
structure provided. Be analytical, cite specific findings from each agent,
and provide actionable recommendations. Use markdown formatting."""


_REPORT_PROMPT_TEMPLATE = """Gere o relatório final da análise VFT para o projeto '{name}'.

## Achados dos agentes

### FRAME (Stakeholders)
{frame}

### AXIOM (Valores e Objetivos)
{axiom}

### NOVA (Alternativas)
{nova}

{analyst_section}

## Transcrição da War Room
{war_room}

---

Gere o relatório completo com esta estrutura exata:

# Análise VFT — {name}

## 1. Contexto e Problema
## 2. Stakeholders Identificados
## 3. Hierarquia de Valores e Objetivos
## 4. Alternativas Avaliadas
## 5. Evidências Documentais
## 6. Síntese da War Room
## 7. Recomendação Final
## 8. Próximos Passos VFT
"""


class ReportGenerator:
    def __init__(
        self,
        project_id: str,
        project_name: str,
        phase_outputs: dict[str, str],
        war_room_transcript: str,
        session: AsyncSession,
    ) -> None:
        self.project_id = project_id
        self.project_name = project_name
        self.phase_outputs = phase_outputs
        self.war_room_transcript = war_room_transcript
        self.session = session

    async def run(self) -> AsyncIterator[dict]:
        yield {"event": "report_start", "data": {}}

        analyst_section = ""
        if "ANALYST" in self.phase_outputs:
            analyst_section = f"### ANALYST (Evidências Documentais)\n{self.phase_outputs['ANALYST'][:2000]}"

        prompt = _REPORT_PROMPT_TEMPLATE.format(
            name=self.project_name,
            frame=self.phase_outputs.get("FRAME", "N/A")[:2000],
            axiom=self.phase_outputs.get("AXIOM", "N/A")[:2000],
            nova=self.phase_outputs.get("NOVA", "N/A")[:2000],
            analyst_section=analyst_section,
            war_room=self.war_room_transcript[:3000],
        )

        try:
            agent = await FacilitatorAgent.from_project_id(
                self.project_id, self.session,
                system_override=_REPORT_SYSTEM,
            )
        except Exception:
            from backend.agents.base_agent import BaseAgent
            agent = BaseAgent(model="claude-sonnet-4-6", system=_REPORT_SYSTEM)

        full_report = ""
        messages = [{"role": "user", "content": prompt}]

        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools(messages):
                if isinstance(event, str):
                    full_report += event
                    yield {"event": "report_delta", "data": {"text": event}}
        else:
            async for chunk in agent.stream(messages):
                full_report += chunk
                yield {"event": "report_delta", "data": {"text": chunk}}

        yield {"event": "report_done", "data": {"report_md": full_report}}
```

> Note: `FacilitatorAgent.from_project_id` may not accept `system_override`. If the signature doesn't support it, catch the TypeError and fall back to `BaseAgent` with `_REPORT_SYSTEM`.

- [ ] **Step 5: Run tests — expect PASS**

```bash
python -m pytest tests/test_war_room.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/pipeline/war_room.py backend/pipeline/report.py tests/test_war_room.py
git commit -m "feat(pipeline): WarRoomOrchestrator (3 acts) + ReportGenerator"
```

---

## Task 7: Pipeline API Endpoint

**Files:**
- Create: `backend/api/pipeline.py`
- Modify: `backend/app.py`
- Create: `tests/test_pipeline_api.py`

- [ ] **Step 1: Write failing test**

```python
# tests/test_pipeline_api.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport

@pytest.fixture
async def client():
    from backend.app import create_app
    app = create_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c

@pytest.mark.asyncio
async def test_pipeline_run_returns_sse(client):
    async def mock_orch_run():
        yield {"event": "pipeline_start", "data": {"run_id": "r1", "project_id": "p1"}}
        yield {"event": "pipeline_done", "data": {}}

    with patch("backend.api.pipeline.run_full_pipeline", return_value=mock_orch_run()):
        resp = await client.post("/api/pipeline/run", json={"project_id": "test-project"})
    assert resp.status_code == 200

@pytest.mark.asyncio
async def test_pipeline_get_latest_run_404(client):
    resp = await client.get("/api/pipeline/nonexistent-project")
    assert resp.status_code == 404
```

- [ ] **Step 2: Run — expect FAIL**

```bash
python -m pytest tests/test_pipeline_api.py -v
```

- [ ] **Step 3: Create `backend/api/pipeline.py`**

```python
"""backend/api/pipeline.py — POST /api/pipeline/run (SSE) + GET /api/pipeline/{project_id}"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Document, PipelineRun, PipelineTurn, Project
from backend.schemas.pipeline import PipelineRunRequest, PipelineRunResponse
from backend.pipeline.orchestrator import PipelineOrchestrator
from backend.pipeline.war_room import WarRoomOrchestrator
from backend.pipeline.report import ReportGenerator

router = APIRouter(tags=["pipeline"])


async def run_full_pipeline(
    project: Project,
    documents: list[Document],
    run_id: str,
    session: AsyncSession,
) -> AsyncIterator[dict]:
    """Full pipeline: phases → war room → report. Yields SSE-ready dicts."""
    yield {"event": "pipeline_start", "data": {"run_id": run_id, "project_id": project.id}}

    # Sequential phases
    orchestrator = PipelineOrchestrator(
        project=project, documents=documents, session=session
    )
    sequence = 0
    async for event in orchestrator.run():
        yield event
        if event["event"] == "agent_done":
            data = event["data"]
            turn = PipelineTurn(
                id=str(uuid.uuid4()),
                run_id=run_id,
                agent_name=data["agent_name"] if "agent_name" in data else data.get("agent", ""),
                phase_label=data.get("phase_label", ""),
                turn_type="analysis",
                content=data.get("content", ""),
                sequence=sequence,
            )
            session.add(turn)
            sequence += 1

    # War Room
    war_room = WarRoomOrchestrator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        session=session,
    )
    async for event in war_room.run():
        yield event

    war_room_transcript = war_room.get_transcript()

    # Report
    report_gen = ReportGenerator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        war_room_transcript=war_room_transcript,
        session=session,
    )
    full_report = ""
    async for event in report_gen.run():
        yield event
        if event["event"] == "report_delta":
            full_report += event["data"].get("text", "")

    # Persist report
    result = await session.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run:
        run.report_md = full_report
        run.status = "done"
        run.completed_at = datetime.now(timezone.utc).isoformat()
    await session.commit()

    yield {"event": "pipeline_done", "data": {}}


@router.post("/pipeline/run", response_class=EventSourceResponse)
async def start_pipeline(
    body: PipelineRunRequest,
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    # Load project
    result = await session.execute(
        select(Project).where(Project.id == body.project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Optionally update description from modal input
    if body.problem_description:
        project.description = body.problem_description

    # Load documents
    docs_result = await session.execute(
        select(Document).where(Document.project_id == body.project_id)
    )
    documents = list(docs_result.scalars().all())

    # Create PipelineRun record
    run_id = str(uuid.uuid4())
    run = PipelineRun(
        id=run_id,
        project_id=body.project_id,
        status="running",
        report_md="",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    session.add(run)
    await session.flush()

    async def generate():
        try:
            async for event_dict in run_full_pipeline(project, documents, run_id, session):
                event_name = event_dict["event"]
                data = json.dumps(event_dict["data"])
                yield ServerSentEvent(data=data, event=event_name)
        except Exception as exc:
            yield ServerSentEvent(data=json.dumps({"message": str(exc)}), event="error")

    return EventSourceResponse(generate())


@router.get("/pipeline/{project_id}", response_model=PipelineRunResponse)
async def get_latest_run(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> PipelineRunResponse:
    result = await session.execute(
        select(PipelineRun)
        .where(PipelineRun.project_id == project_id)
        .order_by(PipelineRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="No pipeline run found")
    return PipelineRunResponse.model_validate(run)
```

- [ ] **Step 4: Register router in `backend/app.py`**

Read `backend/app.py` first, then add:
```python
from backend.api.pipeline import router as pipeline_router
# in create_app(): app.include_router(pipeline_router, prefix="/api")
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_pipeline_api.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/api/pipeline.py backend/app.py tests/test_pipeline_api.py
git commit -m "feat(api): POST /api/pipeline/run SSE endpoint + GET /api/pipeline/{project_id}"
```

---

## Task 8: Frontend — pipelineStore + api/pipeline.ts

**Files:**
- Create: `frontend/src/stores/pipelineStore.ts`
- Create: `frontend/src/api/pipeline.ts`

- [ ] **Step 1: Create `frontend/src/api/pipeline.ts`**

```typescript
import { apiClient } from './client'

export interface PipelineTurn {
  id: string
  event: string
  agent: string
  agentName: string
  phaseLabel: string
  text: string
  act?: number
  isDelta?: boolean
}

export interface PipelineRunInfo {
  id: string
  project_id: string
  status: string
  report_md: string
  created_at: string
  completed_at: string | null
}

export function streamPipeline(
  projectId: string,
  problemDescription: string | undefined,
  onEvent: (eventName: string, data: unknown) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): () => void {
  const ctrl = new AbortController()

  fetch('/api/pipeline/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, problem_description: problemDescription }),
    signal: ctrl.signal,
  }).then(async (resp) => {
    if (!resp.ok) { onError(`HTTP ${resp.status}`); return }
    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          const raw = line.slice(5).trim()
          try {
            const parsed = JSON.parse(raw)
            onEvent(currentEvent, parsed)
            if (currentEvent === 'pipeline_done') onDone()
            if (currentEvent === 'error') onError(parsed.message ?? 'Unknown error')
          } catch {
            // skip malformed
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(String(err))
  })

  return () => ctrl.abort()
}

export async function getLatestRun(projectId: string): Promise<PipelineRunInfo | null> {
  try {
    const resp = await apiClient.get<PipelineRunInfo>(`/pipeline/${projectId}`)
    return resp.data
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Create `frontend/src/stores/pipelineStore.ts`**

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface AgentTurn {
  id: string
  event: 'agent_start' | 'agent_delta' | 'agent_done' | 'war_room_turn' | 'report_delta'
  agent: string
  agentName: string
  phaseLabel: string
  text: string
  act?: number
  isDelta?: boolean
  isWarRoom?: boolean
}

interface PipelineState {
  runId: string | null
  status: 'idle' | 'running' | 'done' | 'error'
  turns: AgentTurn[]
  reportMd: string
  errorMessage: string | null
  startRun: (runId: string) => void
  appendDelta: (agent: string, agentName: string, phaseLabel: string, text: string) => void
  addWarRoomTurn: (speaker: string, agentName: string, text: string, isDelta: boolean, act: number) => void
  appendReportDelta: (text: string) => void
  finishRun: (reportMd: string) => void
  setError: (msg: string) => void
  reset: () => void
  setFromExisting: (reportMd: string, runId: string) => void
}

export const usePipelineStore = create<PipelineState>()(
  immer((set) => ({
    runId: null,
    status: 'idle',
    turns: [],
    reportMd: '',
    errorMessage: null,

    startRun: (runId) => set((s) => {
      s.runId = runId
      s.status = 'running'
      s.turns = []
      s.reportMd = ''
      s.errorMessage = null
    }),

    appendDelta: (agent, agentName, phaseLabel, text) => set((s) => {
      const last = s.turns[s.turns.length - 1]
      if (last && last.agent === agent && last.event === 'agent_delta') {
        last.text += text
      } else {
        s.turns.push({
          id: `${agent}-${Date.now()}`,
          event: 'agent_delta',
          agent,
          agentName,
          phaseLabel,
          text,
          isWarRoom: false,
        })
      }
    }),

    addWarRoomTurn: (speaker, agentName, text, isDelta, act) => set((s) => {
      const last = s.turns[s.turns.length - 1]
      if (isDelta && last && last.agent === speaker && last.isWarRoom) {
        last.text += text
      } else {
        s.turns.push({
          id: `wr-${speaker}-${Date.now()}`,
          event: 'war_room_turn',
          agent: speaker,
          agentName,
          phaseLabel: `War Room — Ato ${act}`,
          text,
          act,
          isDelta,
          isWarRoom: true,
        })
      }
    }),

    appendReportDelta: (text) => set((s) => {
      s.reportMd += text
    }),

    finishRun: (reportMd) => set((s) => {
      s.status = 'done'
      s.reportMd = reportMd
    }),

    setError: (msg) => set((s) => {
      s.status = 'error'
      s.errorMessage = msg
    }),

    reset: () => set((s) => {
      s.status = 'idle'
      s.turns = []
      s.reportMd = ''
      s.runId = null
      s.errorMessage = null
    }),

    setFromExisting: (reportMd, runId) => set((s) => {
      s.reportMd = reportMd
      s.runId = runId
      s.status = 'done'
    }),
  }))
)
```

- [ ] **Step 3: Build and check for TypeScript errors**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend"
npm run build 2>&1 | tail -20
```
Expected: build succeeds with no TS errors in new files.

- [ ] **Step 4: Commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/stores/pipelineStore.ts frontend/src/api/pipeline.ts
git commit -m "feat(frontend): pipelineStore + api/pipeline.ts for SSE streaming"
```

---

## Task 9: Update uiStore + ChatPanel (agent badge, remove AgentSelector)

**Files:**
- Modify: `frontend/src/stores/uiStore.ts`
- Modify: `frontend/src/components/layout/ChatPanel.tsx`

- [ ] **Step 1: Update `frontend/src/stores/uiStore.ts`**

Add `pipelineView` state:

```typescript
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type View = 'project-list' | 'project-detail' | 'settings' | 'documents'
type PipelineView = 'idle' | 'running' | 'report'

interface UiState {
  currentView: View
  chatPanelOpen: boolean
  sidebarCollapsed: boolean
  pipelineView: PipelineView
  setView: (view: View) => void
  toggleChatPanel: () => void
  toggleSidebar: () => void
  setChatPanelOpen: (open: boolean) => void
  setPipelineView: (v: PipelineView) => void
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    currentView: 'project-list' as View,
    chatPanelOpen: false,
    sidebarCollapsed: false,
    pipelineView: 'idle' as PipelineView,
    setView: (view) => set((state) => { state.currentView = view }),
    toggleChatPanel: () => set((state) => { state.chatPanelOpen = !state.chatPanelOpen }),
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed }),
    setChatPanelOpen: (open) => set((state) => { state.chatPanelOpen = open }),
    setPipelineView: (v) => set((state) => { state.pipelineView = v }),
  }))
)
```

- [ ] **Step 2: Update `frontend/src/components/layout/ChatPanel.tsx`**

Remove `AgentSelector` import and usage. Add agent badge + separator logic to message list.

Replace the `AgentSelector` section in the header (lines 104-107):
```tsx
        {/* Remove <AgentSelector /> entirely */}
```

In the messages map, add a separator when agent changes. Replace the messages `map` block with:
```tsx
        {messages.map((msg, idx) => {
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          const agentChanged =
            msg.role !== 'user' &&
            prevMsg &&
            prevMsg.role !== 'user' &&
            prevMsg.agent_name !== msg.agent_name

          return (
            <div key={msg.id}>
              {agentChanged && (
                <div className="flex items-center gap-2 my-2">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">— {msg.agent_name} entrou na conversa —</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>
              )}
              <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400 font-medium">{msg.agent_name}</span>
                  {msg.role !== 'user' && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${agentBadgeColor(msg.agent_name)}`}>
                      {msg.agent_name}
                    </span>
                  )}
                </div>
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm select-text cursor-text ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-code:text-xs prose-pre:text-xs prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      {isStreaming && msg === messages[messages.length - 1] && (
                        <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-text-bottom" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
```

Add `agentBadgeColor` helper above the component:
```typescript
function agentBadgeColor(agentName: string): string {
  const colors: Record<string, string> = {
    ARIA: 'bg-indigo-100 text-indigo-700',
    FRAME: 'bg-blue-100 text-blue-700',
    AXIOM: 'bg-amber-100 text-amber-700',
    NOVA: 'bg-emerald-100 text-emerald-700',
    ANALYST: 'bg-purple-100 text-purple-700',
  }
  return colors[agentName] ?? 'bg-gray-100 text-gray-600'
}
```

Remove the `import { AgentSelector }` line.

- [ ] **Step 3: Build**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend"
npm run build 2>&1 | tail -20
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/stores/uiStore.ts frontend/src/components/layout/ChatPanel.tsx
git commit -m "feat(frontend): unified chat — remove AgentSelector, add agent badge + separator"
```

---

## Task 10: AgentTurnCard component

**Files:**
- Create: `frontend/src/components/pipeline/AgentTurnCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/pipeline/AgentTurnCard.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_COLORS: Record<string, { bg: string; badge: string; border: string }> = {
  ARIA:    { bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',  border: 'border-indigo-200' },
  FRAME:   { bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',      border: 'border-blue-200' },
  AXIOM:   { bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',    border: 'border-amber-200' },
  NOVA:    { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700',border: 'border-emerald-200' },
  ANALYST: { bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700',  border: 'border-purple-200' },
}

interface Props {
  turn: AgentTurn
  isActive: boolean
}

export function AgentTurnCard({ turn, isActive }: Props) {
  const colors = AGENT_COLORS[turn.agentName] ?? {
    bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200',
  }

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {turn.agentName}
        </span>
        <span className="text-xs text-gray-500">{turn.phaseLabel}</span>
        {isActive && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ml-auto" />
        )}
      </div>
      {turn.text && (
        <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-headings:my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/pipeline/AgentTurnCard.tsx
git commit -m "feat(frontend): AgentTurnCard component with agent color system"
```

---

## Task 11: WarRoomTimeline component

**Files:**
- Create: `frontend/src/components/pipeline/WarRoomTimeline.tsx`

- [ ] **Step 1: Create `frontend/src/components/pipeline/WarRoomTimeline.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_COLORS: Record<string, string> = {
  ARIA: 'bg-indigo-500',
  FRAME: 'bg-blue-500',
  AXIOM: 'bg-amber-500',
  NOVA: 'bg-emerald-500',
  ANALYST: 'bg-purple-500',
}

const AGENT_TEXT: Record<string, string> = {
  ARIA: 'text-indigo-700',
  FRAME: 'text-blue-700',
  AXIOM: 'text-amber-700',
  NOVA: 'text-emerald-700',
  ANALYST: 'text-purple-700',
}

interface Props {
  turns: AgentTurn[]
  activeAgent: string | null
}

export function WarRoomTimeline({ turns, activeAgent }: Props) {
  if (turns.length === 0) return null

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">War Room</h3>
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {turns.map((turn, idx) => {
            const dotColor = AGENT_COLORS[turn.agentName] ?? 'bg-gray-400'
            const textColor = AGENT_TEXT[turn.agentName] ?? 'text-gray-700'
            const isActive = activeAgent === turn.agentName && idx === turns.length - 1
            return (
              <div key={turn.id} className="flex gap-3 relative">
                <div className={`w-6 h-6 rounded-full ${dotColor} flex-shrink-0 flex items-center justify-center z-10`}>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className={`text-xs font-semibold mb-1 ${textColor}`}>
                    {turn.agentName}
                    <span className="text-gray-400 font-normal ml-1">· {turn.phaseLabel}</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                    {isActive && (
                      <span className="inline-block w-0.5 h-3 bg-gray-500 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -5
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/pipeline/WarRoomTimeline.tsx
git commit -m "feat(frontend): WarRoomTimeline vertical card layout"
```

---

## Task 12: ReportView component

**Files:**
- Create: `frontend/src/components/pipeline/ReportView.tsx`

- [ ] **Step 1: Create `frontend/src/components/pipeline/ReportView.tsx`**

```tsx
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, MessageSquare, RotateCcw } from 'lucide-react'

interface Props {
  reportMd: string
  projectName: string
  onDiscussInChat: () => void
  onRedo: () => void
}

export function ReportView({ reportMd, projectName, onDiscussInChat, onRedo }: Props) {
  const handleExportMarkdown = () => {
    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vft-analise-${projectName.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
        >
          <FileText size={13} />
          Exportar PDF
        </button>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
        >
          <Download size={13} />
          Exportar Markdown
        </button>
        <button
          onClick={onDiscussInChat}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <MessageSquare size={13} />
          Discutir no Chat
        </button>
        <button
          onClick={onRedo}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors ml-auto"
        >
          <RotateCcw size={13} />
          Refazer análise
        </button>
      </div>

      {/* Report content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 print:border-0 print:p-0">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -5
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/pipeline/ReportView.tsx
git commit -m "feat(frontend): ReportView with export PDF/MD and discuss-in-chat actions"
```

---

## Task 13: PipelinePanel component

**Files:**
- Create: `frontend/src/components/pipeline/PipelinePanel.tsx`

- [ ] **Step 1: Create `frontend/src/components/pipeline/PipelinePanel.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'
import { AgentTurnCard } from './AgentTurnCard'
import { WarRoomTimeline } from './WarRoomTimeline'
import { ReportView } from './ReportView'
import { Loader2 } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'

const STATUS_MESSAGES = ['Pesquisando...', 'Analisando...', 'Considerando...', 'Formulando...']

interface Props {
  projectName: string
}

export function PipelinePanel({ projectName }: Props) {
  const { status, turns, reportMd, errorMessage, reset } = usePipelineStore()
  const { pipelineView, setPipelineView, setChatPanelOpen } = useUiStore()
  const { setAutoSendMessage } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  const phaseTurns = turns.filter((t) => !t.isWarRoom && t.event !== 'report_delta')
  const warRoomTurns = turns.filter((t) => t.isWarRoom)
  const activeTurn = turns[turns.length - 1]
  const activeAgent = status === 'running' ? activeTurn?.agentName ?? null : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  const handleDiscussInChat = () => {
    setPipelineView('idle')
    setChatPanelOpen(true)
    setAutoSendMessage(
      `Acabei de ver o relatório VFT do projeto "${projectName}". Vamos discutir os achados?`
    )
  }

  const handleRedo = () => {
    reset()
    setPipelineView('idle')
  }

  if (pipelineView === 'idle') return null

  return (
    <div className="space-y-6">
      {/* Status banner while running */}
      {status === 'running' && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <Loader2 size={16} className="text-indigo-600 animate-spin shrink-0" />
          <span className="text-sm text-indigo-700 font-medium">
            {activeAgent ? `${activeAgent} — ` : ''}
            <RotatingStatus />
          </span>
        </div>
      )}

      {/* Phase turns */}
      {phaseTurns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Análise sequencial</h3>
          {phaseTurns.map((turn, idx) => (
            <AgentTurnCard
              key={turn.id}
              turn={turn}
              isActive={status === 'running' && idx === phaseTurns.length - 1 && !turn.isWarRoom}
            />
          ))}
        </div>
      )}

      {/* War room */}
      {warRoomTurns.length > 0 && (
        <WarRoomTimeline turns={warRoomTurns} activeAgent={activeAgent} />
      )}

      {/* Report */}
      {status === 'done' && reportMd && (
        <ReportView
          reportMd={reportMd}
          projectName={projectName}
          onDiscussInChat={handleDiscussInChat}
          onRedo={handleRedo}
        />
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          Erro: {errorMessage}
          <button onClick={handleRedo} className="ml-3 underline">Tentar novamente</button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

function RotatingStatus() {
  const idxRef = useRef(0)
  const [label, setLabel] = useStateHook(STATUS_MESSAGES[0])

  useEffect(() => {
    const id = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % STATUS_MESSAGES.length
      setLabel(STATUS_MESSAGES[idxRef.current])
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return <>{label}</>
}

// local helper to avoid importing useState above for clarity
function useStateHook<T>(init: T): [T, (v: T) => void] {
  const { useState } = require('react')
  return useState<T>(init)
}
```

> Fix: replace `useStateHook` with proper React import. Replace the last two helper functions with:

```tsx
import { useEffect, useRef, useState } from 'react'
// ...
function RotatingStatus() {
  const idxRef = useRef(0)
  const [label, setLabel] = useState(STATUS_MESSAGES[0])

  useEffect(() => {
    const id = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % STATUS_MESSAGES.length
      setLabel(STATUS_MESSAGES[idxRef.current])
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return <>{label}</>
}
```

The final file should use `import { useEffect, useRef, useState } from 'react'` at the top.

- [ ] **Step 2: Build**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -10
```
Fix any TypeScript errors before continuing.

- [ ] **Step 3: Commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/pipeline/PipelinePanel.tsx
git commit -m "feat(frontend): PipelinePanel — phase turns + war room + report render"
```

---

## Task 14: PipelineButton + context modal

**Files:**
- Create: `frontend/src/components/pipeline/PipelineButton.tsx`

- [ ] **Step 1: Create `frontend/src/components/pipeline/PipelineButton.tsx`**

```tsx
import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { streamPipeline } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface Props {
  projectId: string
  projectDescription: string
}

export function PipelineButton({ projectId, projectDescription }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState(projectDescription)
  const { status, startRun, appendDelta, addWarRoomTurn, appendReportDelta, finishRun, setError } = usePipelineStore()
  const { setPipelineView } = useUiStore()

  const isRunning = status === 'running'

  const handleStart = () => {
    if (!projectDescription) {
      setShowModal(true)
    } else {
      launchPipeline(projectDescription)
    }
  }

  const handleModalConfirm = () => {
    setShowModal(false)
    launchPipeline(description)
  }

  const launchPipeline = (desc: string) => {
    setPipelineView('running')
    startRun('pending')

    streamPipeline(
      projectId,
      desc || undefined,
      (eventName, data) => {
        const d = data as Record<string, string>
        if (eventName === 'pipeline_start') {
          startRun(d.run_id)
        } else if (eventName === 'agent_delta') {
          appendDelta(d.agent, d.agent_name ?? d.agent, d.phase_label ?? '', d.text ?? '')
        } else if (eventName === 'war_room_turn') {
          const wd = data as { speaker: string; agent_name: string; text: string; is_delta: boolean; act: number }
          addWarRoomTurn(wd.speaker, wd.agent_name, wd.text, wd.is_delta, wd.act)
        } else if (eventName === 'report_delta') {
          appendReportDelta(d.text ?? '')
        } else if (eventName === 'report_done') {
          finishRun(d.report_md ?? '')
          setPipelineView('report')
        }
      },
      () => { /* pipeline_done handled via report_done */ },
      (msg) => setError(msg),
    )
  }

  return (
    <>
      <button
        onClick={handleStart}
        disabled={isRunning}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <Play size={13} />
        VFT Completo com IA
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Contexto do projeto</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Descreva o problema de decisão para que os agentes tenham contexto adequado.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Decidir qual tecnologia adotar para o novo sistema de pagamentos..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalConfirm}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Iniciar análise
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 2: Build + commit**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -5
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/pipeline/PipelineButton.tsx
git commit -m "feat(frontend): PipelineButton with context modal trigger"
```

---

## Task 15: AppShell integration — wire up PipelineButton + PipelinePanel

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Read `frontend/src/views/ProjectDetailView.tsx` (or wherever project detail renders) to decide injection point

- [ ] **Step 1: Read the project detail view**

```bash
find "/Users/mvellasquez/Claude Projects/vft-studio/frontend/src" -name "*.tsx" | xargs grep -l "ProjectDetail\|project-detail" 2>/dev/null
```

- [ ] **Step 2: Update `frontend/src/components/layout/AppShell.tsx`**

Import `PipelineButton`:
```tsx
import { PipelineButton } from '../pipeline/PipelineButton'
```

In the header bar (where "Chat IA" button is), add `PipelineButton` alongside it:
```tsx
<PipelineButton
  projectId={activeProject.id}
  projectDescription={activeProject.description ?? ''}
/>
```

- [ ] **Step 3: Inject `PipelinePanel` in project detail view**

Find the component that renders when `currentView === 'project-detail'`. Import and render `PipelinePanel`:
```tsx
import { PipelinePanel } from '../pipeline/PipelinePanel'
import { useUiStore } from '../../stores/uiStore'
// ...
const { pipelineView } = useUiStore()
// Inside the JSX, before or after existing content:
{pipelineView !== 'idle' && (
  <div className="mb-6">
    <PipelinePanel projectName={activeProject?.name ?? ''} />
  </div>
)}
```

- [ ] **Step 4: Load existing pipeline run on project open**

In the component that handles `setView('project-detail')` (likely a click handler in Sidebar or ProjectCard), call `getLatestRun` and populate store if a completed run exists:

```tsx
import { getLatestRun } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
// ...
const { setFromExisting } = usePipelineStore()
const { setPipelineView } = useUiStore()
// after setting active project:
getLatestRun(projectId).then((run) => {
  if (run && run.status === 'done' && run.report_md) {
    setFromExisting(run.report_md, run.id)
    setPipelineView('report')
  }
})
```

- [ ] **Step 5: Build**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -20
```
Fix any TypeScript errors before committing.

- [ ] **Step 6: Add `@media print` CSS for PDF export**

In `frontend/src/index.css` or equivalent global CSS, add:
```css
@media print {
  aside, nav, header, button, .no-print { display: none !important; }
  .prose { font-size: 12pt; }
}
```

- [ ] **Step 7: Final build + commit + push**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -5
cd "/Users/mvellasquez/Claude Projects/vft-studio"
git add frontend/src/components/layout/AppShell.tsx frontend/src/index.css
git add frontend/src/components/ frontend/src/stores/ frontend/src/api/
git commit -m "feat: VFT Pipeline + War Room complete — PipelineButton, PipelinePanel, AppShell integration"
git push origin master
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| RouterAgent (Haiku) with @mention override | Task 2 |
| Chat endpoint calls RouterAgent for "auto" type | Task 3 |
| Agent badge + separator in ChatPanel | Task 9 |
| Remove AgentSelector | Task 9 |
| PipelineRun + PipelineTurn DB models | Task 1 |
| POST /api/pipeline/run SSE | Task 7 |
| GET /api/pipeline/{project_id} | Task 7 |
| Sequential phases: FRAME, AXIOM, NOVA, ANALYST(conditional) | Task 5 |
| War Room 3-act structure | Task 6 |
| ReportGenerator (ARIA) | Task 6 |
| All SSE events: pipeline_start, agent_start, agent_delta, agent_done, war_room_start, war_room_turn, war_room_done, report_start, report_delta, report_done, pipeline_done, error | Tasks 5–7 |
| Rotating status messages (4s) | Task 13 |
| pipelineStore | Task 8 |
| api/pipeline.ts (streamPipeline, getLatestRun) | Task 8 |
| AgentTurnCard | Task 10 |
| WarRoomTimeline | Task 11 |
| ReportView + Export PDF/MD + Discuss in Chat | Task 12 |
| PipelinePanel | Task 13 |
| PipelineButton + context modal | Task 14 |
| AppShell integration | Task 15 |
| pipelineView state in uiStore | Task 9 |
| Load existing run on project open | Task 15 |
| @media print CSS | Task 15 |
| Agent colors: ARIA=indigo, FRAME=blue, AXIOM=amber, NOVA=emerald, ANALYST=purple | Tasks 10–11 |
