# VFT Studio — System Design

**Versão:** 0.1.0-spec | **Data:** 2026-04-07

---

## 1. Estrutura de Diretórios do Projeto

```
vft-studio/
├── main.py                          # Entry point: inicia FastAPI + PyWebView
├── pyproject.toml                   # Dependências Python
├── .env.example                     # Template de variáveis de ambiente
│
├── backend/
│   ├── __init__.py
│   ├── app.py                       # FastAPI app factory
│   ├── config.py                    # Settings (Pydantic BaseSettings)
│   │
│   ├── api/                         # Routers FastAPI
│   │   ├── projects.py              # CRUD de projetos
│   │   ├── stakeholders.py          # CRUD de stakeholders
│   │   ├── phases.py                # Endpoints de fase/passo
│   │   ├── objectives.py            # CRUD de objetivos
│   │   ├── alternatives.py          # CRUD de alternativas
│   │   ├── chat.py                  # Chat + SSE streaming
│   │   ├── exports.py               # Export Markdown/PDF
│   │   └── settings.py              # Configurações do app
│   │
│   ├── agents/                      # Agentes de IA
│   │   ├── base_agent.py            # Classe base com invoke + stream
│   │   ├── facilitator.py           # Facilitador geral
│   │   ├── phase1_specialist.py     # Especialista Fase 1
│   │   ├── phase2_specialist.py     # Especialista Fase 2
│   │   ├── phase3_specialist.py     # Especialista Fase 3
│   │   ├── stakeholder_agent.py     # Simulação de stakeholder
│   │   ├── documentation_agent.py  # Geração de relatórios
│   │   └── prompts/                 # Prompts em Markdown
│   │       ├── facilitator.md
│   │       ├── phase1_specialist.md
│   │       ├── phase2_specialist.md
│   │       ├── phase3_specialist.md
│   │       ├── stakeholder.md
│   │       └── documentation.md
│   │
│   ├── engine/                      # VFT Process Engine
│   │   ├── process_manager.py       # Controle de fases/passos
│   │   ├── phase1_steps.py          # Lógica dos 7 passos da Fase 1
│   │   ├── phase2_steps.py          # Lógica dos 18 passos da Fase 2
│   │   ├── phase3_steps.py          # Lógica dos 8 passos da Fase 3
│   │   ├── witi_test.py             # WITI Test engine
│   │   ├── control_of_consequences.py  # CoC engine
│   │   └── objectives_network.py    # Geração de rede meios-fins
│   │
│   ├── db/                          # Banco de dados
│   │   ├── base.py                  # SQLAlchemy Base + engine
│   │   ├── models.py                # Todos os modelos ORM
│   │   ├── repository.py            # Repository pattern (CRUD genérico)
│   │   └── migrations/              # Alembic migrations
│   │       └── versions/
│   │
│   ├── schemas/                     # Pydantic schemas (request/response)
│   │   ├── project.py
│   │   ├── stakeholder.py
│   │   ├── objective.py
│   │   ├── alternative.py
│   │   ├── chat.py
│   │   └── export.py
│   │
│   └── services/                    # Lógica de negócio
│       ├── project_service.py
│       ├── phase_service.py
│       ├── elicitation_service.py
│       ├── document_service.py
│       └── export_service.py
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx       # Layout principal: sidebar + main + chat
│       │   │   ├── Sidebar.tsx        # Navegação do projeto
│       │   │   └── ChatPanel.tsx      # Painel de chat (expandível)
│       │   │
│       │   ├── project/
│       │   │   ├── ProjectList.tsx
│       │   │   ├── ProjectCard.tsx
│       │   │   └── NewProjectWizard.tsx
│       │   │
│       │   ├── phases/
│       │   │   ├── PhaseProgress.tsx  # Barra de progresso
│       │   │   ├── StepGuide.tsx      # Card com o que/por que/como
│       │   │   ├── Phase1/
│       │   │   │   ├── StakeholderMapper.tsx
│       │   │   │   ├── DecisionFrameForm.tsx
│       │   │   │   ├── WorkshopMode.tsx
│       │   │   │   └── DecisionStatement.tsx
│       │   │   ├── Phase2/
│       │   │   │   ├── ValueModelingTechnique.tsx
│       │   │   │   ├── WishListInterview.tsx
│       │   │   │   ├── VFTDevicesQuestionnaire.tsx
│       │   │   │   ├── ObjectivesList.tsx
│       │   │   │   ├── ObjectiveCard.tsx
│       │   │   │   ├── WITITestModal.tsx
│       │   │   │   ├── CausalRelationsMap.tsx
│       │   │   │   ├── ControlOfConsequences.tsx
│       │   │   │   ├── MeansEndsNetwork.tsx     # react-flow
│       │   │   │   ├── ObjectivesHierarchy.tsx  # react-flow tree
│       │   │   │   └── AttributeDefiner.tsx
│       │   │   └── Phase3/
│       │   │       ├── AlternativesList.tsx
│       │   │       ├── AlternativeCard.tsx
│       │   │       └── ConsequencesMatrix.tsx
│       │   │
│       │   ├── chat/
│       │   │   ├── ChatMessage.tsx
│       │   │   ├── ChatInput.tsx
│       │   │   ├── AgentSelector.tsx   # Seleciona: Facilitador / Especialista / Stakeholder
│       │   │   └── QuickActions.tsx    # "Salvar como objetivo" etc.
│       │   │
│       │   ├── visualizations/
│       │   │   ├── NetworkGraph.tsx    # Wrapper react-flow genérico
│       │   │   ├── ObjectiveTree.tsx
│       │   │   └── StakeholderMap.tsx
│       │   │
│       │   └── ui/                    # Design system primitivos
│       │       ├── Button.tsx
│       │       ├── Card.tsx
│       │       ├── Badge.tsx
│       │       ├── Input.tsx
│       │       ├── Textarea.tsx
│       │       ├── Select.tsx
│       │       ├── Modal.tsx
│       │       ├── Tooltip.tsx
│       │       ├── MarkdownRenderer.tsx
│       │       └── ProgressBar.tsx
│       │
│       ├── hooks/
│       │   ├── useProject.ts
│       │   ├── useChat.ts          # SSE streaming
│       │   ├── usePhase.ts
│       │   └── useExport.ts
│       │
│       ├── store/                  # Zustand state management
│       │   ├── projectStore.ts
│       │   ├── chatStore.ts
│       │   └── uiStore.ts
│       │
│       ├── api/                    # Client HTTP
│       │   ├── client.ts           # Base axios/fetch config
│       │   ├── projects.ts
│       │   ├── phases.ts
│       │   ├── chat.ts
│       │   └── exports.ts
│       │
│       └── types/
│           ├── project.ts
│           ├── vft.ts              # Tipos VFT (Objective, Stakeholder, etc.)
│           └── agent.ts
│
├── data/                           # Conteúdo estático do processo VFT
│   ├── vft_process.json            # Definição das fases, passos, guias
│   ├── vft_devices.json            # 10 VFT Devices de Keeney (1992)
│   ├── value_stimulation.json      # 8 Value Stimulation Techniques (2020)
│   └── objective_properties.json  # 9 propriedades de objetivos fundamentais
│
└── tests/
    ├── backend/
    │   ├── test_engine.py
    │   ├── test_agents.py
    │   ├── test_api.py
    │   └── test_services.py
    └── frontend/  (Vitest)
```

