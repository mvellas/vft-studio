import { useState } from 'react'
import { X } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import type { ProjectCreate } from '../../types'

interface NewProjectWizardProps {
  onClose: () => void
}

type StakeholderConfig = 'single_dm_single' | 'single_dm_multi' | 'multi_dm_multi'

const STAKEHOLDER_OPTIONS: { value: StakeholderConfig; label: string; description: string }[] = [
  {
    value: 'single_dm_single',
    label: 'Decisor único, stakeholder único',
    description: 'Um único tomador de decisão e um único stakeholder envolvido.',
  },
  {
    value: 'single_dm_multi',
    label: 'Decisor único, múltiplos stakeholders',
    description: 'Um único tomador de decisão com vários stakeholders envolvidos.',
  },
  {
    value: 'multi_dm_multi',
    label: 'Múltiplos decisores, múltiplos stakeholders',
    description: 'Vários tomadores de decisão e múltiplos stakeholders.',
  },
]

const inputStyle = {
  width: '100%',
  background: '#0e0e13',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: '#f1f5f9',
  outline: 'none',
  resize: 'none' as const,
}

const inputFocusStyle = {
  ...inputStyle,
  border: '1px solid rgba(232,121,249,0.4)',
}

export function NewProjectWizard({ onClose }: NewProjectWizardProps) {
  const { addProject, setActiveProject } = useProjectStore()
  const { setView } = useUiStore()

  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [contextNotes, setContextNotes] = useState('')
  const [stakeholderConfig, setStakeholderConfig] = useState<StakeholderConfig>('single_dm_single')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  function handleNext() {
    if (step === 1 && !name.trim()) {
      setError('O nome do projeto é obrigatório.')
      return
    }
    setError(null)
    setStep((s) => s + 1)
  }

  function handleBack() {
    setError(null)
    setStep((s) => s - 1)
  }

  async function handleCreate() {
    setCreating(true)
    setError(null)
    const payload: ProjectCreate = {
      name: name.trim(),
      description: description.trim() || undefined,
      context_notes: contextNotes.trim() || undefined,
    }
    try {
      const project = await projectsApi.create(payload)
      addProject(project)
      setActiveProject(project.id)
      setView('project-detail')
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar projeto.')
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-xl shadow-2xl w-full max-w-lg" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <h2 className="font-semibold text-lg" style={{ color: '#f8fafc' }}>Novo Projeto VFT</h2>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: '#475569' }}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                style={
                  s <= step
                    ? { background: 'rgba(232,121,249,0.2)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.4)' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#475569', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className="h-0.5 w-8"
                  style={{ background: s < step ? 'rgba(232,121,249,0.4)' : 'rgba(255,255,255,0.07)' }}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs" style={{ color: '#475569' }}>Passo {step} de 3</span>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Step 1: Identification */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium" style={{ color: '#f1f5f9' }}>Identificação do Projeto</h3>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Nome do projeto <span style={{ color: '#f87171' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Seleção de Sistema de Drones"
                  style={focusedField === 'name' ? inputFocusStyle : inputStyle}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Descrição <span className="font-normal" style={{ color: '#475569' }}>(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do problema de decisão..."
                  rows={3}
                  style={focusedField === 'description' ? inputFocusStyle : inputStyle}
                  onFocus={() => setFocusedField('description')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: '#94a3b8' }}>
                  Notas de contexto <span className="font-normal" style={{ color: '#475569' }}>(opcional)</span>
                </label>
                <textarea
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Contexto organizacional, restrições relevantes..."
                  rows={3}
                  style={focusedField === 'contextNotes' ? inputFocusStyle : inputStyle}
                  onFocus={() => setFocusedField('contextNotes')}
                  onBlur={() => setFocusedField(null)}
                />
              </div>
            </div>
          )}

          {/* Step 2: Stakeholder config */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium" style={{ color: '#f1f5f9' }}>Configuração de Stakeholders</h3>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Selecione a variante que melhor descreve a estrutura de decisão do seu projeto.
              </p>
              <div className="space-y-3">
                {STAKEHOLDER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors"
                    style={
                      stakeholderConfig === opt.value
                        ? { border: '1px solid rgba(232,121,249,0.35)', background: 'rgba(232,121,249,0.07)' }
                        : { border: '1px solid rgba(255,255,255,0.08)', background: 'transparent' }
                    }
                  >
                    <input
                      type="radio"
                      name="stakeholder_config"
                      value={opt.value}
                      checked={stakeholderConfig === opt.value}
                      onChange={() => setStakeholderConfig(opt.value)}
                      className="mt-0.5"
                      style={{ accentColor: '#e879f9' }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#f1f5f9' }}>{opt.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium" style={{ color: '#f1f5f9' }}>Confirmação</h3>
              <p className="text-sm" style={{ color: '#64748b' }}>Revise as configurações antes de criar o projeto.</p>
              <div className="rounded-lg p-4 space-y-3 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div>
                  <span className="font-medium" style={{ color: '#94a3b8' }}>Nome:</span>{' '}
                  <span style={{ color: '#f1f5f9' }}>{name}</span>
                </div>
                {description && (
                  <div>
                    <span className="font-medium" style={{ color: '#94a3b8' }}>Descrição:</span>{' '}
                    <span style={{ color: '#f1f5f9' }}>{description}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium" style={{ color: '#94a3b8' }}>Configuração:</span>{' '}
                  <span style={{ color: '#f1f5f9' }}>
                    {STAKEHOLDER_OPTIONS.find((o) => o.value === stakeholderConfig)?.label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm transition-colors"
            style={{ color: '#64748b' }}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
            >
              {creating ? 'Criando...' : 'Criar Projeto'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
