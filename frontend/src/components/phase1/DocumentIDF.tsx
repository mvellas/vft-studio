import { useEffect, useState } from 'react'
import { decisionFrameApi, type IDFData } from '../../api/decisionFrame'
import { phasesApi } from '../../api/phases'

interface DocumentIDFProps {
  projectId: string
  onStepComplete: () => void
}

interface IDFFieldProps {
  label: string
  value: string
}

function IDFField({ label, value }: IDFFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      {value.trim() ? (
        <div className="bg-gray-50 rounded p-4 text-sm text-gray-800 whitespace-pre-wrap">
          {value}
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm text-amber-700 italic">
          Campo nao preenchido — volte ao passo anterior para completar.
        </div>
      )}
    </div>
  )
}

export function DocumentIDF({ projectId, onStepComplete }: DocumentIDFProps) {
  const [idf, setIdf] = useState<IDFData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    decisionFrameApi
      .get(projectId)
      .then(data => {
        setIdf(data)
      })
      .catch(() => {
        setError('Erro ao carregar o Quadro Decisorio Inicial.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [projectId])

  const allFieldsFilled =
    idf !== null &&
    idf.idf_purpose.trim() !== '' &&
    idf.idf_perspective.trim() !== '' &&
    idf.idf_scope.trim() !== ''

  async function handleConfirm() {
    if (!allFieldsFilled || confirming) return
    setConfirming(true)
    setError(null)
    try {
      await decisionFrameApi.document(projectId)
      await phasesApi.completeStep(projectId, { data: { idf_documented: true } })
      onStepComplete()
    } catch {
      setError('Erro ao confirmar o IDF. Tente novamente.')
    } finally {
      setConfirming(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-sm text-gray-500">Carregando Quadro Decisorio Inicial...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-base">
            Revisao do Quadro Decisorio Inicial (IDF)
          </h3>
          <p className="text-sm text-gray-500 mt-1">Passo 1.6 — Documentacao do IDF</p>
        </div>
        {idf?.idf_documented_at && (
          <span className="shrink-0 text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
            Documentado
          </span>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* IDF Fields — read-only */}
      <div className="space-y-4">
        <IDFField label="Proposito (Purpose)" value={idf?.idf_purpose ?? ''} />
        <IDFField label="Perspectiva (Perspective)" value={idf?.idf_perspective ?? ''} />
        <IDFField label="Escopo (Scope)" value={idf?.idf_scope ?? ''} />
      </div>

      <div className="border-t border-gray-100" />

      {/* Confirmation section */}
      <div className="space-y-4">
        <div className="pl-4 border-l-2 border-blue-500">
          <p className="text-sm text-gray-700">
            Revise o Quadro Decisorio Inicial acima. Ao confirmar, o IDF sera documentado com
            timestamp e servira como referencia para todo o processo VFT.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!allFieldsFilled && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">
            Preencha todos os campos do IDF (Proposito, Perspectiva e Escopo) antes de confirmar.
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!allFieldsFilled || confirming}
          className={[
            'w-full py-2.5 px-4 rounded-lg text-sm font-medium transition-colors',
            allFieldsFilled && !confirming
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          {confirming ? 'Confirmando...' : 'Confirmar e Documentar'}
        </button>
      </div>
    </div>
  )
}
