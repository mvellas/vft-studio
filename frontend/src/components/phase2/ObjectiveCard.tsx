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

type BadgeInfo = { style: React.CSSProperties; label: string }

const TYPE_BADGE: Record<string, BadgeInfo> = {
  means: { style: { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }, label: 'Meio' },
  fundamental: { style: { background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', color: '#a78bfa' }, label: 'Fundamental' },
  strategic: { style: { background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)', color: '#60a5fa' }, label: 'Estrategico' },
  uncategorized: { style: { background: 'rgba(255,255,255,0.03)', color: '#64748b' }, label: 'Nao categorizado' },
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
    <div className="rounded-lg p-4 space-y-3" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header: badge + type selector */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
            style={badge.style}
          >
            {badge.label}
          </span>
        </div>

        <select
          value={currentType}
          onChange={e => handleTypeChange(e.target.value)}
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
          className="text-xs px-1.5 py-0.5 focus:outline-none"
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
            style={{ background: '#0e0e13', border: '1px solid rgba(232,121,249,0.4)', color: '#f1f5f9', borderRadius: '8px', resize: 'none' as const }}
            className="w-full text-sm p-1 focus:outline-none"
            rows={3}
          />
        ) : (
          <p className={`text-sm leading-relaxed ${savingEdit ? 'opacity-50' : ''}`} style={{ color: '#f8fafc' }}>
            {objective.statement}
          </p>
        )}
      </div>

      {/* AXIOM suggestion popover */}
      {showSuggestion && suggestion && (
        <div className="rounded-md p-3 text-xs space-y-1" style={{ border: '1px solid rgba(232,121,249,0.25)', background: 'rgba(232,121,249,0.06)' }}>
          <div className="flex items-center justify-between">
            <span className="font-semibold" style={{ color: '#e879f9' }}>
              Sugestao AXIOM: {suggestion.suggested_type}
            </span>
            <button
              type="button"
              onClick={() => setShowSuggestion(false)}
              style={{ color: '#e879f9' }}
            >
              ×
            </button>
          </div>
          <p style={{ color: '#94a3b8' }}>{suggestion.reasoning}</p>
          <button
            type="button"
            onClick={() => {
              handleTypeChange(suggestion.suggested_type)
              setShowSuggestion(false)
            }}
            className="mt-1 text-xs font-medium hover:underline"
            style={{ color: '#e879f9' }}
          >
            Aplicar sugestao
          </button>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-1 pt-1" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Suggest with AXIOM */}
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          title="Sugerir com AXIOM"
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors min-w-[44px] min-h-[44px] justify-center"
          style={{ color: '#e879f9', border: '1px solid rgba(232,121,249,0.25)' }}
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
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors min-w-[44px] min-h-[44px] justify-center"
          style={witiDone
            ? { border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', background: 'rgba(52,211,153,0.08)', cursor: 'default' }
            : { border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
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
            className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-md transition-colors min-w-[44px] min-h-[44px] justify-center"
            style={cocDone
              ? { border: '1px solid rgba(52,211,153,0.3)', color: '#34d399', background: 'rgba(52,211,153,0.08)', cursor: 'default' }
              : { border: '1px solid rgba(167,139,250,0.25)', color: '#a78bfa' }}
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
            <span className="text-xs" style={{ color: '#64748b' }}>
              Remover este objetivo? Todas as relacoes causais associadas tambem serao removidas. Esta acao nao pode ser desfeita.
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded-md transition-colors"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2 py-1 text-xs rounded-md transition-colors"
              style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Remover Objetivo"
            className="flex items-center justify-center w-[44px] h-[44px] rounded-md transition-colors"
            style={{ color: '#64748b' }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
