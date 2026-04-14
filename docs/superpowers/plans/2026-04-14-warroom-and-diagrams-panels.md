# WarRoom Float/Popout + Diagrams Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a draggable floating WarRoomGraph card (with popout window via BroadcastChannel) and a Diagrams sidebar panel (Hierarquia / Rede Meios-Fins / Mapa Causal) accessible from the AppShell header.

**Architecture:** `uiStore` gains `rightPanel` (replaces `chatPanelOpen`) and `warRoomFloatOpen`. `pipelineStore` broadcasts turns via `BroadcastChannel`. `WarRoomFloat` is a fixed-position draggable card; `/warroom` is a standalone page receiving data via the channel. `DiagramsPanel` is a new right-panel component with three ReactFlow tabs.

**Tech Stack:** React 18, TypeScript, Zustand + immer, @xyflow/react, Framer Motion, Tailwind v4, Vite (no router — uses hash routing or direct window.open with query params), lucide-react.

---

## File Map

| Action | File |
|--------|------|
| Modify | `frontend/src/stores/uiStore.ts` |
| Modify | `frontend/src/stores/pipelineStore.ts` |
| Create | `frontend/src/components/pipeline/WarRoomFloat.tsx` |
| Create | `frontend/src/pages/WarRoomWindow.tsx` |
| Modify | `frontend/src/components/pipeline/WarRoomTimeline.tsx` |
| Modify | `frontend/src/components/layout/AppShell.tsx` |
| Modify | `frontend/src/components/layout/ChatPanel.tsx` |
| Modify | `frontend/src/components/phase/StepGuide.tsx` |
| Modify | `frontend/src/components/phase/StepTool.tsx` |
| Modify | `frontend/src/components/pipeline/PipelinePanel.tsx` |
| Modify | `frontend/src/App.tsx` |
| Create | `frontend/src/components/diagrams/DiagramsPanel.tsx` |
| Modify | `frontend/src/components/phase2/CausalRelationsMap.tsx` |

---

## Task 1: Migrate uiStore — replace chatPanelOpen with rightPanel

**Files:**
- Modify: `frontend/src/stores/uiStore.ts`

- [ ] **Step 1: Replace the store**

Replace the entire contents of `frontend/src/stores/uiStore.ts` with:

```ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type View = 'project-list' | 'project-detail' | 'settings' | 'documents' | 'guide'
export type RightPanel = 'none' | 'chat' | 'diagrams'

interface UiState {
  currentView: View
  rightPanel: RightPanel
  sidebarCollapsed: boolean
  pipelineView: 'idle' | 'running' | 'report'
  warRoomFloatOpen: boolean
  // computed compat getter
  chatPanelOpen: boolean
  setView: (view: View) => void
  toggleSidebar: () => void
  setRightPanel: (panel: RightPanel) => void
  // compat shim — callers that do setChatPanelOpen(true) open chat; false closes panel
  setChatPanelOpen: (open: boolean) => void
  setPipelineView: (v: 'idle' | 'running' | 'report') => void
  setWarRoomFloatOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    currentView: 'project-list' as View,
    rightPanel: 'none' as RightPanel,
    sidebarCollapsed: false,
    pipelineView: 'idle' as const,
    warRoomFloatOpen: false,

    get chatPanelOpen() {
      return (this as UiState).rightPanel === 'chat'
    },

    setView: (view) => set((state) => { state.currentView = view }),
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed }),
    setRightPanel: (panel) => set((state) => { state.rightPanel = panel }),
    setChatPanelOpen: (open) => set((state) => {
      state.rightPanel = open ? 'chat' : 'none'
    }),
    setPipelineView: (v) => set((state) => { state.pipelineView = v }),
    setWarRoomFloatOpen: (open) => set((state) => { state.warRoomFloatOpen = open }),
  }))
)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors (or only errors in files we'll fix in later tasks).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/uiStore.ts
git commit -m "refactor(uiStore): replace chatPanelOpen with rightPanel + warRoomFloatOpen"
```

---

## Task 2: Add BroadcastChannel to pipelineStore

**Files:**
- Modify: `frontend/src/stores/pipelineStore.ts`

