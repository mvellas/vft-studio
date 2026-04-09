---
phase: 03-vft-phase-2-decision-objectives
plan: "04"
subsystem: backend-engine, frontend-ui
tags: [vft, phase2, coc, control-of-consequences, react-flow, dagre, hierarchy, means-ends, html2canvas]
dependency_graph:
  requires:
    - phase: 03-01
      provides: [objectivesApi.cocEvaluate, useObjectivesStore, Phase2SpecialistAgent, CoCEvaluateRequest]
    - phase: 03-03
      provides: [CausalRelationsMap pattern, ObjectiveNode, dagre BT layout, WITIClassification]
  provides:
    - CoCResult frozen dataclass + parse_coc_response + determine_coc_action
    - CoCModal (Step 2.15 CoC 2-question dialog)
    - MeansEndsNetwork (Step 2.16 dagre BT react-flow graph)
    - ObjectivesHierarchy (Step 2.17 dagre TB react-flow tree)
  affects: [plan 03-05 AttributeDefiner (uses ObjectivesHierarchy + fundamental objectives)]
tech-stack:
  added: []
  patterns:
    - "useEffect on step='evaluating' triggers async API call — avoids double-call from button click"
    - "ObjectivesHierarchy builds edges from parent_id NOT causal_links (RESEARCH.md Pitfall 5)"
    - "html2canvas capture wraps containerRef on the outer div, not ReactFlow — captures full panel including legend"
    - "MeansEndsNetwork filters out empty witi_classification and strategic objectives before building graph"
key-files:
  created:
    - backend/engine/control_of_consequences.py
    - frontend/src/components/phase2/CoCModal.tsx
    - frontend/src/components/phase2/MeansEndsNetwork.tsx
    - frontend/src/components/phase2/ObjectivesHierarchy.tsx
  modified: []
key-decisions:
  - "CoCModal uses useEffect(step='evaluating') for API trigger — prevents React state batching issues with direct async call inside button handler"
  - "MeansEndsNetwork filters witi_classification !== '' AND type !== 'strategic' — shows only classified non-strategic objectives to keep graph meaningful"
  - "ObjectivesHierarchy parent select updates both parent_id and hierarchy_level; calls fetchObjectives to resync store (not optimistic — hierarchy topology must be accurate)"
  - "determine_coc_action merges misaligned+internal and misaligned+external into same reclassify_strategic action — matches CoC decision matrix"

requirements-completed: [P2-09, P2-10, P2-11]

duration: 2min
completed: 2026-04-09
---

# Phase 3 Plan 04: CoC Engine, CoCModal, MeansEndsNetwork, and ObjectivesHierarchy Summary

**CoC frozen dataclass + tolerant LLM parser, CoCModal 5-step dialog (q1→q2→evaluating→result/refining), MeansEndsNetwork dagre BT causal graph with PNG export, and ObjectivesHierarchy dagre TB parent_id tree with attribute badges and parent selector.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-09T18:02:45Z
- **Completed:** 2026-04-09T18:05:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- CoC backend engine: `CoCResult` frozen dataclass, `parse_coc_response` with Q1/Q2/REFINEMENT/REASONING prefix parsing, `determine_coc_action` mapping all 4 Q1+Q2 combinations
- CoCModal: 5-step flow (q1 → q2 → evaluating → result/refining) with spinner, result badge, and editable refinement textarea wired to `objectivesApi.cocEvaluate` + `updateObjective`
- MeansEndsNetwork: dagre BT layout, color-coded nodes (amber=means, purple=fundamental, blue=strategic), animated edges, PNG export via html2canvas, legend panel
- ObjectivesHierarchy: dagre TB layout from parent_id relationships (not causal links), emerald "Atributo definido" badge, parent selector dropdown, PNG export, empty state

## Task Commits

1. **Task 1: CoC engine + CoCModal component** - `5639e3c` (feat)
2. **Task 2: MeansEndsNetwork + ObjectivesHierarchy react-flow components** - `aae0c19` (feat)

## Files Created/Modified

- `backend/engine/control_of_consequences.py` — CoCResult dataclass, parse_coc_response, determine_coc_action
- `frontend/src/components/phase2/CoCModal.tsx` — Step 2.15 2-question CoC dialog with refinement flow
- `frontend/src/components/phase2/MeansEndsNetwork.tsx` — Step 2.16 react-flow BT causal network with export
- `frontend/src/components/phase2/ObjectivesHierarchy.tsx` — Step 2.17 react-flow TB hierarchy tree with export

## Decisions Made

- `CoCModal` uses `useEffect(step === 'evaluating')` pattern to trigger the API call — avoids React batching issues if called directly inside button handler
- `MeansEndsNetwork` filters `witi_classification !== ''` AND `type !== 'strategic'` — keeps the graph focused on the means-ends structure, not strategic context
- `ObjectivesHierarchy` builds edges from `parent_id` (not `objective_causal_links`) per RESEARCH.md Pitfall 5 — hierarchy is orthogonal to the causal graph
- `determine_coc_action` collapses both `misaligned+internal` and `misaligned+external` into `reclassify_strategic` — matches the 4-cell CoC decision matrix

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no placeholder data or hardcoded empty values that flow to UI rendering.

## Issues Encountered

None.

## Next Phase Readiness

- Steps 2.15-2.17 fully implemented: CoC evaluation dialog, Means-Ends Network, Objectives Hierarchy
- Plan 03-05 (AttributeDefiner) can now rely on `witi_classification === 'fundamental'` filtering and `ObjectivesHierarchy` to identify which objectives need attribute definition
- TypeScript `tsc --noEmit --skipLibCheck` passed zero errors

---
*Phase: 03-vft-phase-2-decision-objectives*
*Completed: 2026-04-09*
