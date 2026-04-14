# War Room Graph — Floating Card + Popout Window

**Date:** 2026-04-14
**Status:** Approved

---

## Goal

Move `WarRoomGraph` out of the inline pipeline content area and into a draggable floating card that can be popped out into a separate browser window. The graph must stay live-synced with the ongoing analysis.

---

## Context

Currently `WarRoomGraph` is embedded inside `WarRoomTimeline` → `PipelinePanel` → AppShell main content. It takes up vertical space in the scroll area and cannot be watched while the user works on another part of the screen.

The pipeline store holds `turns: AgentTurn[]`. The `WarRoomGraph` and `WarRoomTimeline` consume `turns` filtered to `isWarRoom === true`.

---

## Architecture

### New files

| File | Responsibility |
|------|---------------|
| `frontend/src/components/pipeline/WarRoomFloat.tsx` | Draggable floating card rendering `WarRoomGraph`. Controls: minimize, popout, close. |
| `frontend/src/pages/WarRoomWindow.tsx` | Full-screen page rendered when opened as popout window. Receives data via `BroadcastChannel`. |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/stores/uiStore.ts` | Add `warRoomFloatOpen: boolean`, `setWarRoomFloatOpen(open: boolean)` |
| `frontend/src/stores/pipelineStore.ts` | Broadcast `turns` on every change via `BroadcastChannel('vft-warroom')` |
| `frontend/src/components/pipeline/WarRoomTimeline.tsx` | Remove embedded `<WarRoomGraph />` — graph moves to float card |
| `frontend/src/components/layout/AppShell.tsx` | Render `<WarRoomFloat />` when `warRoomFloatOpen`. Add "War Room" toggle button in header (visible only when `pipelineView !== 'idle'`) |
| `frontend/src/App.tsx` or router | Register `/warroom` route → `<WarRoomWindow />` |

---

## Components

### `WarRoomFloat`

```
┌─────────────────────────────┐
│ 🔴 War Room  [─] [↗] [✕]   │  ← draggable header
├─────────────────────────────┤
│   WarRoomGraph (SVG)         │
│   pentagon, 260×180          │
└─────────────────────────────┘
```

- Position: `fixed`, initial position bottom-right (`bottom: 24px, right: 24px`)
- Drag: `onPointerDown` on header → track `pointermove` on `window` → update `position: {x, y}` in local state → apply as `style={{ left: x, top: y }}`
- On drag start: `setPointerCapture`, on drag end: `releasePointerCapture`
- Minimize button (`[─]`): collapses card to header-only height (`48px`)
- Popout button (`[↗]`): calls `window.open('/warroom', 'vft-warroom', 'width=800,height=600')`; hides the float card (`setWarRoomFloatOpen(false)`)
- Close button (`[✕]`): `setWarRoomFloatOpen(false)`
- Size: `width: 300px`, `height: 220px` (expanded), `height: 48px` (minimized)
- Z-index: `1000` (above all other content)
- Style: `background: #0e0e13`, `border: 1px solid rgba(232,121,249,0.3)`, `border-radius: 12px`, `box-shadow: 0 16px 48px rgba(0,0,0,0.6)`

**Auto-open logic** (inside `AppShell`):
```ts
useEffect(() => {
  if (warRoomTurns.length > 0 && !warRoomFloatOpen) {
    setWarRoomFloatOpen(true)
  }
}, [warRoomTurns.length])
```
where `warRoomTurns = turns.filter(t => t.isWarRoom)`.

### `WarRoomWindow` (popout page)

- Full-screen dark layout (`background: #07070c`)
- Left 60%: `WarRoomGraph` fills height
- Right 40%: `WarRoomTimeline` (transcript cards, scrollable)
- Header: "🔴 War Room — VFT Studio" title + live status badge
- Receives data via `BroadcastChannel`:
  ```ts
  const channel = new BroadcastChannel('vft-warroom')
  channel.onmessage = (e) => setTurns(e.data.turns)
  ```
- Shows "Aguardando análise…" empty state if no turns received yet

---

## Data Sync via BroadcastChannel

`pipelineStore` emits on every `turns` mutation:

```ts
// pipelineStore.ts — after every set(state => { state.turns = ... })
const channel = new BroadcastChannel('vft-warroom')
channel.postMessage({ turns: get().turns })
```

The channel is created once (module-level singleton). The popout window listens and maintains its own local `turns` state.

**BroadcastChannel** works natively across same-origin windows without any server involvement. No extra dependencies needed.

---

## uiStore changes

```ts
// add to UiState interface
warRoomFloatOpen: boolean
setWarRoomFloatOpen: (open: boolean) => void

// add to immer store
warRoomFloatOpen: false,
setWarRoomFloatOpen: (open) => set(state => { state.warRoomFloatOpen = open }),
```

`chatPanelOpen` and `setChatPanelOpen` are **unchanged**.

---

## Header button

In `AppShell` header, when `pipelineView !== 'idle'`:

```tsx
<button onClick={() => setWarRoomFloatOpen(!warRoomFloatOpen)} ...>
  <Radio size={13} />
  War Room
</button>
```

Style: active → `rgba(232,121,249,0.15)` fuchsia border; inactive → ghost style.

---

## Error handling

- `BroadcastChannel` is not available in very old browsers — wrap in `try/catch`, degrade gracefully (float card still works, popout shows empty state)
- If popout window is closed and user clicks ↗ again, a new window opens and re-subscribes

---

## Testing

- `WarRoomFloat` renders with correct initial position
- Drag moves the card (simulate `pointermove` events)
- Minimize toggles height
- Popout calls `window.open` with correct URL and params
- Close sets `warRoomFloatOpen = false`
- Auto-opens when first warRoom turn arrives
- `BroadcastChannel` message updates `WarRoomWindow` local state
- `WarRoomTimeline` no longer renders `WarRoomGraph` inline