- [ ] **Step 1: Add broadcast helper after the imports**

Add after line 2 (`import { immer } ...`):

```ts
// Module-level BroadcastChannel — safe to create here (no-op if API unavailable)
let _channel: BroadcastChannel | null = null
function getChannel(): BroadcastChannel | null {
  if (_channel) return _channel
  try {
    _channel = new BroadcastChannel('vft-warroom')
  } catch {
    _channel = null
  }
  return _channel
}

function broadcastTurns(turns: AgentTurn[]): void {
  getChannel()?.postMessage({ turns })
}
```

- [ ] **Step 2: Call broadcastTurns after every mutation that changes turns**

In `appendDelta`, after the `set(...)` call:
```ts
appendDelta: (agent, agentName, phaseLabel, text) => {
  set((s) => {
    const last = s.turns[s.turns.length - 1]
    if (last && last.agent === agent && last.event === 'agent_delta') {
      last.text += text
    } else {
      s.turns.push({
        id: `${agent}-${Date.now()}`,
        event: 'agent_delta',
        agent,
        agentName,
        phaseLabel,
        text,
        isWarRoom: false,
      })
    }
  })
  broadcastTurns(usePipelineStore.getState().turns)
},
```

Do the same for `addWarRoomTurn` — add `broadcastTurns(usePipelineStore.getState().turns)` after the `set(...)` call:
```ts
addWarRoomTurn: (speaker, agentName, text, isDelta, act) => {
  set((s) => {
    const last = s.turns[s.turns.length - 1]
    if (isDelta && last && last.agent === speaker && last.isWarRoom) {
      last.text += text
    } else {
      s.turns.push({
        id: `wr-${speaker}-${Date.now()}`,
        event: 'war_room_turn',
        agent: speaker,
        agentName,
        phaseLabel: `War Room — Ato ${act}`,
        text,
        act,
        isDelta,
        isWarRoom: true,
      })
    }
  })
  broadcastTurns(usePipelineStore.getState().turns)
},
```

Also call `broadcastTurns([])` in `reset`:
```ts
reset: () => {
  set((s) => { s.status = 'idle'; s.turns = []; s.reportMd = ''; s.runId = null; s.errorMessage = null })
  broadcastTurns([])
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: only pre-existing errors (none in pipelineStore.ts).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/stores/pipelineStore.ts
git commit -m "feat(pipeline): broadcast turns via BroadcastChannel for popout window"
```

---

## Task 3: Create WarRoomFloat — draggable floating card

**Files:**
- Create: `frontend/src/components/pipeline/WarRoomFloat.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useCallback, useRef, useEffect } from 'react'
import { Minus, ExternalLink, X, Radio } from 'lucide-react'
import { WarRoomGraph } from './WarRoomGraph'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface DragState {
  dragging: boolean
  startX: number
  startY: number
  originX: number
  originY: number
}

export function WarRoomFloat() {
  const { turns, status } = usePipelineStore()
  const { setWarRoomFloatOpen } = useUiStore()

  const warRoomTurns = turns.filter(t => t.isWarRoom)
  const activeAgent = status === 'running' ? (turns[turns.length - 1]?.agentName ?? null) : null

  const [pos, setPos] = useState({ x: window.innerWidth - 324, y: window.innerHeight - 268 })
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef<DragState>({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    }
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 300, dragRef.current.originX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 48, dragRef.current.originY + dy)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current.dragging = false
  }, [])

  const handlePopout = useCallback(() => {
    window.open(
      '/warroom',
      'vft-warroom',
      'width=860,height=560,resizable=yes,scrollbars=no'
    )
    setWarRoomFloatOpen(false)
  }, [setWarRoomFloatOpen])

  // Clamp position when window resizes
  useEffect(() => {
    const handle = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - 300),
        y: Math.min(p.y, window.innerHeight - 48),
      }))
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 300,
        height: minimized ? 40 : 220,
        zIndex: 1000,
        background: '#0e0e13',
        border: '1px solid rgba(232,121,249,0.35)',
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.15s ease',
      }}
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={onHeaderPointerDown}
        style={{
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 6,
          cursor: 'grab',
          borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(232,121,249,0.04)',
          userSelect: 'none',
        }}
      >
        <Radio size={12} style={{ color: '#e879f9', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#e879f9', flex: 1 }}>War Room</span>
        {warRoomTurns.length > 0 && (
          <span style={{ fontSize: 10, color: '#475569' }}>
            {warRoomTurns.length} turnos
          </span>
        )}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setMinimized(m => !m)}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title={minimized ? 'Expandir' : 'Minimizar'}
        >
          <Minus size={12} />
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={handlePopout}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title="Abrir em nova janela"
        >
          <ExternalLink size={12} />
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setWarRoomFloatOpen(false)}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title="Fechar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Graph body */}
      {!minimized && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {warRoomTurns.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: '#334155',
            }}>
              Aguardando War Room...
            </div>
          ) : (
            <WarRoomGraph turns={warRoomTurns} activeAgent={activeAgent} />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep WarRoomFloat
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/pipeline/WarRoomFloat.tsx
git commit -m "feat(warroom): draggable floating WarRoomGraph card with minimize/popout/close"
```

