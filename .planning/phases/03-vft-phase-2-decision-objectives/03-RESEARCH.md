# Phase 3: VFT Phase 2 — Decision Objectives - Research

**Researched:** 2026-04-07
**Domain:** VFT value elicitation, objectives structuring, graph visualization
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| P2-01 | CRUD completo de objetivos com WITI fields e causal_links | DB schema already has `objectives` + `objective_causal_links` tables — no migration needed |
| P2-02 | AXIOM agent (Phase 2 Specialist): elicitação, WITI, CoC, hierarquia, atributos | Extend BaseAgent via `from_project_id` classmethod; context placeholders defined in AGENTS-SPEC |
| P2-03 | Passo 2.1 — Seleção de técnica qualitativa | `qualitative_modeling_tech` column already on Project; needs UI + PUT endpoint |
| P2-04 | Passos 2.2–2.3 — Upload/paste de docs; IA extrai valores | `org_documents_text` column already on Project; AXIOM performs extraction |
| P2-05 | Passos 2.5–2.7 — WishList + VFT Devices single stk | 10 devices defined in AGENTS-SPEC; objectives created from device responses |
| P2-06 | Passos 2.8–2.12 — VFB multi stk: individuais + consolidação + workshop | Conditional steps per `stakeholder_config`; objectives tagged with `source_stakeholder_id` |
| P2-07 | Passo 2.13 — Categorização de objetivos | AXIOM suggests; `type` column on Objective: `strategic/fundamental/means/uncategorized` |
| P2-08 | Passo 2.14 — WITI Test modal; classifica; cria causal links | `witi_classification`, `witi_question`, `witi_answer`, `witi_implies_objective_id` all exist |
| P2-09 | Passo 2.15 — Control of Consequences: 2 perguntas + refinamento | `coc_q1_answer`, `coc_q1_result`, `coc_q2_answer`, `coc_q2_result`, `coc_refinement_needed`, `refined_statement` all exist |
| P2-10 | Passo 2.16 — Means-Ends Network (react-flow + dagre) | react-flow + dagre NOT yet installed; must be added in Plan 03-01 |
| P2-11 | Passo 2.17 — Fundamental Objectives Hierarchy (árvore interativa) | `parent_id`, `hierarchy_level` columns exist on Objective; react-flow reuses same install |
| P2-12 | Passo 2.18 — AttributeDefiner: tipo + escala + 5 propriedades | `attributes` + `attribute_levels` tables already exist and fully match spec |
| P2-13 | Stakeholder Agent: simula respostas por perfil | New agent class; separate from AXIOM; placeholders defined in AGENTS-SPEC |
</phase_requirements>

---

## Summary

Phase 3 (VFT Phase 2 in product terminology) implements the 18-step objectives elicitation sub-system. The heavy lifting of this phase is already schema-complete: the `objectives`, `objective_causal_links`, `attributes`, and `attribute_levels` tables were defined in Phase 1 (Foundation) and match the spec precisely. No Alembic migrations are required.

The two gaps that must be resolved before any other plan can depend on graph visualization are: (1) react-flow and dagre are not installed in `frontend/package.json`, and (2) the AXIOM agent class (`backend/agents/phase2_specialist.py`) does not yet exist. Plan 03-01 must ship both as foundational deliverables. All subsequent plans depend on them.

WITI classification logic and Control of Consequences are pure Python functions — no external dependency — modeled exactly after the patterns from `phase1_service.py`. The Stakeholder Agent is a specialized variant of the BaseAgent pattern already established for FRAME, parameterized by individual stakeholder profile rather than project-level data.

**Primary recommendation:** Follow the 5-plan dependency chain strictly. Plan 03-01 (AXIOM + Stakeholder Agent + react-flow install) must complete before Plans 03-03 and 03-04 can start. Plans 03-02 and 03-05 are independent of the graph library.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react (react-flow) | ^12.x | Means-Ends Network + Hierarchy diagrams | Canonical graph UI for React; dagre layout plugin supported natively |
| dagre | ^0.8.5 | Auto-layout directed graphs (Sugiyama) | Only maintained layout engine with react-flow v11/v12 integration |
| @dagrejs/dagre | ^1.1.x | ESM-compatible fork of dagre | Prefer over legacy `dagre` for Vite/ESM environments |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| html2canvas | ^1.4.x | Export react-flow canvas to PNG | Plan 03-04; Phase 6 also uses it — install once here |
| (existing) axios | ^1.14 | API calls from frontend | Already installed; use for objectives CRUD |
| (existing) zustand | ^5.0 | Objectives/network state store | Already installed; add objectivesStore |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @xyflow/react | vis-network, cytoscape.js | react-flow has better React integration and TypeScript types; cytoscape more powerful but heavier |
| @dagrejs/dagre | elkjs | elk has better layouts but 1.5MB bundle; dagre is sufficient for acyclic means-ends graphs |

