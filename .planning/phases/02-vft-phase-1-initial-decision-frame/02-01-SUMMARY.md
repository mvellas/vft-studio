---
phase: 02-vft-phase-1-initial-decision-frame
plan: "01"
subsystem: api
tags: [anthropic, fastapi, agents, vft, frame, phase1]

requires:
  - phase: 01-foundation
    provides: BaseAgent, get_session, Project/Stakeholder models, BaseRepository

provides:
  - Phase1SpecialistAgent extending BaseAgent with project-context-aware system prompt
  - FRAME system prompt template with 3 placeholders and validation rules
  - POST /api/projects/{id}/frame/generate-ds endpoint
  - POST /api/projects/{id}/frame/validate-idf endpoint
  - chat.py route for phase1_specialist agent_type to FRAME agent

affects:
  - 02-02-DecisionFrameForm (uses FRAME via chat endpoint)
  - 02-03-DocumentIDF (uses validate-idf endpoint)
  - 02-05-DecisionStatement (uses generate-ds endpoint)

tech-stack:
  added: []
  patterns:
    - "Agent prompt loaded from .md file (not inline string) — easier to iterate"
    - "from_project_id classmethod for context-aware agent instantiation"
    - "Structured LLM response parsing (VALID: yes|no + FEEDBACK: prefix)"
    - "frozen=True Pydantic schemas for all new API request/response models"

key-files:
  created:
    - backend/agents/phase1_specialist.py
    - backend/prompts/phase1_specialist.md
    - backend/api/frame.py
  modified:
    - backend/api/chat.py
    - backend/app.py

key-decisions:
  - "Prompt stored in .md file (not inline) to support iterative prompt engineering without code deploys"
  - "from_project_id classmethod builds context from DB — agent is stateless, context assembled on each request"
  - "500-char per-field truncation in from_project_id prevents prompt overflow for verbose project descriptions"
  - "validate-idf uses structured response format (VALID:/FEEDBACK: prefixes) for reliable parsing"

patterns-established:
  - "Agent classmethod pattern: from_project_id(cls, project_id, session, model) -> Agent"
  - "Prompt template pattern: backend/prompts/{agent_name}.md with {{PLACEHOLDER}} substitution"
  - "FRAME endpoint pattern: /api/projects/{id}/frame/{action} with project-scoped agent"

requirements-completed: [P1-05]

duration: 8min
completed: 2026-04-07
---

# Phase 02 Plan 01: FRAME Agent + Phase 1 API Summary

**Phase1SpecialistAgent (FRAME) extending BaseAgent with DB-loaded project context, prompt template with 3 placeholders, and two dedicated endpoints for Decision Statement generation and IDF validation**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-07T01:00:00Z
- **Completed:** 2026-04-08T01:03:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- FRAME agent class extending BaseAgent with `from_project_id` classmethod that loads Project + Stakeholders from DB and builds structured context dict
- System prompt template in `backend/prompts/phase1_specialist.md` with FRAME identity, expertise, 3 context placeholders, key questions, and validation rules — sourced from AGENTS-SPEC.md
- Two FRAME-specific endpoints: `generate-ds` (DS suggestion) and `validate-idf` (structured feedback with is_valid flag)
- Chat endpoint now routes `phase1_specialist` agent_type to `Phase1SpecialistAgent.from_project_id` for project-aware responses

## Task Commits

1. **Task 1: Phase1SpecialistAgent + system prompt template** - `2797c27` (feat)
2. **Task 2: FRAME API endpoints + wire chat and app** - `5b4c115` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `backend/agents/phase1_specialist.py` - Phase1SpecialistAgent(BaseAgent) with from_project_id, _render_prompt, 500-char truncation
- `backend/prompts/phase1_specialist.md` - FRAME system prompt with {{PROJECT_CONTEXT}}, {{STAKEHOLDERS_LIST}}, {{IDF_DRAFT}}
- `backend/api/frame.py` - POST /generate-ds and /validate-idf with frozen Pydantic schemas
- `backend/api/chat.py` - Added phase1_specialist AGENT_CONFIGS entry + conditional branch for project-aware agent
- `backend/app.py` - Registered frame.router under /api prefix

## Decisions Made
- Prompt stored in `.md` file (not inline Python string) — enables iterative prompt engineering without touching code
- `from_project_id` classmethod makes the agent stateless — context assembled fresh from DB on each request, no caching issues
- 500-char per-field truncation prevents token overflow for verbose project descriptions (research pitfall #4)
- `validate-idf` uses structured response format (`VALID: yes|no`, `FEEDBACK: ...`) parsed with simple string prefix matching — LLM reliably follows the format

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- FRAME agent is fully wired: chat endpoint routes `phase1_specialist` to it, `/frame/generate-ds` and `/frame/validate-idf` are importable
- Plan 02-02 (DecisionFrameForm frontend) can now call these endpoints
- Plan 02-03 (DocumentIDF) depends on `/validate-idf` — ready
- Plan 02-05 (DecisionStatement) depends on `/generate-ds` — ready

## Self-Check: PASSED

All created files exist on disk. Both task commits (2797c27, 5b4c115) confirmed in git log.

---
*Phase: 02-vft-phase-1-initial-decision-frame*
*Completed: 2026-04-07*
