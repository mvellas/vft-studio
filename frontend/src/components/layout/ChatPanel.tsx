import { useRef, useEffect, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { X, Send, Square, Loader2, Globe, CheckCircle, Trash2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChatStore } from '../../stores/chatStore'
import { useUiStore } from '../../stores/uiStore'
import { useChat } from '../../hooks/useChat'
import { loadChatHistory, clearChatHistory } from '../../api/chat'
import { useProjectStore } from '../../stores/projectStore'

function agentBadgeColor(agentName: string): CSSProperties {
  const colors: Record<string, CSSProperties> = {
    ARIA: { background: 'rgba(232,121,249,0.15)', color: '#e879f9' },
    FRAME: { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' },
    AXIOM: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    NOVA: { background: 'rgba(52,211,153,0.15)', color: '#34d399' },
    ANALYST: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  }
  return colors[agentName] ?? { background: 'rgba(255,255,255,0.06)', color: '#94a3b8' }
}

interface ChatPanelProps {
  width?: number
}

export function ChatPanel({ width }: ChatPanelProps) {
  const { messages, isStreaming, activeAgent, activeAgentType, addMessage, clearMessages, streamingToolState, autoSendMessage, setAutoSendMessage } = useChatStore()
  const { setChatPanelOpen } = useUiStore()
  const { sendMessage, cancelStream } = useChat()
  const { activeProjectId } = useProjectStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState('')
  const [textareaFocused, setTextareaFocused] = useState(false)

  const handleClearHistory = () => {
    if (!activeProjectId || isStreaming) return
    clearChatHistory(activeProjectId, activeAgentType)
      .then(() => clearMessages())
      .catch(() => {})
  }

  // Load chat history when agent changes
  useEffect(() => {
    if (!activeProjectId) return
    let cancelled = false
    loadChatHistory(activeProjectId, activeAgentType).then(history => {
      if (cancelled) return
      // Skip if a new conversation was already started (streaming or messages present)
      const { isStreaming: streaming, messages: current } = useChatStore.getState()
      if (streaming || current.length > 0) return
      for (const msg of history) addMessage(msg)
    }).catch(() => {})
    return () => { cancelled = true }
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
    <aside
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: '#09090e', ...(width ? { width } : {}) }}
    >
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="shrink-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: '#f8fafc' }}>{activeAgent}</span>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(232,121,249,0.12)', color: '#e879f9' }}
            >
              Agente IA
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClearHistory}
              disabled={isStreaming}
              className="transition-colors p-1 rounded disabled:opacity-40 hover:text-red-500"
              style={{ color: '#475569' }}
              aria-label="Clear chat history"
              title="Limpar histórico"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={() => setChatPanelOpen(false)}
              className="transition-colors p-1 rounded hover:text-slate-300"
              style={{ color: '#475569' }}
              aria-label="Close chat panel"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm mt-8" style={{ color: '#475569' }}>
            <p>Nenhuma mensagem ainda.</p>
            <p className="mt-1">Comece uma conversa com {activeAgent}.</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const prev = idx > 0 ? messages[idx - 1] : null
          const agentChanged = msg.role !== 'user' && msg.agent_name && msg.agent_name !== prev?.agent_name
          return (
            <div key={msg.id}>
              {agentChanged && (
                <div className="flex items-center gap-2 my-2">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs" style={{ color: '#334155' }}>— {msg.agent_name} —</span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}
              <div className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role !== 'user' && msg.agent_name && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                    style={agentBadgeColor(msg.agent_name)}
                  >
                    {msg.agent_name}
                  </span>
                )}
                <div
                  className="max-w-[85%] rounded-lg px-3 py-2 text-sm select-text cursor-text"
                  style={
                    msg.role === 'user'
                      ? { background: 'rgba(232,121,249,0.15)', color: '#f1f5f9' }
                      : { background: '#0e0e13', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  {msg.role === 'user' ? (
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-code:text-xs prose-pre:text-xs prose-table:text-xs prose-td:px-2 prose-td:py-1 prose-th:px-2 prose-th:py-1"
                      style={{ color: '#e2e8f0' }}
                    >
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      {isStreaming && msg === messages[messages.length - 1] && (
                        <span
                          className="inline-block w-0.5 h-4 animate-pulse ml-0.5 align-text-bottom"
                          style={{ background: '#94a3b8' }}
                        />
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
            </div>
          )
        })}

        {streamingToolState?.type === 'tool_use' && (
          <div className="flex items-center gap-2 text-xs animate-pulse px-1" style={{ color: '#64748b' }}>
            <Globe size={12} />
            Pesquisando: &quot;{streamingToolState.query}&quot;
          </div>
        )}
        {streamingToolState?.type === 'tool_result' && (
          <div className="flex items-center gap-2 text-xs px-1" style={{ color: '#34d399' }}>
            <CheckCircle size={12} />
            {streamingToolState.count} resultado{streamingToolState.count !== 1 ? 's' : ''} encontrado{streamingToolState.count !== 1 ? 's' : ''}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        {isStreaming && (
          <div className="flex justify-center mb-2">
            <button
              onClick={cancelStream}
              className="flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded"
              style={{
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#f87171',
                background: 'rgba(239,68,68,0.08)',
              }}
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
            onFocus={() => setTextareaFocused(true)}
            onBlur={() => setTextareaFocused(false)}
            placeholder="Digite sua mensagem..."
            rows={2}
            disabled={isStreaming}
            className="flex-1 resize-none px-3 py-2 text-sm focus:outline-none disabled:opacity-50 transition-colors"
            style={{
              background: '#0e0e13',
              border: textareaFocused
                ? '1px solid rgba(232,121,249,0.5)'
                : '1px solid rgba(255,255,255,0.1)',
              color: '#f1f5f9',
              borderRadius: '8px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !inputValue.trim()}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: 'rgba(232,121,249,0.15)',
              color: '#e879f9',
              border: '1px solid rgba(232,121,249,0.3)',
              opacity: isStreaming || !inputValue.trim() ? 0.5 : 1,
              cursor: isStreaming || !inputValue.trim() ? 'not-allowed' : 'pointer',
            }}
            aria-label="Send message"
          >
            {isStreaming ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </aside>
  )
}
