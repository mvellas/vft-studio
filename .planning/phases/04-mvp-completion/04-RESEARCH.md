# Phase 4 Research: MVP Completion

## Architecture Overview

### What's already in place (end of Phase 3)
- **DB models**: `Alternative`, `AlternativeConsequence`, `ChatSession`, `ChatMessage`, `AppSetting` — all exist in models.py
- **Frontend deps**: `html2canvas` (^1.4.1) already installed
- **Agents**: `phase1_specialist.py` (FRAME), `phase2_specialist.py` (AXIOM), `stakeholder_agent.py` — all follow same pattern
- **Chat**: SSE streaming works; `chat.py` routes to agents by `agent_type` string; `AGENT_CONFIGS` dict pattern
- **Navigation**: No react-router-dom; uses `useUiStore.setView()` and `useProjectStore`
- **UI Pattern**: Components receive props, auto-save with debounce, onStepComplete callback

### Models available
```python
# Alternative — Phase 3 decision alternatives
id, project_id, name, description, source, source_stakeholder_id,
is_status_quo, order_index, created_at, updated_at, deleted

# AlternativeConsequence — alternatives × objectives matrix
id, alternative_id, objective_id, project_id,
value_text, attribute_level_id, created_at, updated_at
UNIQUE(alternative_id, objective_id)

# AppSetting — key/value store (API key stored here after Keychain)
key, value, updated_at
```

### Phase 3 VFT steps (passos 3.1–3.8)
1. 3.1 — Revisão dos objetivos fundamentais e atributos
2. 3.2 — Geração de alternativas (brainstorming + NOVA suggestions)
3. 3.3 — Criação do status quo como alternativa base
4. 3.4 — Avaliação de alternativas vs. objetivos fundamentais
5. 3.5 — Preenchimento da Matriz de Consequências
6. 3.6 — Análise de dominância (NOVA)
7. 3.7 — Consolidação das alternativas
8. 3.8 — Documentação da Fase 3

## Plan 04-01: NOVA Agent + Alternatives + ConsequencesMatrix

### Backend API pattern (following objectives.py)
```python
# alternatives.py router
router = APIRouter(prefix="/projects/{project_id}/alternatives", tags=["alternatives"])

# consequences.py — nested under alternatives
POST /projects/{project_id}/alternatives/{alt_id}/consequences
PUT  /projects/{project_id}/alternatives/{alt_id}/consequences/{cons_id}

# Or matrix approach: PUT /projects/{project_id}/consequences with {alternative_id, objective_id, value_text}
```

### NOVA agent context
- Phase3SpecialistAgent loads: project, stakeholders, objectives (fundamentals), alternatives, attributes
- Uses claude-sonnet-4-6 (operational tasks — cheaper)
- Prompt: NOVA persona — Phase 3 Alternatives specialist
- from_project_id classmethod loads all relevant context

### ConsequencesMatrix UI
- Table: rows = alternatives, cols = fundamental objectives
- Each cell = AlternativeConsequence (value_text + optional attribute_level_id)
- Cell editable inline (textarea on click)
- "Sugerir com NOVA" per row: NOVA generates consequences for an alternative
- Progress indicator: filled cells / total cells

## Plan 04-02: ARIA + Full Chat + SCRIBE

### ARIA agent (facilitator.py)
- Currently `facilitator` agent in AGENT_CONFIGS uses inline system string
- Upgrade to `FacilitatorAgent(BaseAgent)` with proper prompt file and DB context
- ARIA is the main orchestrator; guides the full 33-step process

### AgentSelector component
- Tabs: ARIA / FRAME / AXIOM / NOVA
- Switching agent clears messages (or keeps history filtered by agent)
- Current agent stored in `useChatStore.activeAgent`

### ChatHistory persistence
- Currently chat messages are persisted to DB but not loaded on init
- Add `GET /api/chat/history?project_id=X&agent_type=Y` endpoint
- Load history on ChatPanel mount / agent switch

### SCRIBE agent (documentation_agent.py)
- Generates Markdown report from full project state
- `GET /api/projects/{project_id}/export/markdown` → streams or returns Markdown string
- Sections: Summary, IDF, Stakeholders, Objectives, Attributes, Alternatives, ConsequencesMatrix

