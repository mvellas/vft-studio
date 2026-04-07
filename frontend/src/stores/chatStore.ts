import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ChatMessage } from '../types'

interface ChatState {
  messages: ChatMessage[]
  isStreaming: boolean
  activeAgent: string
  addMessage: (message: ChatMessage) => void
  appendToLastMessage: (text: string) => void
  setStreaming: (streaming: boolean) => void
  setActiveAgent: (agent: string) => void
  clearMessages: () => void
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: [],
    isStreaming: false,
    activeAgent: 'ARIA',
    addMessage: (message) => set((state) => { state.messages.push(message) }),
    appendToLastMessage: (text) => set((state) => {
      const last = state.messages[state.messages.length - 1]
      if (last) last.content += text
    }),
    setStreaming: (streaming) => set((state) => { state.isStreaming = streaming }),
    setActiveAgent: (agent) => set((state) => { state.activeAgent = agent }),
    clearMessages: () => set((state) => { state.messages = [] }),
  }))
)
