---
phase: 04-mvp-completion
plan: "01"
type: summary
completed_at: "2026-04-09"
---

# Plan 04-01 Summary: NOVA Agent + Alternatives + ConsequencesMatrix

## What was built

### Backend
- `backend/agents/phase3_specialist.py` — `Phase3SpecialistAgent` (NOVA), `from_project_id` loads project, fundamentals+attributes, and alternatives
- `backend/prompts/phase3_specialist.md` — NOVA system prompt (PT-BR responses, Phase 3 VFT specialist)
- `backend/schemas/alternative.py` — Frozen Pydantic v2 schemas: `AlternativeCreate`, `AlternativeUpdate`, `AlternativeResponse`, `ConsequenceUpsert`, `ConsequenceResponse`, `AlternativeWithConsequences`
- `backend/api/alternatives.py` — Full CRUD + upsert consequences + `suggest-consequences` endpoint (NOVA invoke)
- `backend/app.py` — registered `alternatives.router`
- `backend/api/chat.py` — added `phase3_specialist` to `AGENT_CONFIGS`, route to `Phase3SpecialistAgent`

### Frontend
- `frontend/src/api/alternatives.ts` — `alternativesApi` with `list`, `create`, `update`, `remove`, `upsertConsequence`, `suggestConsequences`
- `frontend/src/components/phase3/AlternativeCard.tsx` — editable card with status quo toggle and inline name/description edit
- `frontend/src/components/phase3/AlternativesList.tsx` — list with add/delete, NOVA suggest button
- `frontend/src/components/phase3/ConsequencesMatrix.tsx` — interactive alternatives × fundamentals table with inline cell editing, per-row NOVA suggestions, progress indicator
- `frontend/src/components/phase3/Phase3View.tsx` — tabbed view combining AlternativesList and ConsequencesMatrix

## Key Decisions
- NOVA uses `invoke()` (not stream) for consequence suggestions — structured JSON response needed
- ConsequencesMatrix cells: click-to-edit textarea, save on blur
- Upsert pattern for consequences: PUT creates or updates by (alternative_id, objective_id) unique constraint
- NOVA uses `claude-sonnet-4-6` (operational Phase 3 tasks, cheaper than opus)
