import { useState, useEffect, useRef } from 'react'
import { decisionFrameApi } from '../../api/decisionFrame'
import { phasesApi } from '../../api/phases'

interface DecisionFrameFormProps {
  projectId: string
  variant: '1.2' | '1.3' | '1.5'
  onStepComplete: () => void
}

const VARIANT_INSTRUCTIONS: Record<'1.2' | '1.3' | '1.5', string> = {
  '1.2': 'Stakeholder unico: defina o quadro decisorio diretamente com base na sua perspectiva.',
  '1.3': 'DM unico / multiplos stakeholders: considere as perspectivas de todos os stakeholders ao definir o quadro.',
  '1.5': 'Multiplos DMs: consolide o resultado do workshop em um quadro decisorio unico.',
}

const FIELD_HELP: Record<'purpose' | 'perspective' | 'scope', string> = {
  purpose: 'Qual e a decisao a ser tomada? O que motivou esta decisao?',
  perspective: 'De quem e a perspectiva que guia esta decisao? Quais valores sao prioritarios?',
  scope: 'Quais sao os limites? O que esta dentro e fora do escopo?',
}

export function DecisionFrameForm({ projectId, variant, onStepComplete }: DecisionFrameFormProps) {
  const [purpose, setPurpose] = useState('')
  const [perspective, setPerspective] = useState('')
  const [scope, setScope] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [dirty, setDirty] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Fetch IDF data on mount
  useEffect(() => {
    decisionFrameApi
      .get(projectId)
      .then(data => {
        setPurpose(data.idf_purpose)
        setPerspective(data.idf_perspective)
        setScope(data.idf_scope)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      })
  }, [projectId])

  // Auto-save with 2s debounce whenever fields change
  useEffect(() => {
    if (!dirty) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaving(true)
      decisionFrameApi
        .save(projectId, {
          idf_purpose: purpose,
          idf_perspective: perspective,
          idf_scope: scope,
        })
        .then(() => {
          setDirty(false)
          setSavedIndicator(true)
          setTimeout(() => setSavedIndicator(false), 2000)
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Erro ao salvar')
        })
        .finally(() => setSaving(false))
    }, 2000)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [purpose, perspective, scope, dirty, projectId])

  const handleChange =
    (setter: React.Dispatch<React.SetStateAction<string>>) =>
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setter(e.target.value)
      setDirty(true)
    }

  const handleGenerateSuggestion = (field: 'purpose' | 'perspective' | 'scope') => {
    const currentValue =
      field === 'purpose' ? purpose : field === 'perspective' ? perspective : scope
    setGenerating(prev => ({ ...prev, [field]: true }))
    decisionFrameApi
      .generateSuggestion(projectId, field, currentValue)
      .then(suggestion => {
        if (field === 'purpose') setPurpose(suggestion)
        else if (field === 'perspective') setPerspective(suggestion)
        else setScope(suggestion)
        setDirty(true)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao gerar sugestao')
      })
      .finally(() => setGenerating(prev => ({ ...prev, [field]: false })))
  }

  const allFilled =
    purpose.trim().length > 0 && perspective.trim().length > 0 && scope.trim().length > 0

  const handleComplete = async () => {
    if (!allFilled || completing) return
    setCompleting(true)
    try {
      await decisionFrameApi.save(projectId, {
        idf_purpose: purpose,
        idf_perspective: perspective,
        idf_scope: scope,
      })
      await phasesApi.completeStep(projectId, {
        data: {
          idf_purpose: purpose,
          idf_perspective: perspective,
          idf_scope: scope,
        },
      })
      onStepComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir passo')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="rounded-lg p-6 space-y-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Variant instruction */}
      <div className="pl-4 border-l-2 border-blue-500">
        <p className="text-sm" style={{ color: '#60a5fa' }}>{VARIANT_INSTRUCTIONS[variant]}</p>
      </div>

      {error && (
        <div className="rounded-md p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {/* Proposito */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold" style={{ color: '#f8fafc' }}>
          Proposito
        </label>
        <p className="text-xs" style={{ color: '#64748b' }}>{FIELD_HELP.purpose}</p>
        <textarea
          value={purpose}
          onChange={handleChange(setPurpose)}
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '100px' }}
          className="w-full p-3 text-sm focus:outline-none"
          placeholder="Descreva o proposito da decisao..."
        />
        <button
          type="button"
          onClick={() => handleGenerateSuggestion('purpose')}
          disabled={generating['purpose']}
          className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: '#60a5fa' }}
        >
          {generating['purpose'] ? 'Gerando...' : 'Gerar sugestao com IA'}
        </button>
      </div>

      {/* Perspectiva */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold" style={{ color: '#f8fafc' }}>
          Perspectiva
        </label>
        <p className="text-xs" style={{ color: '#64748b' }}>{FIELD_HELP.perspective}</p>
        <textarea
          value={perspective}
          onChange={handleChange(setPerspective)}
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '100px' }}
          className="w-full p-3 text-sm focus:outline-none"
          placeholder="Descreva a perspectiva que guia esta decisao..."
        />
        <button
          type="button"
          onClick={() => handleGenerateSuggestion('perspective')}
          disabled={generating['perspective']}
          className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: '#60a5fa' }}
        >
          {generating['perspective'] ? 'Gerando...' : 'Gerar sugestao com IA'}
        </button>
      </div>

      {/* Escopo */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold" style={{ color: '#f8fafc' }}>
          Escopo
        </label>
        <p className="text-xs" style={{ color: '#64748b' }}>{FIELD_HELP.scope}</p>
        <textarea
          value={scope}
          onChange={handleChange(setScope)}
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '100px' }}
          className="w-full p-3 text-sm focus:outline-none"
          placeholder="Defina os limites do escopo..."
        />
        <button
          type="button"
          onClick={() => handleGenerateSuggestion('scope')}
          disabled={generating['scope']}
          className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ color: '#60a5fa' }}
        >
          {generating['scope'] ? 'Gerando...' : 'Gerar sugestao com IA'}
        </button>
      </div>

      {/* Save indicator + Complete button */}
      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-xs" style={{ color: '#334155' }}>
          {saving && 'Salvando...'}
          {savedIndicator && !saving && (
            <span style={{ color: '#34d399' }}>Salvo</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleComplete}
          disabled={!allFilled || completing}
          className="px-4 py-2 text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }}
        >
          {completing ? 'Concluindo...' : 'Concluir Passo'}
        </button>
      </div>
    </div>
  )
}
