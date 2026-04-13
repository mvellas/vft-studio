import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from './ChatPanel'
import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { DiagramExport } from '../phase/DiagramExport'
import { PipelineButton } from '../pipeline/PipelineButton'
import { PipelinePanel } from '../pipeline/PipelinePanel'
import { PipelineHistory } from '../pipeline/PipelineHistory'
import { MessageSquare } from 'lucide-react'
import { useResize } from '../../hooks/useResize'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { chatPanelOpen, currentView, setChatPanelOpen, pipelineView } = useUiStore()
  const { activeProjectId, projects } = useProjectStore()
  const activeProject = projects.find(p => p.id === activeProjectId)

  const sidebar = useResize({ initialSize: 256, min: 48, max: 400, direction: 'horizontal-right' })
  const chat = useResize({ initialSize: 384, min: 240, max: 600, direction: 'horizontal-left' })

  const collapsed = sidebar.size <= 56

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <div className="relative h-screen shrink-0 flex" style={{ width: sidebar.size }}>
        <Sidebar collapsed={collapsed} width={sidebar.size} />
        {/* Sidebar resize handle */}
        <div
          onMouseDown={sidebar.onMouseDown}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
        >
          <div className="h-full w-px bg-transparent group-hover:bg-indigo-400 transition-colors mx-auto" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {currentView === 'project-detail' && activeProject && (
          <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 truncate max-w-xs">{activeProject.name}</span>
            <div className="flex items-center gap-3">
              <DiagramExport projectId={activeProject.id} projectName={activeProject.name} />
              <PipelineButton
                projectId={activeProject.id}
                projectDescription={activeProject.description ?? ''}
              />
              <button
                onClick={() => setChatPanelOpen(!chatPanelOpen)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  chatPanelOpen
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'text-gray-600 hover:text-indigo-700 border-gray-200 hover:border-indigo-300 bg-white'
                }`}
              >
                <MessageSquare size={13} />
                Chat IA
              </button>
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
          {/* Chat resize handle */}
          <div
            onMouseDown={chat.onMouseDown}
            className="absolute left-0 top-0 h-full w-1.5 cursor-col-resize z-10 group"
          >
            <div className="h-full w-px bg-transparent group-hover:bg-indigo-400 transition-colors mx-auto" />
          </div>
          <ChatPanel width={chat.size} />
        </div>
      )}
    </div>
  )
}
