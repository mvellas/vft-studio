import { useState, useEffect } from 'react'
import type { Stakeholder } from '../../types'
import { stakeholdersApi, type StakeholderCreate } from '../../api/stakeholders'
import { phasesApi } from '../../api/phases'

// Role display labels (PT-BR)
const ROLE_LABELS: Record<string, string> = {
  decision_authority: 'Autoridade Decisora',
  customer: 'Cliente',
  owner: 'Dono/Proprietario',
  user: 'Usuario',
  consumer: 'Consumidor',
}

const ROLE_OPTIONS = [
  { value: 'decision_authority', label: 'Autoridade Decisora' },
  { value: 'customer', label: 'Cliente' },
  { value: 'owner', label: 'Dono/Proprietario' },
  { value: 'user', label: 'Usuario' },
  { value: 'consumer', label: 'Consumidor' },
] as const

const ELICITATION_OPTIONS = [
  { value: 'interview', label: 'Entrevista' },
  { value: 'document_analysis', label: 'Analise Documental' },
  { value: 'simulated', label: 'Simulado' },
] as const

interface StakeholderMapperProps {
  projectId: string
  onStepComplete: () => void
}

interface FormState {
  name: string
  role: string
  is_decision_maker: number
  profile: string
  interests: string
  elicitation_mode: string
}

const EMPTY_FORM: FormState = {
  name: '',
  role: 'decision_authority',
  is_decision_maker: 1,
  profile: '',
  interests: '',
  elicitation_mode: 'interview',
}

function computeVariant(stakeholders: Stakeholder[]): string {
  const dmCount = stakeholders.filter(s => s.is_decision_maker === 1).length
  const total = stakeholders.length
  if (dmCount > 1) return 'multi_dm_multi'
  if (total > 1) return 'single_dm_multi'
  return 'single_dm_single'
}

const VARIANT_LABELS: Record<string, string> = {
  single_dm_single: 'Passo 1.2 - Stakeholder Unico',
  single_dm_multi: 'Passo 1.3 - DM Unico / Multiplos Stakeholders',
  multi_dm_multi: 'Passos 1.4-1.5 - Multiplos DMs',
}

const VARIANT_COLORS: Record<string, string> = {
  single_dm_single: 'bg-blue-100 text-blue-700',
  single_dm_multi: 'bg-amber-100 text-amber-700',
  multi_dm_multi: 'bg-purple-100 text-purple-700',
}

