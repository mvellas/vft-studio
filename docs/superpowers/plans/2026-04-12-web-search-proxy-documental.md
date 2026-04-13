# Web Search + Proxy Documental Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Brave web search to ARIA/FRAME/ANALYST agents and a Document proxy system with a new ANALYST agent for documental value elicitation.

**Architecture:** Two parallel streams sharing `ToolAwareAgent` infrastructure. Stream A wires Brave Search into existing agents via SSE tool events. Stream B adds a `Document` DB table, CRUD API, ANALYST agent, and a DocumentPanel UI.

**Tech Stack:** Python/FastAPI/SQLAlchemy (backend), React/TypeScript/Zustand (frontend), Brave Search API (httpx), pypdf (text extraction)

---

## File Map

**Create:**
- `backend/tools/__init__.py`
- `backend/tools/brave_search.py`
- `backend/schemas/document.py`
- `backend/api/documents.py`
- `backend/agents/analyst_agent.py`
- `frontend/src/api/documents.ts`
- `frontend/src/components/documents/DocumentPanel.tsx`
- `frontend/src/components/documents/DocumentAnalystChat.tsx`
- `tests/test_brave_search.py`
- `tests/test_documents_api.py`

**Modify:**
- `backend/agents/base_agent.py` — add `ToolAwareAgent`, `ToolUseEvent`, `ToolResultEvent`
- `backend/agents/facilitator.py` — inherit `ToolAwareAgent`, add web_search
- `backend/agents/phase1_specialist.py` — same
- `backend/api/chat.py` — handle `ToolAwareAgent` stream + `analyst` agent type
- `backend/api/settings.py` — Brave key endpoints
- `backend/app.py` — load Brave key from keychain on startup, register documents router
- `backend/db/models.py` — add `Document` model
- `pyproject.toml` — add `pypdf>=4.0`
- `frontend/src/types/index.ts` — add `Document`, `ToolEvent` types
- `frontend/src/stores/chatStore.ts` — add `streamingToolState`
- `frontend/src/stores/uiStore.ts` — add `'documents'` to `View` type
- `frontend/src/hooks/useChat.ts` — handle `tool_use`/`tool_result` SSE events
- `frontend/src/api/chat.ts` — parse new SSE event types
- `frontend/src/components/layout/ChatPanel.tsx` — render tool state UI
- `frontend/src/components/layout/AgentSelector.tsx` — add ANALYST
- `frontend/src/components/layout/Sidebar.tsx` — add Documents nav item
- `frontend/src/App.tsx` — render DocumentPanel view

---

## Task 1: Brave Search client

**Files:**
- Create: `backend/tools/__init__.py`
- Create: `backend/tools/brave_search.py`
- Create: `tests/test_brave_search.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_brave_search.py
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from backend.tools.brave_search import brave_search


class TestBraveSearch:
    @pytest.mark.asyncio
    async def test_returns_formatted_results(self):
        mock_data = {
            "web": {
                "results": [
                    {"title": "Lei 12.608", "url": "https://lei.gov.br/12608", "description": "Proteção civil"},
                    {"title": "Defesa Civil", "url": "https://defesa.gov.br", "description": "Portal"},
                ]
            }
        }
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_data
        mock_response.raise_for_status = MagicMock()

        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(return_value=mock_response)

        with patch("backend.tools.brave_search.httpx.AsyncClient", return_value=mock_client):
            text, count = await brave_search("Lei 12.608", api_key="test-key", count=2)

        assert count == 2
        assert "Lei 12.608" in text
        assert "https://lei.gov.br/12608" in text

    @pytest.mark.asyncio
    async def test_no_api_key_returns_unavailable(self):
        text, count = await brave_search("query", api_key="", count=5)
        assert count == 0
        assert "não está disponível" in text

    @pytest.mark.asyncio
    async def test_http_error_returns_error_message(self):
        import httpx
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        mock_client.get = AsyncMock(side_effect=httpx.HTTPError("timeout"))

        with patch("backend.tools.brave_search.httpx.AsyncClient", return_value=mock_client):
            text, count = await brave_search("query", api_key="test-key")

        assert count == 0
        assert "Erro" in text
```

- [ ] **Step 2: Run test — expect ImportError (module doesn't exist)**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
python -m pytest tests/test_brave_search.py -v 2>&1 | head -30
```

Expected: `ModuleNotFoundError: No module named 'backend.tools'`

- [ ] **Step 3: Create `backend/tools/__init__.py`**

```python
# backend/tools/__init__.py
```

(empty file)

- [ ] **Step 4: Create `backend/tools/brave_search.py`**

```python
"""
backend/tools/brave_search.py
==============================
Brave Search API client. Returns (formatted_text, result_count).
Silent graceful degradation when api_key is empty.
"""
from __future__ import annotations

import httpx


async def brave_search(query: str, api_key: str, count: int = 5) -> tuple[str, int]:
    """Search Brave and return (formatted_results_text, count).

    Returns ("Busca na web não está disponível...", 0) when api_key is empty.
    Returns ("Erro na busca: ...", 0) on HTTP failure.
    """
    if not api_key:
        return "Busca na web não está disponível. Configure uma Brave Search API key nas configurações.", 0

    url = "https://api.search.brave.com/res/v1/web/search"
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": api_key,
    }
    params = {"q": query, "count": count}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        return f"Erro na busca: {str(exc)[:200]}", 0

    results = data.get("web", {}).get("results", [])
    if not results:
        return "Nenhum resultado encontrado.", 0

    lines = [f"RESULTADOS DA BUSCA ({len(results)}):\n"]
    for i, r in enumerate(results, 1):
        title = r.get("title", "(sem título)")
        url_r = r.get("url", "")
        snippet = r.get("description", "")
        lines.append(f"{i}. {title}\n   URL: {url_r}\n   {snippet}\n")

    return "\n".join(lines), len(results)
```

- [ ] **Step 5: Run tests — all 3 pass**

```bash
python -m pytest tests/test_brave_search.py -v
```

Expected: `3 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/tools/__init__.py backend/tools/brave_search.py tests/test_brave_search.py
git commit -m "feat(tools): add Brave Search API client with graceful degradation"
```

---

## Task 2: ToolAwareAgent base class

**Files:**
- Modify: `backend/agents/base_agent.py`

- [ ] **Step 1: Write the failing test**

Add to `tests/test_agents.py`:

```python
from backend.agents.base_agent import ToolAwareAgent, ToolUseEvent, ToolResultEvent
import json


