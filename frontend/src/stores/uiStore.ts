import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type View = 'project-list' | 'project-detail' | 'settings' | 'documents'

interface UiState {
  currentView: View
  chatPanelOpen: boolean
  sidebarCollapsed: boolean
  setView: (view: View) => void
  toggleChatPanel: () => void
  toggleSidebar: () => void
  setChatPanelOpen: (open: boolean) => void
}

export const useUiStore = create<UiState>()(
  immer((set) => ({
    currentView: 'project-list' as View,
    chatPanelOpen: false,
    sidebarCollapsed: false,
    setView: (view) => set((state) => { state.currentView = view }),
    toggleChatPanel: () => set((state) => { state.chatPanelOpen = !state.chatPanelOpen }),
    toggleSidebar: () => set((state) => { state.sidebarCollapsed = !state.sidebarCollapsed }),
    setChatPanelOpen: (open) => set((state) => { state.chatPanelOpen = open }),
  }))
)
