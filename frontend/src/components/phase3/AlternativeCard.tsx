import { useState } from 'react'
import { Trash2, Star } from 'lucide-react'
import type { Alternative } from '../../api/alternatives'

interface AlternativeCardProps {
  alternative: Alternative
  onUpdate: (id: string, data: { name?: string; description?: string; is_status_quo?: number }) => void
  onDelete: (id: string) => void
}

export function AlternativeCard({ alternative, onUpdate, onDelete }: AlternativeCardProps) {
  const [name, setName] = useState(alternative.name)
  const [description, setDescription] = useState(alternative.description)

  const handleNameBlur = () => {
    if (name !== alternative.name && name.trim()) {
      onUpdate(alternative.id, { name: name.trim() })
    }
  }

  const handleDescriptionBlur = () => {
    if (description !== alternative.description) {
      onUpdate(alternative.id, { description })
    }
  }

  const toggleStatusQuo = () => {
    onUpdate(alternative.id, { is_status_quo: alternative.is_status_quo ? 0 : 1 })
  }

  return (
    <div className={`bg-white rounded-lg border p-4 space-y-3 ${alternative.is_status_quo ? 'border-amber-300 bg-amber-50' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2">
        <button
          onClick={toggleStatusQuo}
          title={alternative.is_status_quo ? 'Status Quo (clique para remover)' : 'Marcar como Status Quo'}
          className={`p-1 rounded transition-colors ${alternative.is_status_quo ? 'text-amber-500 hover:text-amber-700' : 'text-gray-300 hover:text-amber-400'}`}
        >
          <Star size={16} fill={alternative.is_status_quo ? 'currentColor' : 'none'} />
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onBlur={handleNameBlur}
          className="flex-1 font-semibold text-gray-900 text-sm bg-transparent border-b border-transparent hover:border-gray-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5"
          placeholder="Nome da alternativa"
        />
        <button
          onClick={() => onDelete(alternative.id)}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
          title="Remover alternativa"
        >
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={handleDescriptionBlur}
        rows={2}
        className="w-full text-sm text-gray-600 bg-transparent border border-transparent hover:border-gray-200 focus:border-indigo-400 focus:outline-none rounded px-2 py-1 resize-none"
        placeholder="Descrição da alternativa (opcional)"
      />
      {alternative.is_status_quo === 1 && (
        <span className="inline-block text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
          Status Quo
        </span>
      )}
    </div>
  )
}
