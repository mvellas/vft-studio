# VFT Studio — Task Breakdown

**Versão:** 0.1.0-spec | **Data:** 2026-04-07  
**Status:** AGUARDANDO APROVAÇÃO DO SPEC

---

## Fases de Implementação

```
MILESTONE 1: Foundation (Tasks 1–15)
  → Projeto roda; backend+frontend conectados; banco configurado

MILESTONE 2: Phase 1 Complete (Tasks 16–25)
  → Usuário completa Fase 1 do VFT com suporte de IA

MILESTONE 3: Phase 2 Core (Tasks 26–45)
  → Elicitação de valores, WITI Test, CoC, atributos

MILESTONE 4: Phase 3 + Chat (Tasks 46–55)
  → Alternativas + chat completo com todos os agentes

MILESTONE 5: Visualizations + Export (Tasks 56–65)
  → Grafos, hierarquias, Markdown/PDF export

MILESTONE 6: Polish + Tests (Tasks 66–75)
  → Dark mode, atalhos, testes, packaging .app
```

---

## MILESTONE 1 — Foundation

### T-01 · Setup do Projeto Python
**Done:** `python main.py` inicia FastAPI + PyWebView com janela vazia  
**Arquivos:** `main.py`, `pyproject.toml`, `.env.example`, `backend/app.py`, `backend/config.py`  
**Detalhes:**
- Porta dinâmica para FastAPI (evitar conflitos)
- PyWebView carrega URL do servidor local
- Variáveis: `ANTHROPIC_API_KEY`, `DATA_DIR`, `LOG_LEVEL`
- CORS configurado para aceitar apenas localhost

### T-02 · Setup Frontend React + Vite
**Done:** `npm run dev` serve frontend na porta 5173; `npm run build` produz `dist/`  
**Arquivos:** `frontend/package.json`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`  
**Detalhes:**
- React 18 + TypeScript strict
- TailwindCSS 4 com design tokens do UI-SPEC
- Inter font via Google Fonts ou local
- React Query + Zustand instalados
- react-flow instalado

### T-03 · Database Setup + Migrations
**Done:** SQLite criado em `~/VFTStudio/db.sqlite`; todas as tabelas existem; migration inicial aplicada  
**Arquivos:** `backend/db/base.py`, `backend/db/models.py`, `alembic.ini`, migrations `001_initial`  
**Detalhes:**
- AsyncSession com SQLAlchemy 2.0
- Todas as tabelas do DATA-MODEL.md
- Alembic configurado para auto-detect models
- `~/VFTStudio/` criado automaticamente no primeiro boot

### T-04 · Repository Pattern + Base CRUD
**Done:** `BaseRepository[T]` com get/list/create/update/soft_delete; testes passando  
**Arquivos:** `backend/db/repository.py`, `tests/backend/test_repository.py`

### T-05 · Pydantic Schemas
**Done:** Todos os schemas do SYSTEM-DESIGN.md implementados com validação  
**Arquivos:** `backend/schemas/` (todos os arquivos)  
**Detalhes:**
- `frozen=True` em todos os schemas de resposta
- Validadores customizados onde necessário (ex.: decision_statement_format)

### T-06 · Projects API (CRUD)
**Done:** GET/POST/PATCH/DELETE `/api/projects` funcionam; testados com Postman/pytest  
**Arquivos:** `backend/api/projects.py`, `backend/services/project_service.py`

### T-07 · Stakeholders API (CRUD)
**Done:** CRUD completo de stakeholders com validação de tipo  
**Arquivos:** `backend/api/stakeholders.py`

### T-08 · AppShell + Sidebar (Frontend)
**Done:** Layout principal renderiza; sidebar com navegação; área de conteúdo e painel de chat (vazio)  
**Arquivos:** `frontend/src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `ChatPanel.tsx`  
**Detalhes:**
- Dark Mode via `prefers-color-scheme`
- CSS vars do design tokens ativos
- Layout responsivo (1280px mínimo)

