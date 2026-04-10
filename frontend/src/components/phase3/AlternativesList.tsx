import { useState, useEffect } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { alternativesApi } from '../../api/alternatives'
import type { AlternativeWithConsequences } from '../../api/alternatives'
import { AlternativeCard } from './AlternativeCard'

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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    alternativesApi.list(projectId).then(data => {
      setItems(data)
      onAlternativesChange?.(data)
    }).catch(() => setError('Erro ao carregar alternativas.')).finally(() => setLoading(false))
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

  const handleSuggestWithNova = async () => {
    setSuggesting(true)
    setError(null)
    try {
      // Add status quo first if none exists
      const hasStatusQuo = items.some(i => i.alternative.is_status_quo)
      if (!hasStatusQuo) {
        const sq = await alternativesApi.create(projectId, {
          name: 'Status Quo',
          description: 'Situação atual — manter o estado presente sem mudanças significativas.',
          source: 'nova',
          is_status_quo: 1,
          order_index: 0,
        })
        setItems(prev => [{ alternative: sq, consequences: [] }, ...prev])
      }

      // TODO: integrate with chat to have NOVA suggest alternative names
      setError('Use o chat com NOVA para sugerir alternativas específicas ao seu contexto.')
    } finally {
      setSuggesting(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-lg h-24" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Alternativas de Decisão</h3>
        <button
          onClick={handleSuggestWithNova}
          disabled={suggesting}
          className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-400 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <Sparkles size={13} />
          {suggesting ? 'Sugerindo...' : 'Sugerir com NOVA'}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}

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
            className="flex-1 border border-indigo-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Adicionar
          </button>
          <button
            onClick={() => { setAdding(false); setNewName('') }}
            className="px-4 py-2 text-gray-600 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 border-2 border-dashed border-indigo-200 hover:border-indigo-400 rounded-lg px-4 py-3 w-full transition-colors"
        >
          <Plus size={16} />
          Adicionar alternativa
        </button>
      )}
    </div>
  )
}
