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

const CLASSIFICATION_COPY: Record<string, { pill: string; text: string; textColor: string }> = {
  means: {
    pill: 'bg-amber-100 text-amber-700',
    text: 'Meio — Este objetivo e instrumental para atingir outro.',
    textColor: 'text-amber-700',
  },
  fundamental: {
    pill: 'bg-purple-100 text-purple-700',
    text: 'Fundamental — Este objetivo e um fim em si mesmo.',
    textColor: 'text-purple-700',
  },
  strategic: {
    pill: 'bg-blue-100 text-blue-700',
    text: 'Estrategico — Este objetivo esta alem do escopo da decisao atual.',
    textColor: 'text-blue-700',
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
      <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">WITI Test</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Objective statement */}
        {objective ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-700 leading-relaxed">{objective.statement}</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm text-gray-400 italic">Carregando objetivo...</p>
          </div>
        )}

        {/* Why question + textarea */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {objective
              ? `Por que "${objective.statement}" e importante no contexto desta decisao?`
              : 'Por que este objetivo e importante no contexto desta decisao?'}
          </label>
          <textarea
            value={whyAnswer}
            onChange={e => setWhyAnswer(e.target.value)}
            placeholder="Descreva por que este objetivo e relevante..."
            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
            style={{ minHeight: '100px' }}
            disabled={classifying}
          />
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        {/* Classification result */}
        {result && classificationInfo && (
          <div className="space-y-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${classificationInfo.pill}`}
            >
              {classificationInfo.text}
            </span>
            {result.reasoning && (
              <p className="text-sm text-gray-600">{result.reasoning}</p>
            )}
            {result.classification === 'fundamental' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-sm text-emerald-700">
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
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Confirmar
            </button>
          ) : classifying ? (
            <button
              type="button"
              disabled
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium opacity-80 cursor-not-allowed"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              Classificando...
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClassify}
                disabled={classifyDisabled}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