**Installation (Plan 03-01 task):**
```bash
cd frontend && npm install @xyflow/react @dagrejs/dagre html2canvas
```

**Version verification:** Run `npm view @xyflow/react version` before writing the plan to confirm current version.

---

## Architecture Patterns

### Recommended Project Structure (Phase 3 additions)
```
backend/
├── agents/
│   ├── phase2_specialist.py     # AXIOM agent (Plan 03-01)
│   └── stakeholder_agent.py     # Stakeholder simulation (Plan 03-01)
├── prompts/
│   ├── phase2_specialist.md     # AXIOM system prompt template
│   └── stakeholder.md           # Stakeholder simulation prompt template
├── engine/
│   ├── witi_test.py             # WITI classification pure function (Plan 03-03)
│   └── control_of_consequences.py  # CoC pure function (Plan 03-04)
├── api/
│   └── objectives.py            # Objectives CRUD + WITI/CoC endpoints (Plan 03-02)
└── services/
    └── phase2_service.py        # check_phase2_gate + objectives network builder

frontend/src/
├── api/
│   └── objectives.ts            # objectivesApi (Plan 03-02)
├── components/phase2/
│   ├── TechniqueSelector.tsx    # Step 2.1 (Plan 03-02)
│   ├── OrgDocumentPanel.tsx     # Steps 2.2–2.3 (Plan 03-02)
│   ├── ObjectivesList.tsx       # Steps 2.5–2.13 (Plan 03-02)
│   ├── ObjectiveCard.tsx        # Type badge, edit, WITI trigger (Plan 03-02)
│   ├── WITITestModal.tsx        # Step 2.14 (Plan 03-03)
│   ├── CausalRelationsMap.tsx   # react-flow graph (Plan 03-03)
│   ├── CoCModal.tsx             # Step 2.15 (Plan 03-04)
│   ├── MeansEndsNetwork.tsx     # Step 2.16 react-flow + dagre (Plan 03-04)
│   ├── ObjectivesHierarchy.tsx  # Step 2.17 react-flow tree (Plan 03-04)
│   └── AttributeDefiner.tsx     # Step 2.18 (Plan 03-05)
└── stores/
    └── objectivesStore.ts       # Zustand store for objectives + network state
```

### Pattern 1: AXIOM Agent extending BaseAgent
**What:** Same `from_project_id` classmethod pattern as FRAME, but loads Objectives list in addition to Project + Stakeholders.
**When to use:** All AXIOM API endpoints.
**Example:**
```python
# Source: established pattern from backend/agents/phase1_specialist.py
class Phase2SpecialistAgent(BaseAgent):

    @classmethod
    async def from_project_id(cls, project_id, session, model="claude-opus-4-6"):
        # Load project, stakeholders (same as FRAME)
        # Additionally load objectives ordered by order_index
        objectives = await session.execute(
            select(Objective)
            .where(Objective.project_id == project_id, Objective.deleted == 0)
            .order_by(Objective.order_index)
        )
        # Build objectives markdown list + render prompt template
        # Template placeholders: {{PROJECT_CONTEXT}}, {{OBJECTIVES_LIST}}, {{IDF}}
        ...
```

**Key difference from FRAME:** AXIOM uses `claude-opus-4-6` per AGENTS-SPEC ("Rigoroso, socrático, questionador"). FRAME uses `claude-sonnet-4-6`. The `BaseAgent.__init__` already accepts `model` parameter — just pass it through.

### Pattern 2: Stakeholder Agent — Per-stakeholder context
**What:** New agent class `StakeholderSimulationAgent` initialized from a single Stakeholder record. Not a project-level agent — it simulates one specific stakeholder's perspective.
**When to use:** Steps 2.5–2.12 when interviewing stakeholders (guided or free mode).
**Example:**
```python
# Source: AGENTS-SPEC.md Agente 5 — Stakeholder Agent
class StakeholderSimulationAgent(BaseAgent):

    @classmethod
    async def from_stakeholder_id(cls, stakeholder_id, project_id, session, model="claude-opus-4-6"):
        stakeholder = await session.get(Stakeholder, stakeholder_id)
        project = await session.get(Project, project_id)
        # Build system prompt from stakeholder.md template
        # Placeholders: {{STAKEHOLDER_NAME}}, {{STAKEHOLDER_ROLE}}, {{IS_DM}},
        #               {{STAKEHOLDER_PROFILE}}, {{STAKEHOLDER_INTERESTS}},
        #               {{PROJECT_CONTEXT}}, {{DECISION_STATEMENT}},
        #               {{IDF_PURPOSE}}, {{IDF_SCOPE}}
        ...
```

