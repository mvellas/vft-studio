import { useCallback, useRef } from 'react'
import { useChatStore } from '../stores/chatStore'
import { useProjectStore } from '../stores/projectStore'
import { streamChatMessage } from '../api/chat'
import type { ChatMessage } from '../types'

interface SendOptions {
  agentName?: string
  agentType?: string
}

export function useChat() {
  const abortRef = useRef<(() => void) | null>(null)
  const { addMessage, appendToLastMessage, setStreaming, setToolState, activeAgent, activeAgentType } = useChatStore()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  const sendMessage = useCallback(
    (text: string, opts?: SendOptions) => {
      if (!activeProjectId || !text.trim()) return

      const resolvedAgent = opts?.agentName ?? activeAgent
      const resolvedAgentType = opts?.agentType ?? activeAgentType

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

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        session_id: '',
        project_id: activeProjectId,
        timestamp: new Date().toISOString(),
        role: 'assistant',
        agent_name: resolvedAgent,
        content: '',
        phase: null,
        step: null,
      }
      addMessage(assistantMsg)
      setStreaming(true)

      abortRef.current = streamChatMessage(
        text,
        activeProjectId,
        resolvedAgentType,
        (delta) => appendToLastMessage(delta),
        (event) => setToolState({ type: 'tool_use', name: event.name, query: event.query }),
        (event) => setToolState({ type: 'tool_result', name: event.name, count: event.count }),
        () => {
          setToolState(null)
          setStreaming(false)
        },
        (error) => {
          setToolState(null)
          appendToLastMessage(`\n\n[Erro: ${error}]`)
          setStreaming(false)
        },
      )
    },
    [activeProjectId, activeAgent, activeAgentType, addMessage, appendToLastMessage, setStreaming, setToolState],
  )

  const cancelStream = useCallback(() => {
    abortRef.current?.()
    setStreaming(false)
  }, [setStreaming])

  return { sendMessage, cancelStream }
}
