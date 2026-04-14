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
    <div className="rounded-lg p-6 space-y-6" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Objective context */}
      {objective && (
        <div className="rounded-md p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-xs font-medium mb-1" style={{ color: '#64748b' }}>Objetivo fundamental:</p>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{objective.statement}</p>
        </div>
      )}

      {error && (
        <div className="rounded-md p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
        </div>
      )}

      {/* Attribute type */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
          Tipo de Atributo
        </label>
        <select
          value={form.attr_type}
          onChange={e => handleFormChange({ attr_type: e.target.value })}
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
          className="w-full p-2 text-sm focus:outline-none"
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
        <label className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
          Descricao do Atributo
        </label>
        <textarea
          value={form.description}
          onChange={e => handleFormChange({ description: e.target.value })}
          placeholder="Descreva o que este atributo mede"
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '80px' }}
          className="w-full p-3 text-sm focus:outline-none resize-y"
        />
      </div>

      {/* Scale description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium" style={{ color: '#94a3b8' }}>
          Escala de Medicao
        </label>
        <textarea
          value={form.scale_description}
          onChange={e => handleFormChange({ scale_description: e.target.value })}
          placeholder="Descreva a escala de medicao"
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', minHeight: '60px' }}
          className="w-full p-3 text-sm focus:outline-none resize-y"
        />
      </div>

      {/* AI suggestion button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          className="px-4 py-2 rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ border: '1px solid rgba(232,121,249,0.25)', color: '#e879f9' }}
        >
          {suggesting ? 'Sugerindo...' : 'Sugerir com AXIOM'}
        </button>
        {saving && <span className="text-xs" style={{ color: '#334155' }}>Salvando...</span>}
        {saved && !saving && <span className="text-xs" style={{ color: '#334155' }}>Salvo</span>}
      </div>

      {/* Quality properties */}
      <div className="space-y-2">
        <p className="text-sm font-medium" style={{ color: '#94a3b8' }}>Propriedades de Qualidade</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {PROPERTY_FIELDS.map(({ key, label }) => (
            <label key={key} className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form[key] === 1}
                onChange={e => handleFormChange({ [key]: e.target.checked ? 1 : 0 })}
                className="mt-0.5 h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
              />
              <span className="text-sm" style={{ color: '#94a3b8' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Attribute levels */}
      <div className="space-y-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>Niveis da Escala</h3>

        {levels.length === 0 && (
          <p className="text-sm" style={{ color: '#334155' }}>Nenhum nivel definido. Adicione niveis para descrever a escala.</p>
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
          className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
          style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
        >
          <Plus className="w-4 h-4" />
          Adicionar Nivel
        </button>
      </div>

      {/* Phase 2 gate */}
      <div className="pt-6 space-y-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#64748b' }}>
            {fundamentalsWithAttr.length}/{fundamentals.length} objetivos fundamentais com atributos definidos
          </p>
          {fundamentals.length > 0 && (
            <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
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
          className="px-6 py-3 rounded-lg font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
        >
          {completing ? 'Concluindo...' : 'Confirmar Fase 2'}
        </button>
      </div>

      {/* Confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="rounded-lg p-6 max-w-md mx-4 space-y-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-base font-semibold" style={{ color: '#f1f5f9' }}>Concluir Fase 2</h3>
            <p className="text-sm" style={{ color: '#94a3b8' }}>
              Fase 2 concluida. Todos os objetivos fundamentais tem atributos definidos.
              Avancar para a Fase 3 de Alternativas?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 rounded-md text-sm transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCompletePhase2}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
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
    <div className="flex items-center gap-2 p-2 rounded-md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: '#64748b' }}>{index + 1}</span>

      <input
        type="text"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onBlur={() => onBlur(level, label, description)}
        placeholder="Rotulo"
        style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
        className="px-2 py-1 text-sm w-48 focus:outline-none"
      />

      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        onBlur={() => onBlur(level, label, description)}
        placeholder="Descricao"
        style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
        className="px-2 py-1 text-sm flex-1 focus:outline-none"
      />

      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button
          type="button"
          onClick={() => onMove(index, 'up')}
          disabled={index === 0}
          className="disabled:opacity-20"
          style={{ color: '#64748b' }}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onMove(index, 'down')}
          disabled={index === total - 1}
          className="disabled:opacity-20"
          style={{ color: '#64748b' }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={() => onDelete(level.id)}
        className="transition-colors flex-shrink-0"
        style={{ color: '#64748b' }}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}
