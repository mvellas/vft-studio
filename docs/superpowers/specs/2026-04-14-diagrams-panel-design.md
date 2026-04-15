# Diagrams Panel — VFT Interactive Diagrams Sidebar

**Date:** 2026-04-14
**Status:** Approved

---

## Goal

Surface the three existing VFT diagram components (ObjectivesHierarchy, MeansEndsNetwork, CausalRelationsMap) in a dedicated sidebar panel accessible from a "Diagramas" button in the header. Fix a dead-code quality issue in `CausalRelationsMap` in the same pass.

---

## Context

All three diagram components exist and work correctly as ReactFlow graphs, but are not connected to the main UI. `DiagramExport` in the header tries to screenshot them via `html2canvas` only if they happen to be in the DOM — which they never are in practice.

The right side of AppShell currently hosts only the Chat panel. This spec adds a second mode to that slot: a Diagrams panel.

---

## Architecture

### New files

| File | Responsibility |
|------|---------------|
| `frontend/src/components/diagrams/DiagramsPanel.tsx` | Tabbed panel rendering the 3 diagram components. Handles tab selection state. |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/stores/uiStore.ts` | Replace `chatPanelOpen: boolean` with `rightPanel: 'none' \| 'chat' \| 'diagrams'`. Add computed `chatPanelOpen` getter for backwards compatibility where needed. Add `setRightPanel(panel)` action. |
| `frontend/src/components/layout/AppShell.tsx` | Add "Diagramas" button in header. Swap right panel slot between `<ChatPanel>` and `<DiagramsPanel>` based on `rightPanel`. Wire "Chat IA" button to `setRightPanel('chat')`. |
| `frontend/src/components/phase2/CausalRelationsMap.tsx` | Remove dead state variables (`nodes`, `onNodesChange`, `edges`) — use only `syncedNodes`/`syncedEdges`. Remove `void` suppressions. |

---

## uiStore changes

```ts
// Before
chatPanelOpen: boolean
setChatPanelOpen: (open: boolean) => void

// After
rightPanel: 'none' | 'chat' | 'diagrams'
setRightPanel: (panel: 'none' | 'chat' | 'diagrams') => void

// Computed getter for callers that still use chatPanelOpen:
get chatPanelOpen() { return this.rightPanel === 'chat' }
```

All existing callers of `setChatPanelOpen(true)` → replaced with `setRightPanel('chat')`.
All existing callers of `setChatPanelOpen(false)` → replaced with `setRightPanel('none')`.
All reads of `chatPanelOpen` → replaced with `rightPanel === 'chat'`.

Search scope: `useUiStore`, `useChatStore.getState().setChatPanelOpen` in App.tsx, AppShell.tsx, StepGuide.tsx, StepTool.tsx.

---

## DiagramsPanel component

```
┌────────────────────────────────┐
│ Header: "Diagramas VFT"        │
├──────────┬──────────┬──────────┤
│Hierarquia│Meios-Fins│Mapa Causal│  ← tab bar
├────────────────────────────────┤
│                                │
│   ReactFlow graph (flex-1)     │
│                                │
├────────────────────────────────┤
│  [↓ PNG]                       │  ← export button per tab
└────────────────────────────────┘
```

**Props:**
```ts
interface DiagramsPanelProps {
  projectId: string
  width: number
}
```

**Tab state:** `activeTab: 'hierarchy' | 'means-ends' | 'causal'` — local `useState`

**Tab content:**
- `hierarchy` → `<ObjectivesHierarchy projectId={projectId} />`
- `means-ends` → `<MeansEndsNetwork projectId={projectId} />`
- `causal` → `<CausalRelationsMap projectId={projectId} />`

**Height requirement:** Each diagram component needs a fixed height container to render ReactFlow correctly. `DiagramsPanel` passes `style={{ height: 'calc(100vh - 120px)' }}` to the diagram wrapper div.

**Export:** Each diagram already has its own `handleExportPng` internal function using `html-to-image`. The panel exposes this via a `[↓ PNG]` button that triggers the component's export. Implementation: each diagram component will accept an optional `onExportRef` callback ref pattern — or simpler: use a `useImperativeHandle` + `forwardRef` on each diagram to expose `exportPng()`. The panel calls `ref.current?.exportPng()`.

**Style:** Matches AppShell chat panel — `background: #0a0a0f`, `border-left: 1px solid rgba(255,255,255,0.06)`, same `useResize` hook.

---

## AppShell header changes

Add "Diagramas" button next to "Chat IA":

```tsx
<button
  onClick={() => setRightPanel(rightPanel === 'diagrams' ? 'none' : 'diagrams')}
  style={rightPanel === 'diagrams'
    ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
    : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
  }
>
  <BarChart2 size={13} />
  Diagramas
</button>
```

Right panel slot (replaces current `{chatPanelOpen && <ChatPanel />}`):

```tsx
{rightPanel !== 'none' && (
  <div style={{ width: chat.size }} ...>
    {/* resize handle */}
    {rightPanel === 'chat' && <ChatPanel width={chat.size} />}
    {rightPanel === 'diagrams' && activeProjectId && (
      <DiagramsPanel projectId={activeProjectId} width={chat.size} />
    )}
  </div>
)}
```

---

## CausalRelationsMap quality fix

Current dead code (lines ~130–148):
```ts
// DEAD — declared but never used
const [nodes, , onNodesChange] = useNodesState(initialNodes)
const [edges] = useEdgesState(initialEdges)
// ...
void nodes
void onNodesChange
void edges
```

Fix: remove these three declarations entirely. `syncedNodes`/`syncedEdges` are the only state variables needed.

---

## DiagramExport button

The existing `DiagramExport` component in the header (with `.md` and `.png` export buttons) can remain as-is or be simplified — it no longer needs to hunt for diagram DOM nodes since the diagrams are now always rendered in the panel. Out of scope for this spec — leave unchanged.

---

## Testing

- "Diagramas" button in header opens DiagramsPanel, closes ChatPanel
- "Chat IA" button opens ChatPanel, closes DiagramsPanel
- Clicking active button closes the panel (toggle behavior)
- Each tab renders the correct diagram component
- Diagrams load data from `objectivesStore` on mount
- Empty states render correctly when no objectives exist
- ReactFlow graphs fill the available panel height without overflow
- PNG export button triggers download
- `CausalRelationsMap` has no `void` suppressions
- All existing `chatPanelOpen` call sites work correctly after uiStore migration
