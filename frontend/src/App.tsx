import { useEffect, useState } from 'react'
import { AppShell } from './components/layout/AppShell'
import { ProjectList } from './components/project/ProjectList'
import { SettingsView } from './components/project/SettingsView'
import { OnboardingFlow } from './components/project/OnboardingFlow'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StepGuide } from './components/phase/StepGuide'
import { PhaseProgress } from './components/phase/PhaseProgress'
import { Phase3View } from './components/phase3/Phase3View'
import { useUiStore } from './stores/uiStore'
import { useProjectStore } from './stores/projectStore'
import { phasesApi } from './api/phases'
import { apiClient } from './api/client'
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
      .catch(() => {})
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

  const isPhase3 = currentStep.step.id.startsWith('3.')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PhaseProgress
        currentStep={currentStep.step.id}
        completedSteps={currentStep.completed_steps}
        totalSteps={currentStep.total_steps}
        progressPercent={currentStep.progress_percent}
      />
      {isPhase3 && activeProjectId
        ? <Phase3View projectId={activeProjectId} />
        : <StepGuide step={currentStep.step} />
      }
    </div>
  )
}

function App() {
  const { currentView } = useUiStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)

  useEffect(() => {
    apiClient
      .get<{ completed: boolean }>('/api/settings/onboarding-completed')
      .then(r => {
        if (!r.data.completed) setShowOnboarding(true)
      })
      .catch(() => {})
      .finally(() => setOnboardingChecked(true))
  }, [])

  if (!onboardingChecked) return null

  return (
    <>
      {showOnboarding && (
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      )}
      <AppShell>
        <ErrorBoundary>
          {currentView === 'project-list' && <ProjectList />}
          {currentView === 'project-detail' && <ProjectDetailView />}
          {currentView === 'settings' && <SettingsView />}
        </ErrorBoundary>
      </AppShell>
    </>
  )
}

export default App
