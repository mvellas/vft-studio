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

          return (
            <div key={phase.id} className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span
                  style={{
                    color: isCurrent ? '#e879f9' : isCompleted ? '#34d399' : '#334155',
                    fontSize: '0.75rem',
                    fontWeight: '500',
                  }}
                >
                  {phase.label}
                </span>
                <span style={{ color: '#475569', fontSize: '0.75rem' }}>
                  {phaseSteps.length}/{phase.steps}
                </span>
              </div>
              {/* Bar */}
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((phaseSteps.length / phase.steps) * 100, 100)}%`,
                    background: isCompleted
                      ? 'linear-gradient(90deg, #34d399, #10b981)'
                      : isCurrent
                      ? 'linear-gradient(90deg, #a21caf, #e879f9)'
                      : 'rgba(255,255,255,0.06)',
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
                        className="w-1.5 h-1.5 rounded-full transition-colors"
                        style={{
                          background: isDone ? '#34d399' : isCur ? '#e879f9' : 'rgba(255,255,255,0.08)',
                          boxShadow: isCur ? '0 0 0 2px rgba(232,121,249,0.3)' : 'none',
                        }}
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
      <p
        style={{
          color: '#475569',
          fontSize: '0.75rem',
          textAlign: 'right',
          marginTop: compact ? '0.25rem' : '0.75rem',
        }}
      >
        {completedCount}/{totalSteps} passos ({pct}%)
      </p>
    </>
  )

  if (compact) {
    return <div>{content}</div>
  }

  return (
    <div
      className="rounded-xl px-6 py-4"
      style={{
        background: '#0e0e13',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {content}
    </div>
  )
}