class TestToolAwareAgent:
    def test_tool_aware_agent_init(self):
        tools = [{"name": "web_search", "description": "Search the web"}]
        agent = ToolAwareAgent(model="claude-sonnet-4-6", system="test", tools=tools)
        assert agent.tools == tools

    @pytest.mark.asyncio
    async def test_stream_with_tools_yields_tool_events_then_text(self):
        tools = [{"name": "web_search", "description": "Search", "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}}]

        # Mock first call: stop_reason=tool_use
        mock_tool_block = MagicMock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.id = "tu_123"
        mock_tool_block.name = "web_search"
        mock_tool_block.input = {"query": "test query"}

        first_response = MagicMock()
        first_response.stop_reason = "tool_use"
        first_response.content = [mock_tool_block]

        # model_dump for assistant message reconstruction
        mock_tool_block.model_dump = MagicMock(return_value={"type": "tool_use", "id": "tu_123", "name": "web_search", "input": {"query": "test query"}})

        # Mock second call: stop_reason=end_turn (streaming)
        second_response = MagicMock()
        second_response.stop_reason = "end_turn"
        second_response.content = []

        # Mock streaming context
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_ctx)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

        async def fake_text_stream():
            yield "Resultado "
            yield "da busca."

        mock_stream_ctx.text_stream = fake_text_stream()

        agent = ToolAwareAgent(model="claude-sonnet-4-6", system="test", tools=tools)

        async def fake_execute_tool(name, tool_input):
            return "5 results found", {"count": 5}

        agent.execute_tool = fake_execute_tool

        with patch.object(agent.client.messages, "create", new=AsyncMock(return_value=first_response)), \
             patch.object(agent.client.messages, "stream", return_value=mock_stream_ctx):
            events = []
            async for event in agent.stream_with_tools([{"role": "user", "content": "search"}]):
                events.append(event)

        tool_use_events = [e for e in events if isinstance(e, ToolUseEvent)]
        tool_result_events = [e for e in events if isinstance(e, ToolResultEvent)]
        text_events = [e for e in events if isinstance(e, str)]

        assert len(tool_use_events) == 1
        assert tool_use_events[0].name == "web_search"
        assert tool_use_events[0].input == {"query": "test query"}
        assert len(tool_result_events) == 1
        assert tool_result_events[0].metadata["count"] == 5
        assert "".join(text_events) == "Resultado da busca."
```

- [ ] **Step 2: Run test — expect ImportError**

```bash
python -m pytest tests/test_agents.py::TestToolAwareAgent -v 2>&1 | head -20
```

Expected: `ImportError: cannot import name 'ToolAwareAgent'`

- [ ] **Step 3: Add ToolAwareAgent to `backend/agents/base_agent.py`**

Append after the existing `BaseAgent` class:

```python
import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class ToolUseEvent:
    """Emitted when the model requests a tool call."""
    name: str
    input: dict[str, Any]


@dataclass
class ToolResultEvent:
    """Emitted after a tool call completes."""
    name: str
    result: str          # Full text sent back to the model
    metadata: dict[str, Any] = field(default_factory=dict)  # UI-facing data (e.g. count)


# Union type for stream_with_tools() yields
StreamChunk = str | ToolUseEvent | ToolResultEvent


class ToolAwareAgent(BaseAgent):
    """BaseAgent extended with Anthropic tool-use loop support.

    Subclasses override execute_tool() to implement specific tools.
    stream_with_tools() drives the full tool_use → tool_result → final_stream cycle,
    yielding ToolUseEvent / ToolResultEvent / str chunks for the SSE layer.
    """

    def __init__(self, model: str = "claude-sonnet-4-6", system: str = "", tools: list[dict] | None = None) -> None:
        super().__init__(model=model, system=system)
        self.tools: list[dict] = tools or []

    async def execute_tool(self, name: str, tool_input: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        """Execute a tool call. Returns (content_for_llm, ui_metadata).

        Override in subclasses to implement specific tools.
        """
        return f"Tool '{name}' not implemented.", {}

    async def stream_with_tools(self, messages: list[dict]) -> AsyncGenerator[StreamChunk, None]:
        """Drive the tool-use loop then stream the final text response.

        Yields ToolUseEvent before each tool call, ToolResultEvent after,
        then str chunks for the final streamed response.
        """
        current_messages = list(messages)

        # Non-streaming call to get initial response (may request tool use)
        for attempt in range(3):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=4096,
                    system=self.system,
                    tools=self.tools,
                    messages=current_messages,
                )
                break
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)

        # Tool-use loop
        while response.stop_reason == "tool_use":
            tool_blocks = [b for b in response.content if b.type == "tool_use"]
            tool_results = []

            for block in tool_blocks:
                yield ToolUseEvent(name=block.name, input=block.input)
                result_text, metadata = await self.execute_tool(block.name, block.input)
                yield ToolResultEvent(name=block.name, result=result_text, metadata=metadata)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                })

            # Rebuild messages with full assistant turn + tool results
            assistant_content = [b.model_dump() for b in response.content]
            current_messages = current_messages + [
                {"role": "assistant", "content": assistant_content},
                {"role": "user", "content": tool_results},
            ]

            for attempt in range(3):
                try:
                    response = await self.client.messages.create(
                        model=self.model,
                        max_tokens=4096,
                        system=self.system,
                        tools=self.tools,
                        messages=current_messages,
                    )
                    break
                except Exception:
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2 ** attempt)

        # Stream final text response
        for attempt in range(3):
            try:
                async with self.client.messages.stream(
                    model=self.model,
                    max_tokens=4096,
                    system=self.system,
                    messages=current_messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
                return
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
```

Also add `import json` to the top of `base_agent.py` (it's already imported in the dataclass section above — just make sure `AsyncGenerator` is imported):

```python
from typing import AsyncGenerator
```

(already present in the file; add `Any` to the import)

Full updated imports for `base_agent.py`:

```python
from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator
```

- [ ] **Step 4: Run tests**

```bash
python -m pytest tests/test_agents.py::TestToolAwareAgent -v
```

Expected: `2 passed`

- [ ] **Step 5: Commit**

```bash
git add backend/agents/base_agent.py tests/test_agents.py
git commit -m "feat(agents): add ToolAwareAgent with tool-use loop and SSE event types"
```

---

## Task 3: Backend Brave key settings

**Files:**
- Modify: `backend/api/settings.py`
- Modify: `backend/app.py`

- [ ] **Step 1: Write failing test**

Add to `tests/test_api.py`:

```python
class TestBraveSettings:
    def test_get_brave_key_status_no_key(self, client):
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

    def test_save_brave_key_empty_rejected(self, client):
        r = client.put("/api/settings/brave-api-key", json={"api_key": ""})
        assert r.status_code == 422

    def test_test_brave_connection_no_key(self, client):
        r = client.post("/api/settings/test-brave-connection", json={})
        assert r.status_code == 200
        data = r.json()
        assert data["success"] is False
```

- [ ] **Step 2: Run test — expect 404**

```bash
python -m pytest tests/test_api.py::TestBraveSettings -v 2>&1 | head -20
```

Expected: `FAILED` with `404 Not Found`

- [ ] **Step 3: Add Brave key endpoints to `backend/api/settings.py`**

Add after the existing constants:

```python
_BRAVE_KEYRING_USERNAME = "brave-api-key"
```

Add these helper functions after the existing `_try_keyring_get`:

```python
def _try_brave_keyring_set(key: str) -> None:
    try:
        import keyring
        keyring.set_password(_KEYRING_SERVICE, _BRAVE_KEYRING_USERNAME, key)
    except Exception:
        pass


def _try_brave_keyring_get() -> str | None:
    try:
        import keyring
        return keyring.get_password(_KEYRING_SERVICE, _BRAVE_KEYRING_USERNAME)
    except Exception:
        return None


def get_brave_api_key() -> str:
    """Return Brave API key from Keychain or env. Empty string if not set."""
    return _try_brave_keyring_get() or os.environ.get("BRAVE_SEARCH_API_KEY", "")
```

Add these endpoints:

```python
@router.get("/brave-api-key", response_model=ApiKeyStatus)
async def get_brave_api_key_status() -> ApiKeyStatus:
    """Return whether a Brave Search API key is configured."""
    key = get_brave_api_key()
    if key:
        source = "keychain" if _try_brave_keyring_get() else "env"
        preview = f"****...{key[-4:]}" if len(key) >= 4 else "****"
        return ApiKeyStatus(has_key=True, key_preview=preview, source=source)
    return ApiKeyStatus(has_key=False, key_preview="", source="none")


@router.put("/brave-api-key", response_model=ApiKeyStatus)
async def save_brave_api_key(body: ApiKeyRequest) -> ApiKeyStatus:
    """Save Brave Search API key to macOS Keychain."""
    key = body.api_key.strip()
    if not key:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="API key cannot be empty.")
    _try_brave_keyring_set(key)
    os.environ["BRAVE_SEARCH_API_KEY"] = key
    preview = f"****...{key[-4:]}"
    return ApiKeyStatus(has_key=True, key_preview=preview, source="keychain")


