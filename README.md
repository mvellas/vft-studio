# VFT Studio

Ferramenta de análise de decisão baseada no framework **Value-Focused Thinking (VFT)** de Ralph Keeney. Guia facilitadores e analistas por um processo estruturado em 3 fases — do mapeamento de stakeholders à síntese de alternativas — com suporte de agentes IA especializados.

---

## Modos de uso

| Modo | Descrição |
|------|-----------|
| **VFT Completo com IA** | Pipeline automático: pesquisa, stakeholders, especialistas por fase, War Room, simulação social e relatório final em background |
| **VFT Guiado** | Processo conduzido passo a passo com a facilitadora ARIA; ideal para controle metodológico detalhado |
| **Chat IA** | Chat contínuo com ARIA e agentes especializados para suporte, revisão e iteração pós-relatório |

---

## Features

- **Pipeline automático** — executa o processo VFT completo em background com console de status narrativo; relatório consolidado ao final
- **VFT Guiado** — 33 passos estruturados em 3 fases (Decision Frame → Objectives → Alternatives)
- **Multi-agent IA** — ARIA (facilitadora), FRAME (Fase 1), AXIOM (Fase 2), NOVA (Fase 3), ANALYST (documentos), stakeholder agents
- **War Room** — análise multi-perspectiva com agentes CEO, CFO, COO, CTO, CMO em janela flutuante redimensionável
- **Simulação social** — modelagem de coalizões, trajetórias de posição, votação e convergência/conflito entre stakeholders
- **Proxy documental** — upload de PDFs/documentos; ANALYST extrai stakeholders, valores e posições com citação de fontes
- **Streaming SSE** — tokens em tempo real com indicadores de uso de ferramentas
- **Artefatos visuais** — nuvem de objetivos, hierarquia, rede meios-fins, mapa causal, timeline e grafo da War Room
- **Exportações** — Markdown, PDF editorial, HTML interativo (slides executivos), PNG em lote dos diagramas
- **Revisão pós-relatório** — botão "Solicitar mudanças à ARIA" reabre chat com contexto do relatório para iteração
- **Settings com Keychain** — API keys armazenadas no macOS Keychain via `keyring`; onboarding guiado no primeiro boot

---

## Tech Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | FastAPI + SQLAlchemy (async) + SQLite + Alembic |
| IA | Anthropic Claude (claude-sonnet-4-6 / claude-opus-4-6) via SDK `anthropic` |
| Busca | Brave Search API (opcional) |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS v4 + Zustand + Framer Motion |
| Diagramas | React Flow + Dagre |
| Desktop | pywebview (janela nativa macOS sobre FastAPI + React) |
| Gerenciadores | uv (Python), npm (Node) |

---

## Setup

### Pré-requisitos

- Python ≥ 3.12
- Node.js ≥ 18
- [uv](https://docs.astral.sh/uv/) (`pip install uv`)

### 1. Clonar e instalar

```bash
git clone https://github.com/mvellas/vft-studio.git
cd vft-studio

# Dependências Python
uv sync

# Dependências frontend
cd frontend && npm install && cd ..
```

### 2. Configurar ambiente

```bash
cp .env.example .env
```

Editar `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=BSA...       # opcional — habilita busca web nos agentes
DATABASE_URL=sqlite+aiosqlite:///./vft_studio.db
```

> As API keys também podem ser configuradas via Settings dentro do app (armazenadas no macOS Keychain).

### 3. Rodar migrações do banco

```bash
uv run alembic upgrade head
```

### 4. Iniciar

**App desktop (pywebview):**
```bash
uv run python main.py
```

**Modo desenvolvimento (hot reload):**
```bash
# Terminal 1 — backend
uv run uvicorn backend.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend && npm run dev
```

Abrir [http://localhost:5173](http://localhost:5173).

---

## Estrutura do projeto

```
vft-studio/
├── backend/
│   ├── agents/          # Agentes IA (ARIA, FRAME, AXIOM, NOVA, ANALYST, stakeholder)
│   ├── api/             # Routers FastAPI (chat, phases, projects, documents, pipeline, settings, ...)
│   ├── db/              # SQLAlchemy models + migrações Alembic
│   ├── engine/          # Engine de processamento interno
│   ├── pipeline/        # Orquestrador do pipeline automático (orchestrator, materializer, war_room, social_simulation, report)
│   ├── repositories/    # Padrão Repository — camada de acesso a dados
│   ├── schemas/         # Schemas Pydantic
│   ├── services/        # Serviços transversais
│   └── tools/           # Implementações de ferramentas (brave_search)
├── frontend/
│   └── src/
│       ├── api/         # Clientes Axios
│       ├── components/  # Componentes React (guide, layout, phase, pipeline, diagrams, documents, ...)
│       ├── hooks/       # Custom hooks (useChat, useResize)
│       ├── stores/      # Zustand stores (project, chat, ui, phaseProgress)
│       └── types/       # Interfaces TypeScript
├── tests/               # Suite pytest (backend)
├── docs/                # Documentação e ADRs
├── main.py              # Entry point desktop (pywebview)
└── alembic.ini
```

---

## Agentes IA

| Agente | Tipo | Papel |
|--------|------|-------|
| ARIA | `facilitator` | Facilitadora principal, mediadora da War Room e revisora pós-relatório |
| FRAME | `analyst` | Especialista Fase 1: stakeholders, IDF, Decision Statement |
| AXIOM | `strategist` | Especialista Fase 2: elicitação de valores, WITI, CoC, hierarquia de objetivos |
| NOVA | `analyst` | Especialista Fase 3: alternativas, atributos, matriz de consequências |
| ANALYST | `analyst` | Proxy documental: extrai valores e posições de PDFs/documentos com citação de fontes |
| Stakeholder Agents | `stakeholder` | Representam perspectivas individuais na simulação social e War Room |

Todos os agentes usam `ToolAwareAgent` com suporte a `web_search` (Brave API) e streaming SSE.

---

## Pipeline automático

O modo **VFT Completo com IA** executa um pipeline multi-fase:

1. **Preparação de contexto** — agrega dados do projeto, documentos e stakeholders
2. **Mapeamento de stakeholders** — propõe e valida atores via agentes
3. **Especialistas por fase** — FRAME (Fase 1) → AXIOM (Fase 2) → NOVA (Fase 3)
4. **War Room** — debate multi-perspectiva com CEO/CFO/COO/CTO/CMO
5. **Simulação social** — modela dinâmicas de coalizão e convergência entre stakeholders
6. **Síntese e relatório** — consolida artefatos em relatório estruturado com diagramas

---

## Testes

```bash
uv run pytest
```

Relatório de cobertura:
```bash
uv run pytest --cov=backend --cov-report=term-missing
```

---

## Packaging macOS

```bash
python build.py
```

Gera `VFT Studio.app` em `dist/` via PyInstaller.

---

## Status

**MVP v1.0 — Completo** (4/4 fases GSD executadas)

---

## License

MIT
