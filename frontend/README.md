# VFT Studio — Frontend

React 18 + TypeScript + Vite + Tailwind CSS v4. Interface do VFT Studio: análise de decisão com suporte de agentes IA.

---

## Stack

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18 | Framework de UI |
| TypeScript | 5 | Tipagem estática |
| Vite | 6 | Build e dev server |
| Tailwind CSS | v4 (via `@tailwindcss/vite`) | Estilo — sem postcss.config nem tailwind.config |
| Zustand | — | Estado global (projeto, chat, UI, progresso de fases) |
| Framer Motion | — | Transições de página e animações |
| React Flow + Dagre | — | Diagramas interativos (hierarquia, rede meios-fins, mapa causal) |
| Axios | — | Cliente HTTP para a API FastAPI |

---

## Estrutura

```
src/
├── api/             # Clientes Axios por domínio (projects, chat, phases, pipeline, ...)
├── components/
│   ├── diagrams/    # Diagramas react-flow (WarRoomGraph, WarRoomTimeline, ObjectivesCloud, ...)
│   ├── documents/   # DocumentPanel — upload e análise documental
│   ├── guide/       # GuideView — guia de uso completo do app
│   ├── layout/      # AppShell, Sidebar, ChatPanel, BrandLogo, AppIntroSplash
│   ├── phase/       # StepGuide, StepTool — modo VFT Guiado (passos 1-33)
│   ├── phase1/      # Componentes específicos da Fase 1 (stakeholders, IDF, Decision Frame)
│   ├── phase2/      # Componentes específicos da Fase 2 (objetivos, WITI, CoC, atributos)
│   ├── phase3/      # Phase3View — alternativas e matriz de consequências
│   ├── pipeline/    # PipelineButton, PipelinePanel, PipelineStageScene, ReportView, ...
│   └── project/     # ProjectList, SettingsView, OnboardingFlow
├── hooks/           # useChat, useResize
├── lib/             # Utilitários
├── pages/           # (sem router; navegação via Zustand uiStore)
├── stores/          # projectStore, chatStore, uiStore, phaseProgressStore
└── types/           # Interfaces TypeScript
```

---

## Views principais

| View (uiStore) | Componente | Descrição |
|----------------|------------|-----------|
| `project-list` | `ProjectList` | Lista e criação de projetos |
| `project-detail` | `ProjectDetailView` | Modo guiado (StepTool) ou Fase 3 (Phase3View) |
| `guide` | `GuideView` | Guia de uso completo |
| `documents` | `DocumentPanel` | Upload e análise de documentos |
| `settings` | `SettingsView` | Configuração de API keys e preferências |

O `AppShell` envolve todas as views e contém a `Sidebar` (navegação) e o `ChatPanel` (chat lateral com agentes IA).

---

## Modo Pipeline (VFT Completo com IA)

`PipelineButton` → inicia pipeline via `POST /api/pipeline/start`  
`PipelinePanel` → mostra status SSE do progresso narrativo  
`PipelineStageScene` → console visual de cada etapa (War Room, simulação social, etc.)  
`ReportView` → exibe o relatório consolidado com artefatos interativos e opções de exportação  
`SocialSimulationArtifacts` → coalizões, votos, trajetórias e resumo executivo  
`ArtifactExportSurface` → exportação em lote dos diagramas como PNG  
`reportExport.ts` → geração de PDF editorial e HTML interativo (slides executivos)

---

## Diagramas interativos

| Componente | Conteúdo |
|------------|----------|
| `ObjectivesCloud` | Nuvem de objetivos por saliência |
| `InteractiveArtifacts` | Hierarquia, rede meios-fins e mapa causal (React Flow) |
| `WarRoomGraph` | Grafo de relações da War Room |
| `WarRoomTimeline` | Timeline narrativa da War Room |
| `SocialSimulationArtifacts` | Coalizões, votos, convergência e sumário executivo |

---

## Dev

```bash
npm install
npm run dev       # http://localhost:5173 (proxy → backend :8000)
npm run build     # gera frontend/dist/ para o pywebview
npm run typecheck # tsc --noEmit
```

> `react-router-dom` **não está no package.json**. Navegação é feita via `uiStore.setView()`.  
> Tailwind v4: sem `postcss.config.js` nem `tailwind.config.js` — configurado direto no `vite.config.ts`.
