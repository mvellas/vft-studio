# VFT Pipeline Completo + War Room — Design Spec
**Data:** 2026-04-12  
**Status:** Aprovado

---

## Visão Geral

Adicionar ao VFT Studio dois recursos integrados:

1. **Chat Unificado com Roteamento Automático** — o `AgentSelector` manual é removido; um `RouterAgent` (Haiku) decide qual agente responde cada mensagem com base na fase do projeto e no conteúdo.
2. **Pipeline VFT Completo com IA** — botão na tela principal que executa todos os agentes sequencialmente, seguido de uma War Room mediada pela ARIA, gerando um relatório inline exportável.

Todo o processamento é orquestrado no backend via SSE (Server-Sent Events), padrão já estabelecido no projeto.

---

## Arquitetura

### Backend — novos componentes

```
backend/
  agents/
    router_agent.py          # RouterAgent (Haiku) — decide agent_type por mensagem
  pipeline/
    __init__.py
    orchestrator.py          # PipelineOrchestrator — coordena fases sequenciais
    war_room.py              # WarRoomOrchestrator — debate mediado pela ARIA
    report.py                # ReportGenerator — sintetiza relatório final
  api/
    pipeline.py              # POST /api/pipeline/run (SSE)
                             # GET  /api/pipeline/{run_id}
  db/
    models.py                # + PipelineRun, PipelineTurn
```

**Modificação:** `backend/api/chat.py` — `POST /api/chat/message` chama `RouterAgent.route()` antes de invocar o agente executor.

### Frontend — novos componentes

```
frontend/src/
  components/
    pipeline/
      PipelineButton.tsx     # Botão "VFT Completo com IA" + modal de contexto
      PipelinePanel.tsx      # View inline — turns, war room, relatório
      AgentTurnCard.tsx      # Card de fala de um agente (streamed)
      WarRoomTimeline.tsx    # Linha do tempo vertical da war room
      ReportView.tsx         # Relatório em markdown + ações (export, chat)
  stores/
    pipelineStore.ts         # turns[], status, reportMd, runId
  api/
    pipeline.ts              # streamPipeline(), getLatestRun()
```

**Modificação:**
- `ChatPanel.tsx` — remove `AgentSelector`, exibe `agent_name` como badge por mensagem
- `App.tsx` / `ProjectDetailView` — integra `PipelineButton` e `PipelinePanel`
- `uiStore.ts` — novo estado `pipelineView: 'idle' | 'running' | 'report'`

---

## Chat Unificado — Roteamento Automático

### RouterAgent

- Modelo: `claude-haiku-4-5`
- Input: fase atual, últimas 3 trocas do chat, mensagem do usuário
- Output: `agent_type` string (uma chamada de API não-streaming, ~200ms)

**Regras de roteamento:**

| Condição | Agente |
|---|---|
| Fase 1.x ou menção a stakeholders | `phase1_specialist` (FRAME) |
| Fase 2.x ou menção a valores/objetivos | `phase2_specialist` (AXIOM) |
| Fase 3.x ou menção a alternativas | `phase3_specialist` (NOVA) |
| Menção a documentos/fontes | `analyst` (ANALYST) |
| Default / facilitação / dúvidas gerais | `facilitator` (ARIA) |

**Override manual:** usuário digita `@ARIA`, `@FRAME`, `@AXIOM`, `@NOVA` ou `@ANALYST` para forçar um agente.

**No frontend:** cada mensagem do agente exibe o badge do agente que respondeu. Quando o agente muda em relação à mensagem anterior, aparece um separador: `"— FRAME entrou na conversa —"`.

---

## Pipeline VFT Completo

### Gatilho e pré-condições

- Botão "VFT Completo com IA" na tela principal do projeto
- Se o projeto não tiver `description` preenchida → abre modal de contexto (campos: descrição do problema, stakeholders iniciais opcionais)
- Documentos são carregados na aba Documentos antes ou durante este passo

### Fases sequenciais

Cada fase recebe como contexto os outputs de todas as fases anteriores.

```
Fase 1 — FRAME (phase1_specialist)
  Prompt: análise completa de stakeholders
  Tools:  web_search + documentos do projeto
  Output: lista de stakeholders, papéis, interesses

Fase 2 — AXIOM (phase2_specialist)  
  Prompt: hierarquia de valores e objetivos
  Contexto: output FRAME
  Tools:  web_search + documentos
  Output: árvore de valores, objetivos fundamentais vs. meios

Fase 3 — NOVA (phase3_specialist)
  Prompt: geração e avaliação de alternativas
  Contexto: outputs FRAME + AXIOM
  Tools:  web_search + documentos
  Output: alternativas, análise de trade-offs

Fase 4 — ANALYST (analyst)  [condicional — só se há documentos]
  Prompt: cross-referência documental com achados anteriores
  Contexto: outputs FRAME + AXIOM + NOVA
  Tools:  documentos do projeto
  Output: evidências, lacunas, contradições com docs
```

