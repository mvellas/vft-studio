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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900 text-lg">Novo Projeto VFT</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 border-b border-gray-200">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  s < step
                    ? 'bg-indigo-600 text-white'
                    : s === step
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${s < step ? 'bg-indigo-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-xs text-gray-500">Passo {step} de 3</span>
        </div>

        {/* Body */}
        <div className="px-6 py-6 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Identification */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Identificação do Projeto</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do projeto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Seleção de Sistema de Drones"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Breve descrição do problema de decisão..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas de contexto <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={contextNotes}
                  onChange={(e) => setContextNotes(e.target.value)}
                  placeholder="Contexto organizacional, restrições relevantes..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 2: Stakeholder config */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Configuração de Stakeholders</h3>
              <p className="text-sm text-gray-500">
                Selecione a variante que melhor descreve a estrutura de decisão do seu projeto.
              </p>
              <div className="space-y-3">
                {STAKEHOLDER_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      stakeholderConfig === opt.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stakeholder_config"
                      value={opt.value}
                      checked={stakeholderConfig === opt.value}
                      onChange={() => setStakeholderConfig(opt.value)}
                      className="mt-0.5 accent-indigo-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Confirmação</h3>
              <p className="text-sm text-gray-500">Revise as configurações antes de criar o projeto.</p>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Nome:</span>{' '}
                  <span className="text-gray-900">{name}</span>
                </div>
                {description && (
                  <div>
                    <span className="font-medium text-gray-700">Descrição:</span>{' '}
                    <span className="text-gray-900">{description}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Configuração:</span>{' '}
                  <span className="text-gray-900">
                    {STAKEHOLDER_OPTIONS.find((o) => o.value === stakeholderConfig)?.label}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </button>
          {step < 3 ? (
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              Próximo
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-60"
            >
              {creating ? 'Criando...' : 'Criar Projeto'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