### T-09 · Project List Screen
**Done:** Tela inicial exibe projetos; criar novo projeto abre modal de 3 passos  
**Arquivos:** `frontend/src/components/project/ProjectList.tsx`, `ProjectCard.tsx`, `NewProjectWizard.tsx`

### T-10 · Zustand Stores
**Done:** `projectStore`, `chatStore`, `uiStore` implementados  
**Arquivos:** `frontend/src/store/`  
**Detalhes:**
- Immer middleware ativo em todos os stores
- Persistência de `uiStore` no localStorage (preferências de UI)

### T-11 · API Client (Frontend)
**Done:** Client HTTP com base URL do servidor local; interceptores para error handling  
**Arquivos:** `frontend/src/api/client.ts`, `projects.ts`, `phases.ts`

### T-12 · Phase Engine — Process Manager
**Done:** `ProcessManager` retorna passo atual, marca passo como completo, avança para o próximo  
**Arquivos:** `backend/engine/process_manager.py`, `phase1_steps.py`, `phase2_steps.py`, `phase3_steps.py`  
**Detalhes:**
- Todos os 33 StepConfig definidos com metadata completo
- Lógica condicional baseada em `stakeholder_config`
- `get_current_step()`, `complete_step()`, `get_overview()`

### T-13 · Phase API Endpoints
**Done:** GET current, POST complete, GET overview funcionam  
**Arquivos:** `backend/api/phases.py`

### T-14 · Base Agent + Anthropic Integration
**Done:** `BaseAgent` com `invoke()` e `stream()` (SSE); chamada real à API Claude funciona  
**Arquivos:** `backend/agents/base_agent.py`  
**Detalhes:**
- `stream()` retorna `AsyncGenerator[str, None]`
- Retry automático (3x, backoff exponencial)
- Timeout de 120s por request
- Logs de tokens usados

### T-15 · SSE Chat Endpoint (básico)
**Done:** POST `/api/chat/message` retorna SSE stream; frontend exibe tokens chegando  
**Arquivos:** `backend/api/chat.py`, `frontend/src/hooks/useChat.ts`  
**Detalhes:**
- `EventSource` no frontend
- Mensagens persistidas no `chat_messages` após completar

---

## MILESTONE 2 — Phase 1 Complete

### T-16 · StepGuide Component
**Done:** Card O QUÊ/POR QUÊ/COMO/DICA renderiza para qualquer passo  
**Arquivos:** `frontend/src/components/phases/StepGuide.tsx`  
**Detalhes:**
- Dados vêm do `vft_process.json` em `data/`
- Referência ao artigo linkada

### T-17 · PhaseProgress Component
**Done:** Barra de progresso com 3 fases, passos individuais, passo atual destacado  
**Arquivos:** `frontend/src/components/phases/PhaseProgress.tsx`

### T-18 · Phase 1 — Passo 1.1: Stakeholder Mapper
**Done:** Usuário adiciona stakeholders com tipo, perfil e interesses; dados persistidos  
**Arquivos:** `Phase1/StakeholderMapper.tsx`  
**Detalhes:**
- Autocomplete de tipos com descrição ao hover
- Validação: pelo menos 1 Decision Authority antes de avançar

### T-19 · Phase 1 — Seleção de Variante (1.2/1.3/1.4/1.5)
**Done:** Sistema seleciona variante automaticamente e exibe mensagem contextual  
**Arquivos:** `ProcessManager` + frontend condicional

### T-20 · Phase 1 — Passos 1.2–1.5: Decision Frame Form
**Done:** Formulário Purpose/Perspective/Scope com validação; adapta-se à variante  
**Arquivos:** `Phase1/DecisionFrameForm.tsx`  
**Detalhes:**
- Textarea com contador de caracteres
- Tooltip com exemplos de cada campo
- Botão "Gerar sugestão com IA" usa FRAME agent

### T-21 · FRAME Agent — Phase 1 Specialist
**Done:** FRAME responde a perguntas sobre IDF; valida Decision Statement; sugere melhorias  
**Arquivos:** `backend/agents/phase1_specialist.py`, `backend/agents/prompts/phase1_specialist.md`