---

## 2. Fluxo de Dados Principal

### 2.1 Chat com Streaming (SSE)

```
User types message
      ↓
Frontend: POST /api/chat/message
{
  project_id, agent_type, message,
  phase, step, context_snapshot
}
      ↓
Backend: ChatRouter recebe
      ↓
AgentOrchestrator.select_agent(agent_type)
      ↓
Agent.build_context(project_id)
  → carrega: IDF, objectives, alternatives, stakeholders, chat history
      ↓
Agent.stream(message, context) → AsyncGenerator[str]
  → Anthropic SDK: client.messages.stream(...)
      ↓
SSE: yield "data: {token}\n\n" 
      ↓
Frontend: EventSource recebe tokens → renderiza incrementalmente
      ↓
Agent.on_complete(full_response)
  → Persiste mensagem no ChatMessage
  → Extrai ações (se houver quick actions na resposta)
```

### 2.2 Wizard de Passo (Phase Engine)

```
Frontend: GET /api/phases/{project_id}/current
      ↓
ProcessManager.get_current_step(project_id)
  → retorna: {phase, step, step_config, guidance, status}
      ↓
Frontend renderiza StepGuide com:
  - O QUE: nome e descrição do passo
  - POR QUÊ: fundamentação teórica (Vieira et al., 2024)
  - COMO: instruções práticas
  - FORMULÁRIO: campos específicos do passo
      ↓
User completa formulário
      ↓
Frontend: POST /api/phases/{project_id}/step/{step_id}/complete
{data: {...step_data}}
      ↓
PhaseService.complete_step(project_id, step_id, data)
  → Valida dados
  → Persiste no SQLite
  → ProcessManager.advance(project_id)
      ↓
Retorna: {next_step, can_proceed, validation_errors}
```

