import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ProjectList } from './components/project/ProjectList'
import { StepGuide } from './components/phase/StepGuide'
import { PhaseProgress } from './components/phase/PhaseProgress'
import { useUiStore } from './stores/uiStore'
import { useProjectStore } from './stores/projectStore'
import { phasesApi } from './api/phases'
import type { CurrentStep } from './types'

function ProjectDetailView() {
  const { activeProjectId } = useProjectStore()
  const [currentStep, setCurrentStep] = useState<CurrentStep | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeProjectId) return
    let cancelled = false
    setLoading(true)
    phasesApi
      .getCurrent(activeProjectId)
      .then((data) => {
        if (!cancelled) setCurrentStep(data)
      })
      .catch(() => {
        // step data unavailable — show placeholder
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeProjectId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg h-20 animate-pulse" />
        <div className="bg-white rounded-lg h-40 animate-pulse" />
      </div>
    )
  }

  if (!currentStep) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16 text-gray-500 text-sm">
        Carregando dados do projeto...
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PhaseProgress
        currentStep={currentStep.step.id}
        completedSteps={currentStep.completed_steps}
        totalSteps={currentStep.total_steps}
        progressPercent={currentStep.progress_percent}
      />
      <StepGuide step={currentStep.step} />
    </div>
  )
}

function App() {
  const { currentView } = useUiStore()

  return (
    <AppShell>
      {currentView === 'project-list' && <ProjectList />}
      {currentView === 'project-detail' && <ProjectDetailView />}
      {currentView === 'settings' && (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Configurações</h1>
          <p className="text-gray-500 text-sm">Em desenvolvimento.</p>
        </div>
      )}
    </AppShell>
  )
}

export default App
