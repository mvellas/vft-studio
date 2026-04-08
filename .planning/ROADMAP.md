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

**Plans:** 5 plans

Plans:
- [ ] 02-01-PLAN.md — FRAME Agent (Phase1SpecialistAgent + system prompt + /frame endpoints + chat integration)
- [ ] 02-02-PLAN.md — StakeholderMapper (Step 1.1 UI + compute_stakeholder_config + frontend API client)
- [ ] 02-03-PLAN.md — DecisionFrameForm (Steps 1.2/1.3/1.5 IDF form + GET/PUT /decision-frame endpoints + auto-save debounce)
- [ ] 02-04-PLAN.md — DocumentIDF + WorkshopMode (Step 1.6 read-only review + Step 1.4 7-step facilitation wizard)
- [ ] 02-05-PLAN.md — DecisionStatement + Phase 1 Gate (Step 1.7 DS input + AI gen + self-certification + completion gate)

**Success criteria:**
- Usuário cria stakeholders, preenche IDF, gera Decision Statement com IA, e avança para Fase 2
- FRAME responde corretamente sobre validação do IDF

---

## Phase 3: VFT Phase 2 — Decision Objectives

**Goal:** Usuário elicita valores/objetivos, aplica WITI Test e CoC, e gera Means-Ends Network e hierarquia de objetivos fundamentais com atributos.

**Requirements:** P2-01 a P2-13

**Plans:**
1. **AXIOM Agent + Stakeholder Agent** — `phase2_specialist.py` + `stakeholder_agent.py`; todos os VFT Devices (10 dispositivos); simulação de stakeholder por perfil
2. **Value Elicitation UI** — Passos 2.1–2.12: seleção de técnica, org docs (Gold), WishList + VFT Devices (single stk), VFB (multi stk); ObjectivesList + ObjectiveCard com badges de tipo
3. **WITI Test Engine + UI** — `witi_test.py`: classifica MEANS/FUNDAMENTAL/STRATEGIC/OTHER; WITITestModal com follow-ups; causal links criados automaticamente; CausalRelationsMap (react-flow)
4. **Control of Consequences + Network** — `control_of_consequences.py`; CoC interface passo-a-passo; `objectives_network.py`; Means-Ends Network (react-flow + dagre); FundamentalObjectivesHierarchy
5. **Attribute Definition + Phase 2 Gate** — AttributeDefiner: tipo + escala + 5 propriedades; completion gate: todos os obj. fundamentais com atributo

**Success criteria:**
- Usuário completa entrevista de elicitação, aplica WITI em todos os objetivos, CoC nos candidatos a fundamental, e vê a Means-Ends Network renderizada
- AXIOM classifica corretamente MEANS vs FUNDAMENTAL

---

## Phase 4: VFT Phase 3 + Chat Agents

**Goal:** Usuário define alternativas com suporte do agente NOVA; chat completo com ARIA, todos os especialistas e stakeholders; SCRIBE gera relatório em Markdown.

**Requirements:** P3-01 a P3-05, CHAT-01 a CHAT-05

**Plans:**
1. **NOVA Agent + Alternatives API** — `phase3_specialist.py` + CRUD de alternativas; procedimento Keeney (objetivo→pares→trios); AlternativesList + AlternativeCard
2. **Consequences Matrix** — tabela alternativas × atributos; células editáveis; IA preenche sugestões; ConsequencesMatrix component
3. **ARIA Facilitador Completo** — `facilitator.py` com todos os cenários do AGENTS-SPEC; contexto completo do projeto; integração Phase Engine
4. **Chat Completo** — AgentSelector (ARIA/FRAME/AXIOM/NOVA/stakeholder); QuickActions parser; ChatHistory persistida; export Markdown do histórico
5. **SCRIBE Documentation Agent** — `documentation_agent.py`; relatório completo com todas as seções; template acadêmico

**Success criteria:**
- Usuário completa Fase 3, conversa com cada agente no chat, salva objetivos via QuickActions, e exporta relatório Markdown completo

---

## Phase 5: Interview-Driven Flow + Proxy Documental

**Goal:** Sistema de entrevistas estruturadas por máquina de estados (RF-10) e análise de documentos como substituto de entrevistas (RF-13) com ANALYST multimodal.

**Requirements:** INT-01 a INT-08, DOC-01 a DOC-07

