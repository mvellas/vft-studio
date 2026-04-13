interface PhaseProgressProps {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  progressPercent?: number
  compact?: boolean
}

const PHASES = [
  { id: 1, label: 'Fase 1: Enquadramento', color: 'bg-blue-500', steps: 7 },
  { id: 2, label: 'Fase 2: Objetivos', color: 'bg-purple-500', steps: 18 },
  { id: 3, label: 'Fase 3: Alternativas', color: 'bg-emerald-500', steps: 8 },
]

function getPhaseForStep(stepId: string): number {
  const [phase] = stepId.split('.').map(Number)
  return phase ?? 1
}

export function PhaseProgress({
  currentStep,
  completedSteps,
  totalSteps,
  progressPercent,
  compact = false,
}: PhaseProgressProps) {
  const currentPhase = getPhaseForStep(currentStep)
  const completedCount = completedSteps.length
  const pct = progressPercent ?? Math.round((completedCount / Math.max(totalSteps, 1)) * 100)

  const content = (
    <>
      {/* Phase bars */}
      <div className="flex gap-3">
        {PHASES.map((phase) => {
          const phaseSteps = completedSteps.filter(
            (s) => getPhaseForStep(s) === phase.id
          )
          const isCompleted = phaseSteps.length >= phase.steps
          const isCurrent = phase.id === currentPhase
          const barColor = isCompleted
            ? 'bg-emerald-500'
            : isCurrent
            ? 'bg-indigo-500'
            : 'bg-gray-200'

          return (
            <div key={phase.id} className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-medium ${
                    isCurrent ? 'text-indigo-700' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                  }`}
                >
                  {phase.label}
                </span>
                <span className="text-xs text-gray-400">
                  {phaseSteps.length}/{phase.steps}
                </span>
              </div>
              {/* Bar */}
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                  style={{
                    width: `${Math.min((phaseSteps.length / phase.steps) * 100, 100)}%`,
                  }}
                />
              </div>
              {/* Step dots — hidden in compact mode */}
              {!compact && (
                <div className="flex flex-wrap gap-0.5 mt-1.5">
                  {Array.from({ length: phase.steps }).map((_, i) => {
                    const stepId = `${phase.id}.${i + 1}`
                    const isDone = completedSteps.includes(stepId)
                    const isCur = currentStep === stepId
                    return (
                      <div
                        key={stepId}
                        title={stepId}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${
                          isDone
                            ? 'bg-emerald-500'
                            : isCur
                            ? 'bg-indigo-500 ring-1 ring-indigo-300'
                            : 'bg-gray-200'
                        }`}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Overall progress */}
      <p className={`${compact ? 'mt-1' : 'mt-3'} text-xs text-gray-500 text-right`}>
        {completedCount}/{totalSteps} passos ({pct}%)
      </p>
    </>
  )

  if (compact) {
    return <div>{content}</div>
  }

  return (
    <div className="bg-white rounded-lg shadow-sm px-6 py-4">
      {content}
    </div>
  )
}