@router.delete("/brave-api-key", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brave_api_key() -> None:
    """Remove Brave API key from Keychain and env."""
    try:
        import keyring
        keyring.delete_password(_KEYRING_SERVICE, _BRAVE_KEYRING_USERNAME)
    except Exception:
        pass
    os.environ.pop("BRAVE_SEARCH_API_KEY", None)


@router.post("/test-brave-connection", response_model=ConnectionTestResult)
async def test_brave_connection() -> ConnectionTestResult:
    """Test if the Brave Search API key works."""
    key = get_brave_api_key()
    if not key:
        return ConnectionTestResult(success=False, message="Nenhuma Brave API key configurada.")
    from backend.tools.brave_search import brave_search
    text, count = await brave_search("test", api_key=key, count=1)
    if count > 0:
        return ConnectionTestResult(success=True, message=f"Conexão com Brave Search estabelecida.")
    if "Erro" in text:
        return ConnectionTestResult(success=False, message=text[:120])
    return ConnectionTestResult(success=True, message="Brave Search acessível.")
```

- [ ] **Step 4: Add Brave key loader to `backend/app.py`**

After `_load_api_key_from_keychain()`, add:

```python
def _load_brave_key_from_keychain() -> None:
    """On startup: load Brave Search API key from macOS Keychain into env."""
    if os.environ.get("BRAVE_SEARCH_API_KEY"):
        return
    try:
        import keyring
        key = keyring.get_password("vft-studio", "brave-api-key")
        if key:
            os.environ["BRAVE_SEARCH_API_KEY"] = key
    except Exception:
        pass
```

In the `lifespan` function, add the call:

```python
@asynccontextmanager
async def lifespan(application: FastAPI):
    _load_api_key_from_keychain()
    _load_brave_key_from_keychain()
    await init_db()
    yield
```

- [ ] **Step 5: Run tests**

```bash
python -m pytest tests/test_api.py::TestBraveSettings -v
```

Expected: `4 passed`

- [ ] **Step 6: Commit**

```bash
git add backend/api/settings.py backend/app.py tests/test_api.py
git commit -m "feat(settings): add Brave Search API key management endpoints"
```

---

## Task 4: Wire ARIA and FRAME with web_search

**Files:**
- Modify: `backend/agents/facilitator.py`
- Modify: `backend/agents/phase1_specialist.py`
- Modify: `backend/api/chat.py`

- [ ] **Step 1: Read `backend/agents/phase1_specialist.py` to understand its structure**

```bash
head -60 "backend/agents/phase1_specialist.py"
```

- [ ] **Step 2: Update `backend/agents/facilitator.py`**

Change the class to inherit from `ToolAwareAgent` and define the web_search tool:

```python
from backend.agents.base_agent import ToolAwareAgent
from backend.api.settings import get_brave_api_key
from backend.tools.brave_search import brave_search

WEB_SEARCH_TOOL = {
    "name": "web_search",
    "description": (
        "Search the web for current legislation, public data, academic references, "
        "and other information relevant to the VFT decision context. "
        "Use when the user asks about specific laws, regulations, or external context "
        "that may not be in the project data. Always cite sources in your response."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "query": {
                "type": "string",
                "description": "Search query in the most specific terms possible.",
            }
        },
        "required": ["query"],
    },
}


class FacilitatorAgent(ToolAwareAgent):
    """ARIA — Master VFT Facilitator with optional web search."""

    def __init__(self, project_context: dict, model: str = "claude-opus-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])
        self.project_context = project_context

    async def execute_tool(self, name: str, tool_input: dict) -> tuple[str, dict]:
        if name == "web_search":
            query = tool_input.get("query", "")
            api_key = get_brave_api_key()
            result_text, count = await brave_search(query, api_key=api_key)
            return result_text, {"count": count, "query": query}
        return f"Tool '{name}' not implemented.", {}
```

Keep all existing `_render_prompt()` and `from_project_id()` methods unchanged.

- [ ] **Step 3: Update `backend/agents/phase1_specialist.py`**

Apply the same pattern — change `BaseAgent` → `ToolAwareAgent`, add import, add `WEB_SEARCH_TOOL` constant (can import from facilitator or redefine), add `execute_tool()`. The `__init__` must call `super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])`.

```python
from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import WEB_SEARCH_TOOL
from backend.api.settings import get_brave_api_key
from backend.tools.brave_search import brave_search

class Phase1SpecialistAgent(ToolAwareAgent):
    def __init__(self, project_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])
        self.project_context = project_context

    async def execute_tool(self, name: str, tool_input: dict) -> tuple[str, dict]:
        if name == "web_search":
            query = tool_input.get("query", "")
            api_key = get_brave_api_key()
            result_text, count = await brave_search(query, api_key=api_key)
            return result_text, {"count": count, "query": query}
        return f"Tool '{name}' not implemented.", {}
```

Keep `_render_prompt()` and `from_project_id()` unchanged.

- [ ] **Step 4: Update `backend/api/chat.py` — handle ToolAwareAgent stream**

Add import at top:

```python
import json
from backend.agents.base_agent import ToolAwareAgent, ToolUseEvent, ToolResultEvent
```

Replace the `generate()` function inside `chat_message`:

```python
async def generate():
    full_response = ""
    try:
        if isinstance(agent, ToolAwareAgent):
            async for event in agent.stream_with_tools(messages):
                if isinstance(event, ToolUseEvent):
                    data = json.dumps({"name": event.name, "query": event.input.get("query", "")})
                    yield ServerSentEvent(data=data, event="tool_use")
                elif isinstance(event, ToolResultEvent):
                    data = json.dumps({"name": event.name, **event.metadata})
                    yield ServerSentEvent(data=data, event="tool_result")
                else:  # str
                    full_response += event
                    yield ServerSentEvent(data=event, event="delta")
        else:
            async for chunk in agent.stream(messages):
                full_response += chunk
                yield ServerSentEvent(data=chunk, event="delta")
    except Exception as exc:
        yield ServerSentEvent(data=str(exc), event="error")
        return

    await msg_repo.create(
        session_id=chat_session.id,
        project_id=body.project_id,
        timestamp=datetime.now(timezone.utc).isoformat(),
        role=body.agent_type,
        agent_name=config["name"],
        content=full_response,
    )
    await session.commit()

    yield ServerSentEvent(data="[DONE]", event="done")
```

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
python -m pytest tests/test_agents.py tests/test_api.py -v 2>&1 | tail -20
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add backend/agents/facilitator.py backend/agents/phase1_specialist.py backend/api/chat.py
git commit -m "feat(agents): wire ARIA and FRAME with web_search via ToolAwareAgent"
```

---

