# Roadmap: VFT Studio

**Milestone:** MVP v1.0
**Goal:** Aplicação macOS funcional com as 3 fases VFT, 6 agentes IA, Interview-Driven Flow, Proxy Documental, diagramas automáticos e packaging .app

---

## Phase 1: Foundation

**Goal:** `python main.py` abre janela macOS nativa; backend/frontend conectados; banco de dados configurado com todas as tabelas; CRUD básico funcionando; base de agentes IA com SSE streaming.

**Requirements:** FOUND-01 a FOUND-14, PHASE-01 a PHASE-05

**Plans:** 5/5 plans complete

Plans:
- [x] 01-01-PLAN.md — Project Scaffold (main.py, FastAPI, PyWebView, Vite/Tailwind)
- [x] 01-02-PLAN.md — Database Layer (SQLAlchemy ORM, BaseRepository, Alembic, Pydantic schemas)
- [x] 01-03-PLAN.md — Core APIs (Project/Stakeholder CRUD, ProcessManager 33 steps, Phase endpoints)
- [x] 01-04-PLAN.md — Frontend Foundation (Types, API client, Zustand stores, AppShell, ProjectList, StepGuide)
- [x] 01-05-PLAN.md — AI Base + SSE Chat (BaseAgent, SSE endpoint, frontend streaming)

**Success criteria:**
- `python main.py` abre janela nativa em <3s
- Criar projeto, adicionar stakeholder, navegar entre passos
- Enviar mensagem no chat e receber streaming de resposta da Claude API

---

## Phase 2: VFT Phase 1 — Initial Decision Frame

**Goal:** Usuário completa integralmente a Fase 1 do processo VFT com suporte do agente FRAME — do mapeamento de stakeholders ao Decision Statement validado.

**Requirements:** P1-01 a P1-07

**Plans:** 5/5 plans complete

Plans:
- [x] 02-01-PLAN.md — FRAME Agent (Phase1SpecialistAgent + system prompt + /frame endpoints + chat integration)
- [x] 02-02-PLAN.md — StakeholderMapper (Step 1.1 UI + compute_stakeholder_config + frontend API client)
- [x] 02-03-PLAN.md — DecisionFrameForm (Steps 1.2/1.3/1.5 IDF form + GET/PUT /decision-frame endpoints + auto-save debounce)
- [x] 02-04-PLAN.md — DocumentIDF + WorkshopMode (Step 1.6 read-only review + Step 1.4 7-step facilitation wizard)
- [x] 02-05-PLAN.md — DecisionStatement + Phase 1 Gate (Step 1.7 DS input + AI gen + self-certification + completion gate)

**Success criteria:**
- Usuário cria stakeholders, preenche IDF, gera Decision Statement com IA, e avança para Fase 2
- FRAME responde corretamente sobre validação do IDF

---

## Phase 3: VFT Phase 2 — Decision Objectives

**Goal:** Usuário elicita valores/objetivos, aplica WITI Test e CoC, e gera Means-Ends Network e hierarquia de objetivos fundamentais com atributos.

**Requirements:** P2-01 a P2-13

**Plans:** 5/5 plans complete

Plans:
- [x] 03-01-PLAN.md — AXIOM Agent + Stakeholder Agent + Objectives CRUD API + react-flow install
- [x] 03-02-PLAN.md — Value Elicitation UI (TechniqueSelector, OrgDocPanel, ObjectivesList, ObjectiveCard, VFTDevicePanel)
- [x] 03-03-PLAN.md — WITI Test Engine + WITITestModal + CausalRelationsMap (react-flow)
- [x] 03-04-PLAN.md — Control of Consequences + MeansEndsNetwork + ObjectivesHierarchy (react-flow + dagre)
- [x] 03-05-PLAN.md — AttributeDefiner + Phase 2 Gate

**Success criteria:**
- Usuário completa entrevista de elicitação, aplica WITI em todos os objetivos, CoC nos candidatos a fundamental, e vê a Means-Ends Network renderizada
- AXIOM classifica corretamente MEANS vs FUNDAMENTAL

---

## Phase 4: MVP Completion

**Goal:** VFT Phase 3 completa (NOVA + alternativas + matriz de consequências), chat com todos os agentes, relatório Markdown via SCRIBE, export básico, Settings com Keychain, e packaging como `VFT Studio.app`.

**Requirements:** P3-01..05, CHAT-01..05, VIZ-01..03, SET-01..03, TEST-01, TEST-03

> Plano detalhado original das fases 4-7 preservado em Obsidian:  
> `Claude Knowledge/vft-studio/phases-4-7-original.md`

**Plans:**
1. **NOVA Agent + Alternatives + Consequences Matrix** — `phase3_specialist.py`; CRUD alternativas; AlternativesList + AlternativeCard; tabela alternativas × atributos (ConsequencesMatrix); IA sugere consequências
2. **ARIA + Chat Completo + SCRIBE** — `facilitator.py` com cenários do AGENTS-SPEC; AgentSelector (ARIA/FRAME/AXIOM/NOVA); QuickActions parser; ChatHistory persistida; `documentation_agent.py`; export relatório Markdown
3. **Diagramas + Export** — html2canvas capture das 3 react-flow views já existentes (CausalRelationsMap, MeansEndsNetwork, ObjectivesHierarchy); 2 diagramas Mermaid (StakeholderMap + ProcessFlowchart); ExportService monta Markdown com PNG embutidos
4. **Settings + Polish** — API Key via `keyring` (macOS Keychain); teste de conexão Claude; auto-save debounce global; error boundaries; onboarding 3 telas no primeiro boot
5. **Tests + macOS Packaging** — pytest ≥60% coverage (engine + agents mock + endpoints críticos); PyInstaller `VFTStudio.spec`; `build.py`; frontend como assets estáticos; `VFT Studio.app` em `dist/`

**Success criteria:**
- Usuário completa VFT Phase 3 (define alternativas, preenche matriz de consequências)
- Chat funciona com ARIA, FRAME, AXIOM e NOVA; relatório Markdown exportado
- Diagramas exportam como PNG; relatório inclui imagens
- `VFT Studio.app` abre e funciona sem terminal
- pytest ≥60% coverage backend

---

## Phase Dependencies

```
Phase 1 (Foundation)
  ↓
Phase 2 (VFT Phase 1)
  ↓
Phase 3 (VFT Phase 2)
  ↓
Phase 4 (MVP Completion)
```

## Requirement Coverage

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1 | FOUND-01..14, PHASE-01..05 | 19 |
| Phase 2 | P1-01..07 | 7 |
| Phase 3 | P2-01..13 | 13 |
| Phase 4 | P3-01..05, CHAT-01..05, VIZ-01..03, SET-01..03, TEST-01, TEST-03 | 19 |
| **Total MVP** | | **58** |

> Requirements não incluídos no MVP (INT-01..08, DOC-01..07, VIZ-04..08, SET-04..05, TEST-02):  
> Interview-Driven Flow, Proxy Documental, Graph View D3.js, PDF completo, Frontend E2E tests.  
> Ver `Claude Knowledge/vft-studio/phases-4-7-original.md`.

---
*Roadmap created: 2026-04-07*