### Eventos SSE do pipeline

```
pipeline_start   { run_id, project_id }
agent_start      { agent, agent_name, phase_label, status }
agent_delta      { agent, text }
agent_done       { agent, phase_label }
war_room_start   {}
war_room_turn    { speaker, agent_name, text, is_delta, act }
war_room_done    {}
report_start     {}
report_delta     { text }
report_done      { run_id }
pipeline_done    {}
error            { message }
```

### Status visuais rotativos (frontend)

Durante cada agente, o status alterna a cada 4s:
`"Pesquisando..."` → `"Analisando..."` → `"Considerando..."` → `"Formulando..."`

---

## War Room

### Estrutura (3 atos)

**Ato 1 — Apresentações**
- ARIA abre a sessão
- FRAME, AXIOM, NOVA (e ANALYST se presente) apresentam seu principal achado em 1 parágrafo cada

**Ato 2 — Debate (2 rodadas)**
- ARIA formula pergunta de síntese baseada nos achados
- Cada agente responde (pode concordar, discordar, complementar)
- ARIA formula segunda pergunta focada na tensão principal identificada
- Agentes respondem novamente

**Ato 3 — Síntese**
- ARIA produz o relatório final integrando todos os achados e o debate

### Contexto passado

Cada agente na war room recebe:
- Seu próprio output da fase sequencial
- Outputs das outras fases
- Histórico completo dos turnos já ditos na war room

### Visual — WarRoomTimeline

- Linha do tempo vertical
- Card por turno: badge colorido do agente + nome + texto streamado
- Cor por agente: ARIA=indigo, FRAME=blue, AXIOM=amber, NOVA=emerald, ANALYST=purple
- Linha conectora entre cards
- Cursor piscando no card ativo

---

## Relatório Final

### Estrutura

```markdown
# Análise VFT — [Nome do Projeto]

## 1. Contexto e Problema
## 2. Stakeholders Identificados
## 3. Hierarquia de Valores e Objetivos
## 4. Alternativas Avaliadas
## 5. Evidências Documentais
## 6. Síntese da War Room
## 7. Recomendação Final
## 8. Próximos Passos VFT
```

### Apresentação inline

- Aparece na área principal do projeto após `report_done`
- Renderizado com ReactMarkdown
- Barra de ações: `Exportar PDF` | `Exportar Markdown` | `Discutir no Chat`
- Persiste em `PipelineRun.report_md` — recarrega ao abrir o projeto
- Botão "Refazer análise" para novo pipeline

### Exportação

- **PDF:** `window.print()` com `@media print` CSS dedicado (sem dependências extras)
- **Markdown:** `Blob` download do `report_md`

### "Discutir no Chat"

- Abre `ChatPanel`
- ARIA recebe o `report_md` como contexto no system prompt da sessão
- RouterAgent prioriza `facilitator` para perguntas sobre o relatório

---

## Banco de Dados — Novos Modelos

### PipelineRun

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| project_id | FK projects | |
| status | enum | idle / running / done / error |
| report_md | Text | Relatório gerado |
| created_at | DateTime | |
| completed_at | DateTime nullable | |

### PipelineTurn

| Campo | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| run_id | FK pipeline_runs | |
| agent_name | str | FRAME, AXIOM, etc. |
| phase_label | str | ex: "Fase 1 — Stakeholders" |
| turn_type | enum | analysis / war_room / report |
| content | Text | Output completo do turno |
| sequence | int | Ordem do turno |

---

## Fluxo de Dados Completo

```
User clica "VFT Completo"
  → [modal contexto se necessário]
  → POST /api/pipeline/run { project_id }
  → SSE stream abre
  
Backend PipelineOrchestrator:
  → cria PipelineRun no DB
  → emit pipeline_start
  → para cada fase:
      → emit agent_start
      → agente executa com tool-use loop
      → emit agent_delta* (tokens)
      → emit agent_done
      → salva PipelineTurn no DB
  → WarRoomOrchestrator:
      → emit war_room_start
      → ato 1: apresentações (agent_delta por turno)
      → ato 2: debate 2 rodadas
      → emit war_room_done
  → ReportGenerator (ARIA):
      → emit report_start
      → emit report_delta* (tokens)
      → emit report_done
      → salva report_md em PipelineRun
  → emit pipeline_done

Frontend pipelineStore:
  → acumula turns[]
  → quando report_done: seta reportMd, muda view para 'report'
```

---

## Separação de Documentos por Projeto

Documentos já são associados a `project_id` no modelo `Document` atual. O pipeline filtra documentos pelo `project_id` do run. Nenhuma mudança estrutural necessária — apenas garantir que o modal de "VFT Completo" linke para a aba Documentos se o projeto não tiver docs.

---

## Fora do Escopo (YAGNI)

- Pausa/retomada do pipeline
- Múltiplos pipelines simultâneos por projeto
- Edição manual do relatório inline
- Notificações push quando pipeline completa