export function StakeholderMapper({ projectId, onStepComplete }: StakeholderMapperProps) {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    void loadStakeholders()
  }, [projectId])

  async function loadStakeholders() {
    setLoading(true)
    setError(null)
    try {
      const data = await stakeholdersApi.list(projectId)
      setStakeholders(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar stakeholders')
    } finally {
      setLoading(false)
    }
  }

  function handleRoleChange(role: string) {
    setForm(prev => ({
      ...prev,
      role,
      // Auto-set is_decision_maker when role is decision_authority
      is_decision_maker: role === 'decision_authority' ? 1 : prev.is_decision_maker,
    }))
  }

  function openAddForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEditForm(stakeholder: Stakeholder) {
    setEditingId(stakeholder.id)
    setForm({
      name: stakeholder.name,
      role: stakeholder.role,
      is_decision_maker: stakeholder.is_decision_maker,
      profile: stakeholder.profile,
      interests: stakeholder.interests,
      elicitation_mode: stakeholder.elicitation_mode,
    })
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const payload: StakeholderCreate = {
        name: form.name.trim(),
        role: form.role,
        is_decision_maker: form.is_decision_maker,
        profile: form.profile,
        interests: form.interests,
        elicitation_mode: form.elicitation_mode,
      }
      if (editingId) {
        const updated = await stakeholdersApi.update(projectId, editingId, payload)
        setStakeholders(prev => prev.map(s => s.id === editingId ? updated : s))
      } else {
        const created = await stakeholdersApi.create(projectId, payload)
        setStakeholders(prev => [...prev, created])
      }
      cancelForm()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar stakeholder')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await stakeholdersApi.remove(projectId, id)
      setStakeholders(prev => prev.filter(s => s.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover stakeholder')
    }
  }

  function validateStakeholders(): boolean {
    const hasDecisionMaker = stakeholders.some(s => s.is_decision_maker === 1)
    if (!hasDecisionMaker) {
      setValidationError(
        'E necessario pelo menos 1 stakeholder com papel Decision Authority'
      )
      return false
    }
    setValidationError(null)
    return true
  }

  async function handleCompleteStep() {
    if (!validateStakeholders()) return
    setCompleting(true)
    try {
      const computedConfig = computeVariant(stakeholders)
      await phasesApi.completeStep(projectId, {
        data: {
          stakeholders_count: stakeholders.length,
          stakeholder_config: computedConfig,
        },
      })
      onStepComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao completar passo')
    } finally {
      setCompleting(false)
    }
  }

  const computedConfig = computeVariant(stakeholders)
  const canComplete = stakeholders.some(s => s.is_decision_maker === 1)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <p className="text-sm text-gray-500">Carregando stakeholders...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with variant badge */}
      <div className="rounded-lg p-6" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900 text-base">Passo 1.1 — Mapeamento de Stakeholders</h3>
            <p className="text-sm text-gray-500 mt-1">
              Identifique todos os stakeholders e ao menos uma Autoridade Decisora para determinar o variante IDF.
            </p>
          </div>
          {stakeholders.length > 0 && (
            <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${VARIANT_COLORS[computedConfig]}`}>
              {VARIANT_LABELS[computedConfig]}
            </span>
          )}
        </div>
      </div>

      {/* Global error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stakeholder list */}
      {stakeholders.length > 0 && (
        <div className="rounded-lg divide-y" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.06)' }}>
          {stakeholders.map(s => (
            <div key={s.id} className="flex items-start justify-between gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-900 text-sm">{s.name}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {ROLE_LABELS[s.role] ?? s.role}
                  </span>
                  {s.is_decision_maker === 1 && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2 py-0.5 rounded">
                      DM
                    </span>
                  )}
                </div>
                {s.profile && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{s.profile}</p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => openEditForm(s)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => void handleDelete(s.id)}
                  className="text-xs text-red-500 hover:text-red-700 font-medium"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {stakeholders.length === 0 && !showForm && (
        <div className="rounded-lg p-8 text-center" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-sm text-gray-500">Nenhum stakeholder cadastrado ainda.</p>
          <p className="text-xs text-gray-400 mt-1">Adicione ao menos uma Autoridade Decisora para continuar.</p>
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <div className="rounded-lg p-6" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 className="text-sm font-semibold text-gray-800 mb-4">
            {editingId ? 'Editar Stakeholder' : 'Adicionar Stakeholder'}
          </h4>
          <form onSubmit={e => void handleSubmit(e)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nome <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do stakeholder"
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Papel</label>
              <select
                value={form.role}
                onChange={e => handleRoleChange(e.target.value)}
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              >
                {ROLE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* is_decision_maker toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, is_decision_maker: prev.is_decision_maker === 1 ? 0 : 1 }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                  form.is_decision_maker === 1 ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
                aria-label="Toggle decision maker"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.is_decision_maker === 1 ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-700">
                Decision Maker (Autoridade Decisora)
              </span>
            </div>

            {/* Profile */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Perfil e experiencia
              </label>
              <textarea
                value={form.profile}
                onChange={e => setForm(prev => ({ ...prev, profile: e.target.value }))}
                placeholder="Descreva o perfil e experiencia do stakeholder..."
                rows={2}
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', resize: 'none' as const }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Interests */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Interesses e preocupacoes
              </label>
              <textarea
                value={form.interests}
                onChange={e => setForm(prev => ({ ...prev, interests: e.target.value }))}
                placeholder="Quais os interesses e preocupacoes deste stakeholder?"
                rows={2}
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', resize: 'none' as const }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              />
            </div>

            {/* Elicitation mode */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Modo de elicitacao</label>
              <select
                value={form.elicitation_mode}
                onChange={e => setForm(prev => ({ ...prev, elicitation_mode: e.target.value }))}
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
                className="w-full px-3 py-2 text-sm focus:outline-none"
              >
                {ELICITATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Form actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Salvando...' : editingId ? 'Salvar alteracoes' : 'Adicionar'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add button */}
      {!showForm && (
        <button
          onClick={openAddForm}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          + Adicionar Stakeholder
        </button>
      )}

      {/* Validation error */}
      {validationError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <p className="text-sm text-amber-800">{validationError}</p>
        </div>
      )}

      {/* Complete step button */}
      <div className="rounded-lg p-4 flex items-center justify-between gap-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div>
          {stakeholders.length === 0 ? (
            <p className="text-xs text-gray-500">Adicione ao menos uma Autoridade Decisora para completar este passo.</p>
          ) : !canComplete ? (
            <p className="text-xs text-amber-700">Nenhum stakeholder marcado como Decision Maker ainda.</p>
          ) : (
            <p className="text-xs text-gray-500">
              {stakeholders.length} stakeholder{stakeholders.length !== 1 ? 's' : ''} mapeado{stakeholders.length !== 1 ? 's' : ''} —{' '}
              <span className={`font-semibold ${VARIANT_COLORS[computedConfig].split(' ')[1]}`}>
                {VARIANT_LABELS[computedConfig]}
              </span>
            </p>
          )}
        </div>
        <button
          onClick={() => void handleCompleteStep()}
          disabled={!canComplete || completing}
          className="shrink-0 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {completing ? 'Salvando...' : 'Concluir Passo 1.1'}
        </button>
      </div>
    </div>
  )
}