### T-22 · Phase 1 — Passo 1.6: Document IDF
**Done:** Resumo formatado do IDF gerado e exibido; timestamp salvo; opção de editar  
**Arquivos:** `backend/services/phase_service.py` + frontend

### T-23 · Phase 1 — Passo 1.7: Decision Statement
**Done:** Campo de Decision Statement; botão "Gerar com IA"; validação de estrutura  
**Arquivos:** `Phase1/DecisionStatement.tsx`  
**Detalhes:**
- IA gera DS baseado no IDF preenchido
- Validação: presença de verbo decisório + consistência com escopo
- Usuário pode editar livremente

### T-24 · Workshop Mode — Apêndice B
**Done:** Roteiro dos 7 passos do Decision Framing Workshop implementado como wizard  
**Arquivos:** `Phase1/WorkshopMode.tsx`

### T-25 · Phase 1 Completion Gate
**Done:** Sistema só permite avançar para Fase 2 se IDF completo + DS válido  
**Detalhes:** Checklist visual dos requisitos; mensagem de ARIA ao completar Fase 1

---

## MILESTONE 3 — Phase 2 Core

### T-26 · Objectives API (CRUD + Network)
**Done:** CRUD completo de objetivos; endpoint de network retorna grafo  
**Arquivos:** `backend/api/objectives.py`, `backend/services/phase_service.py`

### T-27 · AXIOM Agent — Phase 2 Specialist
**Done:** AXIOM responde sobre objetivos, WITI, CoC, atributos com contexto do projeto  
**Arquivos:** `backend/agents/phase2_specialist.py`, `prompts/phase2_specialist.md`

### T-28 · Phase 2 — Passo 2.1: Qualitative Value Modeling
**Done:** Seleção de técnica (Platinum/Gold/Silver/Combined) com explicações; persiste escolha  
**Arquivos:** `Phase2/ValueModelingTechnique.tsx`

### T-29 · Phase 2 — Passos 2.2–2.3: Org Documents (Gold/Combined)
**Done:** Upload/paste de documentos organizacionais; IA extrai valores automaticamente  
**Arquivos:** `Phase2/OrgDocumentInput.tsx` + `backend/services/elicitation_service.py`

### T-30 · Phase 2 — Passo 2.4: Questionnaire Preparation
**Done:** AXIOM prepara questionário personalizado com base no IDF e documentos  
**Arquivos:** `Phase2/QuestionnairePrep.tsx`

### T-31 · Stakeholder Agent — Simulation
**Done:** IA simula stakeholder nas entrevistas; responde de acordo com perfil  
**Arquivos:** `backend/agents/stakeholder_agent.py`, `prompts/stakeholder.md`

### T-32 · Phase 2 — Passos 2.5–2.7: Wish List + VFT Devices (Single Stk)
**Done:** Interface de entrevista guiada com 10 VFT Devices; IA simula stakeholder ou registra respostas reais  
**Arquivos:** `Phase2/WishListInterview.tsx`, `Phase2/VFTDevicesQuestionnaire.tsx`  
**Detalhes:**
- Modo "Stakeholder Real" (usuário digita respostas)
- Modo "Simular com IA" (stakeholder agent responde)
- Conversão valor → objetivo inline por AXIOM

### T-33 · Phase 2 — Passos 2.8–2.12: VFB (Multiple Stakeholders)
**Done:** Entrevistas individuais por stakeholder + consolidação de redundâncias + workshop coletivo  
**Arquivos:** `Phase2/VFBWorkflow.tsx`  
**Detalhes:**
- Status de entrevista por stakeholder
- IA detecta redundâncias entre objetivos de diferentes stakeholders
- Lista consolidada antes do workshop

### T-34 · ObjectivesList Component
**Done:** Lista de objetivos com filtros por tipo, busca, badge colorido, ações  
**Arquivos:** `Phase2/ObjectivesList.tsx`, `Phase2/ObjectiveCard.tsx`