**Plans:**
1. **Interview State Machine** — `interview_engine.py`; tabelas `interview_sessions` + `interview_turns`; estados IDLE→BRIEFING→QUESTIONING→FOLLOW_UP→SYNTHESIS→COMPLETED; API endpoints (start/answer/synthesis/confirm/transcript)
2. **Interview UI** — InterviewMode component (progresso, pergunta IA, campo resposta, análise inline); InterviewSynthesis screen (revisão antes de salvar); WITI como entrevista conversacional
3. **CoC Entrevista + AXIOM/FRAME Interview Methods** — CoCInterview conversacional; agentes com `generate_interview_question()` + `analyze_answer()` + extração de valores com follow-up automático
4. **ANALYST Agent + Document Upload** — `document_analyst.py`; tabela `stakeholder_documents`; upload PDF/PNG/TXT; processamento via API multimodal Claude; transcript virtual Q&A com citações
5. **Document Review UI + Rastreabilidade** — tela revisão item a item (aceitar/editar/rejeitar); indicadores visuais no StakeholderMapper; rastreabilidade no relatório (`[Fonte: análise documental]`)

**Success criteria:**
- Usuário conduz entrevista estruturada, pausa e retoma; síntese gerada e confirmada
- Upload de documento PDF; ANALYST extrai valores com citações; usuário revisa e confirma

---

## Phase 6: Visualizacoes, Diagramas e Export

**Goal:** 7 diagramas automáticos exportáveis como PNG, Graph View força-dirigido com D3.js, export completo Markdown + PDF com diagramas embutidos.

**Requirements:** VIZ-01 a VIZ-08

**Plans:**
1. **Diagram Export Service** — `diagramExport.ts`: `captureComponent(elementId)` → PNG base64 via html2canvas (2x DPR); Mermaid.js render pipeline client-side → PNG
2. **Diagramas React-flow** — CausalRelationsMapDiagram, MeansEndsNetworkDiagram (dagre), FundamentalHierarchyDiagram; legendas automáticas; export individual
3. **Diagramas Mermaid** — DecisionFrameDiagram (card estilizado), StakeholderMapDiagram (graph TD), ProcessFlowchartDiagram (fases + passos completados); DecisionFrameConceitual (block-beta)
4. **Graph View D3.js** — ForceGraph component: force simulation, nós SVG por tipo, arestas com setas, zoom/pan, mini-map canvas; filtros + busca; toggle temporal (fase 1/2/3); export PNG
5. **Export Markdown + PDF + .vft** — ExportService (Markdown + WeasyPrint PDF); ReportAssembler coleta PNGs dos 7 diagramas; template com figuras numeradas; import/export .vft bundle

**Success criteria:**
- Todos os 7 diagramas renderizados e exportados como PNG
- Graph View mostra todas as entidades do projeto com force layout
- Relatório PDF gerado com diagramas embutidos

---

## Phase 7: Settings, Polish, Tests e Packaging

**Goal:** Settings com Keychain, auto-save, keyboard shortcuts, onboarding, testes com ≥70% coverage, e packaging como `.app` macOS.

**Requirements:** SET-01 a SET-05, TEST-01 a TEST-03

**Plans:**
1. **Settings Screen** — API Key (macOS Keychain via `keyring`); modelo por agente; idioma; toggle dark/light mode; teste de conexão Claude
2. **Polish UX** — Auto-save debounce 2s + undo/redo (Zustand middleware); keyboard shortcuts (`⌘K`, `⌘G`, etc.); onboarding 3 telas (primeiro boot); error boundaries + offline mode graceful
3. **Backend Tests** — pytest ≥70% coverage: engine (ProcessManager, WITITest, CoC), agents (mock Anthropic), API endpoints, services
4. **Frontend Tests** — Vitest: StepGuide, ObjectiveCard, ChatMessage, InterviewMode, ForceGraph (unit); E2E flow crítico (criar projeto → completar fase 1)
5. **macOS App Packaging** — PyInstaller config (`VFTStudio.spec`); `build.py`; frontend buildado como assets estáticos; app icon (.icns); `Info.plist`; `VFT Studio.app` em `dist/`

**Success criteria:**
- `VFT Studio.app` abre e funciona sem terminal
- pytest: ≥70% cobertura backend
- Onboarding funciona no primeiro boot

---

## Phase Dependencies

```
Phase 1 (Foundation)
  ↓
Phase 2 (VFT Phase 1)
  ↓
Phase 3 (VFT Phase 2)
  ↓
Phase 4 (VFT Phase 3 + Chat)
  ↓                    ↓
Phase 5               Phase 6
(Interview +          (Viz + Export)
 Proxy Docs)              ↓
      ↓               Phase 7
      └──────────────→ (Polish + Tests + Packaging)
```

## Requirement Coverage

| Phase | Requirements | Count |
|-------|-------------|-------|
| Phase 1 | FOUND-01..14, PHASE-01..05 | 19 |
| Phase 2 | P1-01..07 | 7 |
| Phase 3 | P2-01..13 | 13 |
| Phase 4 | P3-01..05, CHAT-01..05 | 10 |
| Phase 5 | INT-01..08, DOC-01..07 | 15 |
| Phase 6 | VIZ-01..08 | 8 |
| Phase 7 | SET-01..05, TEST-01..03 | 8 |
| **Total** | | **80** |

---
*Roadmap created: 2026-04-07*