### 2.3 WITI Test Flow

```
User clica "Aplicar WITI Test" em um objetivo
      ↓
Frontend abre WITITestModal
      ↓
Phase2Specialist.generate_witi_question(objective)
  → Gera pergunta contextualizada: 
    "Por que [objetivo X] é importante no contexto desta decisão?"
      ↓
User responde (texto livre)
      ↓
Phase2Specialist.classify_witi_response(objective, response)
  → LLM classifica: MEANS | FUNDAMENTAL_CANDIDATE | STRATEGIC | OTHER
  → Extrai: "implica em qual outro objetivo?" (se MEANS)
      ↓
Sistema atualiza: objective.type, objective.causal_relations
      ↓
Se FUNDAMENTAL_CANDIDATE → aciona Control of Consequences
```

### 2.4 Export Flow

```
User clica "Exportar Relatório"
      ↓
Frontend: POST /api/exports/{project_id}
{format: "markdown" | "pdf", sections: [...]}
      ↓
ExportService.generate(project_id, format)
      ↓
DocumentationAgent.compose_report(project_data)
  → Usa templates Markdown em data/
  → Insere dados do projeto
  → Formata hierarquias e redes como texto estruturado
      ↓
Se PDF: WeasyPrint.render(markdown → html → pdf)
      ↓
Retorna arquivo para download ou abre no macOS Preview
```

---

## 3. API Endpoints

### Projects

```
GET    /api/projects                    → Lista projetos
POST   /api/projects                    → Cria projeto
GET    /api/projects/{id}               → Detalha projeto
PATCH  /api/projects/{id}               → Atualiza projeto
DELETE /api/projects/{id}               → Arquiva projeto
POST   /api/projects/{id}/duplicate     → Duplica projeto
GET    /api/projects/{id}/export        → Export .vft bundle
POST   /api/projects/import             → Import .vft bundle
```

### Stakeholders

```
GET    /api/projects/{id}/stakeholders          → Lista stakeholders
POST   /api/projects/{id}/stakeholders          → Cria stakeholder
PATCH  /api/projects/{id}/stakeholders/{sid}    → Atualiza
DELETE /api/projects/{id}/stakeholders/{sid}    → Remove
```

### Phase Engine

```
GET    /api/projects/{id}/phase/current         → Passo atual
POST   /api/projects/{id}/phase/step/complete   → Completa passo
POST   /api/projects/{id}/phase/step/skip       → Pula passo (opcional)
GET    /api/projects/{id}/phase/overview        → Visão geral de todas as fases
```

### Decision Frame

```
GET    /api/projects/{id}/decision-frame        → Retorna IDF
PUT    /api/projects/{id}/decision-frame        → Salva IDF completo
GET    /api/projects/{id}/decision-statement    → Retorna DS
PUT    /api/projects/{id}/decision-statement    → Salva DS
POST   /api/projects/{id}/decision-statement/generate  → IA gera DS
```

### Objectives

```
GET    /api/projects/{id}/objectives            → Lista objetivos
POST   /api/projects/{id}/objectives            → Cria objetivo
PATCH  /api/projects/{id}/objectives/{oid}      → Atualiza
DELETE /api/projects/{id}/objectives/{oid}      → Remove
POST   /api/projects/{id}/objectives/{oid}/witi → Aplica WITI Test
POST   /api/projects/{id}/objectives/merge-redundant → IA detecta redundâncias
GET    /api/projects/{id}/objectives/network    → Retorna grafo meios-fins
GET    /api/projects/{id}/objectives/hierarchy  → Retorna hierarquia de fundamentais
```

