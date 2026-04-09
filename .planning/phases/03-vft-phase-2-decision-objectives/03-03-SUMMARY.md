---
phase: 03-vft-phase-2-decision-objectives
plan: "03"
subsystem: backend-engine, frontend-ui
tags: [vft, phase2, witi, causal-links, react-flow, dagre, classification]
dependency_graph:
  requires:
    - phase: 03-01
      provides: [objectivesApi.witiClassify, useObjectivesStore, Phase2SpecialistAgent]
    - phase: 03-02
      provides: [ObjectiveCard.onWITI]
  provides:
    - WITIClassification enum (means/fundamental/strategic/other)
    - WITIResult frozen dataclass + parse_witi_response
    - WITITestModal (Step 2.14 WITI Test dialog)
    - CausalRelationsMap (react-flow causal graph with dagre layout)
  affects: [plan 03-04 MeansEndsNetwork (same react-flow pattern), plan 03-05 AttributeDefiner]
tech_stack:
  added: []
  patterns:
    - "Structured LLM response parsing with prefix keys (CLASSIFICATION:/IMPLIES_OBJECTIVE:/REASONING:) — same pattern as frame.py VALID:/FEEDBACK:"
    - "useObjectivesStore.setState direct for optimistic store update after classify"
    - "dagre BT layout (rankdir:BT, ranksep:80, nodesep:50) — means at bottom, fundamentals at top"
    - "useNodesState + useEffect sync pattern for dynamic react-flow graph"
key_files:
  created:
    - backend/engine/witi_test.py
    - frontend/src/components/phase2/WITITestModal.tsx
    - frontend/src/components/phase2/CausalRelationsMap.tsx
  modified: []
decisions:
  - "parse_witi_response defaults classification to OTHER on unknown values — tolerant parser prevents crashes on unexpected LLM output"
  - "WITITestModal uses useObjectivesStore.setState directly for immediate optimistic update + calls fetchNetwork to sync causal links"
  - "CausalRelationsMap uses two useNodesState instances: one for initial layout, one synced via useEffect on memoized initialNodes — ensures graph re-renders on store updates"
  - "Empty state triggers on objectives.length === 0 OR causalLinks.length === 0 (either condition means no graph to show)"
metrics:
  duration: "2 minutes"
  completed_date: "2026-04-09"
  tasks: 2
  files: 3
---

# Phase 3 Plan 03: WITI Engine, WITITestModal, and CausalRelationsMap Summary

**WITI Test classification engine (frozen dataclass + tolerant LLM response parser), WITITestModal dialog (why-question, classify CTA, result badges for means/fundamental/strategic), and CausalRelationsMap (dagre BT-layout react-flow graph with color-coded nodes, animated edges, and empty state).**

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | WITI engine data types + WITITestModal component | 0fdb583 | backend/engine/witi_test.py, frontend/src/components/phase2/WITITestModal.tsx |
| 2 | CausalRelationsMap react-flow component | 30c5a0c | frontend/src/components/phase2/CausalRelationsMap.tsx |

## What Was Built

### Backend Engine

**`backend/engine/witi_test.py`** — Pure Python module with:
- `WITIClassification(str, Enum)`: MEANS / FUNDAMENTAL / STRATEGIC / OTHER
- `@dataclass(frozen=True) WITIResult`: classification, implies_objective_id, reasoning
- `parse_witi_response(response_text)`: Parses CLASSIFICATION:/IMPLIES_OBJECTIVE:/REASONING: lines; case-insensitive keys; unknown classification defaults to OTHER; null/none/empty implies_id → None

### Frontend UI

**`WITITestModal.tsx`** — Step 2.14 modal dialog:
- Fixed overlay `bg-black/50 z-50` centering
- Objective statement displayed in gray-50 box
- Why-question label dynamically includes objective statement
- Textarea with min-height 100px; "Classificar" CTA disabled while empty or classifying
- Loading state: Loader2 spinner + "Classificando..." replacing CTA
- Classification result: amber pill for means, purple for fundamental, blue for strategic
- Fundamental result shows emerald-50 info box: CoC forwarding notice
- Error state: red-50 box with AXIOM connectivity message
- "Confirmar" button appears after classification; calls onClose()
- Store updated via setState after classify; fetchNetwork called to sync causal links

**`CausalRelationsMap.tsx`** — react-flow graph:
- Imports `@xyflow/react/dist/style.css` (critical for correct rendering)
- Custom `ObjectiveNode`: amber-50/amber-400 for means, purple-50/purple-500 for fundamental, blue-50/blue-400 for strategic
- Handles on top (source) and bottom (target) for edge attachment
- `getLayoutedElements`: dagre BT layout, ranksep:80, nodesep:50, 200×60 node size
- Animated edges with ArrowClosed marker
- Dynamic sync: useEffect resets nodes/edges when store data changes
- Empty state when objectives or causalLinks empty
- Loading spinner while store loading
- Controls bottom-left, Background dots, fitView 0.2 padding

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or hardcoded empty values that flow to UI rendering.

## Self-Check: PASSED

- `backend/engine/witi_test.py` — FOUND
- `frontend/src/components/phase2/WITITestModal.tsx` — FOUND
- `frontend/src/components/phase2/CausalRelationsMap.tsx` — FOUND
- Commit `0fdb583` — FOUND
- Commit `30c5a0c` — FOUND
- Python import `from backend.engine.witi_test import WITIClassification, parse_witi_response` — PASSED
- WITITestModal contains witiClassify, Classificar, Meio, Fundamental, Estrategico, bg-indigo-600, bg-black/50 — VERIFIED
- CausalRelationsMap contains @xyflow/react, dagre, dist/style.css, rankdir BT, ranksep 80, nodesep 50, amber/purple nodes, Handle/Position, empty state, Controls, Background — VERIFIED
- TypeScript `tsc --noEmit --skipLibCheck` — PASSED (zero errors)
