---
phase: 02-vft-phase-1-initial-decision-frame
plan: 03
subsystem: api, ui
tags: [fastapi, react, typescript, pydantic, idf, decision-frame, sse]

# Dependency graph
requires:
  - phase: 02-01
    provides: FRAME agent, chat SSE endpoint, phase1_specialist agent_type
  - phase: 02-02
    provides: stakeholder_config variant, StakeholderMapper component pattern
provides:
  - GET/PUT /api/projects/{id}/decision-frame endpoints
  - IDFUpdate and IDFResponse frozen Pydantic schemas
  - DecisionFrameForm React component (variants 1.2/1.3/1.5)
  - decisionFrameApi frontend client with get/save/generateSuggestion
affects: [phase 2 steps, IDF data consumption, FRAME agent integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - SSE streamChatMessage wrapped in Promise for one-shot AI suggestions
    - 2s debounce auto-save pattern with dirty flag and saved indicator
    - Variant-specific instruction text via Record<variant, string> lookup

key-files:
  created:
    - backend/api/decision_frame.py
    - backend/schemas/decision_frame.py
    - frontend/src/api/decisionFrame.ts
    - frontend/src/components/phase1/DecisionFrameForm.tsx
  modified:
    - backend/app.py

key-decisions:
  - "generateSuggestion uses existing SSE streamChatMessage (not plain POST) — consistent with chat architecture, accumulates delta text into Promise"
  - "PUT endpoint filters non-None fields server-side — partial updates without overwriting existing data"

patterns-established:
  - "SSE-to-Promise wrapper: wrap streamChatMessage in new Promise, accumulate deltas, resolve on done"
  - "Debounce auto-save: dirty flag + useEffect + setTimeout(2000) + cleanup on re-render"

requirements-completed: [P1-02]

# Metrics
duration: 15min
completed: 2026-04-08
---

# Phase 02 Plan 03: Decision Frame API and DecisionFrameForm Summary

**GET/PUT /decision-frame REST endpoints + DecisionFrameForm with variant-adaptive instructions, 2s debounce auto-save, and FRAME-powered AI suggestion buttons via SSE chat endpoint**

## Performance

- **Duration:** 15 min
- **Started:** 2026-04-08T01:00:00Z
- **Completed:** 2026-04-08T01:13:10Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- GET/PUT /api/projects/{id}/decision-frame endpoints with frozen Pydantic schemas (IDFUpdate, IDFResponse)
- DecisionFrameForm React component supporting variants 1.2 (single DM), 1.3 (single DM / multi stakeholder), 1.5 (multi DM) with distinct instruction text per variant
- Auto-save with 2s debounce and "Salvo" success indicator; all 3 IDF fields saved together
- AI suggestion button per field calls FRAME agent via existing SSE chat endpoint (phase1_specialist); SSE stream accumulated into Promise

## Task Commits

1. **Task 1: Create decision_frame API router with GET/PUT endpoints + schemas** - `841553e` (feat)
2. **Task 2: Create DecisionFrameForm component + frontend API client** - `1601c7f` (feat)

**Plan metadata:** (docs commit — see final_commit)

## Files Created/Modified
- `backend/schemas/decision_frame.py` - IDFUpdate and IDFResponse frozen Pydantic schemas
- `backend/api/decision_frame.py` - GET/PUT /decision-frame router with BaseRepository usage
- `backend/app.py` - Added decision_frame router import and include_router
- `frontend/src/api/decisionFrame.ts` - decisionFrameApi client (get/save/generateSuggestion via SSE)
- `frontend/src/components/phase1/DecisionFrameForm.tsx` - 3-field IDF form with variant instructions, debounce, AI buttons, step completion

## Decisions Made
- `generateSuggestion` wraps existing `streamChatMessage` SSE function in a Promise that accumulates delta text and resolves on done — consistent with the SSE-first chat architecture, no separate non-streaming endpoint needed
- PUT endpoint uses `{k: v for k, v in body.model_dump().items() if v is not None}` to allow partial IDF updates without overwriting fields the user hasn't touched in the current session

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 3 IDF fields can be read, saved, and AI-suggested via FRAME
- DecisionFrameForm ready to be wired into the step routing layer (whichever component renders step 1.2/1.3/1.5 passes `variant` prop)
- Next plan in phase 02 should integrate DecisionFrameForm into the step router and validate the IDF flow end-to-end

---
*Phase: 02-vft-phase-1-initial-decision-frame*
*Completed: 2026-04-08*
