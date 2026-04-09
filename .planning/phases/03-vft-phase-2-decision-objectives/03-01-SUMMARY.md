---
phase: 03-vft-phase-2-decision-objectives
plan: "01"
subsystem: backend-agents, backend-api, frontend-store
tags: [vft, phase2, axiom, objectives, crud, causal-links, stakeholder-simulation, react-flow]
dependency_graph:
  requires: []
  provides: [Phase2SpecialistAgent, StakeholderSimulationAgent, objectives-crud-api, axiom-action-api, objectivesApi, useObjectivesStore]
  affects: [backend/api/chat.py, backend/app.py]
tech_stack:
  added: ["@xyflow/react", "@dagrejs/dagre", "html2canvas"]
  patterns: [BaseAgent extension, frozen Pydantic v2 schemas, DFS cycle detection, SSE streaming, Zustand store]
key_files:
  created:
    - backend/agents/phase2_specialist.py
    - backend/agents/stakeholder_agent.py
    - backend/prompts/phase2_specialist.md
    - backend/prompts/stakeholder.md
    - backend/schemas/objective.py
    - backend/api/objectives.py
    - backend/api/axiom.py
    - frontend/src/api/objectives.ts
    - frontend/src/stores/objectivesStore.ts
  modified:
    - backend/schemas/chat.py
    - backend/api/chat.py
    - backend/app.py
    - frontend/package.json
    - frontend/package-lock.json
decisions:
  - "Phase2SpecialistAgent defaults to claude-opus-4-6 per PROJECT.md and AGENTS-SPEC (rigoroso, socrático)"
  - "StakeholderSimulationAgent defaults to claude-sonnet-4-6 (cheaper for conversational simulation, pitfall #4)"
  - "DFS cycle detection prevents circular causal link graphs before DB insert"
  - "WITI classify auto-sets type=means/fundamental and creates causal link if implies_id valid"
  - "axiom/suggest-category returns suggestion only — no DB update, user decides"
metrics:
  duration: "36 minutes"
  completed_date: "2026-04-09"
  tasks: 2
  files: 14
---

# Phase 3 Plan 01: AXIOM Foundation — Agents, Schemas, APIs, and Frontend Layer Summary

Phase 2 backend foundation delivered: AXIOM agent (Phase 2 Specialist) and Stakeholder Simulation agent, Objectives CRUD API with causal link management and DFS cycle detection, AXIOM action endpoints (WITI, CoC, extract-values, suggest-attributes, suggest-category, stakeholder interview SSE), frozen Pydantic schemas, frontend API client, and Zustand store.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AXIOM + Stakeholder agents, prompts, schemas, npm | 3336e81 | 8 files |
| 2 | Objectives CRUD router, AXIOM endpoints, chat wiring, frontend | fe83a90 | 6 files |

## What Was Built

### Backend Agents

**`Phase2SpecialistAgent` (AXIOM)** — extends BaseAgent with `claude-opus-4-6` default. Loads project context (name, description, qualitative_modeling_tech), IDF summary (purpose, perspective, scope, decision_statement), stakeholders list, and objectives list from DB. Renders `phase2_specialist.md` prompt with 4 placeholders. `from_project_id` classmethod truncates all fields (500 chars for text, 200 chars for objective statements).

**`StakeholderSimulationAgent`** — extends BaseAgent with `claude-sonnet-4-6` default. Loads a single stakeholder profile + project context. Renders `stakeholder.md` prompt with 8 placeholders. `from_stakeholder_id` classmethod handles missing profile/interests gracefully with defaults.

### Prompt Templates

**`phase2_specialist.md`** — AXIOM identity, 10 VFT Devices (Wish List through Quantifying), WITI structured response format (`CLASSIFICATION:/IMPLIES_OBJECTIVE:/REASONING:`), CoC structured response format (`Q1_RESULT:/Q2_RESULT:/REFINEMENT_NEEDED:/REFINED_STATEMENT:/REASONING:`). PT-BR, socrático personality.

**`stakeholder.md`** — Stakeholder simulation identity with all context placeholders, guided/free mode instructions, character break rules.

### Backend API

**`/api/projects/{project_id}/objectives`** — Full CRUD with soft delete. Network endpoint returns nodes+edges. `_has_cycle` DFS prevents circular causal graphs. `UniqueConstraint` on causal links caught via IntegrityError → 409.

**`/api/projects/{project_id}/axiom`** — 6 endpoints: `extract-values`, `witi-classify` (parses CLASSIFICATION:/IMPLIES_OBJECTIVE: and auto-creates causal link for means objectives), `coc-evaluate` (parses Q1_RESULT:/Q2_RESULT: and updates all coc_* fields), `suggest-attributes`, `suggest-category` (suggestion-only, no DB write), `stakeholder/{id}/interview` (SSE stream).

**Chat routing** — `phase2_specialist` and `stakeholder_simulation` branches added to `chat_message` handler. Both appear in AGENT_CONFIGS.

### Frontend

**`objectivesApi`** — 12 methods covering full CRUD + causal link management + all 5 AXIOM action endpoints.

**`useObjectivesStore`** — Zustand store with `objectives[]`, `causalLinks[]`, `loading`, `error`. All 7 actions (fetchObjectives, fetchNetwork, addObjective, updateObjective, removeObjective, addCausalLink, removeCausalLink) update state immutably via spread.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or hardcoded empty values that flow to UI rendering.

## Self-Check: PASSED

- `backend/agents/phase2_specialist.py` — FOUND
- `backend/agents/stakeholder_agent.py` — FOUND
- `backend/prompts/phase2_specialist.md` — FOUND
- `backend/prompts/stakeholder.md` — FOUND
- `backend/schemas/objective.py` — FOUND
- `backend/api/objectives.py` — FOUND
- `backend/api/axiom.py` — FOUND
- `frontend/src/api/objectives.ts` — FOUND
- `frontend/src/stores/objectivesStore.ts` — FOUND
- Commit `3336e81` — FOUND
- Commit `fe83a90` — FOUND
- All Python imports verified OK
- All 13 API routes registered in app.routes verified
- npm packages in package.json and node_modules verified
