import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { FolderOpen, Settings, ChevronLeft, ChevronRight, FileText, BookOpen, Compass } from 'lucide-react'
import { BrandLogo } from './BrandLogo'

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
      style={{
        width,
        background: 'linear-gradient(180deg, rgba(5,10,24,0.98), rgba(7,10,18,0.96) 48%, rgba(6,10,15,0.98))',
        borderRight: '1px solid rgba(148,163,184,0.12)',
        boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.03)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(148,163,184,0.1)' }}
      >
        {!collapsed && (
          <div className="min-w-0">
            <BrandLogo size={38} subtitle="Value-Focused Thinking" />
          </div>
        )}
        {collapsed && (
          <div className="mx-auto">
            <BrandLogo compact size={36} />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded transition-colors shrink-0"
            style={{ color: '#64748b' }}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1.5">
        <button
          onClick={() => { setActiveProject(null); setView('project-list') }}
          title="Projetos"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors"
          style={
            currentView === 'project-list'
              ? { background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(56,189,248,0.08))', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.22)' }
              : { color: '#94a3b8', border: '1px solid transparent' }
          }
        >
          <FolderOpen size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">Projetos</span>}
        </button>

        {activeProjectId && (
          <button
            onClick={() => setView('documents')}
            title="Documentos"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors"
            style={
              currentView === 'documents'
                ? { background: 'linear-gradient(135deg, rgba(56,189,248,0.14), rgba(59,130,246,0.08))', color: '#7dd3fc', border: '1px solid rgba(125,211,252,0.2)' }
                : { color: '#94a3b8', border: '1px solid transparent' }
            }
          >
            <FileText size={17} className="shrink-0" />
            {!collapsed && <span className="truncate">Documentos</span>}
          </button>
        )}

        <button
          onClick={() => setView('guide')}
          title="Guia de Uso"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors"
          style={
            currentView === 'guide'
              ? { background: 'linear-gradient(135deg, rgba(16,185,129,0.14), rgba(45,212,191,0.08))', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.18)' }
              : { color: '#94a3b8', border: '1px solid transparent' }
          }
        >
          <BookOpen size={17} className="shrink-0" />
          {!collapsed && <span className="truncate">Guia de Uso</span>}
        </button>

        {activeProject && !collapsed && (
          <div
            className="mx-1 mt-4 rounded-[24px] p-4"
            style={{
              background: 'radial-gradient(circle at top left, rgba(56,189,248,0.16), rgba(15,23,42,0.95) 55%)',
              border: '1px solid rgba(103,232,249,0.14)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Compass size={14} style={{ color: '#67e8f9' }} />
              <span className="text-[11px] uppercase tracking-[0.2em]" style={{ color: '#67e8f9' }}>
                Decision Room
              </span>
            </div>
            <p className="text-sm font-semibold leading-snug" style={{ color: '#f8fafc' }}>
              {activeProject.name}
            </p>
            <p className="text-xs mt-1 leading-5" style={{ color: '#cbd5e1' }}>
              Fase {activeProject.phase_status} em andamento, passo atual {activeProject.current_step}.
            </p>
          </div>
        )}

        <button
          onClick={() => setView('settings')}
          title="Configurações"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-colors"
          style={
            currentView === 'settings'
              ? { background: 'linear-gradient(135deg, rgba(244,114,182,0.14), rgba(192,38,211,0.08))', color: '#f9a8d4', border: '1px solid rgba(249,168,212,0.18)' }
              : { color: '#94a3b8', border: '1px solid transparent' }
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
            style={{ color: '#64748b' }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </aside>
  )
}
