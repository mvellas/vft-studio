# VFT Studio — UI Specification

**Versão:** 0.1.0-spec | **Data:** 2026-04-07

---

## 1. Design Philosophy

- **Foco no processo, não na ferramenta:** UI deve ser quase invisível; o conteúdo VFT é o protagonista
- **Clareza contextual:** Usuário sempre sabe em qual fase/passo está e o que fazer
- **Progressão visual:** Cada passo completado dá sensação de avanço concreto
- **Densidade inteligente:** Formulários complexos em steps; não tudo de uma vez
- **macOS-first:** Segue Human Interface Guidelines; Dark Mode nativo; atalhos ⌘

---

## 2. Design Tokens

### Cores (CSS Custom Properties)

```css
:root {
  /* Marca */
  --color-brand-primary: #4F6AF6;     /* Azul profundo — decisão/confiança */
  --color-brand-secondary: #7C3AED;   /* Roxo — IA/inteligência */
  --color-brand-accent: #059669;      /* Verde — progresso/completude */

  /* Semânticas (modo claro) */
  --color-bg-app: #F8F9FA;
  --color-bg-surface: #FFFFFF;
  --color-bg-surface-2: #F1F3F5;
  --color-bg-sidebar: #1E1E2E;
  --color-text-primary: #1A1B2E;
  --color-text-secondary: #6B7280;
  --color-text-muted: #9CA3AF;
  --color-border: #E5E7EB;
  --color-border-focus: #4F6AF6;

  /* Objetivos por tipo */
  --color-obj-strategic: #F59E0B;     /* Âmbar — estratégico */
  --color-obj-fundamental: #4F6AF6;  /* Azul — fundamental */
  --color-obj-means: #8B5CF6;        /* Roxo — meios */
  --color-obj-other: #6B7280;        /* Cinza — outro */

  /* Fases */
  --color-phase-1: #3B82F6;          /* Azul */
  --color-phase-2: #8B5CF6;          /* Roxo */
  --color-phase-3: #10B981;          /* Verde */

  /* Status */
  --color-success: #059669;
  --color-warning: #D97706;
  --color-error: #DC2626;
  --color-info: #0284C7;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-app: #0F0F1A;
    --color-bg-surface: #1A1B2E;
    --color-bg-surface-2: #252640;
    --color-bg-sidebar: #0A0A14;
    --color-text-primary: #E8E9F0;
    --color-text-secondary: #A0A3B1;
    --color-text-muted: #6B6E80;
    --color-border: #2E3044;
    --color-border-focus: #4F6AF6;
  }
}
```

### Tipografia

```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'SF Mono', Consolas, monospace;

  /* Scale */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */

  /* Weight */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;
}
```

### Espaçamento (escala 4px base)

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Border Radius

```css
:root {
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;
}
```

### Sombras

```css
:root {
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
  --shadow-chat: 0 -4px 24px rgba(0,0,0,0.08);
}
```

---

## 3. Layout Principal (AppShell)

```
┌─────────────────────────────────────────────────────────────────────┐
│  macOS Title Bar (PyWebView nativo)                                  │
├──────────┬──────────────────────────────────────┬───────────────────┤
│          │                                      │                   │
│ SIDEBAR  │         MAIN CONTENT AREA            │   CHAT PANEL      │
│  240px   │         flex-1 (min 640px)           │   320-480px       │
│          │                                      │   (colapsável)    │
│ Logo     │  ┌──────────────────────────────┐   │                   │
│          │  │  Phase Progress Bar          │   │  ┌─────────────┐  │
│ Projects │  └──────────────────────────────┘   │  │ Agent Sel.  │  │
│  list    │                                      │  └─────────────┘  │
│          │  ┌──────────────────────────────┐   │                   │
│ ─────── │  │  Step Guide Card            │   │  [Messages]       │
│          │  │  O QUE / POR QUÊ / COMO     │   │                   │
│ Current  │  └──────────────────────────────┘   │  ┌─────────────┐  │
│ Project  │                                      │  │  Input Box  │  │
│ nav:     │  ┌──────────────────────────────┐   │  └─────────────┘  │
│ • IDF    │  │                              │   │                   │
│ • Obj.   │  │    STEP FORM / CONTENT       │   │                   │
│ • Alts   │  │                              │   │                   │
│ • Export │  │                              │   │                   │
│          │  └──────────────────────────────┘   │                   │
│ Settings │                                      │                   │
│          │  [← Passo Anterior] [Próximo →]     │                   │
└──────────┴──────────────────────────────────────┴───────────────────┘
```