---

## Task 4: Create WarRoomWindow — popout page

**Files:**
- Create: `frontend/src/pages/WarRoomWindow.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useEffect, useState } from 'react'
import { WarRoomGraph } from '../components/pipeline/WarRoomGraph'
import { WarRoomTimeline } from '../components/pipeline/WarRoomTimeline'
import type { AgentTurn } from '../stores/pipelineStore'
import { Radio } from 'lucide-react'

export function WarRoomWindow() {
  const [turns, setTurns] = useState<AgentTurn[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('vft-warroom')
      setConnected(true)
      channel.onmessage = (e: MessageEvent<{ turns: AgentTurn[] }>) => {
        setTurns(e.data.turns)
      }
    } catch {
      setConnected(false)
    }
    return () => { channel?.close() }
  }, [])

  const warRoomTurns = turns.filter(t => t.isWarRoom)
  const activeAgent: string | null = null // popout has no live status info

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#07070c',
      color: '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        background: '#0a0a0f',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Radio size={14} style={{ color: '#e879f9' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e879f9' }}>War Room</span>
        <span style={{ fontSize: 11, color: '#334155' }}>— VFT Studio</span>
        <div style={{ flex: 1 }} />
        {connected && (
          <span style={{ fontSize: 11, color: '#34d399' }}>● ao vivo</span>
        )}
        {!connected && (
          <span style={{ fontSize: 11, color: '#ef4444' }}>● BroadcastChannel indisponível</span>
        )}
        {warRoomTurns.length > 0 && (
          <span style={{ fontSize: 11, color: '#475569' }}>
            {warRoomTurns.length} turnos
          </span>
        )}
      </div>

      {/* Body */}
      {warRoomTurns.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: '#334155',
        }}>
          Aguardando dados da análise...
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Graph — 55% width */}
          <div style={{ width: '55%', borderRight: '1px solid rgba(255,255,255,0.06)', padding: 16 }}>
            <WarRoomGraph turns={warRoomTurns} activeAgent={activeAgent} />
          </div>
          {/* Timeline — 45% width, scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <WarRoomTimeline turns={warRoomTurns} activeAgent={activeAgent} />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/WarRoomWindow.tsx
git commit -m "feat(warroom): popout window page receiving live data via BroadcastChannel"
```

---

