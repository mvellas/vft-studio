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
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b' }}>{label}</p>
      {value.trim() ? (
        <div className="rounded p-4 text-sm whitespace-pre-wrap" style={{ background: 'rgba(255,255,255,0.03)', color: '#f8fafc' }}>
          {value}
        </div>
      ) : (
        <div className="rounded p-4 text-sm italic" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
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
      <div className="rounded-lg p-6" style={{ background: '#0e0e13' }}>
        <p className="text-sm" style={{ color: '#64748b' }}>Carregando Quadro Decisorio Inicial...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-6 space-y-6" style={{ background: '#0e0e13' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-base" style={{ color: '#f8fafc' }}>
            Revisao do Quadro Decisorio Inicial (IDF)
          </h3>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>Passo 1.6 — Documentacao do IDF</p>
        </div>
        {idf?.idf_documented_at && (
          <span className="shrink-0 text-xs font-mono px-2 py-1 rounded" style={{ background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
            Documentado
          </span>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* IDF Fields — read-only */}
      <div className="space-y-4">
        <IDFField label="Proposito (Purpose)" value={idf?.idf_purpose ?? ''} />
        <IDFField label="Perspectiva (Perspective)" value={idf?.idf_perspective ?? ''} />
        <IDFField label="Escopo (Scope)" value={idf?.idf_scope ?? ''} />
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* Confirmation section */}
      <div className="space-y-4">
        <div className="pl-4 border-l-2 border-blue-500">
          <p className="text-sm" style={{ color: '#94a3b8' }}>
            Revise o Quadro Decisorio Inicial acima. Ao confirmar, o IDF sera documentado com
            timestamp e servira como referencia para todo o processo VFT.
          </p>
        </div>

        {error && (
          <div className="rounded p-3 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
            {error}
          </div>
        )}

        {!allFieldsFilled && (
          <div className="rounded p-3 text-sm" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
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
              ? 'bg-blue-600 text-white'
              : 'cursor-not-allowed',
          ].join(' ')}
          style={!(allFieldsFilled && !confirming) ? { background: 'rgba(255,255,255,0.06)', color: '#64748b' } : {}}
        >
          {confirming ? 'Confirmando...' : 'Confirmar e Documentar'}
        </button>
      </div>
    </div>
  )
}
