import { useRef, useEffect } from 'react'
import { X, Send } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { useUiStore } from '../../stores/uiStore'

export function ChatPanel() {
  const { messages, isStreaming, activeAgent } = useChatStore()
  const { setChatPanelOpen } = useUiStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <aside className="h-screen w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div>
          <span className="font-semibold text-gray-900 text-sm">{activeAgent}</span>
          <span className="ml-2 text-xs text-gray-500">Facilitador IA</span>
        </div>
        <button
          onClick={() => setChatPanelOpen(false)}
          className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
          aria-label="Close chat panel"
        >
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-8">
            <p>Nenhuma mensagem ainda.</p>
            <p className="mt-1">Comece uma conversa com {activeAgent}.</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="text-xs text-gray-400">{msg.agent_name}</span>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="flex items-start gap-2">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-600">
              <span className="inline-block w-1 h-4 bg-gray-400 animate-pulse" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-4 py-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            placeholder="Digite sua mensagem..."
            rows={2}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                // SSE wiring in Plan 05
              }
            }}
          />
          <button
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            disabled={isStreaming}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