### T-35 · Phase 2 — Passo 2.13: Categorize Objectives
**Done:** Interface de categorização com drag-and-drop; AXIOM sugere categorias  
**Arquivos:** `Phase2/ObjectiveCategorizer.tsx`

### T-36 · WITI Test Engine
**Done:** `witi_test.py` aplica WITI via IA; classifica como MEANS/FUNDAMENTAL/STRATEGIC/OTHER  
**Arquivos:** `backend/engine/witi_test.py`

### T-37 · Phase 2 — Passo 2.14: WITI Test Interface
**Done:** Modal de WITI por objetivo; resultado exibido; links de causalidade criados  
**Arquivos:** `Phase2/WITITestModal.tsx`

### T-38 · Causal Relations Map Component
**Done:** Grafo interativo de relações causais usando react-flow (simples, editável)  
**Arquivos:** `Phase2/CausalRelationsMap.tsx`

### T-39 · Control of Consequences Engine
**Done:** `control_of_consequences.py` aplica as 2 perguntas de CoC; sugere refinamento  
**Arquivos:** `backend/engine/control_of_consequences.py`

### T-40 · Phase 2 — Passo 2.15: Control of Consequences Interface
**Done:** Interface passo-a-passo para CoC; refinamento de definição com ajuda da IA  
**Arquivos:** `Phase2/ControlOfConsequences.tsx`

### T-41 · Objectives Network Engine
**Done:** `objectives_network.py` gera estrutura de grafo (nós + arestas) para Means-Ends Network  
**Arquivos:** `backend/engine/objectives_network.py`

### T-42 · Phase 2 — Passo 2.16: Means-Ends Network Visualization
**Done:** Grafo interativo com react-flow; nós por tipo de objetivo; layout automático  
**Arquivos:** `Phase2/MeansEndsNetwork.tsx`  
**Detalhes:**
- Layout: dagre (top-down ou left-right)
- Nós clicáveis para ver detalhes
- Zoom, pan, fit-to-view

### T-43 · Phase 2 — Passo 2.17: Fundamental Objectives Hierarchy
**Done:** Árvore interativa de decomposição; adicionar sub-objetivos; validar 9 propriedades  
**Arquivos:** `Phase2/ObjectivesHierarchy.tsx`

### T-44 · Phase 2 — Passo 2.18: Attribute Definition
**Done:** Formulário de atributo por objetivo fundamental; seleção de tipo; níveis de escala  
**Arquivos:** `Phase2/AttributeDefiner.tsx`

### T-45 · Phase 2 Completion Gate
**Done:** Todos os objetivos fundamentais têm atributo definido antes de avançar para Fase 3

---

## MILESTONE 4 — Phase 3 + Chat Complete

### T-46 · Alternatives API (CRUD)
**Done:** CRUD completo de alternativas com consequências por atributo  
**Arquivos:** `backend/api/alternatives.py`

### T-47 · NOVA Agent — Phase 3 Specialist
**Done:** NOVA elicita novas alternativas baseado nos objetivos e na Means-Ends Network  
**Arquivos:** `backend/agents/phase3_specialist.py`, `prompts/phase3_specialist.md`

### T-48 · Phase 3 — Passo 3.1/3.4: Initial Alternatives
**Done:** Lista de alternativas iniciais com consequências por atributo (tabela)  
**Arquivos:** `Phase3/AlternativesList.tsx`, `Phase3/AlternativeCard.tsx`

### T-49 · Phase 3 — Passos 3.2/3.5: Elicit New Alternatives
**Done:** NOVA aplica procedimento de Keeney (objetivo por objetivo → pares) para sugerir novas alternativas  
**Arquivos:** `Phase3/AlternativeElicitor.tsx`

### T-50 · Phase 3 — Consequences Matrix
**Done:** Tabela alternativas × atributos; células editáveis; IA preenche sugestões  
**Arquivos:** `Phase3/ConsequencesMatrix.tsx`

