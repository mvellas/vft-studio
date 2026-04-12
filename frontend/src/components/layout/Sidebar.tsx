import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { FolderOpen, Settings, ChevronLeft, ChevronRight, FileText } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  width: number
}

export function Sidebar({ collapsed, width }: SidebarProps) {
  const { toggleSidebar, setView, currentView } = useUiStore()
  const { projects, activeProjectId, setActiveProject } = useProjectStore()

  const activeProject = projects.find(p => p.id === activeProjectId)

  return (
    <aside
      className="h-screen bg-[#1E1E2E] border-r border-gray-800 flex flex-col overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800 shrink-0">
        {!collapsed && (
          <span className="text-white font-semibold text-lg tracking-tight truncate">VFT Studio</span>
        )}
        <button
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white transition-colors p-1 rounded shrink-0"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <button
          onClick={() => {
            setActiveProject(null)
            setView('project-list')
          }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentView === 'project-list'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <FolderOpen size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">Projetos</span>}
        </button>

        {activeProjectId && (
          <button
            onClick={() => setView('documents')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentView === 'documents'
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <FileText size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">Documentos</span>}
          </button>
        )}

        <button
          onClick={() => setView('settings')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentView === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">Configurações</span>}
        </button>
      </nav>

      {/* Active project info */}
      {activeProject && !collapsed && (
        <div className="border-t border-gray-800 px-4 py-4 shrink-0">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Projeto Ativo</p>
          <p className="text-white text-sm font-medium truncate">{activeProject.name}</p>
          <p className="text-gray-400 text-xs mt-1">
            Fase {activeProject.phase_status} · Passo {activeProject.current_step}
          </p>
        </div>
      )}
    </aside>
  )
}
