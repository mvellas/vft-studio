# Handoff — VFT Pipeline + War Room

**Branch:** `feat/vft-pipeline-war-room`  
**Data:** 2026-04-12  
**Autor:** mvellasquez

---

## Estado atual

Tasks 1–5 do plano concluídas. O backend tem modelos, schemas, RouterAgent e PipelineOrchestrator implementados. O frontend ainda não foi tocado.

### O que existe hoje

| Arquivo | Status |
|---|---|
| `backend/db/models.py` | PipelineRun + PipelineTurn ✅ |
| `backend/agents/router_agent.py` | RouterAgent (Haiku) ✅ |
| `backend/api/chat.py` | RouterAgent integrado + @mention override ✅ |
| `backend/schemas/pipeline.py` | Schemas Pydantic ✅ |
| `backend/pipeline/__init__.py` | ✅ |
| `backend/pipeline/orchestrator.py` | PipelineOrchestrator (4 fases sequenciais) ✅ |
| `backend/pipeline/war_room.py` | ❌ falta |
| `backend/pipeline/report.py` | ❌ falta |
| `backend/api/pipeline.py` | ❌ falta |
| Frontend completo | ❌ falta (Tasks 8–15) |

---

## Tasks pendentes (em ordem)

### Backend (Tasks 6–7)
- **Task 6:** `war_room.py` + `report.py`
- **Task 7:** `api/pipeline.py` + registrar router em `backend/app.py`

### Frontend (Tasks 8–15)
- **Task 8:** `pipelineStore.ts` + `api/pipeline.ts`
- **Task 9:** `uiStore.ts` + `ChatPanel.tsx` (remover AgentSelector)
- **Tasks 10–14:** Componentes pipeline (AgentTurnCard, WarRoomTimeline, ReportView, PipelinePanel, PipelineButton)
- **Task 15:** `AppShell.tsx` — integração final

---

## Como continuar com agentes

O plano completo está em:

```
docs/superpowers/plans/2026-04-12-vft-pipeline-war-room.md
```

Para continuar de onde parou, rode:

```
/gsd:execute-phase
```

O agente vai ler o plano, identificar as tasks pendentes (6 em diante) e executá-las com TDD task a task.

Se preferir executar uma task específica, rode:

```
/gsd:fast Implementar Task 6 do plano docs/superpowers/plans/2026-04-12-vft-pipeline-war-room.md
```

---

## Contexto arquitetural importante

- **RouterAgent** (Haiku): intercepts every `/api/chat` message, retorna `agent_type` — nunca escreve para o usuário diretamente
- **PipelineOrchestrator**: 4 fases sequenciais (FRAME, ARIA, VFT agents, synthesis) via SSE
- **WarRoomOrchestrator** (a criar): debate 3 atos entre agentes, cada turno como SSE event
- **ReportGenerator/ARIA** (a criar): recebe contexto completo do pipeline e gera relatório markdown final
- O frontend usa **Zustand + immer** para `pipelineStore` e `uiStore`
- SSE via `sse_starlette` no backend

## Stack

- Backend: FastAPI + SQLAlchemy async + SQLite + anthropic SDK
- Frontend: React 18 + TypeScript + Zustand + immer + ReactMarkdown
- Modelos: claude-haiku-4-5 (router), claude-sonnet-4-6 (pipeline agents)
