import { apiClient } from './client'
import type { ChatMessage } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? window.location.origin

/**
 * Stream a chat message from the backend SSE endpoint.
 * Returns an abort function to cancel the stream.
 */
export function streamChatMessage(
  message: string,
  projectId: string,
  agentType: string,
  onDelta: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
  const ctrl = new AbortController()

  fetch(`${BASE_URL}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ message, project_id: projectId, agent_type: agentType }),
    signal: ctrl.signal,
  })
    .then(async (res) => {
      if (!res.ok) {
        onError(`HTTP ${res.status}: ${res.statusText}`)
        return
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let lastEventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          onDone()
          break
        }
        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            lastEventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (lastEventType === 'done' || data === '[DONE]') {
              onDone()
              return
            }
            if (lastEventType === 'error') {
              onError(data)
              return
            }
            onDelta(data)
          }
        }
      }
    })
    .catch((err: Error) => {
      if (err.name !== 'AbortError') {
        onError(err.message)
      }
    })

  return () => ctrl.abort()
}

export function loadChatHistory(
  projectId: string,
  agentType: string,
  limit = 50,
): Promise<ChatMessage[]> {
  return apiClient
    .get<ChatMessage[]>('/api/chat/history', { params: { project_id: projectId, agent_type: agentType, limit } })
    .then(r => r.data)
}
