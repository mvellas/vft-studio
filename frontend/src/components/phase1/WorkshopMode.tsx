import { useState } from 'react'
import { phasesApi } from '../../api/phases'

interface WorkshopModeProps {
  projectId: string
  onStepComplete: () => void
}

interface WorkshopStep {
  title: string
  prompt: string
  guidance: string
}

const WORKSHOP_STEPS: WorkshopStep[] = [
  {
    title: '1. Apresentacao e Contexto',
    prompt:
      'Apresente o objetivo do workshop aos DMs. Explique que o objetivo e chegar a um quadro decisorio compartilhado (Proposito, Perspectiva e Escopo).',
    guidance:
      'Distribua material de apoio. Certifique-se de que todos entendem o processo VFT.',
  },
  {
    title: '2. Visoes Individuais',
    prompt:
      'Peca a cada DM que escreva individualmente: qual e a decisao e por que ela e importante?',
    guidance: 'Tempo sugerido: 10 minutos. Nao permita discussao nesta fase.',
  },
  {
    title: '3. Compartilhamento',
    prompt:
      'Cada DM apresenta sua visao. Registre os pontos-chave de cada apresentacao.',
    guidance:
      'Use um quadro ou tela compartilhada. Nao interrompa nem debata ainda.',
  },
  {
    title: '4. Identificacao de Convergencias',
    prompt: 'Identifique pontos em comum entre as visoes dos DMs.',
    guidance:
      'Destaque frases e conceitos que apareceram em multiplas visoes.',
  },
  {
    title: '5. Discussao de Divergencias',
    prompt:
      'Discuta os pontos divergentes. Busque entender as razoes por tras de cada posicao.',
    guidance: "Use perguntas como: 'O que mudaria se adotassemos a perspectiva X?'",
  },
  {
    title: '6. Construcao do Consenso',
    prompt:
      'Trabalhe com os DMs para formular um Proposito, Perspectiva e Escopo compartilhados.',
    guidance:
      'Comece pelo ponto de maior convergencia. Ajuste o texto ate que todos concordem.',
  },
  {
    title: '7. Validacao Final',
    prompt:
      'Leia em voz alta o IDF consolidado. Peca confirmacao explicita de cada DM.',
    guidance:
      'Registre quem concordou. Se houver ressalva, volte ao passo 5.',
  },
]

export function WorkshopMode({ projectId, onStepComplete }: WorkshopModeProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [finishing, setFinishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const step = WORKSHOP_STEPS[currentStep]
  const totalSteps = WORKSHOP_STEPS.length
  const progressPercent = Math.round(((completed.size) / totalSteps) * 100)

  function handleNoteChange(value: string) {
    setNotes(prev => ({ ...prev, [currentStep]: value }))
  }

  function handleToggleCompleted() {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(currentStep)) {
        next.delete(currentStep)
      } else {
        next.add(currentStep)
      }
      return next
    })
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1)
    }
  }

  function handleNext() {
    if (completed.has(currentStep) && currentStep < totalSteps - 1) {
      setCurrentStep(s => s + 1)
    }
  }

  const allCompleted = completed.size === totalSteps
  const isLastStep = currentStep === totalSteps - 1

  async function handleFinish() {
    if (!allCompleted || finishing) return
    setFinishing(true)
    setError(null)
    try {
      await phasesApi.completeStep(projectId, {
        data: {
          workshop_notes: notes,
          workshop_steps_completed: Array.from(completed),
        },
        notes: 'Workshop de facilitacao concluido',
      })
      onStepComplete()
    } catch {
      setError('Erro ao concluir o workshop. Tente novamente.')
    } finally {
      setFinishing(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-gray-900 text-base">
          Workshop de Facilitacao — Quadro Decisorio Compartilhado
        </h3>
        <p className="text-sm text-gray-500 mt-1">Passo 1.4 — Sessao com multiplos DMs</p>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            Passo {currentStep + 1} de {totalSteps}
          </span>
          <span>{progressPercent}% concluido</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex gap-1 pt-1">
          {WORKSHOP_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={[
                'flex-1 h-1.5 rounded-full transition-colors',
                completed.has(idx)
                  ? 'bg-emerald-500'
                  : idx === currentStep
                    ? 'bg-blue-400'
                    : 'bg-gray-200',
              ].join(' ')}
              title={WORKSHOP_STEPS[idx].title}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* Current step card */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">{step.title}</h4>
          {completed.has(currentStep) && (
            <span className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
              Concluida
            </span>
          )}
        </div>

        {/* Prompt */}
        <div className="pl-4 border-l-2 border-blue-500">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
            Prompt para o facilitador
          </p>
          <p className="text-sm text-gray-700">{step.prompt}</p>
        </div>

        {/* Guidance */}
        <div className="pl-4 border-l-2 border-amber-500">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">
            Orientacao
          </p>
          <p className="text-sm text-gray-700">{step.guidance}</p>
        </div>

        {/* Notes textarea */}
        <div className="space-y-1">
          <label
            htmlFor={`workshop-notes-${currentStep}`}
            className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
          >
            Anotacoes
          </label>
          <textarea
            id={`workshop-notes-${currentStep}`}
            value={notes[currentStep] ?? ''}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder="Registre as anotacoes desta etapa..."
            className="w-full min-h-[120px] border border-gray-200 rounded-lg p-3 text-sm text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Completion checkbox */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={completed.has(currentStep)}
            onChange={handleToggleCompleted}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-700 font-medium">Etapa concluida</span>
        </label>
      </div>

      <div className="border-t border-gray-100" />

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className={[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
            currentStep > 0
              ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              : 'border border-gray-100 text-gray-300 cursor-not-allowed',
          ].join(' ')}
        >
          Anterior
        </button>

        {!isLastStep && (
          <button
            type="button"
            onClick={handleNext}
            disabled={!completed.has(currentStep)}
            className={[
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              completed.has(currentStep)
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            ].join(' ')}
          >
            Proxima
          </button>
        )}

        {isLastStep && allCompleted && (
          <button
            type="button"
            onClick={handleFinish}
            disabled={finishing}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {finishing ? 'Concluindo...' : 'Concluir Workshop'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Chat hint */}
      <p className="text-xs text-gray-400 italic text-center">
        Use o painel de chat para consultar o FRAME sobre duvidas de facilitacao.
      </p>
    </div>
  )
}