## Task 5: Frontend — ChatPanel tool event rendering

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/stores/chatStore.ts`
- Modify: `frontend/src/api/chat.ts`
- Modify: `frontend/src/hooks/useChat.ts`
- Modify: `frontend/src/components/layout/ChatPanel.tsx`

- [ ] **Step 1: Add `ToolEvent` type to `frontend/src/types/index.ts`**

Append:

```typescript
export interface ToolEvent {
  type: 'tool_use' | 'tool_result'
  name: string
  query?: string   // present in tool_use
  count?: number   // present in tool_result
}
```

- [ ] **Step 2: Add `streamingToolState` to `frontend/src/stores/chatStore.ts`**

Update the `ChatState` interface:

```typescript
interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  activeAgent: string
  activeAgentType: string
  streamingToolState: ToolEvent | null   // current tool event during streaming
  addMessage: (message: ChatMessage) => void
  appendToLastMessage: (text: string) => void
  setStreaming: (streaming: boolean) => void
  setActiveAgent: (agentName: string, agentType: string) => void
  clearMessages: () => void
  setToolState: (event: ToolEvent | null) => void
}
```

Add import: `import type { ChatMessage, ToolEvent } from '../types'`

Add to initial state: `streamingToolState: null,`

Add action: `setToolState: (event) => set((state) => { state.streamingToolState = event }),`

- [ ] **Step 3: Update `frontend/src/api/chat.ts` — parse tool_use/tool_result events**

Replace `streamChatMessage` signature with new callbacks:

```typescript
export function streamChatMessage(
  message: string,
  projectId: string,
  agentType: string,
  onDelta: (text: string) => void,
  onToolUse: (event: { name: string; query: string }) => void,
  onToolResult: (event: { name: string; count: number }) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
```

In the SSE parsing loop, add handling for new event types:

```typescript
if (lastEventType === 'done' || data === '[DONE]') {
  onDone()
  return
}
if (lastEventType === 'error') {
  onError(data)
  return
}
if (lastEventType === 'tool_use') {
  try { onToolUse(JSON.parse(data)) } catch {}
  continue  // don't call onDelta
}
if (lastEventType === 'tool_result') {
  try { onToolResult(JSON.parse(data)) } catch {}
  continue
}
onDelta(data)
```

- [ ] **Step 4: Update `frontend/src/hooks/useChat.ts`**

Import `setToolState` from chatStore. Pass new callbacks to `streamChatMessage`:

```typescript
const { addMessage, appendToLastMessage, setStreaming, setToolState, activeAgent, activeAgentType } = useChatStore()

// In sendMessage():
abortRef.current = streamChatMessage(
  text,
  activeProjectId,
  resolvedAgentType,
  (delta) => appendToLastMessage(delta),
  (event) => setToolState({ type: 'tool_use', name: event.name, query: event.query }),
  (event) => setToolState({ type: 'tool_result', name: event.name, count: event.count }),
  () => {
    setToolState(null)
    setStreaming(false)
  },
  (error) => {
    setToolState(null)
    appendToLastMessage(`\n\n[Erro: ${error}]`)
    setStreaming(false)
  },
)
```

- [ ] **Step 5: Update `frontend/src/components/layout/ChatPanel.tsx`**

Add imports: `import { Globe, CheckCircle } from 'lucide-react'`

Import `streamingToolState` from chatStore:

```typescript
const { messages, isStreaming, activeAgent, activeAgentType, addMessage, streamingToolState } = useChatStore()
```

Add tool state display between messages list and input area — inside the messages `<div>`, after the messages map and before `<div ref={messagesEndRef} />`:

```tsx
{streamingToolState?.type === 'tool_use' && (
  <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse px-1">
    <Globe size={12} />
    Pesquisando: "{streamingToolState.query}"
  </div>
)}
{streamingToolState?.type === 'tool_result' && (
  <div className="flex items-center gap-2 text-xs text-emerald-600 px-1">
    <CheckCircle size={12} />
    {streamingToolState.count} resultado{streamingToolState.count !== 1 ? 's' : ''} encontrado{streamingToolState.count !== 1 ? 's' : ''}
  </div>
)}
```

- [ ] **Step 6: Build check**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend"
npm run build 2>&1 | tail -20
```

Expected: no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/stores/chatStore.ts frontend/src/api/chat.ts frontend/src/hooks/useChat.ts frontend/src/components/layout/ChatPanel.tsx
git commit -m "feat(chat): render tool_use/tool_result SSE events in ChatPanel"
```

---

## Task 6: Frontend Settings — Brave key section

**Files:**
- Modify: `frontend/src/components/project/SettingsView.tsx`

- [ ] **Step 1: Update `SettingsView.tsx`**

Add a second state block for the Brave key, mirroring the Anthropic key pattern. Add these state vars:

```typescript
const [braveStatus, setBraveStatus] = useState<ApiKeyStatus | null>(null)
const [braveInput, setBraveInput] = useState('')
const [braveSaving, setBraveSaving] = useState(false)
const [braveTesting, setBraveTesting] = useState(false)
const [braveTestResult, setBraveTestResult] = useState<TestResult | null>(null)
const [braveSaveError, setBraveSaveError] = useState<string | null>(null)
```

In `useEffect`, also load Brave key status:

```typescript
useEffect(() => {
  apiClient.get<ApiKeyStatus>('/api/settings/api-key').then(r => setStatus(r.data)).catch(() => {})
  apiClient.get<ApiKeyStatus>('/api/settings/brave-api-key').then(r => setBraveStatus(r.data)).catch(() => {})
}, [])
```

Add handlers:

```typescript
const handleSaveBrave = async () => {
  setBraveSaving(true)
  setBraveSaveError(null)
  setBraveTestResult(null)
  try {
    const r = await apiClient.put<ApiKeyStatus>('/api/settings/brave-api-key', { api_key: braveInput })
    setBraveStatus(r.data)
    setBraveInput('')
  } catch (e: unknown) {
    setBraveSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
  } finally {
    setBraveSaving(false)
  }
}

const handleDeleteBrave = async () => {
  if (!confirm('Remover a Brave API key salva?')) return
  await apiClient.delete('/api/settings/brave-api-key')
  setBraveStatus({ has_key: false, key_preview: '', source: 'none' })
  setBraveTestResult(null)
}

const handleTestBrave = async () => {
  setBraveTesting(true)
  setBraveTestResult(null)
  try {
    const r = await apiClient.post<TestResult>('/api/settings/test-brave-connection', {})
    setBraveTestResult(r.data)
  } catch {
    setBraveTestResult({ success: false, message: 'Erro ao testar conexão.' })
  } finally {
    setBraveTesting(false)
  }
}
```

Add the Brave key section in the JSX, after the Anthropic API Key card and before the About card. Import `Globe` from lucide-react:

```tsx
{/* Brave Search API Key section */}
<div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
  <div className="flex items-center gap-2">
    <Globe size={18} className="text-indigo-600" />
    <h2 className="font-semibold text-gray-900">Brave Search API Key</h2>
    <span className="text-xs text-gray-400 ml-1">(opcional)</span>
  </div>
  <p className="text-sm text-gray-500">
    Permite que ARIA, FRAME e ANALYST pesquisem na internet. Obtenha gratuitamente em{' '}
    <span className="font-mono text-xs">brave.com/search/api</span> (2.000 buscas/mês).
  </p>

  {braveStatus && (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
      braveStatus.has_key ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
    }`}>
      {braveStatus.has_key ? (
        <>
          <CheckCircle size={16} className="text-green-600 shrink-0" />
          <span className="text-green-800">
            Brave key configurada ({braveStatus.source}) — <code className="font-mono">{braveStatus.key_preview}</code>
          </span>
          <button onClick={handleDeleteBrave} className="ml-auto text-gray-400 hover:text-red-500 transition-colors" title="Remover">
            <Trash2 size={14} />
          </button>
        </>
      ) : (
        <span className="text-gray-500">Busca na web não configurada — agentes usarão apenas dados locais.</span>
      )}
    </div>
  )}

  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">
      {braveStatus?.has_key ? 'Atualizar Brave Key' : 'Inserir Brave Key'}
    </label>
    <div className="flex gap-2">
      <input
        type="password"
        value={braveInput}
        onChange={e => setBraveInput(e.target.value)}
        placeholder="BSA..."
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <button
        onClick={handleSaveBrave}
        disabled={braveSaving || !braveInput.trim()}
        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {braveSaving ? <Loader2 size={15} className="animate-spin" /> : 'Salvar'}
      </button>
    </div>
    {braveSaveError && <p className="text-xs text-red-600">{braveSaveError}</p>}
  </div>

  <div className="flex items-center gap-3">
    <button
      onClick={handleTestBrave}
      disabled={braveTesting || !braveStatus?.has_key}
      className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
    >
      {braveTesting ? <Loader2 size={14} className="animate-spin" /> : null}
      Testar Conexão
    </button>
    {braveTestResult && (
      <div className={`flex items-center gap-2 text-sm ${braveTestResult.success ? 'text-green-700' : 'text-red-600'}`}>
        {braveTestResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
        {braveTestResult.message}
      </div>
    )}
  </div>
</div>
```

- [ ] **Step 2: Build check**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -10
```

Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/project/SettingsView.tsx
git commit -m "feat(settings): add Brave Search API key section to SettingsView"
```

---

## Task 7: Frontend Onboarding — Brave key screen

**Files:**
- Modify: `frontend/src/components/project/OnboardingFlow.tsx`

- [ ] **Step 1: Read the full OnboardingFlow.tsx**

Read lines 1-120 to see the complete component.

- [ ] **Step 2: Add Brave key screen as screen index 2 (insert between api-key and ready)**

Update the `SCREENS` array to 4 entries:

```typescript
const SCREENS = [
  {
    id: 'welcome',
    icon: BookOpen,
    title: 'Bem-vindo ao VFT Studio',
    body: `VFT Studio é um facilitador inteligente do processo Value-Focused Thinking — uma metodologia de apoio à decisão que estrutura o problema a partir dos seus valores e objetivos, não apenas das alternativas disponíveis.\n\nEm 3 fases e 33 passos, você e sua equipe vão do enquadramento inicial à avaliação de alternativas, com suporte contínuo de agentes de IA especializados.`,
    action: 'Começar',
  },
  {
    id: 'api-key',
    icon: Key,
    title: 'Configure sua API Key',
    body: `Os agentes de IA (ARIA, FRAME, AXIOM, NOVA) usam a Anthropic Claude API.\n\nVocê precisará de uma API key para usar o chat. Obtenha a sua em console.anthropic.com.\n\nA chave é armazenada localmente no macOS Keychain — nunca é enviada a terceiros.`,
    action: 'Continuar',
  },
  {
    id: 'brave-key',
    icon: Globe,
    title: 'Busca na Web (opcional)',
    body: `Os agentes ARIA, FRAME e ANALYST podem pesquisar na internet para buscar legislações, referências e dados públicos.\n\nVocê precisará de uma Brave Search API key.\nObtenha gratuitamente em brave.com/search/api (2.000 buscas/mês).`,
    action: 'Continuar',
  },
  {
    id: 'ready',
    icon: FolderPlus,
    title: 'Tudo pronto!',
    body: `Crie seu primeiro projeto VFT para começar.\n\nCada projeto representa uma decisão que você quer estruturar. Você pode ter vários projetos e retomar cada um de onde parou.\n\nO assistente ARIA vai te guiar pelo processo do início ao fim.`,
    action: 'Criar primeiro projeto',
  },
]
```

Add `Globe` to lucide-react import.

Add `braveKey` and `braveSaved` state vars:

```typescript
const [braveKey, setBraveKey] = useState('')
const [braveSaved, setBraveSaved] = useState(false)
```

Add `isBraveKeyScreen` check:

```typescript
const isBraveKeyScreen = current.id === 'brave-key'
const isLast = screen === SCREENS.length - 1
```

Add `handleSaveBraveKey`:

```typescript
const handleSaveBraveKey = async () => {
  if (!braveKey.trim()) {
    setScreen(s => s + 1)
    return
  }
  setSaving(true)
  setSaveError(null)
  try {
    await apiClient.put('/api/settings/brave-api-key', { api_key: braveKey.trim() })
    setBraveSaved(true)
    setTimeout(() => setScreen(s => s + 1), 600)
  } catch (e: unknown) {
    setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
  } finally {
    setSaving(false)
  }
}
```

Update `handleNext` to branch on `isBraveKeyScreen`:

```typescript
const handleNext = async () => {
  if (isApiKeyScreen) {
    handleSaveKey()
    return
  }
  if (isBraveKeyScreen) {
    handleSaveBraveKey()
    return
  }
  if (isLast) {
    await apiClient.post('/api/settings/onboarding-completed', {}).catch(() => {})
    onComplete()
    return
  }
  setScreen(s => s + 1)
}
```

In the JSX, add input field for Brave key screen alongside the existing API key input. After the existing `isApiKeyScreen && (...)` block, add:

```tsx
{isBraveKeyScreen && (
  <div className="space-y-2">
    <input
      type="password"
      value={braveKey}
      onChange={e => setBraveKey(e.target.value)}
      placeholder="BSA... (opcional)"
      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
    {saveError && <p className="text-xs text-red-500">{saveError}</p>}
    {braveSaved && <p className="text-xs text-green-600">Brave key salva!</p>}
  </div>
)}
```

Also add a "Pular por agora" link for the brave-key screen (same pattern as api-key screen if it has one, otherwise just leave the skip implicit via empty input + Continuar).

- [ ] **Step 3: Build check**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/project/OnboardingFlow.tsx
git commit -m "feat(onboarding): add Brave Search API key screen (screen 3 of 4)"
```

---

## Task 8: Document DB model and schemas

**Files:**
- Modify: `backend/db/models.py`
- Create: `backend/schemas/document.py`

- [ ] **Step 1: Add `Document` model to `backend/db/models.py`**

Append to end of file:

```python
class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    stakeholder_id: Mapped[str | None] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    doc_type: Mapped[str] = mapped_column(Text, nullable=False)  # official_speech | policy_document | report | academic_paper | news_article | minutes | legal_text | other
    date_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(Text, default="", server_default="")
    content_text: Mapped[str] = mapped_column(Text, default="", server_default="")
    file_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("idx_documents_project", "project_id"),
        Index("idx_documents_stakeholder", "stakeholder_id"),
    )
```

- [ ] **Step 2: Create `backend/schemas/document.py`**

```python
"""
backend/schemas/document.py
============================
Pydantic schemas for Document CRUD and responses.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict


DOC_TYPES = [
    "official_speech", "policy_document", "report",
    "academic_paper", "news_article", "minutes", "legal_text", "other",
]


class DocumentCreate(BaseModel):
    model_config = ConfigDict(frozen=True)
    title: str
    doc_type: str
    date_reference: str | None = None
    source: str = ""
    content_text: str = ""
    stakeholder_id: str | None = None
    file_name: str | None = None


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    project_id: str
    stakeholder_id: str | None
    title: str
    doc_type: str
    date_reference: str | None
    source: str
    content_text: str
    file_name: str | None
    created_at: str
```

- [ ] **Step 3: Verify model is picked up by SQLAlchemy metadata**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
python -c "from backend.db.models import Document; print('Document table:', Document.__tablename__)"
```

Expected: `Document table: documents`

- [ ] **Step 4: Commit**

```bash
git add backend/db/models.py backend/schemas/document.py
git commit -m "feat(db): add Document model for proxy documental"
```

---

## Task 9: Documents API

**Files:**
- Create: `backend/api/documents.py`
- Modify: `backend/app.py`
- Modify: `pyproject.toml`

- [ ] **Step 1: Write failing tests**

Create `tests/test_documents_api.py`:

```python
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

    asyncio.get_event_loop().run_until_complete(_init())

    async def override_get_session():
        async with TestSessionLocal() as s:
            yield s

    app.dependency_overrides[get_session] = override_get_session

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c

    app.dependency_overrides.clear()
    asyncio.get_event_loop().run_until_complete(test_engine.dispose())


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
        # 21 MB fake file
        big_content = b"x" * (21 * 1024 * 1024)
        r = client.post(
            f"/api/projects/{project_id}/documents/upload",
            files={"file": ("big.pdf", big_content, "application/pdf")},
            data={"title": "Big", "doc_type": "report"},
        )
        assert r.status_code == 413
```

- [ ] **Step 2: Run tests — expect failures**

```bash
python -m pytest tests/test_documents_api.py -v 2>&1 | head -25
```

Expected: `404 Not Found` (router not registered)

- [ ] **Step 3: Add `pypdf` to `pyproject.toml`**

In the `dependencies` list, add:

```toml
"pypdf>=4.0",
```

Install it:

```bash
pip install "pypdf>=4.0"
```

- [ ] **Step 4: Create `backend/api/documents.py`**

```python
"""
backend/api/documents.py
=========================
Documents CRUD + file upload + analyze endpoint.
Supports JSON body (text paste) and multipart/form-data (file upload).
Files: PDF → text extraction via pypdf; images → base64 stored as content_text marker.
Max file size: 20 MB.
"""
from __future__ import annotations

import base64
import io
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Document
from backend.db.repository import BaseRepository
from backend.schemas.document import DocumentCreate, DocumentResponse

router = APIRouter(tags=["documents"])

_MAX_FILE_BYTES = 20 * 1024 * 1024  # 20 MB


def _extract_text_from_pdf(data: bytes) -> str:
    """Extract all text from a PDF binary. Returns empty string on failure."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(data))
        pages = []
        for page in reader.pages:
            text = page.extract_text() or ""
            if text.strip():
                pages.append(text)
        return "\n\n".join(pages)
    except Exception:
        return ""


def _encode_image_for_storage(data: bytes, mime_type: str) -> str:
    """Store image as a base64 marker for the ANALYST agent to embed as multimodal block."""
    b64 = base64.b64encode(data).decode("utf-8")
    return f"__IMAGE_BASE64__{mime_type}::{b64}"


@router.post(
    "/projects/{project_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document(
    project_id: str,
    body: DocumentCreate,
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Create a document from pasted text or pre-extracted content."""
    repo: BaseRepository[Document] = BaseRepository(Document, session)
    doc = await repo.create(
        project_id=project_id,
        stakeholder_id=body.stakeholder_id,
        title=body.title,
        doc_type=body.doc_type,
        date_reference=body.date_reference,
        source=body.source,
        content_text=body.content_text,
        file_name=body.file_name,
    )
    await session.commit()
    await session.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.post(
    "/projects/{project_id}/documents/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    project_id: str,
    title: str = Form(...),
    doc_type: str = Form(...),
    date_reference: str | None = Form(default=None),
    source: str = Form(default=""),
    stakeholder_id: str | None = Form(default=None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> DocumentResponse:
    """Upload a file (PDF, TXT, image). Extracts text and stores it."""
    data = await file.read()
    if len(data) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 20 MB limit.")

    mime = file.content_type or ""
    file_name = file.filename or "upload"

    if mime == "application/pdf" or file_name.lower().endswith(".pdf"):
        content_text = _extract_text_from_pdf(data)
    elif mime in ("text/plain", "text/markdown") or file_name.lower().endswith((".txt", ".md")):
        content_text = data.decode("utf-8", errors="replace")
    elif mime.startswith("image/"):
        content_text = _encode_image_for_storage(data, mime)
    else:
        content_text = data.decode("utf-8", errors="replace")

    repo: BaseRepository[Document] = BaseRepository(Document, session)
    doc = await repo.create(
        project_id=project_id,
        stakeholder_id=stakeholder_id,
        title=title,
        doc_type=doc_type,
        date_reference=date_reference,
        source=source,
        content_text=content_text,
        file_name=file_name,
    )
    await session.commit()
    await session.refresh(doc)
    return DocumentResponse.model_validate(doc)


@router.get(
    "/projects/{project_id}/documents",
    response_model=list[DocumentResponse],
)
async def list_documents(
    project_id: str,
    stakeholder_id: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[DocumentResponse]:
    """List documents for a project. Filter by stakeholder_id if provided."""
    stmt = select(Document).where(Document.project_id == project_id)
    if stakeholder_id:
        stmt = stmt.where(Document.stakeholder_id == stakeholder_id)
    else:
        stmt = stmt.where(Document.stakeholder_id.is_(None))
    stmt = stmt.order_by(Document.created_at.desc())
    result = await session.execute(stmt)
    docs = result.scalars().all()
    return [DocumentResponse.model_validate(d) for d in docs]


@router.delete(
    "/projects/{project_id}/documents/{doc_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_document(
    project_id: str,
    doc_id: str,
    session: AsyncSession = Depends(get_session),
) -> None:
    """Delete a document."""
    doc = await session.get(Document, doc_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=404, detail="Document not found.")
    await session.delete(doc)
    await session.commit()
```

- [ ] **Step 5: Register router in `backend/app.py`**

Add import:

```python
from backend.api import projects, stakeholders, phases, chat, frame, decision_frame, objectives, axiom, attributes, alternatives, export, settings, documents
```

Add after other `include_router` calls:

```python
app.include_router(documents.router, prefix="/api")
```

- [ ] **Step 6: Run tests**

```bash
python -m pytest tests/test_documents_api.py -v
```

Expected: `4 passed`

- [ ] **Step 7: Commit**

```bash
git add backend/api/documents.py backend/app.py backend/db/models.py backend/schemas/document.py pyproject.toml tests/test_documents_api.py
git commit -m "feat(documents): add Document model, CRUD API, PDF text extraction"
```

---

## Task 10: ANALYST agent + chat.py route

**Files:**
- Create: `backend/agents/analyst_agent.py`
- Modify: `backend/api/chat.py`

- [ ] **Step 1: Create `backend/agents/analyst_agent.py`**

```python
"""
backend/agents/analyst_agent.py
================================
ANALYST — Document proxy agent.
Reads all documents for a project (optionally filtered by stakeholder) and
answers questions by extracting values, objectives, and positions with citations.
Optionally uses web_search to complement document analysis.
"""
from __future__ import annotations

import base64
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import WEB_SEARCH_TOOL
from backend.api.settings import get_brave_api_key
from backend.db.models import Document, Project, Stakeholder
from backend.tools.brave_search import brave_search

_MAX_DOC_CHARS = 8000  # truncate individual documents to prevent context overflow

ANALYST_SYSTEM = """Você é ANALYST, um agente especializado em análise documental para o processo VFT (Value-Focused Thinking).

Seu papel:
1. Analisar os documentos fornecidos no contexto
2. Extrair valores, objetivos e posições relevantes COM CITAÇÕES DIRETAS do texto
3. Marcar inferências sem evidência textual direta como [inferência]
4. Sinalizar contradições entre documentos com [contradição: Doc A vs Doc B]
5. Usar busca na web (quando disponível) para complementar com contexto externo
6. Responder sempre em PT-BR

Formato de resposta preferido:
- Use headers para organizar (## Valores Identificados, ## Objetivos, etc.)
- Cite sempre a fonte: "Segundo [título do documento]: '...trecho...'"
- Para imagens: descreva o que é visualmente relevante para a análise VFT

Contexto do projeto:
{PROJECT_CONTEXT}

Documentos disponíveis:
{DOCUMENTS_CONTEXT}
"""


def _build_doc_context(documents: list[Document]) -> str:
    if not documents:
        return "(nenhum documento disponível)"
    parts = []
    for doc in documents:
        header = f"--- [{doc.doc_type.upper()}] {doc.title}"
        if doc.date_reference:
            header += f" ({doc.date_reference})"
        if doc.source:
            header += f" — Fonte: {doc.source}"
        header += " ---"

        if doc.content_text.startswith("__IMAGE_BASE64__"):
            body = "[Imagem — enviada como conteúdo visual à API]"
        else:
            body = doc.content_text[:_MAX_DOC_CHARS]
            if len(doc.content_text) > _MAX_DOC_CHARS:
                body += "\n...[truncado]"

        parts.append(f"{header}\n{body}")
    return "\n\n".join(parts)


def _build_image_blocks(documents: list[Document]) -> list[dict]:
    """Build Anthropic image content blocks for image documents."""
    blocks = []
    for doc in documents:
        if not doc.content_text.startswith("__IMAGE_BASE64__"):
            continue
        try:
            _, rest = doc.content_text.split("__IMAGE_BASE64__", 1)
            mime_type, b64_data = rest.split("::", 1)
            blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": b64_data,
                },
            })
            blocks.append({
                "type": "text",
                "text": f"[Imagem acima: {doc.title}]",
            })
        except Exception:
            continue
    return blocks


class AnalystAgent(ToolAwareAgent):
    """ANALYST — Document proxy agent with optional web search."""

    def __init__(self, system: str, image_blocks: list[dict], model: str = "claude-sonnet-4-6") -> None:
        super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])
        self.image_blocks = image_blocks

    async def execute_tool(self, name: str, tool_input: dict) -> tuple[str, dict]:
        if name == "web_search":
            query = tool_input.get("query", "")
            api_key = get_brave_api_key()
            result_text, count = await brave_search(query, api_key=api_key)
            return result_text, {"count": count, "query": query}
        return f"Tool '{name}' not implemented.", {}

    def build_messages(self, user_message: str) -> list[dict]:
        """Build messages list, embedding image blocks for multimodal support."""
        if self.image_blocks:
            content = [*self.image_blocks, {"type": "text", "text": user_message}]
            return [{"role": "user", "content": content}]
        return [{"role": "user", "content": user_message}]

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        stakeholder_id: str | None,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "AnalystAgent":
        """Build ANALYST agent loaded with all relevant documents."""
        project = await session.get(Project, project_id)
        if project is None:
            raise ValueError(f"Project {project_id!r} not found.")

        # Load documents
        stmt = select(Document).where(Document.project_id == project_id)
        if stakeholder_id:
            stmt = stmt.where(Document.stakeholder_id == stakeholder_id)
        result = await session.execute(stmt.order_by(Document.created_at))
        documents = list(result.scalars().all())

        project_context = f"Nome: {project.name}\nFase atual: {project.phase_status}"
        doc_context = _build_doc_context(documents)
        image_blocks = _build_image_blocks(documents)

        system = (
            ANALYST_SYSTEM
            .replace("{PROJECT_CONTEXT}", project_context)
            .replace("{DOCUMENTS_CONTEXT}", doc_context)
        )

        return cls(system=system, image_blocks=image_blocks, model=model)
```

- [ ] **Step 2: Add ANALYST to `backend/api/chat.py`**

Add to imports:

```python
from backend.agents.analyst_agent import AnalystAgent
```

Add to `AGENT_CONFIGS`:

```python
"analyst": {
    "model": "claude-sonnet-4-6",
    "name": "ANALYST",
    "system": "",  # dynamically loaded from DB
},
```

Add elif branch in `chat_message` (after the stakeholder_simulation branch):

```python
elif body.agent_type == "analyst":
    try:
        agent = await AnalystAgent.from_project_id(
            body.project_id, body.stakeholder_id, session, model=config["model"]
        )
    except ValueError:
        agent = BaseAgent(model=config["model"], system="You are ANALYST, a document analysis agent.")
```

Update the `generate()` function to handle `AnalystAgent.build_messages()` — the messages list for ANALYST includes image blocks:

```python
# Build messages — ANALYST may embed image blocks
if isinstance(agent, AnalystAgent):
    messages = agent.build_messages(body.message)
else:
    messages = [{"role": "user", "content": body.message}]
```

- [ ] **Step 3: Run full test suite**

```bash
python -m pytest tests/ -v 2>&1 | tail -20
```

Expected: all pass

- [ ] **Step 4: Commit**

```bash
git add backend/agents/analyst_agent.py backend/api/chat.py
git commit -m "feat(analyst): add ANALYST agent with document context + web search"
```

---

## Task 11: Frontend — Document types + API client

**Files:**
- Modify: `frontend/src/types/index.ts`
- Create: `frontend/src/api/documents.ts`

- [ ] **Step 1: Add `Document` type to `frontend/src/types/index.ts`**

Append:

```typescript
export interface Document {
  id: string
  project_id: string
  stakeholder_id: string | null
  title: string
  doc_type: string
  date_reference: string | null
  source: string
  content_text: string
  file_name: string | null
  created_at: string
}

export interface DocumentCreate {
  title: string
  doc_type: string
  date_reference?: string
  source?: string
  content_text?: string
  stakeholder_id?: string
  file_name?: string
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  official_speech: 'Discurso oficial',
  policy_document: 'Documento de política',
  report: 'Relatório',
  academic_paper: 'Artigo acadêmico',
  news_article: 'Notícia',
  minutes: 'Ata',
  legal_text: 'Texto legal',
  other: 'Outro',
}
```

- [ ] **Step 2: Create `frontend/src/api/documents.ts`**

```typescript
import { apiClient } from './client'
import type { Document, DocumentCreate } from '../types'

export const documentsApi = {
  list(projectId: string, stakeholderId?: string): Promise<Document[]> {
    const params: Record<string, string> = { project_id: projectId }
    if (stakeholderId) params.stakeholder_id = stakeholderId
    return apiClient
      .get<Document[]>(`/api/projects/${projectId}/documents`, { params })
      .then(r => r.data)
  },

  create(projectId: string, data: DocumentCreate): Promise<Document> {
    return apiClient
      .post<Document>(`/api/projects/${projectId}/documents`, data)
      .then(r => r.data)
  },

  upload(projectId: string, formData: FormData): Promise<Document> {
    return apiClient
      .post<Document>(`/api/projects/${projectId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  delete(projectId: string, docId: string): Promise<void> {
    return apiClient.delete(`/api/projects/${projectId}/documents/${docId}`).then(() => {})
  },
}
```

- [ ] **Step 3: Build check**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -10
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/api/documents.ts
git commit -m "feat(frontend): add Document types and documents API client"
```

---

## Task 12: Frontend — DocumentPanel

**Files:**
- Create: `frontend/src/components/documents/DocumentPanel.tsx`

- [ ] **Step 1: Create `frontend/src/components/documents/DocumentPanel.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, FileText, Globe, Loader2, X, Upload, ChevronDown } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { useProjectStore } from '../../stores/projectStore'
import type { Document, DocumentCreate } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS)

interface UploadModalProps {
  projectId: string
  onSave: (doc: Document) => void
  onClose: () => void
}

function UploadModal({ projectId, onSave, onClose }: UploadModalProps) {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('other')
  const [dateRef, setDateRef] = useState('')
  const [source, setSource] = useState('')
  const [contentText, setContentText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) { setError('Título obrigatório.'); return }
    setSaving(true)
    setError(null)
    try {
      if (mode === 'file' && file) {
        const fd = new FormData()
        fd.append('title', title)
        fd.append('doc_type', docType)
        if (dateRef) fd.append('date_reference', dateRef)
        if (source) fd.append('source', source)
        fd.append('file', file)
        const doc = await documentsApi.upload(projectId, fd)
        onSave(doc)
      } else {
        const data: DocumentCreate = { title, doc_type: docType, content_text: contentText, source }
        if (dateRef) data.date_reference = dateRef
        const doc = await documentsApi.create(projectId, data)
        onSave(doc)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Adicionar Documento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2">
          {(['text', 'file'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {m === 'text' ? 'Colar texto' : 'Upload arquivo'}
            </button>
          ))}
        </div>

        {/* Fields */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título (obrigatório)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <div className="flex gap-2">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {DOC_TYPES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <input
            value={dateRef}
            onChange={e => setDateRef(e.target.value)}
            placeholder="Data (ex: 2012-06)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Fonte / autoria (opcional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        {mode === 'text' ? (
          <textarea
            value={contentText}
            onChange={e => setContentText(e.target.value)}
            placeholder="Cole o texto do documento aqui..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
        ) : (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500 cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => document.getElementById('doc-file-input')?.click()}
          >
            <Upload size={20} className="mx-auto mb-2 text-gray-400" />
            {file ? file.name : 'Clique ou arraste um arquivo (PDF, TXT, imagem)'}
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.txt,.md,image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin inline" /> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}


interface DocumentPanelProps {
  onAnalyze: () => void
}

export function DocumentPanel({ onAnalyze }: DocumentPanelProps) {
  const { activeProjectId } = useProjectStore()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const data = await documentsApi.list(activeProjectId)
      setDocs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { load() }, [load])

  const handleDocSaved = (doc: Document) => {
    setDocs(prev => [doc, ...prev])
    setShowModal(false)
  }

  const handleDelete = async (docId: string) => {
    if (!activeProjectId || !confirm('Excluir este documento?')) return
    setDeletingId(docId)
    try {
      await documentsApi.delete(activeProjectId, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  if (!activeProjectId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-gray-400 text-sm">
        Selecione um projeto para ver seus documentos.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Documentos de referência para análise do ANALYST.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          Adicionar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Nenhum documento adicionado.</p>
          <p className="text-gray-400 text-xs mt-1">Adicione PDFs, textos ou imagens para o ANALYST analisar.</p>
        </div>
      )}

      {docs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <FileText size={16} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                <p className="text-xs text-gray-400">
                  {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  {doc.date_reference && ` · ${doc.date_reference}`}
                  {doc.source && ` · ${doc.source}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                title="Excluir"
              >
                {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <button
          onClick={onAnalyze}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          <Globe size={16} />
          Analisar com ANALYST
        </button>
      )}

      {showModal && activeProjectId && (
        <UploadModal
          projectId={activeProjectId}
          onSave={handleDocSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build check**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -10
```

Expected: clean build

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/documents/DocumentPanel.tsx
git commit -m "feat(frontend): add DocumentPanel with upload modal and document list"
```

---

## Task 13: AgentSelector, Sidebar, App wiring

**Files:**
- Modify: `frontend/src/components/layout/AgentSelector.tsx`
- Modify: `frontend/src/stores/uiStore.ts`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Add ANALYST to `frontend/src/components/layout/AgentSelector.tsx`**

```typescript
const AGENTS = [
  { name: 'ARIA', type: 'facilitator', label: 'Facilitadora', description: 'Guia o processo VFT completo' },
  { name: 'FRAME', type: 'phase1_specialist', label: 'Fase 1', description: 'Especialista em Enquadramento' },
  { name: 'AXIOM', type: 'phase2_specialist', label: 'Fase 2', description: 'Especialista em Objetivos' },
  { name: 'NOVA', type: 'phase3_specialist', label: 'Fase 3', description: 'Especialista em Alternativas' },
  { name: 'ANALYST', type: 'analyst', label: 'Documentos', description: 'Análise documental e proxy de stakeholder' },
]
```

- [ ] **Step 2: Add `'documents'` to uiStore View type**

```typescript
type View = 'project-list' | 'project-detail' | 'settings' | 'documents'
```

- [ ] **Step 3: Add Documents nav item to `frontend/src/components/layout/Sidebar.tsx`**

Add import: `import { FolderOpen, Settings, ChevronLeft, ChevronRight, FileText } from 'lucide-react'`

Add after the Projetos button and before Configurações:

```tsx
{activeProjectId && (
  <button
    onClick={() => setView('documents')}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
      currentView === 'documents'
        ? 'bg-indigo-600 text-white'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`}
  >
    <FileText size={18} className="shrink-0" />
    {!sidebarCollapsed && <span>Documentos</span>}
  </button>
)}
```

- [ ] **Step 4: Wire DocumentPanel in `frontend/src/App.tsx`**

Add import:

```typescript
import { DocumentPanel } from './components/documents/DocumentPanel'
```

In the `App` component's view routing, add the documents case. Read lines 60-120 of App.tsx to find the exact routing structure, then add:

```tsx
{currentView === 'documents' && (
  <AppShell>
    <DocumentPanel
      onAnalyze={() => {
        setView('project-detail')
        // Switch chat to ANALYST and open it
        useChatStore.getState().setActiveAgent('ANALYST', 'analyst')
        useUiStore.getState().setChatPanelOpen(true)
        // Send initial analysis prompt
        setTimeout(() => {
          // trigger via useChat would require a ref — use a custom event instead
          window.dispatchEvent(new CustomEvent('vft:analyst-trigger'))
        }, 100)
      }}
    />
  </AppShell>
)}
```

**Note:** The `onAnalyze` trigger needs a clean approach. Use a simpler pattern — navigate to project-detail, open chat with ANALYST, and let the user send the message manually, OR dispatch the message via a store action. The simplest correct approach is to add an `autoSendMessage` field to chatStore:

In `chatStore.ts`, add:

```typescript
autoSendMessage: string | null  // set to trigger sendMessage from ChatPanel on mount
setAutoSendMessage: (msg: string | null) => void
```

Then `ChatPanel.tsx` reads it and fires once:

```tsx
const { autoSendMessage, setAutoSendMessage } = useChatStore()

useEffect(() => {
  if (autoSendMessage && !isStreaming) {
    const msg = autoSendMessage
    setAutoSendMessage(null)
    sendMessage(msg)
  }
}, [autoSendMessage])
```

And `onAnalyze` in App.tsx:

```typescript
onAnalyze={() => {
  useChatStore.getState().setActiveAgent('ANALYST', 'analyst')
  useChatStore.getState().setAutoSendMessage(
    'Analise os documentos disponíveis e extraia os valores, objetivos e posições relevantes para o projeto VFT. Cite as fontes diretamente.'
  )
  useUiStore.getState().setChatPanelOpen(true)
  setView('project-detail')
}}
```

- [ ] **Step 5: Build check — full build**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio/frontend" && npm run build 2>&1 | tail -20
```

Expected: no errors

- [ ] **Step 6: Run full test suite**

```bash
cd "/Users/mvellasquez/Claude Projects/vft-studio"
python -m pytest tests/ -v 2>&1 | tail -20
```

Expected: all pass

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/layout/AgentSelector.tsx \
        frontend/src/stores/uiStore.ts \
        frontend/src/stores/chatStore.ts \
        frontend/src/components/layout/Sidebar.tsx \
        frontend/src/components/layout/ChatPanel.tsx \
        frontend/src/App.tsx
git commit -m "feat(frontend): add ANALYST agent, Documents nav, DocumentPanel wiring"
```

---

## Self-Review

### Spec coverage check

| Requirement | Task |
|---|---|
| ARIA and FRAME use web_search via tool_use loop | Tasks 1, 2, 4 |
| Brave API key in onboarding | Task 7 |
| Brave API key in settings | Task 6 |
| Key stored in macOS Keychain | Task 3 |
| ChatPanel shows "Pesquisando..." during tool_use | Task 5 |
| ChatPanel shows "X resultados" after tool_result | Task 5 |
| Graceful degradation when no Brave key | Task 1 (brave_search returns message) |
| Document model (DB) | Task 8 |
| CRUD + upload endpoint | Task 9 |
| PDF text extraction via pypdf | Task 9 |
| Image as base64 multimodal | Tasks 9, 10 |
| ANALYST agent reads project documents | Task 10 |
| ANALYST uses web_search optionally | Task 10 |
| DocumentPanel with upload modal | Task 12 |
| "Analisar com ANALYST" button | Tasks 12, 13 |
| ANALYST as 5th agent in AgentSelector | Task 13 |
| Documents nav in Sidebar | Task 13 |
| AXIOM and NOVA do NOT get web_search | Implicit — only FacilitatorAgent and Phase1SpecialistAgent inherit ToolAwareAgent |

### Placeholder scan

No TBD/TODO/placeholder entries found in tasks above.

### Type consistency

- `ToolUseEvent.input: dict` → used as `event.input.get("query", "")` in chat.py — consistent
- `ToolResultEvent.metadata` dict → `{"count": count, "query": query}` from execute_tool → `**event.metadata` spread in SSE → frontend expects `count: number` — consistent
- `DocumentCreate` fields match `create_document` endpoint body — consistent
- `AnalystAgent.build_messages()` returns `list[dict]` consumed by `stream_with_tools()` — consistent
- `streamingToolState: ToolEvent | null` → `setToolState` sets it → ChatPanel reads `streamingToolState?.query` and `streamingToolState?.count` — consistent with ToolEvent interface that has `query?` and `count?` as optional fields