### Alternatives

```
GET    /api/projects/{id}/alternatives          → Lista alternativas
POST   /api/projects/{id}/alternatives          → Cria alternativa
PATCH  /api/projects/{id}/alternatives/{aid}    → Atualiza
DELETE /api/projects/{id}/alternatives/{aid}    → Remove
POST   /api/projects/{id}/alternatives/elicit   → IA sugere novas alternativas
```

### Chat

```
POST   /api/chat/message               → Envia mensagem (retorna SSE stream)
GET    /api/chat/{project_id}/history  → Histórico de chat
DELETE /api/chat/{project_id}/history  → Limpa histórico
POST   /api/chat/quick-action          → Processa quick action (salvar como objetivo, etc.)
```

### Exports

```
POST   /api/exports/{project_id}/markdown  → Gera Markdown
POST   /api/exports/{project_id}/pdf       → Gera PDF
POST   /api/exports/{project_id}/network-image → Exporta grafo como PNG
```

---

## 4. Contratos de Interface (Schemas)

### ProjectSchema

```typescript
interface Project {
  id: string                // UUID
  name: string
  description: string
  context_notes: string     // Notas livres sobre o contexto
  created_at: string        // ISO 8601
  updated_at: string
  phase_status: 1 | 2 | 3
  current_step: string      // ex: "1.3", "2.11", "3.5"
  qualitative_modeling_technique: 'platinum' | 'gold' | 'silver' | 'combined'
  stakeholder_config: 'single_dm_single' | 'single_dm_multi' | 'multi_dm_multi'
}
```

### StakeholderSchema

```typescript
interface Stakeholder {
  id: string
  project_id: string
  name: string
  role: 'decision_authority' | 'customer' | 'owner' | 'user' | 'consumer'
  is_decision_maker: boolean
  profile: string           // Descrição detalhada para IA simular
  interests: string         // Interesses na decisão
  wish_list: string[]       // Lista de desejos/valores identificados
  interview_status: 'pending' | 'in_progress' | 'completed'
}
```

### ObjectiveSchema

```typescript
interface Objective {
  id: string
  project_id: string
  statement: string         // "Verbo + Objeto" ex: "Minimize service costs"
  source_stakeholder_id: string | null
  raw_value: string         // Valor original antes da conversão
  type: 'strategic' | 'fundamental' | 'means' | 'other' | 'uncategorized'
  witi_answer: string | null
  witi_classification: string | null
  is_fundamental_candidate: boolean
  coc_question1_answer: string | null  // Control of Consequences Q1
  coc_question2_answer: string | null  // Control of Consequences Q2
  refined_statement: string | null     // Após CoC, se necessário refinar
  parent_id: string | null             // Para hierarquia
  causal_links_to: string[]            // IDs de objetivos que este influencia
  attribute: ObjectiveAttribute | null
}

interface ObjectiveAttribute {
  type: 'natural' | 'constructed' | 'proxy'
  description: string
  scale_description: string
  levels: AttributeLevel[]
}

interface AttributeLevel {
  label: string
  description: string
}
```

### AlternativeSchema

```typescript
interface Alternative {
  id: string
  project_id: string
  name: string
  description: string
  source: 'initial' | 'elicited' | 'decision_opportunity'
  source_stakeholder_id: string | null
  consequences: Record<string, string>  // objective_id → consequence value
}
```

### ChatMessageSchema

```typescript
interface ChatMessage {
  id: string
  project_id: string
  timestamp: string
  role: 'user' | 'facilitator' | 'phase1_specialist' | 'phase2_specialist' | 
        'phase3_specialist' | 'stakeholder' | 'documentation'
  agent_name: string        // "Facilitador", nome do stakeholder, etc.
  content: string           // Markdown
  phase: number | null
  step: string | null
  quick_actions: QuickAction[]
}

interface QuickAction {
  type: 'save_objective' | 'save_value' | 'save_alternative' | 'save_note'
  label: string
  data: Record<string, unknown>
}
```

---

## 5. Process Manager — Definição dos Passos

### Estrutura do Step