### Pattern 3: WITI Engine as Pure Python Function
**What:** `witi_test.py` classifies a single objective based on the user's answer to "Why is X important?"
**When to use:** Called from `/api/projects/{id}/axiom/witi-classify` endpoint.
```python
# backend/engine/witi_test.py
from dataclasses import dataclass
from enum import Enum

class WITIClassification(str, Enum):
    MEANS = "means"
    FUNDAMENTAL = "fundamental"
    STRATEGIC = "strategic"
    OTHER = "other"

@dataclass(frozen=True)
class WITIResult:
    classification: WITIClassification
    implies_objective_id: str | None  # populated when MEANS → points to what it implies
    reasoning: str

def classify_witi(
    objective_statement: str,
    why_answer: str,
    existing_objectives: list[dict],
) -> WITIResult:
    """
    Pure function — no DB access. Planner decides classification based on answer pattern.
    - If answer names another objective → MEANS, implies_objective_id set
    - If answer references IDF purpose/scope directly → FUNDAMENTAL
    - If answer is aspirational beyond decision scope → STRATEGIC
    - Otherwise → OTHER
    """
    ...
```

**Important:** The WITI classification can also be delegated to AXIOM via `agent.invoke()` with structured response format (same `CLASSIFICATION: means|fundamental|strategic|other\nREASONING: ...` pattern as FRAME's `VALID: yes|no`). Use AI for ambiguous cases, deterministic logic for obvious ones.

### Pattern 4: CoC Engine as Pure Python Function
**What:** `control_of_consequences.py` processes Q1 and Q2 answers and determines if objective needs refinement.
```python
# backend/engine/control_of_consequences.py
@dataclass(frozen=True)
class CoCResult:
    q1_result: str      # "aligned" | "misaligned"
    q2_result: str      # "internal" | "external"
    refinement_needed: bool
    refinement_suggestion: str | None

def evaluate_coc(
    objective_statement: str,
    idf_purpose: str,
    idf_scope: str,
    q1_answer: str,   # answer to "contributes to strategic objective?"
    q2_answer: str,   # answer to "influenced from outside scope?"
) -> CoCResult:
    ...
```

### Pattern 5: react-flow + dagre for Means-Ends Network
**What:** Auto-layout directed acyclic graph from `objective_causal_links`.
**Source:** @xyflow/react official docs; established Phase 6 target pattern.
```typescript
// frontend/src/components/phase2/MeansEndsNetwork.tsx
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'

function getLayoutedElements(nodes, edges) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'BT', ranksep: 80, nodesep: 50 })  // BT = means → fundamentals
  nodes.forEach(n => g.setNode(n.id, { width: 200, height: 60 }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return {
    nodes: nodes.map(n => {
      const { x, y } = g.node(n.id)
      return { ...n, position: { x: x - 100, y: y - 30 } }
    }),
    edges,
  }
}
```

### Pattern 6: Objectives CRUD API
**What:** New router `backend/api/objectives.py` following `stakeholders.py` pattern exactly.
**URL pattern:** `/api/projects/{project_id}/objectives`
**Endpoints needed:**
- `GET /` — list objectives (filter by `type`, `deleted=0`)
- `POST /` — create objective
- `PUT /{id}` — update objective (statement, type, WITI fields, CoC fields)
- `DELETE /{id}` — soft_delete via BaseRepository
- `POST /{id}/causal-link` — create ObjectiveCausalLink between two objectives
- `DELETE /causal-link/{link_id}` — remove a causal link

### Pattern 7: AXIOM API endpoints namespace
**What:** New router `backend/api/axiom.py` for AXIOM-specific actions.
**URL pattern:** `/api/projects/{project_id}/axiom/{action}`
**Endpoints needed:**
- `POST /extract-values` — extract values from org_documents_text (Steps 2.2–2.3)
- `POST /suggest-objective` — convert raw value to Verb+Object format
- `POST /witi-classify` — classify one objective (structured LLM response)
- `POST /coc-evaluate` — evaluate CoC for one objective candidate
- `POST /suggest-attributes` — suggest attribute definition for a fundamental objective
- `POST /stakeholder/{stakeholder_id}/interview` (SSE) — stream stakeholder simulation

**All AXIOM endpoints follow frame.py pattern:** load agent via classmethod, invoke with structured prompt, parse structured response.

### Anti-Patterns to Avoid
- **Loading ALL objectives into AXIOM system prompt without truncation:** Use 200-char truncation per objective (more objectives than IDF fields — 500-char per field was for 3 fields total). Apply `_truncate()` per objective statement.
- **Putting react-flow directly in a step component:** Extract `MeansEndsNetwork` and `CausalRelationsMap` as standalone components; step components just mount them. This allows Phase 6 to reuse them for export.
- **Storing WITI classification only in the agent response:** Always persist classification to DB immediately via `BaseRepository.update(objective_id, witi_classification=..., witi_question=..., witi_answer=...)`. Agent responses are ephemeral.
- **react-flow without `@xyflow/react/dist/style.css` import:** Nodes render without styles. Import the CSS once in the component file or in `index.css`.

---

## DB Schema Analysis (HIGH confidence)

All required tables are **already created** and match the spec. No Alembic migration is needed for Phase 3.

### Existing tables (Foundation Phase 1, Plan 01-02)
| Table | Purpose | Key columns for Phase 3 |
|-------|---------|------------------------|
| `objectives` | Core entity | `type` (strategic/fundamental/means/uncategorized), `witi_question`, `witi_answer`, `witi_classification`, `witi_implies_objective_id` (FK → objectives.id), `is_fundamental_candidate`, `coc_q1_answer`, `coc_q1_result`, `coc_q2_answer`, `coc_q2_result`, `coc_refinement_needed`, `refined_statement`, `parent_id` (FK → objectives.id for hierarchy), `hierarchy_level`, `source_stakeholder_id` (FK → stakeholders.id), `deleted` + `deleted_at` |
| `objective_causal_links` | Means-Ends edges | `from_obj`, `to_obj`, `project_id`, `label`; UniqueConstraint on (from_obj, to_obj) prevents duplicates |
| `attributes` | One attribute per fundamental objective | `attr_type` (natural/constructed/proxy), `description`, `scale_description`, `prop_unambiguous`, `prop_comprehensive`, `prop_direct`, `prop_operational`, `prop_understandable` |
| `attribute_levels` | Scale levels (3–5 per attribute) | `attribute_id`, `label`, `description`, `order_index` |

### Schema gaps: NONE
All columns needed for WITI Test, CoC, hierarchy (`parent_id`, `hierarchy_level`), and attributes are already present. The `is_fundamental_candidate` flag is the bridge between WITI (marks candidates) and CoC (processes candidates).

### Soft delete pattern
`Objective` uses `deleted` + `deleted_at` columns (not `archived`). `BaseRepository.soft_delete()` detects this at runtime via column inspection — no special handling needed.

### Phase 2 gate column
`Project.phase2_completed` already exists. The `check_phase2_gate()` function (to be written in `backend/services/phase2_service.py`) must verify: all fundamental objectives have an attribute defined.

---

## VFT Devices — Complete List (HIGH confidence, from AGENTS-SPEC.md)

10 devices from Keeney (1992), as defined in the spec:

| # | Name | Core Question Purpose |
|---|------|-----------------------|
| 1 | Wish List | Unconstrained desires and aspirations |
| 2 | Alternatives | Values revealed through contrast between alternatives |
| 3 | Problems and Shortcomings | Values from current problematic situations |
| 4 | Consequences | Values from feared/valued consequences |
| 5 | Goals, Constraints and Guidelines | Values implicit in goals and restrictions |
| 6 | Different Perspectives | Values from other stakeholders' viewpoints |
| 7 | Strategic Objectives | High-level mission/vision values |
| 8 | Generic Objectives | Customer/employee/social/environmental values |
| 9 | Structuring Objectives | Causal "why" questions — proto-WITI |
| 10 | Quantifying Objectives | Operationalize values for attribute creation |

The UI for Steps 2.5–2.6 (single stk) and 2.8–2.9 (multi stk) should display each device as a card with the question. AXIOM responds as if conducting the interview. Objectives created from device responses are tagged with `source_stakeholder_id`.

---

## WITI Classification Logic (HIGH confidence)

Source: AGENTS-SPEC.md AXIOM section + Keeney (1992) Ch.4 protocol.

### Classification Rules

| Answer Pattern | Classification | Action |
|----------------|---------------|--------|
| "Because it leads to [Other Objective]" | `means` | Set `witi_implies_objective_id` to the target objective; create `ObjectiveCausalLink(from=current, to=target)` |
| "Because it is fundamentally important to us in this decision context" | `fundamental` | Set `is_fundamental_candidate=1`; proceed to CoC |
| "Because it reflects our mission/vision beyond this decision" | `strategic` | No causal link; strategic objectives do not belong in the Means-Ends Network |
| Unclear / not fitting above | `other` | Flag for user review |

### WITI follow-up question flow
1. Show modal with objective statement
2. Ask: "Por que [OBJECTIVE] é importante no contexto desta decisão?"
3. User types answer (or asks AXIOM to suggest)
4. AXIOM classifies via structured response: `CLASSIFICATION: means|fundamental|strategic|other\nIMPLIES_OBJECTIVE: {id or null}\nREASONING: ...`
5. System persists classification + creates causal link if MEANS
6. If FUNDAMENTAL → mark `is_fundamental_candidate=1`, add to CoC queue

### Auto-creation of causal links
When AXIOM returns `CLASSIFICATION: means` and `IMPLIES_OBJECTIVE: {id}`, the endpoint automatically:
1. Updates objective: `witi_classification="means"`, `witi_implies_objective_id=target_id`
2. Creates `ObjectiveCausalLink(from_obj=current_id, to_obj=target_id, project_id=...)`
3. The UniqueConstraint on (from_obj, to_obj) prevents duplicate links — catch `IntegrityError` and return 409.

---

## Control of Consequences Logic (HIGH confidence)

Source: AGENTS-SPEC.md CoC section + Keeney (1992) Ch.4.

### Two Questions (as defined in spec)

**Q1:** "Will this objective contribute to the strategic objective(s) of this decision context?"
- Tests alignment with IDF Purpose and Perspective
- YES → aligned (coc_q1_result = "aligned")
- NO → misaligned → objective may be out of scope → needs refinement

**Q2:** "Is there any way to influence the achievement of this objective through alternatives from outside the decision context?"
- Tests adherence to IDF Scope
- NO → internal (coc_q2_result = "internal") → objective is truly fundamental to THIS decision
- YES → external → objective is too broad → needs scope refinement

### Decision Matrix

| Q1 | Q2 | Result |
|----|-----|--------|
| aligned | internal | Confirmed fundamental — no refinement needed |
| aligned | external | Fundamental but scope too broad — refine statement |
| misaligned | internal | Out of scope for this decision — reclassify as strategic |
| misaligned | external | Double problem — reclassify as strategic |

`coc_refinement_needed = 1` when any misalignment is found. `refined_statement` is populated by AXIOM suggestion.

---

## Means-Ends Network and Hierarchy (HIGH confidence)

### Data flow
1. WITI Test creates `ObjectiveCausalLink` records
2. `GET /api/projects/{id}/objectives/network` returns: `{nodes: [{id, statement, type, ...}], edges: [{from_obj, to_obj, label}]}`
3. Frontend converts to react-flow format: nodes with `position` (from dagre), edges with arrows
4. Hierarchy uses `parent_id` + `hierarchy_level` columns — NOT causal links
5. The two views (Network vs Hierarchy) display different structures from the same objective data

### react-flow node types for this phase
- `means_node` — orange/amber; shows objective statement; clickable to open WITI modal
- `fundamental_node` — blue/indigo; shows statement + attribute badge if defined
- `strategic_node` — purple; displayed but not connected in Means-Ends Network

### dagre layout configuration for Means-Ends Network
- `rankdir: 'BT'` (bottom-to-top): means objectives at bottom, fundamentals at top
- `ranksep: 80`: vertical spacing
- `nodesep: 50`: horizontal spacing

### dagre layout for Hierarchy (Step 2.17)
- `rankdir: 'TB'` (top-to-bottom): root fundamental at top, specific children below
- Use `parent_id` to build parent-child edges, not `objective_causal_links`

---

## Attribute Definition (HIGH confidence)

Source: DATA-MODEL.md `attributes` + `attribute_levels` tables; AGENTS-SPEC.md AXIOM section.

### `attr_type` values
- `natural` — directly measurable in natural units (e.g., cost in R$)
- `constructed` — scale built specifically for this objective (e.g., 5-level qualitative scale)
- `proxy` — indirect measure when direct measurement impossible

### 5 properties (booleans stored as INTEGER 0/1)
- `prop_unambiguous` — each level has single clear meaning
- `prop_comprehensive` — scale covers all relevant levels
- `prop_direct` — directly measures the objective
- `prop_operational` — levels can be determined in practice
- `prop_understandable` — stakeholders understand the scale

### AttributeLevel order
`attribute_levels.order_index` is the ordering mechanism. Typically 3–5 levels from worst to best (or best to worst). The UI should allow drag-to-reorder.

### Phase 2 gate
All objectives with `witi_classification = "fundamental"` (and `is_fundamental_candidate = 1`, CoC confirmed) must have a corresponding `attributes` record. `check_phase2_gate()` queries:
```python
fundamentals = [o for o in objectives if o.witi_classification == "fundamental"]
fundamentals_with_attr = [f for f in fundamentals if attribute_exists(f.id)]
return len(fundamentals) > 0 and len(fundamentals_with_attr) == len(fundamentals)
```

---

## Common Pitfalls

### Pitfall 1: react-flow missing CSS import
**What goes wrong:** Nodes render as unstyled boxes with no handles. Graph layout applies but visual is broken.
**Why it happens:** `@xyflow/react` requires its own CSS file to be imported; unlike most React libraries, it does not inject styles via JS.
**How to avoid:** Add `import '@xyflow/react/dist/style.css'` at the top of `MeansEndsNetwork.tsx` or in `index.css`.
**Warning signs:** Nodes visible but no edges; handles invisible; controls missing.

### Pitfall 2: Circular causal links crash dagre layout
**What goes wrong:** dagre.layout() hangs or produces NaN positions if the graph has cycles.
**Why it happens:** Users may create circular WITI links (A → B → A).
**How to avoid:** Backend validates before creating `ObjectiveCausalLink`: run DFS to detect cycle. Return 422 with message "Circular dependency detected" if cycle found. UniqueConstraint already prevents A→B+B→A only if the check catches A→B→A patterns. Detection must be explicit.
**Warning signs:** dagre returns NaN for node positions.

### Pitfall 3: AXIOM prompt token overflow with many objectives
**What goes wrong:** AXIOM fails with `max_tokens` error when project has 30+ objectives.
**Why it happens:** Each objective in `{{OBJECTIVES_LIST}}` adds ~50–200 tokens. FRAME only had 3 IDF fields.
**How to avoid:** Apply 200-char truncation per objective statement (shorter than FRAME's 500-char per field). For WITI/CoC operations, pass only the single target objective — not the full list — in the user message. Only include full list in system prompt context.
**Warning signs:** API errors with code `overloaded_error` or `context_window_exceeded`.

### Pitfall 4: Stakeholder Agent model vs AXIOM model
**What goes wrong:** Using `claude-sonnet-4-6` for stakeholder simulation produces "expert" sounding answers; using `claude-opus-4-6` is expensive per interview turn.
**Why it happens:** AGENTS-SPEC specifies `claude-opus-4-6` for both AXIOM and Stakeholder Agent, but simulation doesn't need deep reasoning.
**How to avoid:** `StakeholderSimulationAgent` defaults to `claude-sonnet-4-6` (cheaper, faster for conversational turns); override to `claude-opus-4-6` only if user explicitly requests "deeper simulation". AXIOM always uses `claude-opus-4-6` for classification tasks.
**Warning signs:** High API cost per interview session.

### Pitfall 5: `parent_id` vs `objective_causal_links` confusion
**What goes wrong:** Plan tries to build hierarchy from `objective_causal_links` instead of `parent_id`.
**Why it happens:** Both represent relationships between objectives; developer uses wrong source.
**How to avoid:** `parent_id` is for the Fundamental Objectives Hierarchy (Step 2.17) — manually assigned parent-child groupings. `objective_causal_links` is for the Means-Ends Network (Step 2.16) — WITI-derived causal relationships. They are different graphs with different semantics.
**Warning signs:** Hierarchy shows means objectives; network shows hierarchy structure.

### Pitfall 6: `witi_implies_objective_id` vs `ObjectiveCausalLink`
**What goes wrong:** Plan only updates `witi_implies_objective_id` but does not create the `ObjectiveCausalLink` record, causing the network graph to be empty.
**Why it happens:** Two representations of the same link exist: `Objective.witi_implies_objective_id` (denormalized) and `ObjectiveCausalLink` table (normalized for graph queries). Both must be written.
**How to avoid:** WITI classification endpoint always writes both. `witi_implies_objective_id` is a convenience pointer for single-parent lookup; `ObjectiveCausalLink` is the source of truth for the network graph.

---

## Wave Dependencies Between the 5 Plans

Plans must be executed in this order due to hard dependencies:

```
Plan 03-01: AXIOM + Stakeholder Agent + react-flow install
    ↓
Plan 03-02: Value Elicitation UI (depends on: objectives API + AXIOM agent)
    ↓ (also depends on 03-01 for react-flow CSS types)
Plan 03-03: WITI Test Engine + CausalRelationsMap (depends on: 03-01 react-flow, 03-02 objectives API)
    ↓
Plan 03-04: CoC + Means-Ends Network + Hierarchy (depends on: 03-03 for WITI data, 03-01 react-flow)
    ↓
Plan 03-05: AttributeDefiner + Phase 2 Gate (depends on: 03-04 for confirmed fundamentals list)
```

**Plans 03-02 and 03-03 could partially parallelize** (UI for elicitation vs WITI engine) but WITI UI (03-03) needs the ObjectivesCard component from 03-02, so the UI side is sequential.

**Plan 03-01 is the critical-path blocker.** It must:
1. Create `backend/agents/phase2_specialist.py` (AXIOM)
2. Create `backend/agents/stakeholder_agent.py` (Stakeholder)
3. Create `backend/prompts/phase2_specialist.md` + `backend/prompts/stakeholder.md`
4. Create `backend/api/axiom.py` router (at least `extract-values` + `witi-classify` stubs)
5. Create `backend/api/objectives.py` CRUD router
6. Register both routers in `backend/app.py`
7. Run `npm install @xyflow/react @dagrejs/dagre html2canvas` in frontend

---

## Code Examples

### AXIOM agent from_project_id pattern
```python
# Source: established pattern, backend/agents/phase1_specialist.py
PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "phase2_specialist.md"
_MAX_FIELD_LEN = 500
_MAX_OBJ_LEN = 200  # shorter — many objectives in list

class Phase2SpecialistAgent(BaseAgent):

    def __init__(self, project_context: dict, model: str = "claude-opus-4-6") -> None:
        system = self._render_prompt(project_context)
        super().__init__(model=model, system=system)

    def _render_prompt(self, ctx: dict) -> str:
        template = PROMPT_PATH.read_text(encoding="utf-8")
        return (
            template
            .replace("{{PROJECT_CONTEXT}}", ctx.get("project_summary", ""))
            .replace("{{OBJECTIVES_LIST}}", ctx.get("objectives_md", "(none yet)"))
            .replace("{{IDF}}", ctx.get("idf_summary", ""))
        )

    @classmethod
    async def from_project_id(cls, project_id, session, model="claude-opus-4-6"):
        # ... load project, stakeholders, objectives
        # Truncate each objective to _MAX_OBJ_LEN
        objectives_lines = [
            f"- [{o.type}] {o.statement[:_MAX_OBJ_LEN]}"
            for o in objectives if not o.deleted
        ]
        context = {
            "project_summary": ...,
            "objectives_md": "\n".join(objectives_lines) or "(none yet)",
            "idf_summary": f"Purpose: {project.idf_purpose}\nScope: {project.idf_scope}",
        }
        return cls(project_context=context, model=model)
```

### Structured AXIOM response parsing (WITI)
```python
# backend/api/axiom.py
response = await agent.invoke([{"role": "user", "content": witi_prompt}])

classification = "other"
implies_id = None
reasoning = response.strip()

for line in response.splitlines():
    ls = line.strip().upper()
    if ls.startswith("CLASSIFICATION:"):
        val = line.split(":", 1)[-1].strip().lower()
        if val in ("means", "fundamental", "strategic", "other"):
            classification = val
    elif ls.startswith("IMPLIES_OBJECTIVE:"):
        val = line.split(":", 1)[-1].strip()
        if val and val.lower() != "null":
            implies_id = val
    elif ls.startswith("REASONING:"):
        reasoning = line.split(":", 1)[-1].strip()
```

### react-flow node rendering for objectives
```typescript
// Source: @xyflow/react official docs pattern
import { Handle, Position } from '@xyflow/react'

function ObjectiveNode({ data }: { data: { statement: string; type: string } }) {
  const colors = {
    means: 'bg-amber-50 border-amber-400',
    fundamental: 'bg-blue-50 border-blue-400',
    strategic: 'bg-purple-50 border-purple-400',
  }
  return (
    <div className={`rounded-lg border-2 p-3 max-w-[200px] text-sm ${colors[data.type] ?? 'bg-gray-50 border-gray-300'}`}>
      <Handle type="target" position={Position.Bottom} />
      <p className="text-center">{data.statement}</p>
      <Handle type="source" position={Position.Top} />
    </div>
  )
}
```

### chat.py extension for AXIOM agent type
```python
# backend/api/chat.py — add to AGENT_CONFIGS and branch
AGENT_CONFIGS["phase2_specialist"] = {
    "model": "claude-opus-4-6",
    "name": "AXIOM",
    "system": "",  # dynamically loaded from DB
}
AGENT_CONFIGS["stakeholder_simulation"] = {
    "model": "claude-sonnet-4-6",
    "name": "",  # dynamically set from stakeholder.name
    "system": "",  # dynamically loaded from DB
}

# In chat_message handler — add branch after phase1_specialist branch:
elif body.agent_type == "phase2_specialist":
    agent = await Phase2SpecialistAgent.from_project_id(...)
elif body.agent_type == "stakeholder_simulation" and body.stakeholder_id:
    agent = await StakeholderSimulationAgent.from_stakeholder_id(...)
```

The `ChatMessageRequest` schema will need a `stakeholder_id: str | None = None` field added for stakeholder simulation routing.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `reactflow` (npm package) | `@xyflow/react` (renamed) | v12.0 (2024) | Must install `@xyflow/react`, not `reactflow` |
| `dagre` (CommonJS) | `@dagrejs/dagre` (ESM fork) | 2023 | Vite builds fail with legacy `dagre` due to CommonJS module issues |

**Deprecated/outdated:**
- `reactflow`: Renamed to `@xyflow/react` at v12. The `reactflow` package on npm still exists but points to older v11 — do NOT use it.
- `dagre` (original): CommonJS only; Vite tree-shaking breaks it. Use `@dagrejs/dagre` instead.

---

## Open Questions

1. **ChatMessageRequest schema — stakeholder_id field**
   - What we know: Current schema does not include `stakeholder_id`
   - What's unclear: Whether to add it to the shared schema or create a separate endpoint
   - Recommendation: Add `stakeholder_id: str | None = None` to `ChatMessageRequest` in `backend/schemas/chat.py`; minimal change, consistent with existing pattern

2. **VFT Devices UI — guided vs free mode toggle**
   - What we know: AGENTS-SPEC describes "guided" (devices one-by-one) and "free" (open chat) modes
   - What's unclear: Whether to implement both in Plan 03-02 or free mode only
   - Recommendation: Implement free mode (direct chat with AXIOM) in Plan 03-02; guided device-by-device in Plan 03-02 as a secondary tab; both are straightforward given the devices list is static

3. **Hierarchy root node**
   - What we know: `parent_id` is nullable on Objective — roots have `parent_id=NULL`
   - What's unclear: Whether the Fundamental Objectives Hierarchy root is one virtual node or multiple independent roots
   - Recommendation: Allow multiple roots (multiple independent fundamental clusters is valid in VFT); react-flow handles disconnected graphs natively

---

## Sources

### Primary (HIGH confidence)
- `backend/db/models.py` — confirmed all DB columns for objectives, causal_links, attributes, attribute_levels
- `backend/agents/base_agent.py` + `backend/agents/phase1_specialist.py` — confirmed BaseAgent extension pattern
- `backend/api/chat.py` — confirmed agent routing pattern for new agent types
- `backend/api/frame.py` — confirmed AXIOM endpoint pattern (structured response parsing)
- `backend/engine/process_manager.py` — confirmed all 18 Phase 2 step definitions
- `AGENTS-SPEC.md` — VFT Devices list (10 devices), AXIOM/Stakeholder system prompt templates
- `frontend/package.json` — confirmed react-flow + dagre NOT installed

### Secondary (MEDIUM confidence)
- @xyflow/react v12 naming confirmed via npm package name change documentation
- @dagrejs/dagre ESM fork recommendation based on known Vite/CommonJS incompatibility with original `dagre`

### Tertiary (LOW confidence — flag for validation)
- dagre `rankdir: 'BT'` for Means-Ends being best UX choice — verify with domain expert; alternative is `LR` (left-to-right)

---

## Metadata

**Confidence breakdown:**
- Standard stack: MEDIUM — react-flow + dagre version confirmed via package.json absence; actual current versions need npm verification before Plan 03-01
- Architecture: HIGH — all patterns derived directly from existing codebase code
- DB schema: HIGH — read models.py directly; all columns confirmed present
- VFT logic: HIGH — derived from AGENTS-SPEC.md and process_manager.py
- Pitfalls: HIGH — derived from established Phase 2 decisions in STATE.md and direct code analysis

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable stack; only react-flow version needs re-verification if >30 days)