---

## 4. Telas e Fluxo

### 4.1 Tela Inicial — Project List

```
┌──────────────────────────────────────────────────────┐
│  VFT Studio                               [+ Novo]   │
│                                                      │
│  Projetos Recentes                                   │
│  ┌────────────────────────────────────────────────┐ │
│  │ 🔵 Seleção de Drones — Fase 2, Passo 2.11      │ │
│  │    Última edição: 05/04/2026         [Abrir →] │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │ ✅ Torre de Controle FAB — Concluído            │ │
│  │    Última edição: 01/04/2026  [Abrir] [Export] │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  Todos os Projetos  [busca]                          │
└──────────────────────────────────────────────────────┘
```

### 4.2 New Project Wizard (Modal)

```
Passo 1/3: Identificação
─────────────────────────
Nome do Projeto: [____________]
Descrição: [____________________]
Notas sobre o contexto: [textarea]

Passo 2/3: Configuração de Stakeholders
────────────────────────────────────────
Quantos decision-makers estão envolvidos?
  ○ Apenas 1  ● 2 ou mais

Há outros stakeholders além dos DMs?
  ● Sim  ○ Não

→ Sistema seleciona variante: "Multiple DMs / Multiple Stakeholders"

Passo 3/3: Técnica de Modelagem de Valor
─────────────────────────────────────────
○ Platinum Standard (entrevistas diretas com DMs sênior)
● Gold Standard (documentos organizacionais)
○ Silver Standard (representantes dos stakeholders)
○ Combined Standard (combinação de técnicas)

[tooltip: explicação de cada técnica com referência Vieira et al. 2024]

[Criar Projeto]
```

### 4.3 Step Guide Card

Presente em todo passo do wizard:

```
┌──────────────────────────────────────────────────────────┐
│  📍 Passo 2.14 — Mapear Relações Causais (WITI Test)     │
│  Fase 2: Definir Objetivos de Decisão                    │
├──────────────────────────────────────────────────────────┤
│  O QUÊ                                                   │
│  Identificar relações de causalidade entre objetivos     │
│  para diferenciar objetivos de meios de objetivos        │
│  fundamentais.                                           │
├──────────────────────────────────────────────────────────┤
│  POR QUÊ                                                 │
│  Keeney (1992) argumenta que as relações causais entre   │
│  objetivos são essenciais para construir a rede          │
│  meios-fins e identificar objetivos fundamentais.        │
│  [Vieira et al. 2024, Seção 3.3.14]                     │
├──────────────────────────────────────────────────────────┤
│  COMO                                                    │
│  Para cada objetivo na lista, aplique o WITI Test:       │
│  pergunte "Por que este objetivo é importante no         │
│  contexto da decisão?" e classifique a resposta.         │
├──────────────────────────────────────────────────────────┤
│  💡 Dica do Facilitador (ARIA)                           │
│  "Objetivos que são importantes porque influenciam       │
│  outros são objetivos de MEIOS. Os que são razões        │
│  fundamentais de interesse são CANDIDATOS A              │
│  FUNDAMENTAIS."                                          │
└──────────────────────────────────────────────────────────┘
```

### 4.4 Phase Progress Bar

```
Fase 1 ●●●●●●● 7/7  ✅ | Fase 2 ●●●●●●●●●●●○○○○○○○ 11/18 🔵 | Fase 3 ○○○○○○○○ 0/8
                                                              ▲ você está aqui
```

### 4.5 Stakeholder Mapper (Passo 1.1)

```
Stakeholders Identificados
─────────────────────────
┌─────────────────────────────────────────────────────────┐
│ 👤 Gustavo Barbi                                        │
│    Decision Authority · É DM                            │
│    "Preocupado com custo e prazo..."                    │
│    [Editar] [Entrevistar com IA] [Remover]             │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ 👤 Amanda Simões                                        │
│    Customer · Não é DM                                  │
│    "Necessita de plataformas de aprendizado..."         │
│    [Editar] [Entrevistar com IA] [Remover]             │
└─────────────────────────────────────────────────────────┘
[+ Adicionar Stakeholder]

Tipos de Stakeholder (Parnell et al., 2013a):
  Decision Authority | Customer | Owner | User | Consumer
```

