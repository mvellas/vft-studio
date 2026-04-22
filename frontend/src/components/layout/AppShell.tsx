import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from './ChatPanel'
import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useChatStore } from '../../stores/chatStore'
import { usePhaseProgressStore } from '../../stores/phaseProgressStore'
import { PipelineButton } from '../pipeline/PipelineButton'
import { PipelinePanel } from '../pipeline/PipelinePanel'
import { PipelineHistory } from '../pipeline/PipelineHistory'
import { PhaseProgress } from '../phase/PhaseProgress'
import { MessageSquare, BotMessageSquare, BarChart2, Sparkles } from 'lucide-react'
import { useResize } from '../../hooks/useResize'
import { usePhasePoller } from '../../hooks/usePhasePoller'
import { DiagramsPanel } from '../diagrams/DiagramsPanel'
import { BrandLogo } from './BrandLogo'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { rightPanel, setRightPanel, currentView, pipelineView } = useUiStore()
  const chatPanelOpen = rightPanel === 'chat'
  const { activeProjectId, projects } = useProjectStore()
  const activeProject = projects.find(p => p.id === activeProjectId)

  const { currentStep, completedSteps, totalSteps, progressPercent, livePhaseCounts, liveCurrentPhase } = usePhaseProgressStore()
  usePhasePoller(activeProjectId)

  const sidebar = useResize({ initialSize: 256, min: 48, max: 400, direction: 'horizontal-right' })
  const chat = useResize({ initialSize: 384, min: 240, max: 600, direction: 'horizontal-left' })

  const collapsed = sidebar.size <= 56

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{
        background: 'radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 22%), radial-gradient(circle at 86% 14%, rgba(52,211,153,0.08), transparent 18%), #05070d',
      }}
    >
      {/* Sidebar */}
      <div className="relative h-screen shrink-0 flex" style={{ width: sidebar.size }}>
        <Sidebar collapsed={collapsed} width={sidebar.size} />
        <div
          onMouseDown={sidebar.onMouseDown}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
        >
          <div className="h-full w-px bg-transparent group-hover:bg-fuchsia-500/30 transition-colors mx-auto" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {currentView === 'project-detail' && activeProject && (
          <div
            className="shrink-0 border-b"
            style={{
              background: 'linear-gradient(180deg, rgba(8,12,23,0.96), rgba(8,12,20,0.92))',
              borderColor: 'rgba(148,163,184,0.1)',
              boxShadow: '0 18px 50px rgba(2,6,23,0.24)',
            }}
          >
            {/* Top row */}
            <div className="px-6 py-3 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-4">
                <BrandLogo compact size={34} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold truncate max-w-xs" style={{ color: '#f8fafc' }}>
                      {activeProject.name}
                    </span>
                    <span
                      className="text-[10px] uppercase tracking-[0.22em] px-2 py-1 rounded-full"
                      style={{ color: '#67e8f9', background: 'rgba(103,232,249,0.08)', border: '1px solid rgba(103,232,249,0.18)' }}
                    >
                      Fase {activeProject.phase_status}
                    </span>
                  </div>
                  <p className="text-xs truncate" style={{ color: '#94a3b8' }}>
                    Sala ativa do projeto · Passo metodológico {activeProject.current_step}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <PipelineButton
                  projectId={activeProject.id}
                  projectDescription={activeProject.description ?? ''}
                />
                {currentView === 'project-detail' && activeProjectId && (
                  <button
                    onClick={() => setRightPanel(rightPanel === 'diagrams' ? 'none' : 'diagrams')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={rightPanel === 'diagrams'
                      ? { background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    <BarChart2 size={13} />
                    Diagramas
                  </button>
                )}
                <button
                  onClick={() => {
                    useChatStore.getState().setActiveAgent('ARIA', 'facilitator')
                    setRightPanel('chat')
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    border: '1px solid rgba(103,232,249,0.2)',
                    color: '#67e8f9',
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(34,197,94,0.08))',
                  }}
                >
                  <BotMessageSquare size={13} />
                  VFT Guiado
                </button>
                <button
                  onClick={() => setRightPanel(rightPanel === 'chat' ? 'none' : 'chat')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={
                    chatPanelOpen
                      ? { background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  <MessageSquare size={13} />
                  Chat IA
                </button>
              </div>
            </div>
            {/* Progress row */}
            <div className="px-4 pb-4">
              <div
                className="rounded-[22px] px-4 py-3"
                style={{
                  background: 'rgba(15,23,42,0.62)',
                  border: '1px solid rgba(148,163,184,0.12)',
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={13} style={{ color: '#67e8f9' }} />
                  <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#67e8f9' }}>
                    VFT Progress
                  </span>
                </div>
              <PhaseProgress
                currentStep={currentStep}
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                progressPercent={progressPercent}
                livePhaseCounts={livePhaseCounts}
                liveCurrentPhase={liveCurrentPhase}
                compact
              />
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'project-detail' && activeProject && pipelineView !== 'idle' && (
            <div className="max-w-4xl mx-auto mb-6">
              <PipelinePanel projectId={activeProject.id} projectName={activeProject.name} />
            </div>
          )}
          {currentView === 'project-detail' && activeProject && (
            <PipelineHistory projectId={activeProject.id} />
          )}
          {children}
        </main>
      </div>

      {/* Right panel */}
      {rightPanel !== 'none' && (
        <div className="relative h-screen shrink-0 flex" style={{ width: chat.size }}>
          <div
            onMouseDown={chat.onMouseDown}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
          >
            <div className="h-full w-px bg-transparent group-hover:bg-fuchsia-500/30 transition-colors mx-auto" />
          </div>
          {rightPanel === 'chat' && <ChatPanel width={chat.size} />}
          {rightPanel === 'diagrams' && activeProjectId && (
            <DiagramsPanel projectId={activeProjectId} width={chat.size} />
          )}
        </div>
      )}
    </div>
  )
}
