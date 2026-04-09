import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'
import { attributesApi, type Attribute, type AttributeLevel } from '../../api/attributes'
import { objectivesApi } from '../../api/objectives'
import { phasesApi } from '../../api/phases'
import { useObjectivesStore } from '../../stores/objectivesStore'

interface AttributeDefinerProps {
  projectId: string
  objectiveId: string
  onStepComplete?: () => void
}

interface FormState {
  attr_type: string
  description: string
  scale_description: string
  prop_unambiguous: number
  prop_comprehensive: number
  prop_direct: number
  prop_operational: number
  prop_understandable: number
}

const INITIAL_FORM: FormState = {
  attr_type: 'natural',
  description: '',
  scale_description: '',
  prop_unambiguous: 0,
  prop_comprehensive: 0,
  prop_direct: 0,
  prop_operational: 0,
  prop_understandable: 0,
}

const ATTR_TYPE_OPTIONS = [
  { value: 'natural', label: 'Natural: medivel diretamente em unidades naturais (ex: custo em R$)' },
  { value: 'constructed', label: 'Construido: escala criada especificamente para este objetivo' },
  { value: 'proxy', label: 'Proxy: medida indireta quando medicao direta e impossivel' },
]

const PROPERTY_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: 'prop_unambiguous', label: 'Inequivoco: cada nivel tem significado unico e claro' },
  { key: 'prop_comprehensive', label: 'Abrangente: a escala cobre todos os niveis relevantes' },
  { key: 'prop_direct', label: 'Direto: mede diretamente o objetivo' },
  { key: 'prop_operational', label: 'Operacional: os niveis podem ser determinados na pratica' },
  { key: 'prop_understandable', label: 'Compreensivel: os stakeholders entendem a escala' },
]

