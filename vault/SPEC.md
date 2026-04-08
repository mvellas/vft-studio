# VFT Studio — Master Specification

**Versão:** 0.3.0-spec  
**Data:** 2026-04-07  
**Status:** AGUARDANDO APROVAÇÃO  
**Autor:** Elaborado com base em Vieira et al. (2024)  
**Changelog v0.3:** +RF-13 Proxy de Stakeholder por Documentos · +Agente ANALYST · +tabela stakeholder_documents

---

## Visão do Produto

**VFT Studio** é um software nativo para macOS que atua como um facilitador inteligente do processo de *Value-Focused Thinking* (VFT), guiado pelo framework de Vieira et al. (2024). O sistema utiliza agentes de IA para representar o **Facilitador**, **Especialistas de Fase** e **Stakeholders Simulados**, conduzindo equipes de tomada de decisão pelas 3 fases e ~33 passos do processo VFT de forma estruturada, interativa e documentada.

### Proposta de Valor

| Para quem | Problema atual | Solução |
|-----------|---------------|---------|
| Analistas de decisão | VFT é rico mas disperso na literatura; difícil operacionalizar | Processo guiado passo-a-passo com IA facilitando |
| Decision-makers | Dificuldade em articular valores e objetivos | Agentes de IA elicitam valores com perguntas calibradas |
| Equipes com múltiplos stakeholders | Gestão manual de perspectivas divergentes | Stakeholders simulados por IA; consolidação automática |
| Pesquisadores e estudantes | Curva de aprendizado do VFT | Facilitador explica cada conceito contextualmente |

---

## Documentos de Spec

| Arquivo | Conteúdo |
|---------|---------|
| `SPEC.md` | Este arquivo — visão geral e índice |
| `REQUIREMENTS.md` | Requisitos funcionais e não-funcionais |
| `SYSTEM-DESIGN.md` | Arquitetura, componentes, fluxo de dados |
| `AGENTS-SPEC.md` | Especificação dos agentes de IA |
| `DATA-MODEL.md` | Schema do banco de dados SQLite |
| `UI-SPEC.md` | Design system, componentes, fluxo de telas |
| `TASKS.md` | Breakdown de tarefas para implementação |

---

## Stack Tecnológico (Decisão)

### Runtime Principal

```
Python 3.12+  ←→  PyWebView 5.x  →  Janela Mac nativa (.app)
     ↕
FastAPI (servidor HTTP local, porta dinâmica)
     ↕
React 18 + TypeScript + Vite + TailwindCSS (UI)
     ↕
SQLite via SQLAlchemy 2.0 (persistência local)
     ↕
Anthropic Python SDK (Claude claude-opus-4-6 / claude-sonnet-4-6)
```

### Justificativa da Stack

- **PyWebView:** Produz `.app` nativo no macOS sem Electron; sem Chromium empacotado; window nativa com menu bar; padrão já usado pelo usuário em `fda-jam-sim`
- **FastAPI:** Async, tipado, fácil integração com Anthropic SDK; SSE nativo para streaming
- **React + Tailwind:** UI rica, componentes reutilizáveis, Markdown rendering
- **SQLite:** Sem servidor, arquivo local, perfeito para single-user
- **Claude claude-opus-4-6 para agentes:** Raciocínio profundo para facilitação e simulação de stakeholders; claude-sonnet-4-6 para tarefas secundárias

### Dependências Chave

```
# Python
anthropic>=0.40.0
fastapi>=0.115.0
uvicorn[standard]>=0.32.0
pywebview>=5.3.0
sqlalchemy>=2.0.0
alembic>=1.14.0
pydantic>=2.10.0
python-dotenv>=1.0.0
markdown>=3.7.0
weasyprint>=62.0  # PDF export

# JS/Node (build only)
react@18, typescript@5, vite@6, tailwindcss@4
@anthropic-ai/sdk  # optional, não usado diretamente
react-flow@12  # visualização de grafos (Means-Ends Network)
react-markdown, remark-gfm
```

---

## Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────┐
│                    macOS Window                      │
│  ┌─────────────────────────────────────────────┐    │
│  │            React SPA (PyWebView)            │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │    │
│  │  │  Project │ │  Phase   │ │    Chat    │  │    │
│  │  │  Manager │ │  Wizard  │ │  Interface │  │    │
│  │  └──────────┘ └──────────┘ └────────────┘  │    │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │    │
│  │  │Objectives│ │  Network │ │  Reports   │  │    │
│  │  │  Editor  │ │   View   │ │  Export    │  │    │
│  │  └──────────┘ └──────────┘ └────────────┘  │    │
│  └─────────────────────────────────────────────┘    │
│                        ↕ REST + SSE                  │
│  ┌─────────────────────────────────────────────┐    │
│  │           FastAPI Backend (local)           │    │
│  │  ┌────────────┐  ┌────────────────────────┐ │    │
│  │  │   Agent    │  │    VFT Process Engine  │ │    │
│  │  │Orchestrator│  │  (Phase/Step Manager)  │ │    │
│  │  └────────────┘  └────────────────────────┘ │    │
│  │  ┌────────────┐  ┌────────────────────────┐ │    │
│  │  │  Anthropic │  │  Document Generator    │ │    │
│  │  │    SDK     │  │  (Markdown/PDF)        │ │    │
│  │  └────────────┘  └────────────────────────┘ │    │
│  └─────────────────────────────────────────────┘    │
│                        ↕ SQLAlchemy                  │
│  ┌─────────────────────────────────────────────┐    │
│  │         SQLite (~/VFTStudio/db.sqlite)      │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Fases do Produto (Roadmap)

### v1.0 — Core VFT Workflow + Interview + Diagrams + Graph View (Este Spec)
- Projeto completo VFT: Fases 1, 2, 3 (33 passos)
- Facilitador AI (ARIA) + 3 Especialistas de Fase + Agentes Stakeholder + ANALYST + SCRIBE
- **Interview-Driven Flow:** IA conduz entrevistas estruturadas para TODOS os passos de elicitação; máquina de estados pergunta→resposta→análise→síntese
- **Proxy Documental (RF-13):** Quando entrevista não é possível, o usuário submete documentos/imagens/textos; agente ANALYST extrai valores com citações-evidência; transcript virtual revisável
- **Stakeholders simulados por IA** (até 5 por projeto) com perfis para simulação realista
- Chat contextual em qualquer passo + Quick Actions
- **7 diagramas gerados automaticamente** (Means-Ends Network, Hierarchy, Causal Map, Decision Frame Card, Stakeholder Map, Process Flowchart, Decision Frame Conceitual) exportados como PNG e embutidos no relatório
- **Graph View força-dirigido** (D3.js) — visão unificada de todas as entidades e relações do projeto, com filtros, busca, mini-map e evolução temporal (estilo Obsidian)
- Export Markdown + PDF com imagens reais dos diagramas
- Roda como `.app` no macOS

### v1.1 — Visualizações Avançadas
- Means-Ends Network interativo (react-flow)
- Fundamental Objectives Hierarchy como árvore interativa
- Causal Relations Map

### v2.0 — Multi-usuário e Colaboração
- Sessões reais com múltiplos usuários
- Modo facilitador humano + stakeholders reais via chat
- Integração com ferramentas externas (Notion, Obsidian)

---

## Constraints Globais

1. **Offline-first:** Funciona sem internet (exceto chamadas à API Claude)
2. **API Key local:** ANTHROPIC_API_KEY em `.env` local; nunca transmitida externamente
3. **Dados locais:** Tudo em `~/VFTStudio/` — sem cloud sync automático
4. **macOS 13+ (Ventura):** Target mínimo
5. **Imutabilidade:** Dados nunca mutados in-place; sempre novos objetos/registros
6. **Idioma:** Interface em Português BR; prompts dos agentes em Inglês (melhor performance)
7. **Framework canônico:** Vieira et al. (2024) é a referência para todo o conteúdo de processo
