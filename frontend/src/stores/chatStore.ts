import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ChatMessage, ToolEvent } from '../types'

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  activeAgent: string
  activeAgentType: string
  streamingToolState: ToolEvent | null
  autoSendMessage: string | null
  addMessage: (message: ChatMessage) => void
  appendToLastMessage: (text: string) => void
  setStreaming: (streaming: boolean) => void
  setActiveAgent: (agentName: string, agentType: string) => void
  clearMessages: () => void
  setToolState: (event: ToolEvent | null) => void
  setAutoSendMessage: (msg: string | null) => void
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: [],
    isStreaming: false,
    activeAgent: 'ARIA',
    activeAgentType: 'facilitator',
    streamingToolState: null,
    autoSendMessage: null,
    addMessage: (message) => set((state) => { state.messages.push(message) }),
    appendToLastMessage: (text) => set((state) => {
      const last = state.messages[state.messages.length - 1]
      if (last) last.content += text
    }),
    setStreaming: (streaming) => set((state) => { state.isStreaming = streaming }),
    setActiveAgent: (agentName, agentType) => set((state) => {
      state.activeAgent = agentName
      state.activeAgentType = agentType
      state.messages = []
    }),
    clearMessages: () => set((state) => { state.messages = [] }),
    setToolState: (event) => set((state) => { state.streamingToolState = event }),
    setAutoSendMessage: (msg) => set((state) => { state.autoSendMessage = msg }),
  }))
)
