# Requirements: VFT Studio

**Defined:** 2026-04-07
**Core Value:** O usuário completa o processo VFT completo (33 passos) com suporte de IA em cada etapa, gerando um relatório com diagramas exportáveis.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: `python main.py` inicia FastAPI na porta dinâmica e abre janela PyWebView nativa
- [x] **FOUND-02**: Frontend React/Vite serve em dev mode; build produz `dist/` embutido no app
- [x] **FOUND-03**: SQLite criado em `~/VFTStudio/db.sqlite` com todas as tabelas no primeiro boot
- [x] **FOUND-04**: Alembic migrations versionadas; schema aplicado automaticamente
- [x] **FOUND-05**: BaseRepository genérico com get/list/create/update/soft_delete
- [x] **FOUND-06**: Pydantic schemas frozen=True para todas as entidades
- [ ] **FOUND-07**: CRUD completo de projetos (create/list/open/archive/duplicate/import/export)
- [ ] **FOUND-08**: CRUD completo de stakeholders com campo `elicitation_mode`
- [ ] **FOUND-09**: AppShell layout: sidebar + área de conteúdo + painel de chat lateral
- [ ] **FOUND-10**: ProjectList screen com ProjectCard e NewProjectWizard (3 passos)
- [ ] **FOUND-11**: Zustand stores (projectStore, chatStore, uiStore) com immer middleware
- [ ] **FOUND-12**: API client HTTP com base URL do servidor local e error interceptors
- [x] **FOUND-13**: BaseAgent com invoke() + stream() (AsyncGenerator SSE); retry 3x exponential
- [x] **FOUND-14**: POST /api/chat/message retorna SSE stream; EventSource no frontend

### VFT Phase Engine

- [ ] **PHASE-01**: ProcessManager com 33 StepConfigs completos (id, name, why, how, reference, form_type, conditions)
- [ ] **PHASE-02**: GET /api/projects/{id}/phase/current — retorna passo atual com metadata
- [ ] **PHASE-03**: POST /api/projects/{id}/phase/step/complete — valida, persiste, avança
- [ ] **PHASE-04**: StepGuide component: card O QUÊ/POR QUÊ/COMO para qualquer passo
- [ ] **PHASE-05**: PhaseProgress component: barra 3 fases + passos individuais + passo atual

### Phase 1 — Initial Decision Frame

- [ ] **P1-01**: Passo 1.1 — StakeholderMapper: adicionar stakeholders com tipo/perfil/interesses; validar ≥1 Decision Authority
- [x] **P1-02**: Passos 1.2–1.5 — DecisionFrameForm: Purpose/Perspective/Scope; adapta à variante (single/multi DM)
- [x] **P1-03**: Passo 1.6 — DocumentIDF: resumo formatado gerado e salvo com timestamp
- [x] **P1-04**: Passo 1.7 — DecisionStatement: campo + "Gerar com IA" (FRAME) + validação de estrutura
- [x] **P1-05**: FRAME agent (Phase 1 Specialist): IDF validation, DS generation, stakeholder suggestions
- [x] **P1-06**: Workshop Mode (Apêndice B): wizard dos 7 passos para múltiplos DMs
- [x] **P1-07**: Phase 1 completion gate: só avança para Fase 2 se IDF completo + DS válido

### Phase 2 — Decision Objectives

