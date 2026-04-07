import { useCallback, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useProjectStore } from '../stores/projectStore'
import { streamChatMessage } from '../api/chat'
import type { ChatMessage } from '../types'

export function useChat() {
  const abortRef = useRef<(() => void) | null>(null)
  const { addMessage, appendToLastMessage, setStreaming, activeAgent } = useChatStore()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  const sendMessage = useCallback(
    (text: string) => {
      if (!activeProjectId || !text.trim()) return

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: '',
        project_id: activeProjectId,
        timestamp: new Date().toISOString(),
        role: 'user',
        agent_name: 'User',
        content: text,
        phase: null,
        step: null,
      }
      addMessage(userMsg)

      // Add placeholder for assistant response (content will be built up via appendToLastMessage)
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: '',
        project_id: activeProjectId,
        timestamp: new Date().toISOString(),
        role: 'assistant',
        agent_name: activeAgent,
        content: '',
        phase: null,
        step: null,
      }
      addMessage(assistantMsg)
      setStreaming(true)

      abortRef.current = streamChatMessage(
        text,
        activeProjectId,
        'facilitator',
        (delta) => appendToLastMessage(delta),
        () => setStreaming(false),
        (error) => {
          appendToLastMessage(`\n\n[Erro: ${error}]`)
          setStreaming(false)
        },
      )
    },
    [activeProjectId, activeAgent, addMessage, appendToLastMessage, setStreaming],
  )

  const cancelStream = useCallback(() => {
    abortRef.current?.()
    setStreaming(false)
  }, [setStreaming])

  return { sendMessage, cancelStream }
}