### 4.6 VFT Devices Interview Mode (Passo 2.6)

```
Entrevistando: Amanda Simões (Customer)
Técnica: VFT Devices (Keeney, 1992)
Progresso: Dispositivo 3 de 10

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Dispositivo 3: Problemas e Deficiências

"Quais são os principais problemas com que você está lidando agora?
 Quais são as principais deficiências que enfrenta neste contexto?"

[ARIA responde como Amanda Simões — streaming...]
─────────────────────────────────────────────────
👤 Amanda:
"Minha principal dificuldade é que os sistemas atuais de controle 
de tráfego aéreo são muito dependentes de conectividade e quando 
há falhas de comunicação..."

[Salvar resposta] [← Anterior] [Próximo →]
[💬 Pedir clarificação] [📌 Marcar como objetivo]
```

### 4.7 WITI Test Interface (Passo 2.14)

```
WITI Test — Mapear Relações Causais
────────────────────────────────────
Objetivos para classificar: 12 pendentes | 3 classificados

┌──────────────────────────────────────────────────────┐
│ Objetivo: "Minimize service costs"                   │
│ Tipo atual: não classificado                         │
│                                                      │
│ ❓ WITI Test:                                        │
│ "Por que 'Minimize service costs' é importante no   │
│  contexto desta decisão?"                            │
│                                                      │
│ [_______________________________________________]    │
│ [Sua resposta aqui...]                              │
│                                                      │
│ [Analisar com IA]                                   │
└──────────────────────────────────────────────────────┘

✅ AXIOM analisou: OBJETIVO DE MEIOS
"Minimize service costs é importante porque permite 
 Maximize system availability (influência financeira).
 → Classificado como: MEIOS → influencia 'Maximize system availability'"

[Confirmar] [Discordar e revisar]
```

### 4.8 Means-Ends Network (Passo 2.16) — react-flow

```
┌─────────────────────────────────────────────────────────┐
│  Rede Meios-Fins                    [🔍 zoom] [Export]  │
│                                                         │
│  ┌──────────┐                                          │
│  │Minimize  │──┐                                       │
│  │service   │  │                                       │
│  │costs     │  ↓                                       │
│  └──────────┘  ┌────────────────────┐                 │
│                 │Maximize system     │──→ [FUNDAMENTAL]│
│  ┌──────────┐  │availability        │    ┌──────────┐  │
│  │Maximize  │──→│                   │    │Promote   │  │
│  │compat.   │  └────────────────────┘    │excellence│  │
│  └──────────┘                            │in ATM... │  │
│                                          └──────────┘  │
│  Legenda: ○ Meios  ● Fundamental  ◆ Estratégico       │
└─────────────────────────────────────────────────────────┘
```

### 4.9 Chat Panel

```
┌─────────────────────────────────────┐
│  💬 ARIA — Facilitador    [─] [×]   │
│                                     │
│  Falando com: [ARIA ▾]              │
│  ○ ARIA (Facilitador)               │
│  ○ AXIOM (Especialista Fase 2)      │
│  ○ Amanda Simões (Stakeholder)      │
│  ○ Gustavo Barbi (Stakeholder)      │
│  ○ Brainstorming Livre              │
│                                     │
│  ──────────────────────────────     │
│  🤖 ARIA · 14:32                    │
│  Você está no Passo 2.14 —          │
│  WITI Test. Recomendo aplicar       │
│  primeiro nos objetivos que         │
│  Amanda Simões identificou...       │
│                                     │
│  👤 Você · 14:33                    │
│  O objetivo "Minimize service       │
│  costs" parece ser de meios mas     │
│  não tenho certeza                  │
│                                     │
│  🤖 ARIA · 14:33                    │
│  ▌ [streaming...]                   │
│                                     │
│  ──────────────────────────────     │
│  [Digite sua mensagem...]    [→]    │
└─────────────────────────────────────┘
```

---

## 5. Componentes — Inventário

### Primitivos (ui/)

