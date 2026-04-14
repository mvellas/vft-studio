# VFT Studio — Frontend Redesign Spec

**Data:** 2026-04-14  
**Status:** Aprovado para implementação  
**Branch:** feat/vft-pipeline-war-room

---

## 1. Identidade Visual

### Paleta — Midnight Ink

| Token | Valor | Uso |
|---|---|---|
| `ink-900` | `#07070c` | Background raiz (body) |
| `ink-800` | `#0e0e13` | Superfície principal (cards, painéis) |
| `ink-700` | `#0a0a0f` | Superfície baixa (sidebar, topbar) |
| `ink-600` | `#13131f` | Glass inner |
| `border-subtle` | `rgba(255,255,255,0.07)` | Bordas padrão |
| `border-accent` | `rgba(232,121,249,0.25)` | Bordas em foco/hover |
| `accent` | `#e879f9` | Rosa principal (CTA, ativo, progresso) |
| `accent-dim` | `rgba(232,121,249,0.12)` | Background de badges/chips com accent |
| `text-primary` | `#f8fafc` | Texto principal |
| `text-secondary` | `#94a3b8` | Texto secundário |
| `text-muted` | `#475569` | Texto desabilitado / placeholder |

### Agentes — Cores mantidas, ajustadas ao dark
| Agente | Cor |
|---|---|
| ARIA | `#e879f9` (rosa — destaque principal) |
| FRAME | `#60a5fa` (azul) |
| AXIOM | `#fbbf24` (âmbar) |
| NOVA | `#34d399` (esmeralda) |
| ANALYST | `#a78bfa` (violeta) |

### Tipografia
- **Font:** Inter (já presente no projeto)
- **Logo/headings:** `font-weight: 800`, `letter-spacing: -0.8px`
- **Body:** Regular 400/500
- **Labels uppercase:** `letter-spacing: 1px`, `font-size: 7–9px`

---

## 2. Layout Global

### Estrutura de telas
```
┌─────────┬──────────────────────────┬─────────────┐
│ Sidebar │   Main Content           │  Chat Panel │
│  48px   │   flex-1                 │  (opcional) │
│ (icons) │                          │   240–400px │
└─────────┴──────────────────────────┴─────────────┘
```

### Sidebar
- Background `ink-700`, largura colapsada **48px** (só ícones), expandida **200px**
- Logo: quadrado 28px com gradiente `#e879f9 → #a21caf`, letra "V"
- Ícones: Lucide, cor `text-muted`, ativo `accent`
- Itens: Projetos, Documentos, Guia de Uso, Configurações
- Animação colapso/expansão: **Framer Motion** `layout` + `AnimatePresence`

### Header do projeto (quando projeto ativo)
- Fundo `ink-700`, `border-bottom: border-subtle`
- Linha superior: nome do projeto (truncado) + botões de ação
  - **"✦ VFT com IA"**: border `accent-dim`, cor `accent`
  - **"◈ VFT Guiado"**: border `border-subtle`, cor `text-secondary`
  - **"Chat IA"**: toggle, ativo = `accent` preenchido
- Linha inferior: `PhaseProgress` — barra fina (2px) gradiente `#a21caf → #e879f9`

### Transições entre telas
- Framer Motion `AnimatePresence` + `motion.div` com `initial/animate/exit`
- Tipo: fade + slide-up `y: 8px → 0` com `duration: 0.2s`

---

## 3. War Room — Graph View

### Layout
```
┌──────────────────────────┬──────────────┐
│   Graph View (vis-network)│  Chat Panel  │
│   fundo: #07070c + grid  │  200–280px   │
│   animado                │  mensagens   │
└──────────────────────────┴──────────────┘
```

### Graph (vis-network)
- **Biblioteca:** `vis-network` (via `vis-data` + `vis-network`)
- **Nós:** um por agente ativo (ARIA, FRAME, AXIOM, NOVA, ANALYST quando aplicável)
  - Forma: círculo
  - Cor de fundo: `rgba(cor-do-agente, 0.2)`, borda `rgba(cor-do-agente, 0.6)`
  - Tamanho: ARIA maior (raio 28), demais 20
  - Label: nome do agente, bold, cor do agente
