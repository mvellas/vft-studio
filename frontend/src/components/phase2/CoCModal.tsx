import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { objectivesApi, type Objective } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'

interface CoCModalProps {
  isOpen: boolean
  onClose: () => void
  objectiveId: string | null
  projectId: string
}

type Step = 'q1' | 'q2' | 'evaluating' | 'result' | 'refining'

interface CoCResultState {
  q1_result: string
  q2_result: string
  refinement_needed: boolean
  refined_statement: string | null
  reasoning: string
}

function determineAction(q1: string, q2: string): { action: string; refinement_needed: boolean } {
  if (q1 === 'aligned' && q2 === 'internal') return { action: 'confirmed', refinement_needed: false }
  if (q1 === 'aligned' && q2 === 'external') return { action: 'refine_scope', refinement_needed: true }
  return { action: 'reclassify_strategic', refinement_needed: false }
}

export function CoCModal({ isOpen, onClose, objectiveId, projectId }: CoCModalProps) {
  const [step, setStep] = useState<Step>('q1')
  const [q1Answer, setQ1Answer] = useState('')
  const [q2Answer, setQ2Answer] = useState('')
  const [result, setResult] = useState<CoCResultState | null>(null)
  const [refinedStatement, setRefinedStatement] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const objectives = useObjectivesStore(s => s.objectives)
  const updateObjectiveInStore = useObjectivesStore(s => s.updateObjective)

  const objective: Objective | null =
    isOpen && objectiveId
      ? (objectives.find(o => o.id === objectiveId) ?? null)
      : null

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep('q1')
      setQ1Answer('')
      setQ2Answer('')
      setResult(null)
      setRefinedStatement('')
      setErrorMessage(null)
      setSaving(false)
    }
  }, [isOpen, objectiveId])

  // Trigger API call when step transitions to 'evaluating'
  useEffect(() => {
    if (step !== 'evaluating' || !objectiveId) return

    let cancelled = false

    const evaluate = async () => {
      setErrorMessage(null)
      try {
        const updated = await objectivesApi.cocEvaluate(projectId, {
          objective_id: objectiveId,
          q1_answer: q1Answer.trim(),
          q2_answer: q2Answer.trim(),
        })

        if (cancelled) return

        // Sync updated objective back to store
        useObjectivesStore.setState(state => ({
          objectives: state.objectives.map(o => (o.id === updated.id ? updated : o)),
        }))

        const q1 = updated.coc_q1_result || 'aligned'
        const q2 = updated.coc_q2_result || 'internal'
        const action = determineAction(q1, q2)

        const resultState: CoCResultState = {
          q1_result: q1,
          q2_result: q2,
          refinement_needed: action.refinement_needed,
          refined_statement: updated.refined_statement ?? null,
          reasoning: updated.coc_q2_answer || q2Answer.trim(),
        }

        setResult(resultState)
        setRefinedStatement(resultState.refined_statement ?? '')

        if (action.refinement_needed) {
          setStep('refining')
        } else {
          setStep('result')
        }
      } catch {
        if (cancelled) return
        setErrorMessage(
          'Nao foi possivel conectar ao AXIOM. Verifique sua chave de API e tente novamente.',
        )
        setStep('q2')
      }
    }

    evaluate()
    return () => { cancelled = true }
  }, [step, objectiveId, projectId, q1Answer, q2Answer])

  const handleConfirmRefinement = async () => {
    if (!objectiveId || !refinedStatement.trim()) return

    setSaving(true)
    try {
      await updateObjectiveInStore(projectId, objectiveId, {
        refined_statement: refinedStatement.trim(),
        statement: refinedStatement.trim(),
      })
      onClose()
    } catch {
      setErrorMessage('Nao foi possivel salvar o refinamento. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const resultBadge = (): { className: string; label: string } => {
    if (!result) return { className: '', label: '' }
    if (result.q1_result === 'aligned' && result.q2_result === 'internal') {
      return {
        className: 'bg-emerald-100 text-emerald-700',
        label: 'Confirmado — Objetivo fundamental validado',
      }
    }
    return {
      className: 'bg-amber-100 text-amber-700',
      label: 'Reclassificado — Objetivo reclassificado como estrategico',
    }
  }

  const badge = resultBadge()

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
          <h2 className="text-xl font-semibold text-gray-900">Controle de Consequencias</h2>
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

        {/* Step: Q1 */}
        {step === 'q1' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Este objetivo contribui para os objetivos estrategicos deste contexto de decisao?
            </label>
            <textarea
              value={q1Answer}
              onChange={e => setQ1Answer(e.target.value)}
              placeholder="Descreva como este objetivo se relaciona com os objetivos estrategicos..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
              style={{ minHeight: '80px' }}
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep('q2')}
                disabled={q1Answer.trim().length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Proxima
              </button>
            </div>
          </div>
        )}

        {/* Step: Q2 */}
        {step === 'q2' && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Ha alguma forma de influenciar o alcance deste objetivo por meios fora do escopo desta decisao?
            </label>
            <textarea
              value={q2Answer}
              onChange={e => setQ2Answer(e.target.value)}
              placeholder="Descreva se e como o objetivo poderia ser influenciado externamente..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
              style={{ minHeight: '80px' }}
            />
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}
            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => setStep('q1')}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep('evaluating')}
                disabled={q2Answer.trim().length === 0}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Avaliar
              </button>
            </div>
          </div>
        )}

        {/* Step: Evaluating */}
        {step === 'evaluating' && (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm text-gray-600">Avaliando com AXIOM...</p>
          </div>
        )}

        {/* Step: Result (no refinement needed) */}
        {step === 'result' && result && (
          <div className="space-y-3">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
            {result.reasoning && (
              <p className="text-sm text-gray-600 leading-relaxed">{result.reasoning}</p>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        {/* Step: Refining */}
        {step === 'refining' && result && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              O enunciado do objetivo precisa ser refinado para se adequar ao escopo da decisao.
            </p>
            <textarea
              value={refinedStatement}
              onChange={e => setRefinedStatement(e.target.value)}
              placeholder="Edite o enunciado refinado do objetivo..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent resize-none"
              style={{ minHeight: '80px' }}
            />
            {errorMessage && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRefinement}
                disabled={refinedStatement.trim().length === 0 || saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Refinamento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