### T-51 · ARIA Agent — Facilitador Completo
**Done:** ARIA com contexto completo do projeto; lida com todos os cenários descritos no AGENTS-SPEC  
**Arquivos:** `backend/agents/facilitator.py`, `prompts/facilitator.md`

### T-52 · Chat — Agent Selector
**Done:** Usuário seleciona agente no chat; contexto muda; avatar e nome mudam  
**Arquivos:** `frontend/src/components/chat/AgentSelector.tsx`

### T-53 · Chat — Quick Actions
**Done:** IA retorna marcadores de quick action no response; botões aparecem na mensagem  
**Arquivos:** `frontend/src/components/chat/QuickActions.tsx`, `backend/api/chat.py`  
**Detalhes:**
- Parser de `<!-- quick_action: {type, label, data} -->` no response da IA
- Botões: "Salvar como objetivo", "Salvar como valor", "Salvar como alternativa"

### T-54 · Chat — History + Export
**Done:** Histórico completo por projeto; opção de exportar como Markdown  
**Arquivos:** `frontend/src/components/chat/ChatHistory.tsx`

### T-55 · SCRIBE — Documentation Agent
**Done:** SCRIBE gera relatório completo em Markdown com todos os dados do projeto  
**Arquivos:** `backend/agents/documentation_agent.py`, `prompts/documentation.md`

---

## MILESTONE 5 — Visualizations + Export

### T-56 · Export Service — Markdown
**Done:** `ExportService.generate_markdown()` produz relatório completo e bem formatado  
**Arquivos:** `backend/services/export_service.py`

### T-57 · Export Service — PDF
**Done:** `ExportService.generate_pdf()` converte Markdown → HTML → PDF via WeasyPrint  
**Arquivos:** `backend/services/export_service.py` (extended)

### T-58 · Export Endpoints + Frontend
**Done:** Usuário clica em Export; escolhe formato; arquivo abre/salva no macOS  
**Arquivos:** `backend/api/exports.py`, `frontend/src/components/phases/ExportPanel.tsx`

### T-59 · Network Graph — PNG Export
**Done:** Means-Ends Network exportável como PNG via react-flow  
**Arquivos:** `Phase2/MeansEndsNetwork.tsx` (extended)

### T-60 · VFT Process Data Files
**Done:** Todos os arquivos JSON em `data/` preenchidos com conteúdo completo do framework  
**Arquivos:** `data/vft_process.json`, `data/vft_devices.json`, `data/value_stimulation.json`, `data/objective_properties.json`

### T-61 · Settings Screen
**Done:** Tela de configurações com API Key (keychain), modelo por agente, idioma  
**Arquivos:** `frontend/src/components/settings/`, `backend/api/settings.py`  
**Detalhes:**
- API key armazenada no macOS Keychain via `keyring` library
- Teste de conexão com Claude ao salvar key

### T-62 · Project Export/Import (.vft bundle)
**Done:** Exportar e importar projeto completo como arquivo `.vft` (JSON comprimido)  
**Arquivos:** `backend/api/projects.py` (endpoints import/export)

---

## MILESTONE 6 — Polish + Tests + Packaging

### T-63 · Keyboard Shortcuts
**Done:** Todos os atalhos do UI-SPEC funcionam; `⌘K` command palette básica  
**Arquivos:** `frontend/src/hooks/useKeyboardShortcuts.ts`

### T-64 · Auto-save + Undo/Redo
**Done:** Salvamento automático com debounce 2s; undo/redo em formulários  
**Arquivos:** Zustand middleware custom para undo/redo

### T-65 · Error Boundaries + Offline Mode
**Done:** Graceful degradation sem API key; Error boundaries no React; retry UI  
**Arquivos:** `frontend/src/components/ui/ErrorBoundary.tsx`

### T-66 · Backend Tests (70% coverage)
**Done:** pytest com ≥70% cobertura; testes de engine, agents (mock), API, services  
**Arquivos:** `tests/backend/`

### T-67 · Frontend Tests (Vitest)
**Done:** Testes de componentes críticos (StepGuide, ObjectiveCard, ChatMessage)  
**Arquivos:** `tests/frontend/`