- **Arestas:**
  - Quando agente A fala para agente B → aresta animada A→B
  - Estilo: `dashes: true`, animação de partículas viajando (`arrows: {to: true}`)
  - Cor: cor do agente emissor com opacidade 0.5
  - Espessura: 1.5px padrão, 2.5px quando ativa
- **Background:** `#07070c` com grid SVG `rgba(232,121,249,0.03)` 24×24px
- **Physics:** layout `forceAtlas2Based` com gravidade central suave
- **Animações em tempo real:**
  - Ao receber `war_room_turn` SSE: highlight no nó do speaker (pulse ring), cria/anima a aresta para o destinatário
  - Nó falante: borda brilha com `borderWidth: 3`, anima de volta após turno terminar

### Chat lateral
- Mensagens por turno do War Room (`war_room_turn` events)
- Badge colorido por agente + nome + texto em streaming
- Scroll automático ao fundo
- Indicador de digitação (3 dots pulsando) enquanto streaming

### Atos
- Cabeçalho: `"Ato N · Rodada N"` + badge `● Ao vivo` pulsando vermelho
- Transição entre atos: animação de fade no cabeçalho, reset parcial do grafo

---

## 4. Diagramas VFT — Interativos + Exportáveis

### Tipos de diagrama (seguindo Vieira et al.)

| Diagrama | Biblioteca | Descrição |
|---|---|---|
| **IDF — Quadro Decisório** | ReactFlow | Mapa de stakeholders com relações; nós: Decisor, Stakeholders, Perspectivas |
| **Hierarquia de Objetivos** | ReactFlow (dagre layout) | Árvore top-down: Estratégico → Fundamental → Meios |
| **Rede de Meios-Fins** | ReactFlow | Grafo direcionado mostrando relações de suporte entre objetivos |
| **Atributos** | Tabela HTML customizada | Grid: objetivo fundamental × atributo (natural/construído/proxy) + escala |
| **Matriz de Consequências** | Tabela HTML customizada | Alternativas × Objetivos Fundamentais, células com valores dos atributos |

### ReactFlow — configuração padrão
- Background: `#07070c`, background pattern: `dots` com cor `rgba(255,255,255,0.05)`
- Nós customizados por tipo:
  - `estratégico`: rosa/fúcsia `accent`
  - `fundamental`: âmbar `#fbbf24`
  - `meios`: cinza `border-subtle`
  - `stakeholder`: azul `#60a5fa`
  - `alternativa`: esmeralda `#34d399`
- Arestas: `smoothstep`, cor `rgba(255,255,255,0.15)`, com seta
- Controles: minimap (desabilitado por padrão, toggle), zoom, fit-view
- Nós draggable: sim (usuário pode reorganizar layout)

### Exportação PNG
- **Biblioteca:** `html-to-image` (`toPng`)
- Botão "⬇ PNG" no toolbar de cada diagrama
- Captura o elemento `<div>` do canvas ReactFlow
- Fundo garantido: `background: #07070c` antes da captura
- Nome do arquivo: `vft-{tipo-diagrama}-{nome-projeto}-{data}.png`

### Toolbar por diagrama
```
[Título do diagrama]          [IDF] [Objetivos] [Meios-Fins] [Atributos]   [⬇ PNG]
```
- Tabs trocam o diagrama exibido sem recarregar
- Estado do ReactFlow preservado por tab (zoom, posição)

### Geração automática dos diagramas
- Ao salvar dados via API (stakeholders, objetivos, alternativas), o diagrama correspondente é regerado automaticamente
- Nós do ReactFlow são derivados dos dados do banco (stakeholders → nós IDF, objectives → nós da hierarquia, etc.)

---

## 5. Animações e Micro-interações (Framer Motion)

