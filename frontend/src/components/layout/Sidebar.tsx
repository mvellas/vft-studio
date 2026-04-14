import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { FolderOpen, Settings, ChevronLeft, ChevronRight, FileText, BookOpen } from 'lucide-react'

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
      className="h-screen flex flex-col overflow-hidden"
      style={{ width, background: '#09090e', borderRight: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #e879f9, #a21caf)' }}
            >
              V
            </div>
            <span className="text-white font-bold text-sm tracking-tight truncate">VFT Studio</span>
          </div>
        )}
        {collapsed && (
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #e879f9, #a21caf)' }}
          >
            V
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded transition-colors shrink-0"
            style={{ color: '#475569' }}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <button
          onClick={() => { setActiveProject(null); setView('project-list') }}
          title="Projetos"
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
          style={
            currentView === 'project-list'
              ? { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }
              : { color: '#475569' }
          }
        >
          <FolderOpen size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">Projetos</span>}
        </button>

        {activeProjectId && (
          <button
            onClick={() => setView('documents')}
            title="Documentos"
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
            style={
              currentView === 'documents'
                ? { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }
                : { color: '#475569' }
            }
          >
            <FileText size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">Documentos</span>}
          </button>
        )}

        <button
          onClick={() => setView('guide')}
          title="Guia de Uso"
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
          style={
            currentView === 'guide'
              ? { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }
              : { color: '#475569' }
          }
        >
          <BookOpen size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">Guia de Uso</span>}
        </button>

        <button
          onClick={() => setView('settings')}
          title="Configurações"
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors"
          style={
            currentView === 'settings'
              ? { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }
              : { color: '#475569' }
          }
        >
          <Settings size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">Configurações</span>}
        </button>
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <div className="px-2 pb-4">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center p-2 rounded-lg transition-colors"
            style={{ color: '#334155' }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Active project info */}
      {activeProject && !collapsed && (
        <div
          className="px-3 py-4 shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#334155', letterSpacing: '0.8px' }}>
            Projeto Ativo
          </p>
          <p className="text-sm font-semibold truncate" style={{ color: '#f8fafc' }}>
            {activeProject.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
            Fase {activeProject.phase_status} · Passo {activeProject.current_step}
          </p>
        </div>
      )}
    </aside>
  )
}
