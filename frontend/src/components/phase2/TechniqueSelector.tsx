import { useState, useEffect, useRef } from 'react'
import { decisionFrameApi } from '../../api/decisionFrame'

interface TechniqueSelectorProps {
  projectId: string
  onSelect: (tech: string) => void
}

const TECHNIQUES = [
  {
    value: 'platinum',
    label: 'Platinum',
    description: 'Entrevistas individuais completas com todos os dispositivos VFT',
  },
  {
    value: 'gold',
    label: 'Gold',
    description: 'Analise de documentos organizacionais + dispositivos selecionados',
  },
  {
    value: 'silver',
    label: 'Silver',
    description: 'WishList + dispositivos essenciais (abordagem simplificada)',
  },
  {
    value: 'combined',
    label: 'Combined',
    description: 'Combinacao de tecnicas conforme contexto do stakeholder',
  },
] as const

export function TechniqueSelector({ projectId, onSelect }: TechniqueSelectorProps) {
  const [selected, setSelected] = useState<string>('platinum')
  const [saving, setSaving] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    decisionFrameApi
      .get(projectId)
      .then(data => {
        if (data.qualitative_modeling_tech) {
          setSelected(data.qualitative_modeling_tech)
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar tecnica')
      })
  }, [projectId])

  const handleChange = (value: string) => {
    setSelected(value)
    onSelect(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaving(true)
      decisionFrameApi
        .save(projectId, { qualitative_modeling_tech: value })
        .then(() => {
          setSavedIndicator(true)
          setTimeout(() => setSavedIndicator(false), 1500)
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Erro ao salvar tecnica')
        })
        .finally(() => setSaving(false))
    }, 2000)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Tecnica de Elicitacao de Valores
        </h3>
        <span className="text-xs text-gray-400">
          {saving && 'Salvando...'}
          {savedIndicator && !saving && 'Salvo'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {TECHNIQUES.map(tech => (
          <label
            key={tech.value}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              selected === tech.value
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="technique"
              value={tech.value}
              checked={selected === tech.value}
              onChange={() => handleChange(tech.value)}
              className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
            />
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-semibold text-gray-900">{tech.label}</span>
              <span className="block text-xs text-gray-500 mt-0.5">{tech.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
