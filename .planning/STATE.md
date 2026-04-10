---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-04-09T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 20
  completed_plans: 20
---

# Project State: VFT Studio

**Last updated:** 2026-04-09 after Phase 4 MVP Completion execution

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-07)

**Core value:** O usuário completa o processo VFT completo (33 passos) com suporte de IA em cada etapa, gerando um relatório com diagramas exportáveis.
**Current focus:** Phase 04 — MVP Completion ✓ DONE

## Milestone

**MVP v1.0** — 7 phases total

## Progress

[██████████] 100% (20/20 plans complete)

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation | ✓ Complete | 5/5 |
| 2 | VFT Phase 1: Initial Decision Frame | ✓ Complete | 5/5 |
| 3 | VFT Phase 2: Decision Objectives | ✓ Complete | 5/5 |
| 4 | MVP Completion | ✓ Complete | 5/5 |

> Fases 4-7 originais consolidadas em Phase 4 MVP Completion em 2026-04-09.  
> Plano detalhado preservado em: Claude Knowledge/vft-studio/phases-4-7-original.md

## Stopped At

Phase 4 completa. MVP v1.0 concluído. Próximo: validação/testes no macOS e packaging.

## Decisions

- **01-01:** Copied fda-jam-sim PyWebView+uvicorn threading pattern verbatim (loop=none prevents signal-handler crash in non-main thread)
- **01-01:** Tailwind v4 via @tailwindcss/vite — no postcss.config, no tailwind.config (v4 Vite-native)
- **01-01:** StaticFiles mount guarded by FRONTEND_DIST.exists() — backend runs without pre-built frontend in dev
- [Phase 01-02]: All 13 tables use TEXT for UUIDs and timestamps; soft_delete() detects column set at runtime
- [Phase 01-02]: Alembic env.py overrides URL with Path.home()/VFTStudio/db.sqlite — no per-machine config needed
- [Phase 01-05]: ChatSession created directly (not via BaseRepository.create) because the model lacks updated_at column
- [Phase 01-05]: sse-starlette 3.x used for SSE endpoint; anthropic SDK for AsyncAnthropic streaming with text_stream async generator
- [Phase 02-01]: FRAME prompt stored in .md file (backend/prompts/) not inline — enables iterative prompt engineering without code deploys
- [Phase 02-01]: from_project_id classmethod makes agents stateless — context assembled fresh from DB on each request
- [Phase 02-01]: 500-char per-field truncation in from_project_id prevents token overflow for verbose project descriptions
- [Phase 02-02]: update_stakeholder_config called after every mutation — always-consistent project.stakeholder_config, no drift
- [Phase 02-02]: Variant badge computed client-side from stakeholder array — instant feedback, no extra API call
- [Phase 02-02]: is_decision_maker auto-set to 1 when role=decision_authority — prevents inconsistent DM state
- [Phase 02-03]: generateSuggestion wraps SSE streamChatMessage in Promise — consistent with chat architecture
- [Phase 02-03]: PUT decision-frame filters non-None fields server-side for safe partial IDF updates
- [Phase Phase 02-04]: DocumentIDF validates IDF completeness client-side (button disabled) and server-side (422) — defense in depth
- [Phase Phase 02-04]: WorkshopMode Proxima button requires checkbox completion for explicit facilitator acknowledgment, not just textarea content
- [Phase 02-05]: Re-completion for IDF steps 1.2-1.7 updates existing StepCompletion record in-place; Phase 1 gate sets phase1_completed=1 without blocking step advancement to 2.1
- [Phase 03-01]: Phase2SpecialistAgent uses claude-opus-4-6 default (socrático, rigoroso); StakeholderSimulationAgent uses claude-sonnet-4-6 (cheaper for conversational)
- [Phase 03-01]: DFS cycle detection in _has_cycle prevents circular objective causal graphs before DB insert
- [Phase 03-01]: axiom/suggest-category returns suggestion only (no DB write) — user decides the final type
- [Phase 03-02]: IDFUpdate/IDFResponse extended with qualitative_modeling_tech + org_documents_text — fields existed in DB, schemas just needed exposing
- [Phase 03-02]: StakeholderConsolidationPanel exclusion toggle is local state only — no DB delete on toggle, only hides from consolidation view
- [Phase 03-03]: parse_witi_response defaults classification to OTHER on unknown values — tolerant parser prevents crashes on unexpected LLM output
- [Phase 03-03]: WITITestModal uses useObjectivesStore.setState directly for optimistic update after classify + fetchNetwork for causal links
- [Phase 03-03]: CausalRelationsMap useEffect syncs nodes/edges when store memos change — handles dynamic react-flow graph updates
- [Phase 03-04]: CoCModal uses useEffect(step='evaluating') pattern to trigger API call — avoids React state batching issues
- [Phase 03-04]: ObjectivesHierarchy builds edges from parent_id NOT causal_links (RESEARCH.md Pitfall 5) — hierarchy is orthogonal to causal graph
- [Phase 03-05]: AttributeDefiner uses onStepComplete prop (not useNavigate) — react-router-dom not in package.json; matches existing Phase 1/2 component pattern
- [Phase 03-05]: Auto-save debounce creates attribute on first flush if attributeId is null, then PUTs — prevents 409 IntegrityError from rapid saves
- [Phase 04-01]: NOVA uses claude-sonnet-4-6 (cheaper for operational Phase 3 tasks); consequences use upsert pattern via PUT (alternative_id, objective_id unique)
- [Phase 04-01]: suggest-consequences uses invoke() not stream() — structured JSON response needed before updating matrix
- [Phase 04-02]: ARIA upgraded to FacilitatorAgent.from_project_id (DB-aware context); SCRIBE uses static Markdown generation (no LLM) for fast offline report
- [Phase 04-02]: setActiveAgent clears messages in store + useEffect reloads history from DB — avoids duplication on agent switch
- [Phase 04-03]: html2canvas scale=2 + backgroundColor='#ffffff' for retina react-flow captures; diagram export iterates known element IDs, skips missing
- [Phase 04-04]: keyring silent-fail pattern — never crash app if Keychain unavailable (Windows dev, CI)
- [Phase 04-04]: onboardingChecked gate prevents flash of app content before check resolves
- [Phase 04-05]: TestClient with get_session override to in-memory SQLite — isolated DB per test fixture
- [Phase 04-05]: PyInstaller hiddenimport keyring.backends.macOS required — not auto-detected

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 01-foundation | 01 | 5min | 2 | 12 |
| Phase 01-foundation P02 | 6min | 2 tasks | 11 files |
| Phase 01-foundation P05 | 8min | 2 tasks | 8 files |
| Phase 02 P01 | 8min | 2 tasks | 5 files |
| Phase 02 P02 | 12min | 2 tasks | 4 files |
| Phase 02 P03 | 15min | 2 tasks | 5 files |
| Phase 02-vft-phase-1-initial-decision-frame P04 | 8min | 2 tasks | 4 files |
| Phase 02-vft-phase-1-initial-decision-frame P05 | 8min | 2 tasks | 6 files |
| Phase 03 P01 | 36min | 2 tasks | 14 files |
| Phase 03-vft-phase-2-decision-objectives P02 | 4 | 3 tasks | 9 files |
| Phase 03 P03 | 2min | 2 tasks | 3 files |
| Phase 03-vft-phase-2-decision-objectives P04 | 2 | 2 tasks | 4 files |
| Phase 03-vft-phase-2-decision-objectives P05 | 4min | 2 tasks | 7 files |
| Phase 04-mvp-completion P01 | — | 2 tasks | 9 files |
| Phase 04-mvp-completion P02 | — | 3 tasks | 8 files |
| Phase 04-mvp-completion P03 | — | 2 tasks | 5 files |
| Phase 04-mvp-completion P04 | — | 3 tasks | 6 files |
| Phase 04-mvp-completion P05 | — | 3 tasks | 5 files |

## Key Context

- Spec completo: `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Mestrado/Mestrado/PSM - Problem Structuring Methods/VFT Software/`
- Stack reference: `fda-jam-sim` (mesmo stack PyWebView+FastAPI+React+Vite já comprovado)
- Data dir: `~/VFTStudio/`
- 33 VFT steps definidos em SYSTEM-DESIGN.md §5
- 93 tasks originais mapeadas em TASKS.md (consolidadas em 7 fases GSD)
- **Runtime Python:** `/opt/anaconda3/bin/python` (system python3 lacks fastapi; no project venv yet)