```python
@dataclass
class StepConfig:
    id: str                    # ex: "1.1", "2.14", "3.6"
    phase: int                 # 1, 2, 3
    name: str                  # "Map Stakeholders"
    description: str           # O que é este passo
    why: str                   # Por que fazer (fundamentação teórica)
    how: str                   # Como fazer (instruções práticas)
    reference: str             # "Vieira et al. (2024), Seção 3.2.1"
    form_type: str             # "stakeholder_mapper" | "decision_frame" | etc.
    requires_ai: bool          # Se precisa de chamada ativa ao LLM
    is_conditional: bool       # Se aparece apenas em certas configurações
    condition: str | None      # ex: "stakeholder_config == 'multi_dm_multi'"
    completion_criteria: list  # Lista de campos obrigatórios para considerar completo
```

### Mapa Completo de Passos (33 passos)

```
FASE 1 (7 passos):
  1.1 → Map Stakeholders
  1.2 → Identify IDF - Single Stakeholder          [conditional: single_dm_single]
  1.3 → Identify IDF - Single DM / Multi Stk       [conditional: single_dm_multi]
  1.4 → Workshop for IDF - Multiple DMs             [conditional: multi_dm_multi]
  1.5 → Identify IDF - Multi DM / Multi Stk         [conditional: multi_dm_multi]
  1.6 → Document Initial Decision Frame
  1.7 → Define Decision Statement

FASE 2 (18 passos):
  2.1  → Plan Qualitative Value Modeling
  2.2  → Identify org values from documents         [conditional: gold OR combined]
  2.3  → Convert org values into objectives         [conditional: gold OR combined]
  2.4  → Prepare questionnaire for objectives ID
  2.5  → Wish List - Single Stakeholder             [conditional: single stk]
  2.6  → VFT Devices / Value Stim - Single Stk      [conditional: single stk]
  2.7  → Convert Values into Objectives             [conditional: single stk]
  2.8  → Wish List - Multiple Stakeholders          [conditional: multi stk]
  2.9  → VFT Devices / Value Stim - Multi Stk       [conditional: multi stk]
  2.10 → Convert Individual Values - Multi Stk      [conditional: multi stk]
  2.11 → Workshop to identify collective objectives [conditional: multi stk]
  2.12 → Present individual + identify collective   [conditional: multi stk]
  2.13 → Categorize Objectives
  2.14 → Map Causal Relations (WITI Test)
  2.15 → Apply Control of Consequences
  2.16 → Define Means-Ends Objectives Network
  2.17 → Build Fundamental Objectives Hierarchy
  2.18 → Define Attributes for Fundamental Objectives

FASE 3 (8 passos):
  3.1 → Depict initial alternatives - Single Stk    [conditional: single stk]
  3.2 → Elicit new alternatives - Single Stk        [conditional: single stk]
  3.3 → Organize final alternatives - Single Stk    [conditional: single stk]
  3.4 → Depict initial alternatives - Multi Stk     [conditional: multi stk]
  3.5 → Elicit new alternatives - Multi Stk         [conditional: multi stk]
  3.6 → Workshop to define alternatives             [conditional: multi stk]
  3.7 → Present + elicit collective alternatives    [conditional: multi stk]
  3.8 → Organize final alternatives - Multi Stk     [conditional: multi stk]
```

---

## 6. Padrões de Código

### Backend

- **Repository Pattern:** `BaseRepository[T]` genérico; um repositório por entidade
- **Imutabilidade:** Pydantic schemas são frozen=True; SQLAlchemy modelos nunca mutados in-place (sempre `session.merge` ou novo objeto)
- **Async:** Todos os endpoints FastAPI são async; chamadas Anthropic via asyncio
- **Error Handling:** HTTPException com códigos e mensagens claras; nunca retornar 500 sem logging
- **Dependency Injection:** FastAPI Depends para db session, agent instances

### Frontend

- **State:** Zustand para estado global (projeto, UI); React Query para cache de API
- **Imutabilidade:** Zustand stores usam `produce` (immer) para updates
- **Componentes:** Funcionais + hooks; sem class components
- **Tailwind:** Classes utilitárias; nenhum CSS inline; design tokens via CSS vars
- **TypeScript:** strict mode; no `any`; interfaces para todos os dados de API
