import { useState } from 'react'
import { Trash2, CheckCircle, Brain, FlaskConical, Lightbulb } from 'lucide-react'
import { objectivesApi, type Objective } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'

interface ObjectiveCardProps {
  objective: Objective
  projectId: string
  onWITI: (id: string) => void
  onCoC: (id: string) => void
}

type BadgeInfo = { bg: string; text: string; label: string }

const TYPE_BADGE: Record<string, BadgeInfo> = {
  means: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Meio' },
  fundamental: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Fundamental' },
  strategic: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Estrategico' },
  uncategorized: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Nao categorizado' },
}

export function ObjectiveCard({ objective, projectId, onWITI, onCoC }: ObjectiveCardProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(objective.statement)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [suggestion, setSuggestion] = useState<{ suggested_type: string; reasoning: string } | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [showSuggestion, setShowSuggestion] = useState(false)
  const [typeOverride, setTypeOverride] = useState<string | null>(null)

  const updateObjective = useObjectivesStore(s => s.updateObjective)
  const removeObjective = useObjectivesStore(s => s.removeObjective)

  const currentType = typeOverride ?? objective.type ?? 'uncategorized'
  const badge = TYPE_BADGE[currentType] ?? TYPE_BADGE.uncategorized

  const witiDone = !!objective.witi_classification
  const cocDone = !!objective.coc_q1_result
  const showCoC = objective.type === 'fundamental' || objective.is_fundamental_candidate === 1

  const handleBlur = async () => {
    if (!editing) return
    setEditing(false)
    if (editValue.trim() === objective.statement) return

    setSavingEdit(true)
    try {
      await updateObjective(projectId, objective.id, { statement: editValue.trim() })
    } catch {
      setEditValue(objective.statement)
    } finally {
      setSavingEdit(false)
    }
  }

  const handleTypeChange = async (newType: string) => {
    setTypeOverride(newType)
    try {
      await updateObjective(projectId, objective.id, { type: newType })
    } catch {
      setTypeOverride(null)
    }
  }

  const handleSuggest = async () => {
    setSuggesting(true)
    setShowSuggestion(false)
    try {
      const result = await objectivesApi.suggestCategory(projectId, objective.id)
      setSuggestion(result)
      setShowSuggestion(true)
    } catch {
      // suggestion is advisory — silently ignore errors
    } finally {
      setSuggesting(false)
    }
  }

  const handleDelete = async () => {
    try {
      await removeObjective(projectId, objective.id)
    } catch {
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
      {/* Header: badge + type selector */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}
          >
            {badge.label}
          </span>
        </div>

        <select
          value={currentType}
          onChange={e => handleTypeChange(e.target.value)}
          className="text-xs border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-600 focus:ring-1 focus:ring-indigo-500"
        >
          <option value="uncategorized">Nao categorizado</option>
          <option value="means">Meio</option>
          <option value="fundamental">Fundamental</option>
          <option value="strategic">Estrategico</option>
        </select>
      </div>

      {/* Statement — double-click to edit */}
      <div
        onDoubleClick={() => {
          setEditing(true)
          setEditValue(objective.statement)
        }}
        className="min-h-[2.5rem]"
        title="Duplo clique para editar"
      >
        {editing ? (
          <textarea
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-sm border border-indigo-400 rounded-md p-1 focus:ring-1 focus:ring-indigo-500 resize-none"
            rows={3}
          />
        ) : (
          <p className={`text-sm text-gray-800 leading-relaxed ${savingEdit ? 'opacity-50' : ''}`}>
            {objective.statement}
          </p>
        )}
      </div>

      {/* AXIOM suggestion popover */}
      {showSuggestion && suggestion && (
        <div className="border border-indigo-200 bg-indigo-50 rounded-md p-3 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-indigo-700">
              Sugestao AXIOM: {suggestion.suggested_type}
            </span>
            <button
              type="button"
              onClick={() => setShowSuggestion(false)}
              className="text-indigo-400 hover:text-indigo-600"
            >
              ×
            </button>
          </div>
          <p className="text-gray-600">{suggestion.reasoning}</p>
          <button
            type="button"
            onClick={() => {
              handleTypeChange(suggestion.suggested_type)
              setShowSuggestion(false)
            }}
            className="mt-1 text-xs text-indigo-600 hover:underline font-medium"
          >
            Aplicar sugestao
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-1 border-t border-gray-100">
        {/* Suggest with AXIOM */}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          title="Sugerir com AXIOM"
          className="flex items-center gap-1 px-2 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] justify-center"
        >
          <Brain className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sugerir com AXIOM</span>
        </button>

        {/* WITI Test */}
        <button
          type="button"
          onClick={() => !witiDone && onWITI(objective.id)}
          disabled={witiDone}
          title={witiDone ? 'WITI Test ja aplicado' : 'Aplicar WITI Test'}
          className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border transition-colors min-w-[44px] min-h-[44px] justify-center ${
            witiDone
              ? 'border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          {witiDone ? (
            <CheckCircle className="w-3.5 h-3.5" />
          ) : (
            <FlaskConical className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">{witiDone ? 'WITI feito' : 'Aplicar WITI Test'}</span>
        </button>

        {/* CoC — only for fundamentals */}
        {showCoC && (
          <button
            type="button"
            onClick={() => !cocDone && onCoC(objective.id)}
            disabled={cocDone}
            title={cocDone ? 'CoC ja aplicado' : 'Aplicar CoC'}
            className={`flex items-center gap-1 px-2 py-1.5 text-xs rounded-md border transition-colors min-w-[44px] min-h-[44px] justify-center ${
              cocDone
                ? 'border-emerald-200 text-emerald-600 bg-emerald-50 cursor-default'
                : 'border-purple-200 text-purple-600 hover:bg-purple-50'
            }`}
          >
            {cocDone ? (
              <CheckCircle className="w-3.5 h-3.5" />
            ) : (
              <Lightbulb className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{cocDone ? 'CoC feito' : 'CoC'}</span>
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Delete */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">
              Remover este objetivo? Todas as relacoes causais associadas tambem serao removidas. Esta acao nao pode ser desfeita.
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 text-xs border border-gray-200 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Remover Objetivo"
            className="flex items-center justify-center w-[44px] h-[44px] text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
