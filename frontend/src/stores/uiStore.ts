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