### QuickActions
- Backend: chat response can include `quick_actions_json` in ChatMessage
- Frontend: parse and render as clickable chips below assistant message
- QuickActions trigger predefined prompts

## Plan 04-03: Diagrams + Export

### Existing react-flow views (all have IDs to capture)
1. `CausalRelationsMap` — causal links between objectives
2. `MeansEndsNetwork` — means-ends relationships
3. `ObjectivesHierarchy` — fundamental objectives hierarchy

### html2canvas capture pattern
```typescript
import html2canvas from 'html2canvas'

async function captureReactFlow(elementId: string): Promise<string> {
  const el = document.getElementById(elementId)
  if (!el) throw new Error('Element not found')
  const canvas = await html2canvas(el, { useCORS: true, scale: 2 })
  return canvas.toDataURL('image/png')
}
```

### Mermaid diagrams (server-side generation)
- `StakeholderMap`: Mermaid graph showing stakeholder relationships
- `ProcessFlowchart`: Mermaid flowchart of VFT steps with completion status
- Generate as SVG string on backend using mermaid CLI or mermaid-py
  - NOTE: Use `mermaid-py` (python package) or just generate Mermaid source strings and embed in Markdown
  - Since `WeasyPrint` can render embedded SVG, generate SVG directly

### ExportService
```typescript
// frontend: collect all diagram PNGs + call SCRIBE
async function exportProject(projectId: string): Promise<void> {
  const diagrams = {
    causal: await captureView('causal-map'),
    means_ends: await captureView('means-ends'),
    hierarchy: await captureView('hierarchy'),
  }
  await fetch(`/api/projects/${projectId}/export`, {
    method: 'POST',
    body: JSON.stringify({ diagrams })
  })
}
```

## Plan 04-04: Settings + Polish

### API Key via keyring
```python
import keyring

SERVICE = "vft-studio"
USERNAME = "anthropic-api-key"

def save_api_key(key: str) -> None:
    keyring.set_password(SERVICE, USERNAME, key)
    os.environ["ANTHROPIC_API_KEY"] = key

def load_api_key() -> str | None:
    return keyring.get_password(SERVICE, USERNAME)
```

### Startup flow
- On app start: load API key from Keychain → set env var → BaseAgent works
- Settings UI: text field to enter/update API key + "Test Connection" button

### Error boundaries
- React `ErrorBoundary` class component wrapping major sections
- Fallback UI with error message + "Retry" button

### Onboarding (3 screens)
- Check `AppSetting` where key="onboarding_completed"
- Screen 1: Welcome + VFT overview
- Screen 2: API key setup (integrates with keyring)
- Screen 3: Create first project CTA

## Plan 04-05: Tests + macOS Packaging

### pytest coverage targets (≥60%)
- `tests/test_engine.py` — ProcessManager, StepConfig, phase gates
- `tests/test_agents.py` — BaseAgent mock; Phase1/2/3SpecialistAgent.from_project_id
- `tests/test_api.py` — critical endpoints: projects CRUD, chat, alternatives, export

### PyInstaller spec
- `VFTStudio.spec` — entry point `main.py`
- Bundle: backend/, frontend/dist/, prompts/
- `build.py` — build script: `npm run build` then `pyinstaller VFTStudio.spec`
- Output: `dist/VFT Studio.app`

## Key Pitfalls to Avoid

1. **ConsequencesMatrix**: use UNIQUE(alternative_id, objective_id) — upsert pattern (PUT creates or updates)
2. **ChatHistory load**: load only last 50 messages per agent to avoid prompt overflow
3. **html2canvas**: needs `useCORS: true` and `scale: 2` for retina; react-flow elements need explicit background color
4. **keyring on macOS**: works natively; on first run if no key, show onboarding screen 2
5. **PyInstaller**: PyWebView requires special handling — use `--windowed` flag; include `webview` in hidden imports
6. **NOVA consequences suggestion**: use `invoke()` not `stream()` to get full structured response before updating matrix
