---
phase: 02-vft-phase-1-initial-decision-frame
plan: "05"
subsystem: phase1-decision-statement
tags: [frontend, backend, phase1, decision-statement, gate]
dependency_graph:
  requires: ["02-01", "02-02", "02-03", "02-04"]
  provides: ["DecisionStatement UI", "check_phase1_gate", "phase1_completed flag"]
  affects: ["phase progression", "step 1.7", "phase2 unlock"]
tech_stack:
  added: []
  patterns: ["gate pattern on step completion", "re-completion for revisable steps"]
key_files:
  created:
    - frontend/src/components/phase1/DecisionStatement.tsx
  modified:
    - frontend/src/api/decisionFrame.ts
    - backend/schemas/decision_frame.py
    - backend/api/decision_frame.py
    - backend/services/phase1_service.py
    - backend/services/phase_service.py
decisions:
  - "Re-completion for steps 1.2-1.7 updates the existing StepCompletion record in-place (ORM-tracked mutation), rather than creating a duplicate — avoids unique constraint issues and allows user to revise IDF/DS"
  - "Phase 1 gate only sets phase1_completed=1 and does not block advancement — current_step naturally advances to 2.1 via existing get_next_step logic"
metrics:
  duration: "8min"
  completed_date: "2026-04-08"
  tasks: 2
  files: 6
---

# Phase 2 Plan 05: Decision Statement and Phase 1 Gate Summary

**One-liner:** DecisionStatement UI (step 1.7) with AI generation via FRAME agent, user self-certification checkbox, and Phase 1 gate that sets phase1_completed=1 and advances to step 2.1.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | DecisionStatement component + DS schema | fcb71c4 | DecisionStatement.tsx, decisionFrame.ts, decision_frame.py |
| 2 | Phase 1 gate + re-completion for IDF steps | af6d8de | phase1_service.py, phase_service.py |

## What Was Built

### Task 1: DecisionStatement Component (step 1.7)

- `frontend/src/components/phase1/DecisionStatement.tsx` — 110-line component with:
  - Free-text textarea for Decision Statement input
  - "Gerar com IA" button calling `decisionFrameApi.generateDS()` with current text as hint
  - Self-certification checkbox (`decision_statement_validated`)
  - "Salvar" button (always enabled when statement non-empty)
  - "Validar e Concluir Fase 1" button (requires non-empty statement AND checked checkbox)
  - On mount: loads existing DS from GET /decision-frame
- Extended `frontend/src/api/decisionFrame.ts` with `generateDS()` and `saveDS()` methods
- Extended `backend/schemas/decision_frame.py` IDFUpdate with `decision_statement` and `decision_statement_validated` optional fields; IDFResponse with same required fields
- Fixed `backend/api/decision_frame.py` GET endpoint to return `decision_statement` and `decision_statement_validated`

### Task 2: Phase 1 Completion Gate

- Added `check_phase1_gate(project_id, session)` to `backend/services/phase1_service.py`:
  - Check 1: At least 1 stakeholder with `is_decision_maker == 1`
  - Check 2: `idf_purpose`, `idf_perspective`, `idf_scope` all non-empty
  - Check 3: `idf_documented_at` is set (IDF documented)
  - Check 4: `decision_statement` non-empty AND `decision_statement_validated == 1`
- Hooked gate into `PhaseService.complete_step()` — when `step_id == "1.7"`, gate runs and sets `phase1_completed=1` if all criteria pass
- Implemented re-completion for steps 1.2–1.7: instead of HTTP 409, updates the existing `StepCompletion` record (data_json, notes, completed_at)

## Decisions Made

1. **Re-completion updates existing record:** Steps 1.2-1.7 can be re-completed by the user (they revise IDF fields and re-confirm). The existing `StepCompletion` row is updated in-place via ORM attribute assignment rather than creating duplicates.

2. **Gate is non-blocking for advancement:** The gate sets `phase1_completed=1` only if criteria pass, but step advancement to 2.1 happens regardless (via `get_next_step`). This is intentional — the flag is informational for downstream logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical field] GET /decision-frame did not return DS fields**
- **Found during:** Task 1 implementation
- **Issue:** `IDFResponse.decision_statement` and `decision_statement_validated` were added to the schema but the GET endpoint still only passed 4 fields to the constructor
- **Fix:** Added `decision_statement=project.decision_statement` and `decision_statement_validated=project.decision_statement_validated` to `IDFResponse()` call in `backend/api/decision_frame.py`
- **Files modified:** backend/api/decision_frame.py
- **Commit:** fcb71c4

## Known Stubs

None — all DS fields are wired to real DB columns and the backend endpoint is functional.

## Self-Check: PASSED

- `frontend/src/components/phase1/DecisionStatement.tsx` exists: FOUND
- `backend/services/phase1_service.py` has `check_phase1_gate`: FOUND
- `backend/services/phase_service.py` has `check_phase1_gate` and `phase1_completed`: FOUND
- Commits fcb71c4 and af6d8de: FOUND
