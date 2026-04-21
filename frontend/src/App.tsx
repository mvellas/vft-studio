import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, X } from 'lucide-react'
import { AppShell } from './components/layout/AppShell'
import { AppIntroSplash } from './components/layout/AppIntroSplash'
import { ProjectList } from './components/project/ProjectList'
import { SettingsView } from './components/project/SettingsView'
import { OnboardingFlow } from './components/project/OnboardingFlow'
import { ErrorBoundary } from './components/ErrorBoundary'
import { StepGuide } from './components/phase/StepGuide'
import { StepTool } from './components/phase/StepTool'
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
  const [drawerOpen, setDrawerOpen] = useState(false)

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
      <div className="max-w-5xl mx-auto space-y-4">
        <div
          className="rounded-xl h-40 animate-pulse"
          style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
        />
      </div>
    )
  }

  if (!step) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16 text-sm" style={{ color: '#475569' }}>
        Carregando dados do projeto...
      </div>
    )
  }

  const isPhase3 = stepId.startsWith('3.')

  return (
    <div className="flex gap-4 items-start relative" style={{ minHeight: 0 }}>
      {/* Main tool area */}
      <div className="flex-1 min-w-0">
        {isPhase3 && activeProjectId
          ? <Phase3View projectId={activeProjectId} />
          : activeProjectId
            ? (
              <StepTool
                step={step.step}
                projectId={activeProjectId}
                onStepComplete={() => refresh(activeProjectId)}
              />
            )
            : null
        }
      </div>

      {/* Drawer toggle button */}
      {!drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="shrink-0 flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg font-medium transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#64748b',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(96,165,250,0.08)'
            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.25)'
            e.currentTarget.style.color = '#60a5fa'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            e.currentTarget.style.color = '#64748b'
          }}
          title="Ver instruções do passo"
        >
          <BookOpen size={13} />
          Instruções
        </button>
      )}

      {/* Instructions drawer */}
      {drawerOpen && (
        <div
          className="shrink-0 rounded-xl overflow-hidden"
          style={{
            width: '340px',
            background: '#0a0a0f',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Drawer header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-2">
              <BookOpen size={13} style={{ color: '#60a5fa' }} />
              <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
                Instruções do Passo
              </span>
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1 rounded transition-colors"
              style={{ color: '#475569' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
            >
              <X size={13} />
            </button>
          </div>
          {/* StepGuide content — no extra wrapper padding; StepGuide has its own */}
          <StepGuide step={step.step} />
        </div>
      )}
    </div>
  )
}

function App() {
  const { currentView } = useUiStore()
  const { projects, activeProjectId } = useProjectStore()
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === 'undefined') return false
    return sessionStorage.getItem('vftstudio-intro-seen') !== '1'
  })

  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null
  const introMode = showOnboarding
    ? 'welcome'
    : currentView === 'project-detail' && activeProject
      ? 'project'
      : projects.length > 0
        ? 'workspace'
        : 'welcome'

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
      <AnimatePresence>
        {showIntro && (
          <AppIntroSplash
            mode={introMode}
            projectCount={projects.length}
            projectName={activeProject?.name ?? null}
            onFinish={() => {
              sessionStorage.setItem('vftstudio-intro-seen', '1')
              setShowIntro(false)
            }}
          />
        )}
      </AnimatePresence>
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