### T-68 · macOS App Bundle (.app)
**Done:** `python build.py` produz `VFT Studio.app` em `dist/`  
**Arquivos:** `build.py`, `VFTStudio.spec` (PyInstaller config)  
**Detalhes:**
- PyInstaller para empacotar Python + deps
- Frontend buildado e incluído como assets estáticos
- App icon (icns) criado
- `Info.plist` com metadata correto

### T-69 · Onboarding Flow
**Done:** Primeiro boot mostra onboarding de 3 telas: O que é VFT / Como funciona o app / Configure sua API key  
**Arquivos:** `frontend/src/components/onboarding/`

### T-70 · Dark/Light Mode Polish
**Done:** Dark mode e Light mode completamente estilizados; toggle manual nas configurações  
**Arquivos:** CSS vars revisados para ambos os modos

---

## MILESTONE 7 — Interview-Driven Flow (RF-10) [NOVO v0.2]

### T-71 · Interview Session State Machine (Backend)
**Done:** `InterviewSession` model + engine com estados IDLE→BRIEFING→QUESTIONING→FOLLOW_UP→SYNTHESIS→COMPLETED; persistido no SQLite  
**Arquivos:** `backend/engine/interview_engine.py`, nova tabela `interview_sessions` + `interview_turns`  
**Detalhes:**
- `start_session(project_id, stakeholder_id, interview_type)` → cria sessão
- `submit_answer(session_id, answer_text)` → IA analisa, retorna próxima ação
- `get_synthesis(session_id)` → IA compila valores/objetivos extraídos
- `confirm_synthesis(session_id, confirmed_objectives)` → salva no projeto

### T-72 · Interview Session API Endpoints
**Done:** POST start, POST answer (SSE), GET synthesis, POST confirm, GET transcript  
**Arquivos:** `backend/api/interviews.py`

### T-73 · Interview Agent Behavior (AXIOM + FRAME + Facilitator updates)
**Done:** Agentes têm método `generate_interview_question(context, device, turn)` e `analyze_answer(question, answer)` que retorna: extracted_values, needs_followup, followup_question, next_device  
**Arquivos:** Atualizar `phase1_specialist.py`, `phase2_specialist.py`; novos prompts `interview_*.md`

### T-74 · InterviewMode Component (Frontend)
**Done:** Tela de entrevista com: progresso (dispositivo N/10), pergunta da IA em destaque, campo de resposta, análise inline após submissão, botão para avançar/follow-up  
**Arquivos:** `frontend/src/components/interview/InterviewMode.tsx`, `InterviewQuestion.tsx`, `InterviewAnswer.tsx`, `InterviewProgress.tsx`

### T-75 · Interview Synthesis Review Screen
**Done:** Após entrevista, tela de revisão mostra: valores extraídos → objetivos candidatos → quotes das respostas; usuário edita/confirma antes de salvar  
**Arquivos:** `frontend/src/components/interview/InterviewSynthesis.tsx`

### T-76 · Interview Transcript Export
**Done:** Transcrição completa (pergunta + resposta + análise IA) exportável como Markdown  
**Arquivos:** `backend/services/export_service.py` (extend)

### T-77 · WITI Test como Entrevista Conversacional
**Done:** Passo 2.14 tem modo "Entrevista WITI" onde AXIOM conduz cada objetivo como conversa; follow-ups automáticos para respostas ambíguas  
**Arquivos:** `Phase2/WITITestInterview.tsx` (substituir WITITestModal.tsx)

### T-78 · CoC como Entrevista Conversacional
**Done:** Passo 2.15 conduzido como diálogo; IA explica implicações de cada resposta em tempo real  
**Arquivos:** `Phase2/CoCInterview.tsx`

---

## MILESTONE 8 — Diagrams + Report (RF-11) [NOVO v0.2]

