import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from './ChatPanel'
import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { useChatStore } from '../../stores/chatStore'
import { usePhaseProgressStore } from '../../stores/phaseProgressStore'
import { DiagramExport } from '../phase/DiagramExport'
import { PipelineButton } from '../pipeline/PipelineButton'
import { PipelinePanel } from '../pipeline/PipelinePanel'
import { PipelineHistory } from '../pipeline/PipelineHistory'
import { PhaseProgress } from '../phase/PhaseProgress'
import { MessageSquare, BotMessageSquare } from 'lucide-react'
import { useResize } from '../../hooks/useResize'
import { usePhasePoller } from '../../hooks/usePhasePoller'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { chatPanelOpen, currentView, setChatPanelOpen, pipelineView } = useUiStore()
  const { activeProjectId, projects } = useProjectStore()
  const activeProject = projects.find(p => p.id === activeProjectId)

  const { currentStep, completedSteps, totalSteps, progressPercent } = usePhaseProgressStore()
  usePhasePoller(activeProjectId)

  const sidebar = useResize({ initialSize: 256, min: 48, max: 400, direction: 'horizontal-right' })
  const chat = useResize({ initialSize: 384, min: 240, max: 600, direction: 'horizontal-left' })

  const collapsed = sidebar.size <= 56

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#07070c' }}>
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
            style={{ background: '#0a0a0f', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            {/* Top row */}
            <div className="px-6 py-2 flex items-center justify-between">
              <span className="text-sm truncate max-w-xs" style={{ color: '#475569' }}>
                {activeProject.name}
              </span>
              <div className="flex items-center gap-2">
                <DiagramExport projectId={activeProject.id} projectName={activeProject.name} />
                <PipelineButton
                  projectId={activeProject.id}
                  projectDescription={activeProject.description ?? ''}
                />
                <button
                  onClick={() => {
                    useChatStore.getState().setActiveAgent('ARIA', 'facilitator')
                    setChatPanelOpen(true)
                  }}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                  style={{
                    border: '1px solid rgba(52,211,153,0.25)',
                    color: '#34d399',
                    background: 'rgba(52,211,153,0.06)',
                  }}
                >
                  <BotMessageSquare size={13} />
                  VFT Guiado
                </button>
                <button
                  onClick={() => setChatPanelOpen(!chatPanelOpen)}
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
            <div className="px-4 pb-3">
              <PhaseProgress
                currentStep={currentStep}
                completedSteps={completedSteps}
                totalSteps={totalSteps}
                progressPercent={progressPercent}
                compact
              />
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'project-detail' && activeProject && pipelineView !== 'idle' && (
            <div className="max-w-4xl mx-auto mb-6">
              <PipelinePanel projectName={activeProject.name} />
            </div>
          )}
          {currentView === 'project-detail' && activeProject && (
            <PipelineHistory projectId={activeProject.id} />
          )}
          {children}
        </main>
      </div>

      {/* Chat panel */}
      {chatPanelOpen && (
        <div className="relative h-screen shrink-0 flex" style={{ width: chat.size }}>
          <div
            onMouseDown={chat.onMouseDown}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
          >
            <div className="h-full w-px bg-transparent group-hover:bg-fuchsia-500/30 transition-colors mx-auto" />
          </div>
          <ChatPanel width={chat.size} />
        </div>
      )}
    </div>
  )
}