### Globais
- **Page transitions:** `AnimatePresence` em todas as trocas de `currentView`
- **Cards de projeto:** `whileHover={{ y: -2, boxShadow: "..." }}`, spring `stiffness: 300`
- **Modais:** scale `0.95 → 1` + fade, `duration: 0.15s`
- **Sidebar colapso:** `motion.div layout` para reflow suave

### Pipeline / War Room
- **AgentTurnCard:** entra com `initial: { opacity: 0, x: -12 }`, sai com `exit: { opacity: 0 }`
- **Progress bar:** `motion.div` com `animate={{ width: "XX%" }}`, spring suave
- **Badge "● Ao vivo":** `animate={{ opacity: [1, 0.3, 1] }}`, `repeat: Infinity`, `duration: 1.2s`
- **Step tracker:** check mark aparece com scale `0 → 1`, spring bounce

### Diagramas
- Nós ReactFlow entram com fade + scale ao serem adicionados
- Ao gerar diagrama automático: nós animam posição com spring (ReactFlow layout animation)

---

## 6. Componentes Novos / Modificados

### Novos
| Componente | Local | Responsabilidade |
|---|---|---|
| `WarRoomGraph` | `components/pipeline/WarRoomGraph.tsx` | vis-network wrapper + lógica de animação por turno |
| `VftDiagramView` | `components/diagrams/VftDiagramView.tsx` | Container com tabs + toolbar + export |
| `IdfDiagram` | `components/diagrams/IdfDiagram.tsx` | ReactFlow: stakeholders e quadro decisório |
| `ObjectivesHierarchy` | `components/diagrams/ObjectivesHierarchy.tsx` | ReactFlow: árvore de objetivos (substitui o componente atual) |
| `MeansEndsNetwork` | `components/diagrams/MeansEndsNetwork.tsx` | ReactFlow: rede de meios-fins (substitui o atual) |
| `ConsequencesMatrix` | `components/diagrams/ConsequencesMatrix.tsx` | Tabela interativa sortável |
| `AttributesTable` | `components/diagrams/AttributesTable.tsx` | Grid de atributos por objetivo |

### Modificados
| Componente | Mudança |
|---|---|
| `AppShell` | Novo tema dark + Framer Motion nas transições |
| `Sidebar` | Visual Midnight Ink + animação colapso |
| `PipelinePanel` | Incorpora `WarRoomGraph` ao lado do chat |
| `WarRoomTimeline` | Mantida como alternativa de visualização (toggle com Graph) |
| `ProjectCard` | Novo visual dark + animações hover |
| `ProjectList` | Novo visual dark |
| `ChatPanel` | Novo visual dark com cores dos agentes |
| `PhaseProgress` | Barra gradiente rosa |

---

## 7. Dependências Novas

```json
{
  "framer-motion": "^11.x",
  "vis-network": "^9.x",
  "vis-data": "^7.x",
  "@xyflow/react": "^12.x",
  "html-to-image": "^1.x"
}
```

**Notas:**
- `@xyflow/react` é o novo pacote do ReactFlow (v12+, suporte React 18+)
- `vis-network` requer wrapper funcional para React (sem hook oficial)
- `framer-motion` pode coexistir com Tailwind sem conflito

---

## 8. Fora de Escopo

- Redesign do backend
- Novos endpoints de API (os diagramas consomem dados já existentes)
- Modo mobile (responsividade básica mantida, foco em desktop)
- Tema claro (o design é exclusivamente dark)
- Internacionalização

---

## 9. Ordem de Implementação Sugerida

1. **Fase A — Tema global** (tokens CSS, AppShell, Sidebar, ProjectList/Card)
2. **Fase B — Animações** (Framer Motion: transições, modais, cards)
3. **Fase C — War Room Graph** (vis-network no PipelinePanel)
4. **Fase D — Diagramas VFT** (ReactFlow: IDF, Hierarquia, Meios-Fins + exportação PNG)
5. **Fase E — Polimento** (micro-interações restantes, testes visuais)
