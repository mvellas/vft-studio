import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { ChatPanel } from './ChatPanel'
import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { DiagramExport } from '../phase/DiagramExport'
import { MessageSquare } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const { chatPanelOpen, currentView, setChatPanelOpen } = useUiStore()
  const { activeProjectId, projects } = useProjectStore()
  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar — only shown when in project-detail view */}
        {currentView === 'project-detail' && activeProject && (
          <div className="shrink-0 bg-white border-b border-gray-200 px-6 py-2 flex items-center justify-between">
            <span className="text-sm text-gray-500 truncate max-w-xs">{activeProject.name}</span>
            <div className="flex items-center gap-3">
              <DiagramExport projectId={activeProject.id} projectName={activeProject.name} />
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
          {children}
        </main>
      </div>
      {chatPanelOpen && <ChatPanel />}
    </div>
  )
}
