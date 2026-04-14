import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AppShell } from './components/layout/AppShell'
import { ProjectList } from './components/project/ProjectList'
import { SettingsView } from './components/project/SettingsView'
import { OnboardingFlow } from './components/project/OnboardingFlow'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StepGuide } from './components/phase/StepGuide'
import { Phase3View } from './components/phase3/Phase3View'
import { useUiStore } from './stores/uiStore'
import { useProjectStore } from './stores/projectStore'
import { usePhaseProgressStore } from './stores/phaseProgressStore'
import { useChatStore } from './stores/chatStore'
import { phasesApi } from './api/phases'
import { apiClient } from './api/client'
import { DocumentPanel } from './components/documents/DocumentPanel'
import { GuideView } from './components/guide/GuideView'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.0, 0.0, 0.2, 1.0] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.12, ease: [0.4, 0.0, 1.0, 1.0] as const } },
}

function ProjectDetailView() {
  const { activeProjectId } = useProjectStore()
  const { currentStep: stepId, refresh } = usePhaseProgressStore()
  const [step, setStep] = useState<import('./types').CurrentStep | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!activeProjectId) return
    let cancelled = false
    setLoading(true)
    phasesApi.getCurrent(activeProjectId)
      .then((data) => {
        if (!cancelled) setStep(data)
        refresh(activeProjectId)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [activeProjectId, refresh])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-lg h-40 animate-pulse" />
      </div>
    )
  }

  if (!step) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16 text-gray-500 text-sm">
        Carregando dados do projeto...
      </div>
    )
  }

  const isPhase3 = stepId.startsWith('3.')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {isPhase3 && activeProjectId
        ? <Phase3View projectId={activeProjectId} />
        : <StepGuide step={step.step} />
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
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {currentView === 'project-list' && <ProjectList />}
              {currentView === 'project-detail' && <ProjectDetailView />}
              {currentView === 'settings' && <SettingsView />}
              {currentView === 'guide' && <GuideView />}
              {currentView === 'documents' && (
                <DocumentPanel
                  onAnalyze={() => {
                    useChatStore.getState().setActiveAgent('ANALYST', 'analyst')
                    useChatStore.getState().setAutoSendMessage(
                      'Analise os documentos disponíveis e extraia os valores, objetivos e posições relevantes para o projeto VFT. Cite as fontes diretamente.'
                    )
                    useUiStore.getState().setChatPanelOpen(true)
                    useUiStore.getState().setView('project-detail')
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </ErrorBoundary>
      </AppShell>
    </>
  )
}

export default App