- [x] **P2-01**: CRUD completo de objetivos com WITI fields e causal_links
- [x] **P2-02**: AXIOM agent (Phase 2 Specialist): elicitação, WITI, CoC, hierarquia, atributos
- [x] **P2-03**: Passo 2.1 — Seleção de técnica qualitativa (Platinum/Gold/Silver/Combined)
- [x] **P2-04**: Passos 2.2–2.3 — Upload/paste de docs organizacionais; IA extrai valores (Gold/Combined)
- [x] **P2-05**: Passos 2.5–2.7 — WishList + VFT Devices (10 dispositivos) para stakeholder único
- [x] **P2-06**: Passos 2.8–2.12 — VFB para múltiplos stakeholders: individuais + consolidação + workshop
- [x] **P2-07**: Passo 2.13 — Categorização de objetivos com AXIOM sugerindo categorias
- [x] **P2-08**: Passo 2.14 — WITI Test: modal por objetivo; classifica MEANS/FUNDAMENTAL/STRATEGIC; cria causal links
- [ ] **P2-09**: Passo 2.15 — Control of Consequences: 2 perguntas + refinamento de enunciado
- [ ] **P2-10**: Passo 2.16 — Means-Ends Objectives Network: react-flow + dagre; zoom/pan; PNG export
- [ ] **P2-11**: Passo 2.17 — Fundamental Objectives Hierarchy: árvore interativa; 9 propriedades
- [ ] **P2-12**: Passo 2.18 — AttributeDefiner: tipo (natural/constructed/proxy) + escala + 5 propriedades
- [x] **P2-13**: Stakeholder Agent: simula respostas com base no perfil; modo livre e guiado

### Phase 3 — Decision Alternatives

- [ ] **P3-01**: CRUD completo de alternativas com consequences por atributo
- [ ] **P3-02**: NOVA agent (Phase 3 Specialist): elicita alternativas pelo procedimento de Keeney
- [ ] **P3-03**: Passos 3.1/3.4 — AlternativesList: lista inicial com consequências por atributo
- [ ] **P3-04**: Passos 3.2/3.5 — AlternativeElicitor: NOVA sugere alternativas (objetivo por objetivo → pares → trios)
- [ ] **P3-05**: ConsequencesMatrix: tabela alternativas × atributos; células editáveis; IA preenche sugestões

### Chat & Agents

- [ ] **CHAT-01**: ARIA agent (Facilitador): contexto completo do projeto; todos os cenários do AGENTS-SPEC
- [ ] **CHAT-02**: AgentSelector: usuário seleciona agente no chat; avatar + nome mudam
- [ ] **CHAT-03**: QuickActions: parser de marcadores na resposta da IA; botões "Salvar como objetivo/valor/alternativa"
- [ ] **CHAT-04**: ChatHistory persistida por projeto com timestamps; exportável como Markdown
- [ ] **CHAT-05**: SCRIBE agent (Documentation): gera relatório completo em Markdown com todos os dados

### Interview-Driven Flow (RF-10)

- [ ] **INT-01**: InterviewSession state machine backend: IDLE→BRIEFING→QUESTIONING→FOLLOW_UP→SYNTHESIS→COMPLETED
- [ ] **INT-02**: Tabelas `interview_sessions` + `interview_turns` no SQLite; sessão pausável/retomável
- [ ] **INT-03**: API endpoints: POST start, POST answer (SSE), GET synthesis, POST confirm, GET transcript
- [ ] **INT-04**: Agentes AXIOM/FRAME com `generate_interview_question()` e `analyze_answer()` contextualizado
- [ ] **INT-05**: InterviewMode component: progresso (dispositivo N/10), pergunta IA, campo resposta, análise inline
- [ ] **INT-06**: InterviewSynthesis screen: valores extraídos → objetivos candidatos → quotes; revisão antes de salvar
- [ ] **INT-07**: WITI Test como entrevista conversacional com follow-ups automáticos
- [ ] **INT-08**: CoC como entrevista conversacional com IA explicando implicações

### Proxy Documental (RF-13)

- [ ] **DOC-01**: Tabela `stakeholder_documents` com metadados (tipo, data, autoria, fonte)
- [ ] **DOC-02**: Upload de PDF/PNG/JPG/TXT e paste de texto por stakeholder
- [ ] **DOC-03**: ANALYST agent (Document Analysis): processa documentos via API multimodal Claude
- [ ] **DOC-04**: ANALYST gera transcript virtual Q&A com citações diretas como evidência
- [ ] **DOC-05**: Tela de revisão: usuário confirma/edita/rejeita valores extraídos item a item
- [ ] **DOC-06**: Rastreabilidade no relatório: `[Fonte: análise documental]` + citações em nota de rodapé
- [ ] **DOC-07**: Indicador visual no StakeholderMapper: 🎙️ entrevista | 📄 análise documental | 🤖 simulação

