# VFT Studio

## What This Is

VFT Studio é uma aplicação macOS nativa (PyWebView + FastAPI + React + SQLite) que atua como facilitador inteligente do processo *Value-Focused Thinking* (VFT), guiado pelo framework de Vieira et al. (2024). O sistema usa agentes de IA (Claude) para representar o Facilitador (ARIA), Especialistas de Fase (FRAME, AXIOM, NOVA), Análise Documental (ANALYST) e Documentação (SCRIBE), conduzindo equipes pelas 3 fases e ~33 passos do processo VFT de forma estruturada, interativa e documentada. Roda como `.app` nativo no macOS, offline-first, com dados 100% locais.

## Core Value

O usuário completa o processo VFT completo (33 passos) com suporte de IA em cada etapa — da elicitação de valores à definição de alternativas — gerando um relatório estruturado com diagramas exportáveis.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Aplicação macOS nativa via PyWebView — `python main.py` abre janela nativa
- [ ] Backend FastAPI com SQLite (SQLAlchemy 2.0 + Alembic); dados em `~/VFTStudio/`
- [ ] Frontend React 18 + TypeScript + TailwindCSS 4 + Zustand + React Query
- [ ] Processo VFT completo: Fase 1 (7 passos), Fase 2 (18 passos), Fase 3 (8 passos)
- [ ] Phase Engine com ProcessManager: 33 StepConfigs com metadata (o que/por que/como)
- [ ] 6 agentes de IA via Anthropic API: ARIA, FRAME, AXIOM, NOVA, ANALYST, SCRIBE
- [ ] Chat com SSE streaming em qualquer tela; AgentSelector; QuickActions
- [ ] Interview-Driven Flow (RF-10): máquina de estados IDLE→BRIEFING→QUESTIONING→SYNTHESIS→COMPLETED
- [ ] Proxy Documental (RF-13): upload PDF/imagem/texto; ANALYST extrai valores com citações
- [ ] 7 diagramas automáticos (react-flow + Mermaid) exportáveis como PNG
- [ ] Graph View força-dirigido D3.js com todos os nós e relações do projeto
- [ ] Export Markdown + PDF (WeasyPrint) com diagramas embutidos
- [ ] Packaging como `.app` macOS via PyInstaller

### Out of Scope

- Multi-usuário / colaboração em tempo real — v2.0; complexity alta, não é core do VFT
- OAuth / autenticação de usuário — app single-user, local
- Cloud sync — dados locais por design (privacidade)
- Mobile / Windows / Linux — macOS first
- Integração com ferramentas externas (Notion, Obsidian) — v2.0
- Modo facilitador humano (sessões com stakeholders reais via rede) — v2.0

## Context

- **Stack:** Python 3.12+ / FastAPI / PyWebView 5.x / React 18 / TypeScript / Vite / TailwindCSS 4 / SQLite / SQLAlchemy 2.0 / Alembic / Anthropic SDK / react-flow / D3.js / WeasyPrint
- **Framework canônico:** Vieira et al. (2024), "Using value-focused thinking in an integrated process to support decisions", Pesquisa Operacional
- **Spec completo:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Mestrado/Mestrado/PSM - Problem Structuring Methods/VFT Software/`
- **Padrão de referência existente:** `fda-jam-sim` (mesmo stack PyWebView + FastAPI + React + Vite — padrão comprovado)
- **Dados locais:** `~/VFTStudio/db.sqlite`, `~/VFTStudio/documents/`, `~/VFTStudio/exports/`
- **API Key:** macOS Keychain via `keyring` library
- **Idioma:** Interface PT-BR; prompts dos agentes em Inglês

## Constraints

- **Tech Stack:** PyWebView + FastAPI + React — decisão tomada, alinhada com fda-jam-sim
- **macOS:** 13 Ventura+ (Apple Silicon + Intel); resolução mínima 1280×800
- **Offline-first:** Funciona sem internet (exceto chamadas Claude API)
- **Imutabilidade:** Dados nunca mutados in-place (frozen Pydantic, Zustand + immer)
- **Segurança:** API key no Keychain; dados nunca transmitidos a terceiros exceto Anthropic
- **Performance:** Startup <3s; primeira token streaming <2s; renderização de grafo <300ms

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| PyWebView + FastAPI (não Electron) | Sem Chromium empacotado; janela nativa macOS; padrão fda-jam-sim | — Pending |
| SQLite local (não Supabase/PostgreSQL) | Single-user, offline-first, privacidade, sem servidor | — Pending |
| claude-opus-4-6 para ARIA/AXIOM/ANALYST | Raciocínio profundo para facilitação VFT e análise documental | — Pending |
| claude-sonnet-4-6 para FRAME/NOVA/SCRIBE | Tarefas mais operacionais; melhor custo/qualidade | — Pending |
| react-flow para grafos de objetivos | Interatividade rica; dagre layout; PNG export | — Pending |
| D3.js para Graph View global | Mais flexível para force-directed; react-flow menos adequado para grafos grandes | — Pending |
| Proxy Documental por ANALYST (RF-13) | Entrevistas nem sempre possíveis; análise documental é método reconhecido em PO | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-07 after initialization*
