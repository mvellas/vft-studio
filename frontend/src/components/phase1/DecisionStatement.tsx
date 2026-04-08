import { useState, useEffect } from 'react'
import { decisionFrameApi } from '../../api/decisionFrame'
import { phasesApi } from '../../api/phases'

interface DecisionStatementProps {
  projectId: string
  onStepComplete: () => void
}

export function DecisionStatement({ projectId, onStepComplete }: DecisionStatementProps) {
  const [statement, setStatement] = useState('')
  const [validated, setValidated] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedIndicator, setSavedIndicator] = useState(false)

  // Fetch existing DS on mount
  useEffect(() => {
    decisionFrameApi
      .get(projectId)
      .then(data => {
        setStatement(data.decision_statement ?? '')
        setValidated(data.decision_statement_validated === 1)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      })
  }, [projectId])

  const handleGenerateDS = async () => {
    setGenerating(true)
    setError(null)
    try {
      const result = await decisionFrameApi.generateDS(projectId, statement)
      setStatement(result.decision_statement)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar enunciado')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!statement.trim()) return
    setSaving(true)
    setError(null)
    try {
      await decisionFrameApi.saveDS(projectId, statement, validated)
      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    if (!statement.trim() || !validated || completing) return
    setCompleting(true)
    setError(null)
    try {
      await decisionFrameApi.saveDS(projectId, statement, true)
      await phasesApi.completeStep(projectId, {
        data: {
          decision_statement: statement,
          decision_statement_validated: 1,
        },
      })
      onStepComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir fase')
    } finally {
      setCompleting(false)
    }
  }

  const canComplete = statement.trim() !== '' && validated

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Enunciado da Decisao (Decision Statement)
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Formule um enunciado conciso que capture o proposito, perspectiva e escopo da decisao.
          Formato sugerido: &quot;Decidir [qual/como/se/quando] + [acao]&quot;.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Textarea */}
      <div className="space-y-3">
        <textarea
          value={statement}
          onChange={e => setStatement(e.target.value)}
          placeholder="Ex: Decidir qual estrategia de expansao adotar para os proximos 5 anos, considerando a perspectiva dos acionistas e dentro do escopo do mercado latino-americano."
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] resize-y"
        />

        {/* Gerar com IA button */}
        <button
          type="button"
          onClick={handleGenerateDS}
          disabled={generating}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
        >
          {generating ? 'Gerando...' : 'Gerar com IA'}
        </button>
      </div>

      {/* Validation section */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <p className="text-xs text-gray-500">
          O enunciado deve seguir o formato &quot;Decidir + [interrogativa] + [acao]&quot;.
          A validacao e consultiva — voce tem a palavra final.
        </p>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={validated}
            onChange={e => setValidated(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">
            Confirmo que este enunciado da decisao e valido e reflete adequadamente o quadro decisorio.
          </span>
        </label>
      </div>

      {/* Save + Complete section */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={!statement.trim() || saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          {savedIndicator && (
            <span className="text-xs text-green-600">Salvo</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleComplete}
          disabled={!canComplete || completing}
          className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-base transition-colors"
        >
          {completing ? 'Concluindo...' : 'Validar e Concluir Fase 1'}
        </button>
      </div>
    </div>
  )
}