## Task 5: Register /warroom route in App.tsx + remove WarRoomGraph from WarRoomTimeline

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/pipeline/WarRoomTimeline.tsx`

- [ ] **Step 1: Register /warroom route**

At the top of `frontend/src/App.tsx`, add import:
```ts
import { WarRoomWindow } from './pages/WarRoomWindow'
```

In the `App` function, before the `if (!onboardingChecked) return null` check, add:
```ts
// Detect popout window (/warroom path)
if (window.location.pathname === '/warroom') {
  return <WarRoomWindow />
}
```

So the full beginning of `App()` looks like:
```tsx
function App() {
  const { currentView } = useUiStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  // Detect popout window
  if (window.location.pathname === '/warroom') {
    return <WarRoomWindow />
  }

  useEffect(() => {
    // ... existing onboarding check
  }, [])
  // ...
```

**Note on Vite:** The dev server must serve `index.html` for `/warroom`. Add to `vite.config.ts`:
```ts
server: {
  proxy: { ... },
  historyApiFallback: true,  // ADD THIS
},
```

For production builds, this is handled by the server config (nginx/caddy `try_files`).

- [ ] **Step 2: Remove WarRoomGraph from WarRoomTimeline**

In `frontend/src/components/pipeline/WarRoomTimeline.tsx`:

Remove import:
```ts
import { WarRoomGraph } from './WarRoomGraph'
```

Remove the `{/* Interaction graph */}` block (lines 48-49):
```tsx
{/* Interaction graph */}
<WarRoomGraph turns={turns} activeAgent={activeAgent} />
```

The file should go from showing the graph + timeline to showing only the timeline transcript.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/pipeline/WarRoomTimeline.tsx frontend/vite.config.ts
git commit -m "feat(warroom): register /warroom route, remove graph from timeline"
```

---

## Task 6: Wire WarRoomFloat into AppShell

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add imports**

At the top of `AppShell.tsx`, add:
```ts
import { WarRoomFloat } from '../pipeline/WarRoomFloat'
```

- [ ] **Step 2: Read warRoomFloatOpen from store**

In the destructure line:
```ts
const { chatPanelOpen, currentView, setChatPanelOpen, pipelineView } = useUiStore()
```
Change to:
```ts
const { rightPanel, setRightPanel, setChatPanelOpen, currentView, pipelineView, warRoomFloatOpen, setWarRoomFloatOpen } = useUiStore()
const chatPanelOpen = rightPanel === 'chat'
```

- [ ] **Step 3: Auto-open float when warRoom turns arrive**

After the existing `usePhasePoller` call, add:
```ts
const warRoomTurns = usePipelineStore(s => s.turns.filter(t => t.isWarRoom))
useEffect(() => {
  if (warRoomTurns.length > 0 && !warRoomFloatOpen) {
    setWarRoomFloatOpen(true)
  }
}, [warRoomTurns.length, warRoomFloatOpen, setWarRoomFloatOpen])
```

Add `usePipelineStore` to imports:
```ts
import { usePipelineStore } from '../../stores/pipelineStore'
```

- [ ] **Step 4: Add "War Room" toggle button in header**

In the header button row (after the "VFT Guiado" button), add a War Room button that shows only when `pipelineView !== 'idle'`:
```tsx
{pipelineView !== 'idle' && (
  <button
    onClick={() => setWarRoomFloatOpen(!warRoomFloatOpen)}
    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
    style={warRoomFloatOpen
      ? { background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }
      : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
    }
  >
    <Radio size={13} />
    War Room
  </button>
)}
```

Add `Radio` to the lucide-react import in AppShell.

- [ ] **Step 5: Update "Chat IA" button to use setRightPanel**

Find the existing `setChatPanelOpen(!chatPanelOpen)` onClick on the "Chat IA" button and change it:
```tsx
onClick={() => setRightPanel(rightPanel === 'chat' ? 'none' : 'chat')}
```

Find the `setChatPanelOpen(true)` in the "VFT Guiado" button onClick:
```tsx
onClick={() => {
  useChatStore.getState().setActiveAgent('ARIA', 'facilitator')
  setRightPanel('chat')
}}
```

- [ ] **Step 6: Update right panel slot to use rightPanel state**

Find the chat panel section:
```tsx
{chatPanelOpen && (
  <div className="relative h-screen shrink-0 flex" style={{ width: chat.size }}>
    ...
    <ChatPanel width={chat.size} />
  </div>
)}
```

Change to:
```tsx
{rightPanel !== 'none' && (
  <div className="relative h-screen shrink-0 flex" style={{ width: chat.size }}>
    <div
      onMouseDown={chat.onMouseDown}
      className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
    >
      <div className="h-full w-px bg-transparent group-hover:bg-fuchsia-500/30 transition-colors mx-auto" />
    </div>
    {rightPanel === 'chat' && <ChatPanel width={chat.size} />}
    {rightPanel === 'diagrams' && activeProjectId && (
      <DiagramsPanel projectId={activeProjectId} width={chat.size} />
    )}
  </div>
)}
```

Import `DiagramsPanel` at the top:
```ts
import { DiagramsPanel } from '../diagrams/DiagramsPanel'
```

- [ ] **Step 7: Render WarRoomFloat at root level**

At the end of the AppShell return, just before the closing `</div>`, add:
```tsx
{warRoomFloatOpen && <WarRoomFloat />}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: DiagramsPanel import error (not yet created) — all others resolved.

- [ ] **Step 9: Commit (partial — DiagramsPanel will be added next task)**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(appshell): wire WarRoomFloat, rightPanel state, Diagrams button placeholder"
```

---

## Task 7: Create DiagramsPanel

**Files:**
- Create: `frontend/src/components/diagrams/DiagramsPanel.tsx`

- [ ] **Step 1: Create the file**

```tsx
import { useState, useRef } from 'react'
import { X, BarChart2 } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { CausalRelationsMap } from '../phase2/CausalRelationsMap'

type DiagramTab = 'hierarchy' | 'means-ends' | 'causal'

const TABS: { id: DiagramTab; label: string; shortLabel: string }[] = [
  { id: 'hierarchy', label: 'Hierarquia de Objetivos', shortLabel: 'Hierarquia' },
  { id: 'means-ends', label: 'Rede Meios-Fins', shortLabel: 'Meios-Fins' },
  { id: 'causal', label: 'Mapa de Relações Causais', shortLabel: 'Mapa Causal' },
]

interface DiagramsPanelProps {
  projectId: string
  width: number
}

export function DiagramsPanel({ projectId, width: _width }: DiagramsPanelProps) {
  const { setRightPanel } = useUiStore()
  const [activeTab, setActiveTab] = useState<DiagramTab>('hierarchy')

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#0a0a0f', width: '100%' }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 px-4"
        style={{
          height: 44,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#0a0a0f',
        }}
      >
        <BarChart2 size={13} style={{ color: '#60a5fa' }} />
        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
          Diagramas VFT
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setRightPanel('none')}
          className="p-1 rounded transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={
              activeTab === tab.id
                ? {
                    color: '#60a5fa',
                    borderBottom: '2px solid #60a5fa',
                    background: 'rgba(96,165,250,0.05)',
                  }
                : { color: '#475569', borderBottom: '2px solid transparent' }
            }
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* Diagram area — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'hierarchy' && (
          <ObjectivesHierarchy projectId={projectId} />
        )}
        {activeTab === 'means-ends' && (
          <MeansEndsNetwork projectId={projectId} />
        )}
        {activeTab === 'causal' && (
          <CausalRelationsMap projectId={projectId} />
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles with no errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/diagrams/DiagramsPanel.tsx
git commit -m "feat(diagrams): DiagramsPanel with Hierarquia / Meios-Fins / Mapa Causal tabs"
```

---

## Task 8: Add "Diagramas" button to AppShell header

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Step 1: Add the button**

In the header button row (next to "Chat IA"), add before the "Chat IA" button:
```tsx
{currentView === 'project-detail' && activeProjectId && (
  <button
    onClick={() => setRightPanel(rightPanel === 'diagrams' ? 'none' : 'diagrams')}
    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
    style={rightPanel === 'diagrams'
      ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
      : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
    }
  >
    <BarChart2 size={13} />
    Diagramas
  </button>
)}
```

Add `BarChart2` to the lucide-react import in AppShell.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 3: Full build check**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(appshell): add Diagramas button to header"
```

---

## Task 9: Fix CausalRelationsMap dead state

**Files:**
- Modify: `frontend/src/components/phase2/CausalRelationsMap.tsx`

- [ ] **Step 1: Remove dead state declarations (lines 130–147)**

Remove these lines:
```ts
const [nodes, , onNodesChange] = useNodesState<Node<ObjectiveNodeData>>(initialNodes)
const [edges] = useEdgesState<Edge>(initialEdges)

// Sync layouted nodes/edges when store data changes
// useNodesState init only fires once; we need to reset on dependency change
const [syncedNodes, setSyncedNodes, onSyncedNodesChange] =
  useNodesState<Node<ObjectiveNodeData>>(initialNodes)
const [syncedEdges, setSyncedEdges] = useEdgesState<Edge>(initialEdges)

useEffect(() => {
  setSyncedNodes(initialNodes)
  setSyncedEdges(initialEdges)
}, [initialNodes, initialEdges, setSyncedNodes, setSyncedEdges])

// Suppress unused vars from the non-synced state
void nodes
void onNodesChange
void edges
```

Replace with the clean version (only the synced state):
```ts
const [syncedNodes, setSyncedNodes, onSyncedNodesChange] =
  useNodesState<Node<ObjectiveNodeData>>(initialNodes)
const [syncedEdges, setSyncedEdges] = useEdgesState<Edge>(initialEdges)

useEffect(() => {
  setSyncedNodes(initialNodes)
  setSyncedEdges(initialEdges)
}, [initialNodes, initialEdges, setSyncedNodes, setSyncedEdges])
```

Also remove the unused `useEdgesState` import if `syncedEdges` is the only consumer — verify it's still used. It is: `syncedEdges` is passed to `<ReactFlow edges={syncedEdges} ...>`.

- [ ] **Step 2: Fix empty state text color**

Change line:
```tsx
<p className="text-sm text-center max-w-sm" style={{ color: '#334155' }}>
```
to:
```tsx
<p className="text-sm text-center max-w-sm" style={{ color: '#64748b' }}>
```
(#334155 is nearly invisible on dark bg; #64748b is readable)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/phase2/CausalRelationsMap.tsx
git commit -m "fix(causal-map): remove dead state declarations and fix empty state text color"
```

---

## Task 10: Fix remaining chatPanelOpen call sites

**Files:**
- Modify: `frontend/src/components/pipeline/PipelinePanel.tsx`
- Modify: `frontend/src/components/layout/ChatPanel.tsx`

- [ ] **Step 1: Fix PipelinePanel.tsx**

Find in `frontend/src/components/pipeline/PipelinePanel.tsx`:
```ts
const { pipelineView, setPipelineView, setChatPanelOpen } = useUiStore()
```
and:
```ts
const handleDiscussInChat = () => {
  setPipelineView('idle')
  setChatPanelOpen(true)
}
```

`setChatPanelOpen` is a compat shim so this still works — no change needed here. TypeScript will be happy since `setChatPanelOpen` still exists on the store.

- [ ] **Step 2: Fix ChatPanel.tsx**

In `frontend/src/components/layout/ChatPanel.tsx`:
```ts
const { setChatPanelOpen } = useUiStore()
```
and the close button:
```tsx
onClick={() => setChatPanelOpen(false)}
```

`setChatPanelOpen(false)` calls `setRightPanel('none')` via the compat shim — no change needed. TypeScript happy.

- [ ] **Step 3: Fix App.tsx**

In `frontend/src/App.tsx` line 197:
```ts
useUiStore.getState().setChatPanelOpen(true)
```

This still works via the compat shim. No change needed.

- [ ] **Step 4: Full build + type check**

```bash
cd frontend && npx tsc --noEmit && npm run build 2>&1 | tail -8
```

Expected: zero TypeScript errors, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/pipeline/PipelinePanel.tsx frontend/src/components/layout/ChatPanel.tsx
git commit -m "chore: verify compat shims for setChatPanelOpen callers"
```

---

## Task 11: Final build verification + push

- [ ] **Step 1: Run full build**

```bash
cd frontend && npm run build 2>&1 | tail -15
```

Expected: `✓ built in X.XXs` with no TypeScript errors.

- [ ] **Step 2: Push to origin**

```bash
git push
```

- [ ] **Step 3: Open PR**

```bash
gh pr create --title "feat: WarRoom floating graph + Diagrams panel" \
  --body "Adds draggable WarRoomGraph float card with popout window (BroadcastChannel sync) and DiagramsPanel sidebar with 3 VFT diagram tabs. Fixes CausalRelationsMap dead state." \
  --base master
```