### Visualizações e Export

- [ ] **VIZ-01**: 7 diagramas automáticos: IDF Card, Causal Map, Means-Ends Network, Hierarchy, Stakeholder Map, Process Flowchart, Decision Frame Conceitual
- [ ] **VIZ-02**: Diagramas de grafo (react-flow + dagre): Causal Map, Means-Ends, Hierarchy — export PNG via html2canvas
- [ ] **VIZ-03**: Diagramas estruturados (Mermaid.js): Stakeholder Map, Process Flowchart, Decision Frame Card
- [ ] **VIZ-04**: Graph View D3.js force-directed: todas as entidades + relações; filtros; busca; mini-map
- [ ] **VIZ-05**: Graph View: click em nó → painel lateral com detalhes; toggle de evolução temporal (fase 1/2/3)
- [ ] **VIZ-06**: Export Markdown — relatório completo bem formatado com seções e hierarquias
- [ ] **VIZ-07**: Export PDF — WeasyPrint; diagramas PNG embutidos; figuras numeradas
- [ ] **VIZ-08**: Export .vft bundle — projeto completo como JSON comprimido; importável

### Settings e Polish

- [ ] **SET-01**: Settings screen: ANTHROPIC_API_KEY (macOS Keychain via keyring); modelo por agente; idioma
- [ ] **SET-02**: Dark Mode + Light Mode via CSS vars; toggle nas configurações
- [ ] **SET-03**: Auto-save com debounce 2s; undo/redo em formulários
- [ ] **SET-04**: Keyboard shortcuts: ⌘K command palette, ⌘G Graph View, etc.
- [ ] **SET-05**: Onboarding de 3 telas no primeiro boot

### Tests e Packaging

- [ ] **TEST-01**: pytest backend ≥70% coverage: engine, agents (mock), API, services
- [ ] **TEST-02**: Vitest frontend: componentes críticos (StepGuide, ObjectiveCard, ChatMessage)
- [ ] **TEST-03**: `python build.py` produz `VFT Studio.app` em `dist/` via PyInstaller

## v2 Requirements

### Colaboração

- **COLLAB-01**: Sessões reais com múltiplos usuários via rede
- **COLLAB-02**: Modo facilitador humano + stakeholders reais via chat
- **COLLAB-03**: Integração Notion/Obsidian

### Visualizações Avançadas

- **VIZ2-01**: Means-Ends Network com layout interativo personalizável
- **VIZ2-02**: Causal Relations Map com animações de propagação

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-usuário / colaboração em rede | Alta complexidade; v2.0 |
| Cloud sync automático | Dados locais por design (privacidade, offline-first) |
| Mobile / Windows / Linux | macOS-first; PyWebView se adapta depois |
| OAuth / auth de usuário | Single-user local |
| Integração Notion/Obsidian | v2.0 |
| VFT quantitativo (funções de valor, MAUT) | Fora do escopo do framework Vieira et al. (2024) |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 a FOUND-14 | Phase 1 | Pending |
| PHASE-01 a PHASE-05 | Phase 1 | Pending |
| P1-01 a P1-07 | Phase 2 | Pending |
| P2-01 a P2-13 | Phase 3 | Pending |
| P3-01 a P3-05 | Phase 4 | Pending |
| CHAT-01 a CHAT-05 | Phase 4 | Pending |
| INT-01 a INT-08 | Phase 5 | Pending |
| DOC-01 a DOC-07 | Phase 5 | Pending |
| VIZ-01 a VIZ-08 | Phase 6 | Pending |
| SET-01 a SET-05 | Phase 7 | Pending |
| TEST-01 a TEST-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 68 total
- Mapped to phases: 68
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after initial definition*
