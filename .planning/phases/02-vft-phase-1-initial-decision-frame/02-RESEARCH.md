# Phase 2: VFT Phase 1 — Initial Decision Frame - Research

**Researched:** 2026-04-07
**Domain:** VFT Phase 1 implementation — FRAME agent, StakeholderMapper, DecisionFrameForm, Decision Statement, Phase 1 Gate
**Confidence:** HIGH — all findings derived directly from project specs and existing codebase

---

## Summary

Phase 2 builds the interactive VFT Phase 1 user experience on top of the fully functional foundation from Phase 1. The backend already has all the database columns (idf_purpose, idf_perspective, idf_scope, decision_statement, stakeholder_config, phase1_completed), the ProcessManager with all 7 Phase 1 StepConfigs defined (1.1–1.7), and the phase step completion endpoints. The CRUD for stakeholders is also complete. What is missing is: (1) the FRAME specialist agent, (2) the Decision Frame dedicated API endpoints (PUT /api/projects/{id}/decision-frame, POST generate DS), (3) the frontend Phase 1 form components (StakeholderMapper, DecisionFrameForm, DecisionStatement), (4) the stakeholder_config auto-selection logic, and (5) the Phase 1 completion gate.

The planner's key insight is that this phase wires the existing engine scaffolding to real form UIs. The ProcessManager already filters steps by stakeholder_config — the frontend just needs to read `project.stakeholder_config` and render the correct form variant. The FRAME agent follows the exact same BaseAgent pattern already working in chat; the only additions are a richer system prompt and a dedicated `/decision-statement/generate` endpoint that calls `invoke()` instead of `stream()`.

**Primary recommendation:** Build in the order specified in ROADMAP.md plans 1–5. Start with FRAME agent because DecisionFrameForm and DecisionStatement both call it. End with the Phase 1 Gate because it depends on all data being persisted.

---

## Standard Stack

### Core (already installed — no new installs required)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| FastAPI | 0.135.3 | Backend API routes for IDF and DS | Already in pyproject.toml |
| SQLAlchemy 2.0 | 2.0.x | ORM — Project model already has all IDF columns | Already in use |
| Anthropic SDK | 0.40+ | FRAME agent uses AsyncAnthropic via BaseAgent | Already in base_agent.py |
| React 19 + Vite | installed | Frontend form components | Already running |
| Zustand + immer | 5.x | projectStore holds current project with IDF fields | Already wired |
| Tailwind v4 | 4.x | Styling — same design tokens as Phase 1 | Already in index.css |

### No New Dependencies

All Phase 2 requirements are satisfiable with the existing stack. No new Python or Node packages needed.

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
backend/
├── agents/
│   ├── phase1_specialist.py         # NEW: FRAME agent class
│   └── prompts/
│       └── phase1_specialist.md     # NEW: FRAME system prompt template
├── api/
│   └── decision_frame.py            # NEW: IDF + DS endpoints
└── schemas/
    └── decision_frame.py            # NEW: IDFUpdate, DSGenerateRequest, DSResponse

frontend/src/
└── components/
    └── phases/
        └── Phase1/
            ├── StakeholderMapper.tsx    # NEW
            ├── DecisionFrameForm.tsx    # NEW (handles variants 1.2/1.3/1.5)
            ├── WorkshopMode.tsx         # NEW (step 1.4)
            ├── DecisionStatement.tsx    # NEW (step 1.7)
            └── DocumentIDF.tsx          # NEW (step 1.6)