### T-79 · Diagram Export Service (html2canvas + Mermaid CLI)
**Done:** `DiagramExportService` captura qualquer componente React como PNG (html2canvas); renderiza Mermaid como PNG server-side via mermaid CLI ou client-side  
**Arquivos:** `frontend/src/services/diagramExport.ts`, `backend/services/diagram_service.py`  
**Detalhes:**
- `captureComponent(elementId, scale=2)` → PNG base64
- Mermaid: `mermaid.render(id, definition)` → SVG → PNG via canvas

### T-80 · Diagrama: Initial Decision Frame Card
**Done:** Componente React estilizado que renderiza IDF como card visual (Purpose/Perspective/Scope/Stakeholders); exportável como PNG  
**Arquivos:** `frontend/src/components/diagrams/DecisionFrameDiagram.tsx`

### T-81 · Diagrama: Stakeholder Map (Mermaid)
**Done:** Gera Mermaid `graph TD` com stakeholders agrupados por tipo; renderiza e exporta  
**Arquivos:** `frontend/src/components/diagrams/StakeholderMapDiagram.tsx`, `backend/services/mermaid_generator.py`

### T-82 · Diagrama: Process Flowchart (Mermaid)
**Done:** Fluxograma das 3 fases com passos completados vs pendentes (checkmarks); baseado na Figura 15 do artigo  
**Arquivos:** `frontend/src/components/diagrams/ProcessFlowchartDiagram.tsx`

### T-83 · Diagrama: Causal Relations Map (react-flow)
**Done:** Grafo de relações causais com nós coloridos por tipo; legenda automática; exportável  
**Arquivos:** `frontend/src/components/diagrams/CausalRelationsMapDiagram.tsx` (refactor de CausalRelationsMap.tsx)

### T-84 · Diagrama: Means-Ends Network (react-flow + dagre)
**Done:** Network com layout dagre; nós por tipo; legenda; export PNG 2x  
**Arquivos:** `frontend/src/components/diagrams/MeansEndsNetworkDiagram.tsx`

### T-85 · Diagrama: Fundamental Objectives Hierarchy (react-flow tree)
**Done:** Árvore top-down com atributos nas folhas; cores distintas por nível  
**Arquivos:** `frontend/src/components/diagrams/FundamentalHierarchyDiagram.tsx`

### T-86 · Report Assembler — Coleta de Diagramas
**Done:** `ReportAssembler` no backend solicita ao frontend a captura de todos os diagramas antes de gerar PDF; recebe PNGs como base64 via endpoint POST  
**Arquivos:** `backend/services/report_assembler.py`, `backend/api/exports.py` (extend)  
**Detalhes:**
- Frontend: `DiagramCollector.captureAll()` → captura 7 diagramas → POST /api/exports/{id}/diagrams
- Backend: salva PNGs em `~/VFTStudio/exports/{project_id}/diagrams/`
- PDF gerado com `<img>` tags apontando para os PNGs locais

### T-87 · Full Report Template com Diagramas
**Done:** Template Markdown/HTML do relatório completo com seções específicas para cada diagrama; numeração de figuras; legendas; referências ao artigo  
**Arquivos:** `backend/services/report_templates/full_report.md`, `full_report.html`

---

## MILESTONE 9 — Graph View (RF-12) [NOVO v0.2]

### T-88 · Graph View API Endpoint
**Done:** GET `/api/projects/{id}/graph-view` retorna `{nodes, edges}` com todas as entidades e relações do projeto  
**Arquivos:** `backend/api/graph.py`, `backend/services/graph_service.py`  
**Detalhes:**
- Nós: stakeholders + todos os objetivos + alternativas + atributos
- Arestas: causal_influence, hierarchical, contributed_by, measured_by, alternative_achieves
- Metadados: `connections_count`, `phase_origin`, `entity_type`

### T-89 · D3.js Force Graph Component
**Done:** Componente React com D3 force simulation; nós SVG por tipo; arestas com setas; zoom/pan via d3-zoom  
**Arquivos:** `frontend/src/components/graph/ForceGraph.tsx`, `GraphNode.tsx`, `GraphEdge.tsx`  
**Detalhes:**
- d3-force: forceLink (distance por tipo), forceManyBody (repulsão), forceCenter, forceCollide
- Nós: SVG `<g>` com `<circle>` + `<text>`; tamanho proporcional a `connections_count`
- Arestas: SVG `<path>` com `<marker>` para setas; estilo por tipo
- Cores e ícones conforme RF-12.2 e RF-12.3

