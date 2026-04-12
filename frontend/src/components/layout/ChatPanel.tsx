import { useRef, useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { X, Send, Square, Loader2, Globe, CheckCircle } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '../../stores/chatStore'
import { useUiStore } from '../../stores/uiStore'
import { useChat } from '../../hooks/useChat'
import { AgentSelector } from './AgentSelector'
import { loadChatHistory } from '../../api/chat'
import { useProjectStore } from '../../stores/projectStore'

export function ChatPanel() {
  const { messages, isStreaming, activeAgent, activeAgentType, addMessage, streamingToolState, autoSendMessage, setAutoSendMessage } = useChatStore()
  const { setChatPanelOpen } = useUiStore()
  const { sendMessage, cancelStream } = useChat()
  const { activeProjectId } = useProjectStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')

  // Load chat history when agent changes
  useEffect(() => {
    if (!activeProjectId) return
    loadChatHistory(activeProjectId, activeAgentType).then(history => {
      for (const msg of history) addMessage(msg)
    }).catch(() => {})
  }, [activeAgentType, activeProjectId])

  // Auto-scroll to bottom on new message or new streaming content
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fire autoSendMessage once when set (used by DocumentPanel onAnalyze)
  useEffect(() => {
    if (autoSendMessage && !isStreaming) {
      const msg = autoSendMessage
      setAutoSendMessage(null)
      sendMessage(msg)
    }
  }, [autoSendMessage, isStreaming])

  const handleSend = () => {
    const text = inputValue.trim()
    if (!text || isStreaming) return
    sendMessage(text)
    setInputValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <aside className="h-screen w-96 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{activeAgent}</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
              Agente IA
            </span>
          </div>
          <button
            onClick={() => setChatPanelOpen(false)}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
            aria-label="Close chat panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="pb-2">
          <AgentSelector />
        </div>
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
            <span className="text-xs text-gray-400 font-medium">{msg.agent_name}</span>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm select-text cursor-text ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {msg.role === 'user' ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-code:text-xs prose-pre:text-xs prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  {isStreaming && msg === messages[messages.length - 1] && (
                    <span className="inline-block w-0.5 h-4 bg-gray-500 animate-pulse ml-0.5 align-text-bottom" />
                  )}
                </div>
              )}
              {/* Blinking cursor for user messages while streaming (shouldn't happen, safety) */}
              {isStreaming &&
                msg.role === 'user' &&
                msg === messages[messages.length - 1] && (
                  <span className="inline-block w-0.5 h-4 bg-white animate-pulse ml-0.5 align-text-bottom" />
                )}
            </div>
          </div>
        ))}

        {streamingToolState?.type === 'tool_use' && (
          <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse px-1">
            <Globe size={12} />
            Pesquisando: "{streamingToolState.query}"
          </div>
        )}
        {streamingToolState?.type === 'tool_result' && (
          <div className="flex items-center gap-2 text-xs text-emerald-600 px-1">
            <CheckCircle size={12} />
            {streamingToolState.count} resultado{streamingToolState.count !== 1 ? 's' : ''} encontrado{streamingToolState.count !== 1 ? 's' : ''}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 px-4 py-3 shrink-0">
        {isStreaming && (
          <div className="flex justify-center mb-2">
            <button
              onClick={cancelStream}
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded border border-red-200 hover:border-red-400"
              aria-label="Stop streaming"
            >
              <Square size={12} />
              Parar
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