```

### Pattern 1: FRAME Agent (extends BaseAgent)

**What:** Phase1SpecialistAgent subclasses BaseAgent, overrides `__init__` to inject a rich system prompt with project context (IDF draft, stakeholders list, current step).

**When to use:** Called from both the chat endpoint (streaming) and the dedicated DS-generate endpoint (invoke).

**Example:**
```python
# backend/agents/phase1_specialist.py
class Phase1SpecialistAgent(BaseAgent):
    def __init__(self, project_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._build_system(project_context)
        super().__init__(model=model, system=system)

    def _build_system(self, ctx: dict) -> str:
        # Load phase1_specialist.md template, substitute {{PROJECT_CONTEXT}},
        # {{STAKEHOLDERS_LIST}}, {{IDF_DRAFT}} placeholders
        ...

    @classmethod
    async def from_project_id(cls, project_id: str, session: AsyncSession) -> "Phase1SpecialistAgent":
        # Load project + stakeholders from DB and build context dict
        ...
```

The existing `chat.py` endpoint already selects agents by `agent_type` string. Extending it to support `"phase1_specialist"` is a one-line match addition.

### Pattern 2: AgentOrchestrator (build_project_context)

**What:** The AGENTS-SPEC.md defines `AgentOrchestrator.build_project_context()`. For Phase 2, implement a `build_phase1_context()` helper that loads project + stakeholders and formats them as Markdown for the system prompt.

**Context variables to inject:**
- `{{PROJECT_CONTEXT}}`: project name, description, context_notes, current_step
- `{{STAKEHOLDERS_LIST}}`: name, role, is_decision_maker, profile, interests per stakeholder
- `{{IDF_DRAFT}}`: current values of idf_purpose, idf_perspective, idf_scope

### Pattern 3: stakeholder_config Auto-Selection

**What:** When the user completes Step 1.1 (StakeholderMapper), the system auto-derives the `stakeholder_config` from the stakeholder list.

**Logic (deterministic, no AI):**
```python
def compute_stakeholder_config(stakeholders: list[Stakeholder]) -> str:
    dm_count = sum(1 for s in stakeholders if s.is_decision_maker)
    total_count = len(stakeholders)
    if dm_count > 1:
        return "multi_dm_multi"   # Multiple DMs always implies multi stk
    if total_count > 1:
        return "single_dm_multi"
    return "single_dm_single"
```

This must be computed and persisted to `projects.stakeholder_config` when Step 1.1 is completed. The PhaseService.complete_step() already reads `project.stakeholder_config` to filter steps — so updating this field before the step is marked complete is the critical ordering constraint.

**Consequence:** Steps 1.2/1.3/1.4/1.5 that are shown depend on this value. The frontend must re-fetch the step overview after 1.1 is completed.

### Pattern 4: IDF Field Persistence (PUT /api/projects/{id}/decision-frame)

**What:** A dedicated endpoint that accepts partial IDF updates (purpose/perspective/scope) and persists them to the projects table. This endpoint exists in the spec but was NOT created in Phase 1.

**From SYSTEM-DESIGN.md §3:**
```
GET    /api/projects/{id}/decision-frame        → Retorna IDF
PUT    /api/projects/{id}/decision-frame        → Salva IDF completo
GET    /api/projects/{id}/decision-statement    → Retorna DS
PUT    /api/projects/{id}/decision-statement    → Salva DS
POST   /api/projects/{id}/decision-statement/generate  → IA gera DS
```

These 5 endpoints need to be created in a new `backend/api/decision_frame.py`.

Implementation uses the existing `BaseRepository(Project, session).update(project_id, **idf_fields)` pattern already established.

### Pattern 5: Decision Statement Validation

**What:** The Decision Statement must conform to the VFT format: "Decide + [which/what/when/whether/how/if] + [action]". Validation is advisory, not blocking for save, but required to set `decision_statement_validated=1`.

**Two-level approach:**
1. **Local regex** (instant): detect presence of decision verb + interrogative
2. **FRAME advisory** (optional): user clicks "Validar com IA" → FRAME returns structured feedback

The `decision_statement_validated` flag in the DB stores the result. The Phase 1 Gate checks this flag.

**Regex pattern (MEDIUM confidence):**
```python
import re
DS_PATTERN = re.compile(
    r'\bDecid[aeioir]\w*\s+(qual|what|quando|when|whether|se|como|how|if|o que)\b',
    re.IGNORECASE
)
```

This may need refinement for Portuguese. FRAME validation is the authoritative path.

### Pattern 6: Step 1.6 — Document IDF

**What:** Step 1.6 is a read-only review: display the compiled IDF (purpose + perspective + scope) from whatever variant was used (1.2, 1.3, or 1.5), let the user confirm it, and set `idf_documented_at` timestamp.

**No AI call required for step 1.6.** The user reviews and clicks "Confirmar e Documentar". The PhaseService records the step completion and sets `idf_documented_at = now()` on the project via a project PATCH.

### Pattern 7: Workshop Mode (Step 1.4 — Appendix B)

**What:** Step 1.4 applies only when `stakeholder_config == 'multi_dm_multi'`. The form_type is `"workshop_mode"`. Per AGENTS-SPEC.md, FRAME conducts a "Decision Framing Workshop (Appendix B): 7-step roadmap."

**Scope for Phase 2:** Workshop Mode is NOT a separate facilitation mode or multi-user feature. It is a guided checklist/wizard within the app where FRAME walks through 7 facilitation steps for the analyst to use in a real workshop. The UI shows: step number, facilitation prompt to read to DMs, space for notes. FRAME can be queried for elaboration on each step.

**This is NOT real-time multi-user.** It's a reference guide + notes capture. The `step_completions.data_json` stores the workshop notes.

### Pattern 8: Phase 1 Completion Gate

**What:** `phase1_completed` is set to `1` only when all of the following are true:
1. Step 1.1 completed: at least 1 stakeholder with `role == 'decision_authority'`
2. Conditional IDF step (1.2 or 1.3 or 1.5) completed: `idf_purpose != ''`, `idf_perspective != ''`, `idf_scope != ''`
3. Step 1.6 completed: `idf_documented_at` is set
4. Step 1.7 completed: `decision_statement != ''` AND `decision_statement_validated == 1`

The gate check runs inside `PhaseService.complete_step()` when `step_id == "1.7"`. After setting phase1_completed=1, the next step advances to 2.1 (Phase 2 begins).

The completion gate should also trigger an ARIA message in the chat ("Parabéns, você completou a Fase 1..."). This can be a fire-and-forget async task or a chat event, but the mechanism for ARIA proactive messages is not yet built — the planner should decide whether to implement this in Phase 2 or defer.

### Anti-Patterns to Avoid

- **Rebuilding the chat endpoint:** The `/api/chat/message` SSE endpoint already works for FRAME. Just extend the agent selector with a `"phase1_specialist"` case.
- **Blocking DS save on structure validation:** The DS field should save freely; the validation flag is separate.
- **Recalculating stakeholder_config on every request:** Set it once when step 1.1 is completed, persist to DB. Never recalculate from stakeholder list on the fly (it would break if stakeholders change after step 1.1).
- **Treating Workshop Mode as a separate app mode:** It is a guided UI screen inside the normal step flow.
- **IDF fields on Stakeholder model:** IDF fields live exclusively on the Project model (idf_purpose, idf_perspective, idf_scope). Already confirmed in models.py.
- **Making DecisionFrameForm one giant component:** The 4 variants (1.2/1.3/1.4/1.5) have different instructions but the same fields. Pass a `variant` prop with the step id and swap instruction text only. Same form structure.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming FRAME responses | New SSE infra | Existing `/api/chat/message` endpoint + BaseAgent.stream() | Already works end-to-end |
| DS non-streaming generation | Custom HTTP pipeline | BaseAgent.invoke() | Returns complete text; no stream needed |
| Auto-save debounce | Custom timer logic | React's useEffect + setTimeout | Standard pattern; 2s debounce per spec |
| stakeholder_config derivation | LLM classification | Deterministic Python function (count DMs) | Always deterministic, zero latency |
| IDF persistence | Custom ORM bypass | BaseRepository.update(project_id, idf_purpose=...) | Already pattern-established |
| Markdown rendering in IDF review | Custom parser | react-markdown + remark-gfm (declared in package.json) | Already available |

**Key insight:** The FRAME agent is a configuration of BaseAgent, not a new system. The only new infrastructure is the decision_frame API router and the Phase1SpecialistAgent class.

---

## Common Pitfalls

### Pitfall 1: stakeholder_config Not Updated Before Step Advance

**What goes wrong:** PhaseService.complete_step("1.1") calls get_next_step() using the old stakeholder_config (still "single_dm_single" default). The next step shown is 1.2 even if multi_dm is true.

**Why it happens:** The step completion and project update are in the same transaction, but get_next_step() reads the project config before the update.

**How to avoid:** In PhaseService (or a Phase1-specific override), compute and persist stakeholder_config to the Project BEFORE calling get_next_step(). The ordering must be: 1) validate stakeholders, 2) update project.stakeholder_config, 3) record step completion, 4) call get_next_step() with the new config.

**Warning signs:** Tests showing step 1.2 appearing for a multi-DM project.

### Pitfall 2: step_completions UNIQUE Constraint Blocks Re-Completion

**What goes wrong:** PhaseService raises HTTP 409 if the user tries to re-complete a step. For Phase 1 IDF steps this is problematic because the user may want to revise and re-confirm.

**Why it happens:** `UNIQUE(project_id, step_id)` constraint in step_completions table.

**How to avoid:** For IDF steps (1.2/1.3/1.4/1.5/1.6), use an UPSERT pattern: check if the step is already completed; if yes, update the data_json instead of inserting. Or allow re-completion by deleting the existing record first.

**Warning signs:** User edits IDF after completing step 1.3, clicks Confirmar, gets a 409 error.

### Pitfall 3: DecisionFrameForm Shows Wrong Variant After stakeholder_config Change

**What goes wrong:** Frontend caches the step overview and still shows step 1.2 after stakeholder_config was updated to multi_dm_multi.

**Why it happens:** React state (or react-query cache) not invalidated after step 1.1 completes.

**How to avoid:** After `POST /phase/step/complete` for step 1.1, invalidate the react-query cache for both `/phase/current` and `/phase/overview`. The backend will then return the correct conditional step.

### Pitfall 4: FRAME System Prompt Too Large

**What goes wrong:** For projects with many stakeholders and a long context_notes, the system prompt may exceed model token limits or cause slow responses.

**Why it happens:** Full IDF + all stakeholders + chat history injected into every request.

**How to avoid:** Cap each text field at 500 chars for the system prompt injection. Include a truncation note "...[truncated]" if over limit. The AGENTS-SPEC.md explicitly notes context window management strategy: summarize when context is large.

### Pitfall 5: Decision Statement Validation Blocks Phase Gate

**What goes wrong:** FRAME returns "invalid structure" for a perfectly reasonable DS phrased in Portuguese. User cannot advance to Phase 2.

**Why it happens:** DS_PATTERN regex or FRAME's English-centric training causing false negatives.

**How to avoid:** Make `decision_statement_validated` settable by the user manually (a checkbox "Confirmo que este enunciado é válido") as a fallback to AI validation. Advisory AI validation is the primary path; user override is the escape hatch.

### Pitfall 6: ChatSession Not Found for FRAME in Decision Frame Context

**What goes wrong:** The dedicated DS-generate endpoint doesn't persist to ChatMessage (unlike the chat endpoint).

**Why it happens:** The generate endpoint uses BaseAgent.invoke() which doesn't auto-persist like the SSE chat generator does.

**How to avoid:** The generate endpoint returns only the DS text — it should NOT write to chat history (it's a form action, not a conversation turn). Keep this separation clean.

---

## Code Examples

### FRAME Agent — Class Skeleton

```python
# backend/agents/phase1_specialist.py
from __future__ import annotations
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from backend.agents.base_agent import BaseAgent
from backend.db.models import Project, Stakeholder

PROMPT_PATH = Path(__file__).parent / "prompts" / "phase1_specialist.md"


class Phase1SpecialistAgent(BaseAgent):
    """FRAME — Phase 1 Specialist. Handles IDF validation, DS generation, stakeholder suggestions."""

    def __init__(self, project_context: dict, model: str = "claude-sonnet-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system)

    def _render_prompt(self, ctx: dict) -> str:
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", ""))
            .replace("{{STAKEHOLDERS_LIST}}", ctx.get("stakeholders_md", ""))
            .replace("{{IDF_DRAFT}}", ctx.get("idf_draft", ""))
        )

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "Phase1SpecialistAgent":
        result = await session.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()
        if project is None:
            raise ValueError(f"Project {project_id} not found")

        stk_result = await session.execute(
            select(Stakeholder).where(Stakeholder.project_id == project_id)
        )
        stakeholders = stk_result.scalars().all()

        context = {
            "project_summary": f"**{project.name}**\n{project.description}\n\nContext: {project.context_notes}",
            "stakeholders_md": "\n".join(
                f"- {s.name} ({s.role}{'  [DM]' if s.is_decision_maker else ''}): {s.interests}"
                for s in stakeholders
            ),
            "idf_draft": (
                f"**Purpose:** {project.idf_purpose}\n"
                f"**Perspective:** {project.idf_perspective}\n"
                f"**Scope:** {project.idf_scope}"
            ),
        }
        return cls(project_context=context, model=model)
```

### Decision Frame API Endpoints

```python
# backend/api/decision_frame.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db.base import get_session
from backend.db.models import Project
from backend.db.repository import BaseRepository
from backend.agents.phase1_specialist import Phase1SpecialistAgent
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/projects/{project_id}", tags=["decision-frame"])


class IDFUpdate(BaseModel, frozen=True):
    idf_purpose: Optional[str] = None
    idf_perspective: Optional[str] = None
    idf_scope: Optional[str] = None


class DSGenerateRequest(BaseModel, frozen=True):
    hint: str = ""   # Optional user hint to guide generation


class DSResponse(BaseModel, frozen=True):
    decision_statement: str


@router.put("/decision-frame")
async def save_decision_frame(
    project_id: str,
    body: IDFUpdate,
    session: AsyncSession = Depends(get_session),
):
    repo = BaseRepository(Project, session)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await repo.update(project_id, **updates)
    await session.commit()
    return {"ok": True}


@router.post("/decision-statement/generate", response_model=DSResponse)
async def generate_decision_statement(
    project_id: str,
    body: DSGenerateRequest,
    session: AsyncSession = Depends(get_session),
):
    agent = await Phase1SpecialistAgent.from_project_id(project_id, session)
    prompt = (
        "Based on the IDF above, generate a concise Decision Statement in this exact format: "
        "'Decidir [qual/como/se/quando] + [action]'. "
        "Return ONLY the statement text, no explanation."
    )
    if body.hint:
        prompt += f"\n\nUser hint: {body.hint}"
    result = await agent.invoke([{"role": "user", "content": prompt}])
    return DSResponse(decision_statement=result.strip())
```

### stakeholder_config Derivation (in phase_service.py extension)

```python
def compute_stakeholder_config(stakeholders: list) -> str:
    """Derive stakeholder_config from stakeholder list. Called when step 1.1 completes."""
    dm_count = sum(1 for s in stakeholders if s.is_decision_maker)
    total_count = len(stakeholders)
    if dm_count > 1:
        return "multi_dm_multi"
    if total_count > 1:
        return "single_dm_multi"
    return "single_dm_single"
```

### StakeholderMapper Validation (frontend)

```typescript
// frontend/src/components/phases/Phase1/StakeholderMapper.tsx
function validateStakeholders(stakeholders: Stakeholder[]): string | null {
  const hasDecisionAuthority = stakeholders.some(
    s => s.role === 'decision_authority' || s.is_decision_maker
  )
  if (!hasDecisionAuthority) {
    return 'É necessário pelo menos 1 stakeholder com papel Decision Authority para prosseguir.'
  }
  return null
}
```

### Phase 1 Gate Check (backend)

```python
# In PhaseService.complete_step(), when step_id == "1.7":
async def _check_phase1_gate(self, project: Project, session: AsyncSession) -> bool:
    """Returns True if all Phase 1 completion criteria are met."""
    from sqlalchemy import select
    # 1. At least 1 Decision Authority stakeholder
    stk_result = await session.execute(
        select(Stakeholder).where(
            Stakeholder.project_id == project.id,
            Stakeholder.is_decision_maker == 1
        )
    )
    if not stk_result.scalars().first():
        return False
    # 2. IDF complete
    if not all([project.idf_purpose, project.idf_perspective, project.idf_scope]):
        return False
    # 3. IDF documented
    if not project.idf_documented_at:
        return False
    # 4. DS set and validated
    if not project.decision_statement or not project.decision_statement_validated:
        return False
    return True
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate ARIA endpoint for each agent | One `/api/chat/message` with `agent_type` param | Phase 1 | FRAME uses the same endpoint; no new route needed for chat |
| Agent with hardcoded prompt string | Agent loads prompt from `.md` file | Spec decision | Prompts are maintainable outside code |
| DSgeneration via chat stream | Dedicated invoke() endpoint | Phase 2 design | Cleaner UX — form field populated directly, not via chat |

---

## Open Questions

1. **ARIA proactive message on Phase 1 completion**
   - What we know: ARIA should congratulate the user when phase1_completed is set
   - What's unclear: No mechanism exists yet for backend-initiated chat messages. The chat is always user-initiated.
   - Recommendation: Defer proactive ARIA message to Phase 4 (Chat Agents plan). For Phase 2, display a static UI completion card instead.

2. **Step re-completion / IDF editing after step completion**
   - What we know: step_completions UNIQUE constraint prevents re-insertion. Users WILL want to edit IDF after completing a step.
   - What's unclear: Should editing IDF fields re-open the step, or should it be freely editable independent of step status?
   - Recommendation: Treat IDF fields as freely editable at any time via the PUT endpoint (no step gate). Step completion records that the user reviewed and confirmed, but the fields remain editable. The Phase Gate re-checks field values at gate time, not at step-complete time.

3. **DS validation: regex vs. FRAME advisory**
   - What we know: FRAME is the authoritative validator per spec. The regex is a fallback.
   - What's unclear: Should `decision_statement_validated=1` require FRAME confirmation, or can user self-certify?
   - Recommendation: User self-certification checkbox is the primary path (fastest). "Validar com IA" calls FRAME for feedback but does NOT block saving. The user checks the box after reading FRAME's feedback.

---

## Phase Requirements Map

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P1-01 | Passo 1.1 — StakeholderMapper: adicionar stakeholders com tipo/perfil/interesses; validar ≥1 Decision Authority | Stakeholder CRUD already exists (backend/api/stakeholders.py). Frontend StakeholderMapper.tsx needed. compute_stakeholder_config() must run on step complete. |
| P1-02 | Passos 1.2–1.5 — DecisionFrameForm: Purpose/Perspective/Scope; adapta à variante; "Gerar sugestão com IA" (FRAME) | PUT /decision-frame endpoint needed. DecisionFrameForm takes variant prop (step id). FRAME agent via chat endpoint. |
| P1-03 | Passo 1.6 — DocumentIDF: resumo formatado gerado e salvo com timestamp | No AI needed. PUT idf_documented_at on project. Read-only review UI. |
| P1-04 | Passo 1.7 — DecisionStatement: campo + "Gerar com IA" (FRAME) + validação de estrutura | POST /decision-statement/generate calls Phase1SpecialistAgent.invoke(). Validation is advisory + user checkbox. |
| P1-05 | FRAME agent (Phase 1 Specialist): IDF validation, DS generation, stakeholder suggestions | Phase1SpecialistAgent extends BaseAgent. Registered in chat.py agent selector. Dedicated generate endpoint. |
| P1-06 | Workshop Mode (Apêndice B): wizard dos 7 passos para múltiplos DMs | Step 1.4 form_type="workshop_mode". Guided checklist UI. FRAME answers clarification questions via chat. NOT a multi-user mode. |
| P1-07 | Phase 1 completion gate: só avança para Fase 2 se IDF completo + DS válido | _check_phase1_gate() in PhaseService. Sets phase1_completed=1. Advances current_step to "2.1". |
</phase_requirements>

---

## Sources

### Primary (HIGH confidence)

- `backend/agents/base_agent.py` — BaseAgent pattern confirmed: invoke() + stream(); both with 3x exponential retry
- `backend/db/models.py` — Project model confirmed: idf_purpose, idf_perspective, idf_scope, idf_documented_at, decision_statement, decision_statement_validated, stakeholder_config, phase1_completed all exist
- `backend/engine/process_manager.py` — All 7 Phase 1 StepConfigs confirmed with correct conditions, form_types, completion_criteria
- `backend/api/stakeholders.py` — Stakeholder CRUD confirmed complete
- `backend/api/phases.py` — GET /phase/current + POST /phase/step/complete confirmed working
- `backend/services/phase_service.py` — PhaseService.complete_step() logic confirmed; UNIQUE constraint on step_completions confirmed
- `backend/schemas/stakeholder.py` (inferred from responses) — Stakeholder schema with all fields
- `~/Library/.../AGENTS-SPEC.md` — FRAME agent identity, system prompt template, context variables, responsibilities
- `~/Library/.../SYSTEM-DESIGN.md` — Decision Frame API endpoints spec, stakeholder_config values, Workshop Mode context
- `~/Library/.../DATA-MODEL.md` — projects table schema confirmed
- `~/Library/.../UI-SPEC.md` — StakeholderMapper mockup, component inventory
- `.planning/REQUIREMENTS.md` — P1-01 through P1-07 confirmed
- `.planning/ROADMAP.md` — Phase 2 plans breakdown confirmed

### Secondary (MEDIUM confidence)

- DS_PATTERN regex for Portuguese — derived from AGENTS-SPEC decision verb list + SYSTEM-DESIGN §3. Pattern may need validation against real Portuguese DS examples.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Phase 2 work uses existing installed packages
- Architecture: HIGH — derived from live codebase (models, engine, APIs) + authoritative specs
- Pitfalls: HIGH — derived from reading actual PhaseService implementation (UNIQUE constraint, config ordering)
- Decision Statement validation: MEDIUM — Portuguese regex heuristic unverified

**Research date:** 2026-04-07
**Valid until:** 2026-07-07 (stable spec; no external dependencies to drift)