export function AttributeDefiner({ projectId, objectiveId, onStepComplete }: AttributeDefinerProps) {
  const objectives = useObjectivesStore(s => s.objectives)

  const [_attribute, setAttribute] = useState<Attribute | null>(null)
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [levels, setLevels] = useState<AttributeLevel[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const attributeIdRef = useRef<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Derived: objective statement
  const objective = objectives.find(o => o.id === objectiveId)

  // Derived: Phase 2 gate progress
  const fundamentals = objectives.filter(
    o => o.witi_classification === 'fundamental' && !o.deleted
  )

  // We need to know which fundamentals have attributes. We load all attributes once on mount.
  const [allAttributes, setAllAttributes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    attributesApi.list(projectId).then(data => {
      const attrMap: Record<string, boolean> = {}
      for (const item of data) {
        attrMap[item.attribute.objective_id] = true
      }
      setAllAttributes(attrMap)

      // Populate form if attribute already exists for this objective
      const existing = data.find(d => d.attribute.objective_id === objectiveId)
      if (existing) {
        const a = existing.attribute
        setAttribute(a)
        attributeIdRef.current = a.id
        setForm({
          attr_type: a.attr_type,
          description: a.description,
          scale_description: a.scale_description,
          prop_unambiguous: a.prop_unambiguous,
          prop_comprehensive: a.prop_comprehensive,
          prop_direct: a.prop_direct,
          prop_operational: a.prop_operational,
          prop_understandable: a.prop_understandable,
        })
        setLevels(existing.levels)
      }
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Erro ao carregar atributos')
    })
  }, [projectId, objectiveId])

  const fundamentalsWithAttr = fundamentals.filter(f => allAttributes[f.id] || f.id === objectiveId)
  const gateReady = fundamentals.length > 0 && fundamentalsWithAttr.length === fundamentals.length

  // Auto-save with 2000ms debounce
  const triggerSave = useCallback(
    (updatedForm: FormState) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(async () => {
        setSaving(true)
        setError(null)
        try {
          if (!attributeIdRef.current) {
            // Create new attribute
            const created = await attributesApi.create(projectId, {
              objective_id: objectiveId,
              attr_type: updatedForm.attr_type,
              description: updatedForm.description,
              scale_description: updatedForm.scale_description,
            })
            attributeIdRef.current = created.id
            setAttribute(created)
            // Mark this objective as having an attribute
            setAllAttributes(prev => ({ ...prev, [objectiveId]: true }))
            // Now update properties
            await attributesApi.update(projectId, created.id, {
              prop_unambiguous: updatedForm.prop_unambiguous,
              prop_comprehensive: updatedForm.prop_comprehensive,
              prop_direct: updatedForm.prop_direct,
              prop_operational: updatedForm.prop_operational,
              prop_understandable: updatedForm.prop_understandable,
            })
          } else {
            // Update existing attribute
            const updated = await attributesApi.update(projectId, attributeIdRef.current, updatedForm)
            setAttribute(updated)
            setAllAttributes(prev => ({ ...prev, [objectiveId]: true }))
          }
          setSaved(true)
          setTimeout(() => setSaved(false), 1500)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao salvar')
        } finally {
          setSaving(false)
        }
      }, 2000)
    },
    [projectId, objectiveId]
  )

  const handleFormChange = (updates: Partial<FormState>) => {
    const next = { ...form, ...updates }
    setForm(next)
    triggerSave(next)
  }

  const handleSuggest = async () => {
    setSuggesting(true)
    setError(null)
    try {
      const result = await objectivesApi.suggestAttributes(projectId, objectiveId)
      if (result.suggestion) {
        const next = { ...form, description: result.suggestion, scale_description: result.suggestion }
        setForm(next)
        triggerSave(next)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao sugerir atributo')
    } finally {
      setSuggesting(false)
    }
  }

  // Level management
  const handleAddLevel = async () => {
    if (!attributeIdRef.current) {
      // Save attribute first if not yet created
      if (!form.description.trim()) return
      setSaving(true)
      try {
        const created = await attributesApi.create(projectId, {
          objective_id: objectiveId,
          attr_type: form.attr_type,
          description: form.description,
          scale_description: form.scale_description,
        })
        attributeIdRef.current = created.id
        setAttribute(created)
        setAllAttributes(prev => ({ ...prev, [objectiveId]: true }))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao criar atributo')
        setSaving(false)
        return
      } finally {
        setSaving(false)
      }
    }

    try {
      const newLevel = await attributesApi.createLevel(projectId, attributeIdRef.current!, {
        label: `Nivel ${levels.length + 1}`,
        description: '',
        order_index: levels.length,
      })
      setLevels(prev => [...prev, newLevel])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar nivel')
    }
  }

  const handleLevelBlur = async (level: AttributeLevel, label: string, description: string) => {
    if (label === level.label && description === level.description) return
    try {
      const updated = await attributesApi.updateLevel(projectId, level.id, { label, description })
      setLevels(prev => prev.map(l => (l.id === updated.id ? updated : l)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar nivel')
    }
  }

  const handleDeleteLevel = async (levelId: string) => {
    try {
      await attributesApi.removeLevel(projectId, levelId)
      setLevels(prev => prev.filter(l => l.id !== levelId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover nivel')
    }
  }

  const handleMoveLevel = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= levels.length) return

    const reordered = [...levels]
    const temp = reordered[index]
    reordered[index] = reordered[targetIndex]
    reordered[targetIndex] = temp

    const newLevels = reordered.map((l, i) => ({ ...l, order_index: i }))
    setLevels(newLevels)

    if (attributeIdRef.current) {
      try {
        await attributesApi.reorderLevels(projectId, attributeIdRef.current, newLevels.map(l => l.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao reordenar niveis')
      }
    }
  }

  const handleCompletePhase2 = async () => {
    setShowConfirmDialog(false)
    setCompleting(true)
    setError(null)
    try {
      await phasesApi.completeStep(projectId, { data: { phase2_gate: true } })
      onStepComplete?.()
    } catch (err) {
      setError('Nem todos os objetivos fundamentais possuem atributos definidos.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Objective context */}
      {objective && (
        <div className="bg-gray-50 rounded-md p-3">
          <p className="text-xs text-gray-500 font-medium mb-1">Objetivo fundamental:</p>
          <p className="text-sm text-gray-700">{objective.statement}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Attribute type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Tipo de Atributo
        </label>
        <select
          value={form.attr_type}
          onChange={e => handleFormChange({ attr_type: e.target.value })}
          className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          {ATTR_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Descricao do Atributo
        </label>
        <textarea
          value={form.description}
          onChange={e => handleFormChange({ description: e.target.value })}
          placeholder="Descreva o que este atributo mede"
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* Scale description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Escala de Medicao
        </label>
        <textarea
          value={form.scale_description}
          onChange={e => handleFormChange({ scale_description: e.target.value })}
          placeholder="Descreva a escala de medicao"
          className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
          style={{ minHeight: '60px' }}
        />
      </div>

      {/* AI suggestion button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          className="px-4 py-2 border border-indigo-600 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {suggesting ? 'Sugerindo...' : 'Sugerir com AXIOM'}
        </button>
        {saving && <span className="text-xs text-gray-400">Salvando...</span>}
        {saved && !saving && <span className="text-xs text-gray-400">Salvo</span>}
      </div>

      {/* Quality properties */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">Propriedades de Qualidade</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {PROPERTY_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key] === 1}
                onChange={e => handleFormChange({ [key]: e.target.checked ? 1 : 0 })}
                className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Attribute levels */}
      <div className="space-y-3 border-t border-gray-100 pt-4">
        <h3 className="text-lg font-semibold text-gray-900">Niveis da Escala</h3>

        {levels.length === 0 && (
          <p className="text-sm text-gray-400">Nenhum nivel definido. Adicione niveis para descrever a escala.</p>
        )}

        <div className="space-y-2">
          {levels.map((level, index) => (
            <LevelRow
              key={level.id}
              level={level}
              index={index}
              total={levels.length}
              onBlur={handleLevelBlur}
              onDelete={handleDeleteLevel}
              onMove={handleMoveLevel}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddLevel}
          className="flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Nivel
        </button>
      </div>

      {/* Phase 2 gate */}
      <div className="border-t border-gray-100 pt-6 space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            {fundamentalsWithAttr.length}/{fundamentals.length} objetivos fundamentais com atributos definidos
          </p>
          {fundamentals.length > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all"
                style={{
                  width: `${Math.round((fundamentalsWithAttr.length / fundamentals.length) * 100)}%`,
                }}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowConfirmDialog(true)}
          disabled={!gateReady || completing}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {completing ? 'Concluindo...' : 'Confirmar Fase 2'}
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Concluir Fase 2</h3>
            <p className="text-sm text-gray-600">
              Fase 2 concluida. Todos os objetivos fundamentais tem atributos definidos.
              Avancar para a Fase 3 de Alternativas?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCompletePhase2}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                Avancar para Fase 3
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LevelRow sub-component ────────────────────────────────────────────────

interface LevelRowProps {
  level: AttributeLevel
  index: number
  total: number
  onBlur: (level: AttributeLevel, label: string, description: string) => void
  onDelete: (id: string) => void
  onMove: (index: number, direction: 'up' | 'down') => void
}

function LevelRow({ level, index, total, onBlur, onDelete, onMove }: LevelRowProps) {
  const [label, setLabel] = useState(level.label)
  const [description, setDescription] = useState(level.description)

  return (
    <div className="flex items-center gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
      <span className="text-xs text-gray-400 w-5 text-center flex-shrink-0">{index + 1}</span>

      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={() => onBlur(level, label, description)}
        placeholder="Rotulo"
        className="border border-gray-300 rounded px-2 py-1 text-sm w-48 focus:ring-1 focus:ring-indigo-500"
      />

      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={() => onBlur(level, label, description)}
        placeholder="Descricao"
        className="border border-gray-300 rounded px-2 py-1 text-sm flex-1 focus:ring-1 focus:ring-indigo-500"
      />

      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 'down')}
          disabled={index === total - 1}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-20"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onDelete(level.id)}
        className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