| Componente | Descrição | Props Chave |
|-----------|-----------|-------------|
| `Button` | Botão primário/secundário/ghost/danger | variant, size, loading, disabled |
| `Card` | Container com borda e sombra | padding, hover, selected |
| `Badge` | Label colorido para tipo de objetivo | variant (strategic/fundamental/means/other) |
| `Input` | Campo de texto single-line | label, error, hint, prefix/suffix |
| `Textarea` | Campo de texto multi-line | label, error, autoResize, minRows |
| `Select` | Dropdown de seleção | options, searchable, multi |
| `Modal` | Dialog centrado com overlay | title, size, onClose |
| `Tooltip` | Hover tooltip com referência | content, placement |
| `MarkdownRenderer` | Renderiza Markdown com estilos | content, compact |
| `ProgressBar` | Barra de progresso linear | value, max, color |
| `Spinner` | Loading indicator | size, color |
| `Divider` | Separador horizontal/vertical | label |
| `StepBadge` | Badge com número do passo | step, phase, completed |

### Compostos

| Componente | Descrição |
|-----------|-----------|
| `StepGuide` | Card O QUÊ/POR QUÊ/COMO/DICA para cada passo |
| `ObjectiveCard` | Card de objetivo com tipo badge, actions, WITI status |
| `StakeholderCard` | Card de stakeholder com role badge e ações |
| `AlternativeCard` | Card de alternativa com fonte e status |
| `PhaseProgress` | Barra de progresso com 3 fases e passos |
| `AgentBubble` | Mensagem de chat com avatar do agente |
| `QuickActionBar` | Botões de ação rápida em mensagem do chat |
| `NetworkGraph` | Wrapper react-flow para Means-Ends Network |
| `ObjectiveTree` | Hierarquia de objetivos fundamentais interativa |
| `WITITestModal` | Modal de aplicação do WITI Test |
| `CoCModal` | Modal de Control of Consequences |
| `AttributeForm` | Formulário de definição de atributo |
| `ConsequencesMatrix` | Tabela alternativas × atributos |

---

## 6. Atalhos de Teclado (macOS)

| Atalho | Ação |
|--------|------|
| `⌘N` | Novo projeto |
| `⌘O` | Abrir projeto |
| `⌘S` | Salvar (explícito; auto-save sempre ativo) |
| `⌘E` | Export |
| `⌘⇧C` | Abrir/fechar Chat Panel |
| `⌘→` | Próximo passo |
| `⌘←` | Passo anterior |
| `⌘1` | Ir para Fase 1 |
| `⌘2` | Ir para Fase 2 |
| `⌘3` | Ir para Fase 3 |
| `⌘K` | Command palette (busca rápida) |
| `Esc` | Fechar modal |
| `⌘Z` / `⌘⇧Z` | Desfazer / Refazer |

---

## 7. Estados de Loading e Erro

### Loading States

- **Streaming de IA:** Cursor piscando + texto aparecendo gradualmente (SSE)
- **Carregamento de projeto:** Skeleton loader nos cards
- **Processamento WITI:** Spinner no botão "Analisar com IA"
- **Export:** Progress bar com mensagem "Gerando relatório..."

### Error States

- **API Key inválida:** Banner persistente no topo com link para Settings
- **Sem conexão com Claude:** Toast error + modo "somente visualização" ativado
- **Passo incompleto:** Inline validation com campos destacados em vermelho
- **Projeto corrompido:** Modal com opção de recuperar do backup

---

## 8. Responsividade

O app tem largura mínima de 1280px (macOS). Comportamentos adaptativos:

- **< 1440px:** Chat Panel colapsado por padrão; ativado por botão
- **≥ 1440px:** Chat Panel visível por padrão na direita
- **Fullscreen:** Main content expande; sidebar e chat permanecem fixos

---

## 9. Animações

```css
/* Transições suaves e não-distrativas */
--transition-fast: 150ms ease;
--transition-base: 250ms ease;
--transition-slow: 400ms ease;

/* Entrada de mensagem de chat */
@keyframes slideInUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Nó de grafo ao aparecer */
@keyframes nodeAppear {
  from { opacity: 0; scale: 0.8; }
  to   { opacity: 1; scale: 1; }
}
```
