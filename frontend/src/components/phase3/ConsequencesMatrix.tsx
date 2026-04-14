import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { alternativesApi } from '../../api/alternatives'
import type { AlternativeWithConsequences, Consequence } from '../../api/alternatives'
import type { Objective } from '../../api/objectives'

interface ConsequencesMatrixProps {
  projectId: string
  fundamentals: Objective[]
  alternatives: AlternativeWithConsequences[]
  onConsequenceUpdate?: (alternativeId: string, objectiveId: string, valueText: string) => void
}

interface CellKey {
  alternativeId: string
  objectiveId: string
}

function getCellValue(
  consequences: Consequence[],
  objectiveId: string
): string {
  return consequences.find(c => c.objective_id === objectiveId)?.value_text ?? ''
}

export function ConsequencesMatrix({
  projectId,
  fundamentals,
  alternatives,
  onConsequenceUpdate,
}: ConsequencesMatrixProps) {
  const [cellValues, setCellValues] = useState<Record<string, string>>({})
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [suggestingRow, setSuggestingRow] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<CellKey | null>(null)

  // Initialize cell values from loaded consequences
  useEffect(() => {
    const values: Record<string, string> = {}
    for (const item of alternatives) {
      for (const obj of fundamentals) {
        const key = `${item.alternative.id}:${obj.id}`
        values[key] = getCellValue(item.consequences, obj.id)
      }
    }
    setCellValues(values)
  }, [alternatives, fundamentals])

  const cellKey = (altId: string, objId: string) => `${altId}:${objId}`

  const handleCellSave = useCallback(async (altId: string, objId: string, value: string) => {
    const key = cellKey(altId, objId)
    setSavingCell(key)
    try {
      await alternativesApi.upsertConsequence(projectId, altId, objId, { value_text: value })
      onConsequenceUpdate?.(altId, objId, value)
    } finally {
      setSavingCell(null)
    }
  }, [projectId, onConsequenceUpdate])

  const handleCellBlur = (altId: string, objId: string) => {
    const key = cellKey(altId, objId)
    const value = cellValues[key] ?? ''
    setEditingCell(null)
    handleCellSave(altId, objId, value)
  }

  const handleSuggestRow = async (altId: string) => {
    setSuggestingRow(altId)
    try {
      const { suggestions } = await alternativesApi.suggestConsequences(projectId, altId)
      const updates: Record<string, string> = {}
      for (const s of suggestions) {
        const key = cellKey(altId, s.objective_id)
        updates[key] = s.value_text
      }
      setCellValues(prev => ({ ...prev, ...updates }))
      // Persist all suggestions
      await Promise.all(
        suggestions.map(s =>
          alternativesApi.upsertConsequence(projectId, altId, s.objective_id, { value_text: s.value_text })
        )
      )
    } finally {
      setSuggestingRow(null)
    }
  }

  const totalCells = alternatives.length * fundamentals.length
  const filledCells = Object.values(cellValues).filter(v => v.trim().length > 0).length
  const progressPct = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0

  if (fundamentals.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Nenhum objetivo fundamental definido. Complete a Fase 2 primeiro.
      </div>
    )
  }

  if (alternatives.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-8">
        Adicione alternativas para preencher a matriz de consequências.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">Matriz de Consequências</h3>
        <span className="text-xs text-gray-500">
          {filledCells}/{totalCells} células preenchidas ({progressPct}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Matrix table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-600 text-xs w-40 sticky left-0 bg-gray-50 z-10">
                Alternativa
              </th>
              {fundamentals.map(obj => (
                <th
                  key={obj.id}
                  className="text-left px-3 py-2 font-medium text-gray-600 text-xs min-w-[160px] max-w-[200px]"
                  title={obj.statement}
                >
                  <span className="line-clamp-2">{obj.statement}</span>
                </th>
              ))}
              <th className="px-3 py-2 text-xs text-gray-400 font-medium">NOVA</th>
            </tr>
          </thead>
          <tbody>
            {alternatives.map((item, rowIdx) => {
              const alt = item.alternative
              return (
                <tr
                  key={alt.id}
                  className={`border-b border-gray-100 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${alt.is_status_quo ? 'bg-amber-50/50' : ''}`}
                >
                  {/* Alternative name cell */}
                  <td className="px-3 py-2 sticky left-0 z-10 bg-inherit">
                    <div className="font-medium text-gray-900 text-xs truncate max-w-[130px]" title={alt.name}>
                      {alt.name}
                    </div>
                    {alt.is_status_quo === 1 && (
                      <span className="text-[10px] text-amber-600">Status Quo</span>
                    )}
                  </td>

                  {/* Consequence cells */}
                  {fundamentals.map(obj => {
                    const key = cellKey(alt.id, obj.id)
                    const value = cellValues[key] ?? ''
                    const isEditing =
                      editingCell?.alternativeId === alt.id &&
                      editingCell?.objectiveId === obj.id
                    const isSaving = savingCell === key

                    return (
                      <td key={obj.id} className="px-2 py-1.5 min-w-[160px] max-w-[200px] align-top">
                        {isEditing ? (
                          <textarea
                            autoFocus
                            value={value}
                            onChange={e => setCellValues(prev => ({ ...prev, [key]: e.target.value }))}
                            onBlur={() => handleCellBlur(alt.id, obj.id)}
                            rows={3}
                            style={{ background: '#0e0e13', border: '1px solid rgba(232,121,249,0.4)', color: '#f1f5f9', borderRadius: '8px', resize: 'none' as const }}
                            className="w-full text-xs px-2 py-1 focus:outline-none"
                          />
                        ) : (
                          <div
                            onClick={() => setEditingCell({ alternativeId: alt.id, objectiveId: obj.id })}
                            className={`min-h-[48px] text-xs rounded px-2 py-1 cursor-text transition-colors ${
                              value
                                ? 'text-gray-700 hover:bg-indigo-50'
                                : 'text-gray-300 hover:bg-gray-50 italic'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            {isSaving ? (
                              <Loader2 size={12} className="animate-spin text-indigo-400" />
                            ) : (
                              value || 'Clique para editar...'
                            )}
                          </div>
                        )}
                      </td>
                    )
                  })}

                  {/* NOVA suggest button */}
                  <td className="px-2 py-1.5 text-center">
                    <button
                      onClick={() => handleSuggestRow(alt.id)}
                      disabled={suggestingRow === alt.id}
                      title="NOVA sugere consequências para esta alternativa"
                      className="p-1.5 text-indigo-400 hover:text-indigo-600 disabled:opacity-40 transition-colors rounded hover:bg-indigo-50"
                    >
                      {suggestingRow === alt.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Clique em qualquer célula para editar. Use NOVA para sugerir consequências automaticamente por linha.
      </p>
    </div>
  )
}