### T-90 · Graph View Filters + Search
**Done:** Painel de filtros para tipo de nó e fase; campo de busca que destaca nós  
**Arquivos:** `frontend/src/components/graph/GraphFilters.tsx`, `useGraphFilter.ts`

### T-91 · Graph View Mini-map + Node Detail Panel
**Done:** Mini-map canvas no canto inferior direito; click em nó abre painel lateral com detalhes e link para editar  
**Arquivos:** `frontend/src/components/graph/GraphMinimap.tsx`, `GraphNodeDetail.tsx`

### T-92 · Graph View Temporal Toggle
**Done:** Slider de fases (1/2/3) mostra evolução do grafo; nós aparecem/somem conforme fase  
**Arquivos:** `frontend/src/components/graph/GraphTimeline.tsx`

### T-93 · Graph View Export PNG + Integração no Relatório
**Done:** Botão exporta grafo como PNG 2x; versão estática incluída como primeira figura no relatório completo  
**Arquivos:** `frontend/src/components/graph/ForceGraph.tsx` (extend)

---

## Dependências Entre Tasks

```
T-01 → T-02 → T-08 (parallel)
T-03 → T-04 → T-05 → T-06 → T-07
T-12 → T-13
T-14 → T-15
[T-01..T-15 = MILESTONE 1]

T-16 → T-17 → T-18 → T-19 → T-20
T-21 (parallel com T-20)
T-22 → T-23 → T-24 → T-25
[T-16..T-25 = MILESTONE 2]

T-26 → T-27 (parallel)
T-28 → T-29 → T-30 → T-31 → T-32 → T-33 → T-34 → T-35
T-36 → T-37 → T-38 → T-39 → T-40 → T-41 → T-42 → T-43 → T-44 → T-45
[T-26..T-45 = MILESTONE 3]

T-46 → T-47 (parallel)
T-48 → T-49 → T-50
T-51 → T-52 → T-53 → T-54 → T-55
[T-46..T-55 = MILESTONE 4]

T-56 → T-57 → T-58
T-59 (parallel com T-58)
T-60 (pode ser feito em M1)
T-61 → T-62
[T-56..T-62 = MILESTONE 5]

T-63..T-70 = MILESTONE 6 (maioria paralela)

T-71 → T-72 → T-73 → T-74 → T-75 → T-76
T-77 (depende T-37) → T-78 (depende T-40)
[T-71..T-78 = MILESTONE 7]

T-79 → T-80 → T-81 → T-82 (parallel T-80..T-82)
T-83 (depende T-38) → T-84 (depende T-42) → T-85 (depende T-43)
T-86 → T-87 (depende T-79..T-85)
[T-79..T-87 = MILESTONE 8]

T-88 → T-89 → T-90 → T-91 (parallel T-90..T-91)
T-92 → T-93 (depende T-89)
[T-88..T-93 = MILESTONE 9]
```

---

## Estimativa de Esforço (v0.2)

| Milestone | Tasks | Estimativa |
|-----------|-------|-----------|
| M1 - Foundation | 15 | ~3-4 dias |
| M2 - Phase 1 | 10 | ~2-3 dias |
| M3 - Phase 2 | 20 | ~5-6 dias |
| M4 - Phase 3 + Chat | 10 | ~3-4 dias |
| M5 - Viz + Export | 7 | ~2-3 dias |
| M6 - Polish + Tests | 8 | ~2-3 dias |
| M7 - Interview-Driven Flow | 8 | ~3-4 dias |
| M8 - Diagrams + Report | 9 | ~3-4 dias |
| M9 - Graph View | 6 | ~2-3 dias |
| **Total** | **93** | **~25-33 dias** |
