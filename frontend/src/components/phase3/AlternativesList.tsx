import { useState, useEffect } from 'react'
import { Plus, Sparkles, Check, X, Loader2 } from 'lucide-react'
import { alternativesApi } from '../../api/alternatives'
import type { AlternativeWithConsequences } from '../../api/alternatives'
import { AlternativeCard } from './AlternativeCard'

interface Suggestion {
  name: string
  description: string
}

interface AlternativesListProps {
  projectId: string
  onAlternativesChange?: (alternatives: AlternativeWithConsequences[]) => void
}

export function AlternativesList({ projectId, onAlternativesChange }: AlternativesListProps) {
  const [items, setItems] = useState<AlternativeWithConsequences[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [acceptingIdx, setAcceptingIdx] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    alternativesApi.list(projectId)
      .then(data => {
        setItems(data)
        onAlternativesChange?.(data)
      })
      .catch(() => setError('Erro ao carregar alternativas.'))
      .finally(() => setLoading(false))
  }, [projectId])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      const created = await alternativesApi.create(projectId, {
        name,
        order_index: items.length,
      })
      const updated = [...items, { alternative: created, consequences: [] }]
      setItems(updated)
      onAlternativesChange?.(updated)
      setNewName('')
      setAdding(false)
    } catch {
      setError('Erro ao criar alternativa.')
    }
  }

  const handleUpdate = async (id: string, data: { name?: string; description?: string; is_status_quo?: number }) => {
    try {
      const updated = await alternativesApi.update(projectId, id, data)
      setItems(prev => {
        const next = prev.map(item =>
          item.alternative.id === id ? { ...item, alternative: updated } : item
        )
        onAlternativesChange?.(next)
        return next
      })
    } catch {
      setError('Erro ao atualizar alternativa.')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await alternativesApi.remove(projectId, id)
      setItems(prev => {
        const next = prev.filter(item => item.alternative.id !== id)
        onAlternativesChange?.(next)
        return next
      })
    } catch {
      setError('Erro ao remover alternativa.')
    }
  }

  const handleSuggest = async () => {
    setSuggesting(true)
    setError(null)
    setSuggestions([])
    try {
      const { suggestions: s } = await alternativesApi.suggestNames(projectId)
      if (s.length === 0) {
        setError('NOVA não conseguiu gerar sugestões. Tente adicionar mais objetivos fundamentais ao projeto.')
        return
      }
      setSuggestions(s)
    } catch {
      setError('Erro ao gerar sugestões com NOVA.')
    } finally {
      setSuggesting(false)
    }
  }

  const handleAcceptSuggestion = async (idx: number) => {
    const s = suggestions[idx]
    if (!s) return
    setAcceptingIdx(idx)
    try {
      const created = await alternativesApi.create(projectId, {
        name: s.name,
        description: s.description,
        source: 'nova',
        order_index: items.length,
      })
      const updated = [...items, { alternative: created, consequences: [] }]
      setItems(updated)
      onAlternativesChange?.(updated)
      setSuggestions(prev => prev.filter((_, i) => i !== idx))
    } catch {
      setError('Erro ao aceitar sugestão.')
    } finally {
      setAcceptingIdx(null)
    }
  }

  const handleRejectSuggestion = (idx: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== idx))
  }

  if (loading) {
    return (
      <div
        className="rounded-xl h-24 animate-pulse"
        style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>
          Alternativas de Decisão
        </h3>
        <button
          onClick={handleSuggest}
          disabled={suggesting}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          style={{
            background: 'rgba(52,211,153,0.08)',
            border: '1px solid rgba(52,211,153,0.25)',
            color: '#34d399',
          }}
        >
          {suggesting ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {suggesting ? 'Gerando...' : 'Sugerir com NOVA'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div
          className="text-sm rounded-lg px-3 py-2"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          {error}
        </div>
      )}

      {/* AI Suggestions panel */}
      {suggestions.length > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: 'rgba(52,211,153,0.05)', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={13} style={{ color: '#34d399' }} />
            <span className="text-xs font-semibold" style={{ color: '#34d399' }}>
              NOVA sugeriu {suggestions.length} alternativa{suggestions.length !== 1 ? 's' : ''}
            </span>
            <span className="text-xs" style={{ color: '#475569' }}>
              — aceite ou recuse cada uma
            </span>
          </div>

          <div className="space-y-2">
            {suggestions.map((s, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg px-3 py-2.5"
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{s.name}</p>
                  {s.description && (
                    <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{s.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleAcceptSuggestion(idx)}
                    disabled={acceptingIdx === idx}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}
                    title="Aceitar"
                  >
                    {acceptingIdx === idx
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Check size={13} />
                    }
                  </button>
                  <button
                    onClick={() => handleRejectSuggestion(idx)}
                    disabled={acceptingIdx === idx}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: 'rgba(239,68,68,0.08)', color: '#f87171' }}
                    title="Recusar"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {suggestions.length > 1 && (
            <button
              onClick={() => setSuggestions([])}
              className="text-xs"
              style={{ color: '#334155' }}
            >
              Descartar todas
            </button>
          )}
        </div>
      )}

      {/* Existing alternatives */}
      <div className="space-y-3">
        {items.map(item => (
          <AlternativeCard
            key={item.alternative.id}
            alternative={item.alternative}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Add manually */}
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') { setAdding(false); setNewName('') }
            }}
            placeholder="Nome da nova alternativa"
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
            style={{
              background: '#0e0e13',
              border: '1px solid rgba(232,121,249,0.4)',
              color: '#f1f5f9',
              borderRadius: '8px',
            }}
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm rounded-lg font-medium"
            style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
          >
            Adicionar
          </button>
          <button
            onClick={() => { setAdding(false); setNewName('') }}
            className="px-4 py-2 text-sm rounded-lg"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#64748b', background: 'transparent' }}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm w-full px-4 py-3 rounded-lg transition-colors"
          style={{
            border: '2px dashed rgba(255,255,255,0.1)',
            color: '#475569',
            background: 'transparent',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(232,121,249,0.3)'
            e.currentTarget.style.color = '#e879f9'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            e.currentTarget.style.color = '#475569'
          }}
        >
          <Plus size={16} />
          Adicionar alternativa manualmente
        </button>
      )}
    </div>
  )
}
