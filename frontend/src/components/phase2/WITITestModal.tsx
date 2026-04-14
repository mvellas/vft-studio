import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { objectivesApi, type Objective } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'

interface WITITestModalProps {
  isOpen: boolean
  onClose: () => void
  objectiveId: string | null
  projectId: string
}

type ClassificationResult = {
  classification: string
  reasoning: string
}

const CLASSIFICATION_COPY: Record<string, { pillStyle: React.CSSProperties; text: string }> = {
  means: {
    pillStyle: { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' },
    text: 'Meio — Este objetivo e instrumental para atingir outro.',
  },
  fundamental: {
    pillStyle: { background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' },
    text: 'Fundamental — Este objetivo e um fim em si mesmo.',
  },
  strategic: {
    pillStyle: { background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' },
    text: 'Estrategico — Este objetivo esta alem do escopo da decisao atual.',
  },
}

export function WITITestModal({ isOpen, onClose, objectiveId, projectId }: WITITestModalProps) {
  const [whyAnswer, setWhyAnswer] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [result, setResult] = useState<ClassificationResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const objectives = useObjectivesStore(s => s.objectives)
  const fetchNetwork = useObjectivesStore(s => s.fetchNetwork)

  const objective: Objective | null =
    isOpen && objectiveId
      ? (objectives.find(o => o.id === objectiveId) ?? null)
      : null

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setWhyAnswer('')
      setResult(null)
      setErrorMessage(null)
      setClassifying(false)
    }
  }, [isOpen, objectiveId])

  const handleClassify = async () => {
    if (!objectiveId || !whyAnswer.trim()) return

    setClassifying(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const updated = await objectivesApi.witiClassify(projectId, {
        objective_id: objectiveId,
        why_answer: whyAnswer.trim(),
      })

      // Sync updated objective back to store
      useObjectivesStore.setState(state => ({
        objectives: state.objectives.map(o => (o.id === updated.id ? updated : o)),
      }))

      // Refresh network to pick up any new causal links
      await fetchNetwork(projectId)

      setResult({
        classification: updated.witi_classification ?? 'other',
        reasoning: updated.witi_answer ?? whyAnswer.trim(),
      })
    } catch {
      setErrorMessage(
        'Nao foi possivel conectar ao AXIOM. Verifique sua chave de API e tente novamente.',
      )
    } finally {
      setClassifying(false)
    }
  }

  const handleConfirm = () => {
    onClose()
  }

  if (!isOpen) return null

  const classifyDisabled = whyAnswer.trim().length === 0 || classifying
  const classificationInfo =
    result ? (CLASSIFICATION_COPY[result.classification] ?? CLASSIFICATION_COPY.means) : null

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="rounded-xl p-6 max-w-lg w-full space-y-4" style={{ background: '#13131f' }}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: '#f1f5f9' }}>WITI Test</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md transition-colors"
            style={{ color: '#64748b' }}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Objective statement */}
        {objective ? (
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm leading-relaxed" style={{ color: '#e2e8f0' }}>{objective.statement}</p>
          </div>
        ) : (
          <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm italic" style={{ color: '#64748b' }}>Carregando objetivo...</p>
          </div>
        )}

        {/* Why question + textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
            {objective
              ? `Por que "${objective.statement}" e importante no contexto desta decisao?`
              : 'Por que este objetivo e importante no contexto desta decisao?'}
          </label>
          <textarea
            value={whyAnswer}
            onChange={e => setWhyAnswer(e.target.value)}
            placeholder="Descreva por que este objetivo e relevante..."
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '100px', resize: 'none' as const }}
            className="w-full p-3 text-sm focus:outline-none"
            disabled={classifying}
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-lg p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-sm" style={{ color: '#f87171' }}>{errorMessage}</p>
          </div>
        )}

        {/* Classification result */}
        {result && classificationInfo && (
          <div className="space-y-2">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={classificationInfo.pillStyle}
            >
              {classificationInfo.text}
            </span>
            {result.reasoning && (
              <p className="text-sm" style={{ color: '#94a3b8' }}>{result.reasoning}</p>
            )}
            {result.classification === 'fundamental' && (
              <div className="rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                <p className="text-sm" style={{ color: '#34d399' }}>
                  Este objetivo sera encaminhado para o Controle de Consequencias.
                </p>
              </div>
            )}
          </div>
        )}

        {/* CTA buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {result ? (
            <button
              type="button"
              onClick={handleConfirm}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
            >
              Confirmar
            </button>
          ) : classifying ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed"
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Classificando...
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClassify}
                disabled={classifyDisabled}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
              >
                Classificar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
