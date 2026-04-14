# VFT Studio Frontend Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retheme the entire VFT Studio frontend to Midnight Ink identity (#0e0e13 + #e879f9), add Framer Motion animations, replace the War Room timeline with an animated vis-network graph, and restyle all ReactFlow diagrams with the dark theme + png export via html-to-image.

**Architecture:** Five sequential phases — A (global theme tokens + shell), B (Framer Motion transitions), C (War Room vis-network graph), D (ReactFlow diagrams dark theme + new IDF diagram), E (polish + consistency). Each phase is independently shippable. Phases D and E depend on A being done first; B and C are independent of each other after A.

**Tech Stack:** React 18, TypeScript, Tailwind v4 (`@theme` tokens in index.css), Framer Motion v11, vis-network v9 + vis-data v7, @xyflow/react v12 (already installed), html-to-image v1 (replaces html2canvas), dagre (already installed)

---

## Pre-flight: Install new dependencies

- [ ] **Install packages**

```bash
cd frontend
npm install framer-motion vis-network vis-data html-to-image
```

Expected output: 4 new packages added, no peer dependency warnings.

- [ ] **Verify TypeScript types resolve**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors (or same errors as before install).

- [ ] **Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(deps): add framer-motion, vis-network, vis-data, html-to-image"
```

---

## Phase A — Global Theme + Shell

### Task A1: CSS design tokens + body background

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Replace index.css with Midnight Ink tokens and dark scrollbar**

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
@import "@fontsource/inter/400.css";
@import "@fontsource/inter/500.css";
@import "@fontsource/inter/600.css";
@import "@fontsource/inter/700.css";
@import "@fontsource/inter/800.css";

@theme {
  --font-sans: "Inter", sans-serif;

  /* Midnight Ink palette */
  --color-ink-900: #07070c;
  --color-ink-800: #0e0e13;
  --color-ink-700: #0a0a0f;
  --color-ink-600: #13131f;

  /* Accent */
  --color-accent: #e879f9;
  --color-accent-dark: #a21caf;

  /* Agent colors */
  --color-agent-aria: #e879f9;
  --color-agent-frame: #60a5fa;
  --color-agent-axiom: #fbbf24;
  --color-agent-nova: #34d399;
  --color-agent-analyst: #a78bfa;
}

html, body, #root {
  background-color: #07070c;
  color: #f8fafc;
  min-height: 100vh;
}

/* Dark scrollbars */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(232,121,249,0.3); }
* { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }

/* ReactFlow dark override */
.react-flow { background: #07070c !important; }
.react-flow__background { background: #07070c !important; }
.react-flow__controls button {
  background: #13131f !important;
  border-color: rgba(255,255,255,0.07) !important;
  color: #94a3b8 !important;
}
.react-flow__controls button:hover {
  background: rgba(232,121,249,0.1) !important;
  color: #e879f9 !important;
}
.react-flow__minimap { background: #0e0e13 !important; }
```

- [ ] **Commit**

```bash
git add frontend/src/index.css
git commit -m "feat(theme): Midnight Ink CSS tokens + dark body + ReactFlow overrides"
```

---

### Task A2: AppShell dark theme

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] **Replace AppShell with dark theme version**

Replace the entire `AppShell.tsx` with:

```tsx
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
```

- [ ] **Commit**

```bash
git add frontend/src/components/layout/AppShell.tsx
git commit -m "feat(theme): AppShell Midnight Ink — dark header + accent borders"
```

---

### Task A3: Sidebar dark theme

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`

- [ ] **Replace Sidebar with dark theme version**

```tsx
import { useUiStore } from '../../stores/uiStore'
import { useProjectStore } from '../../stores/projectStore'
import { FolderOpen, Settings, ChevronLeft, ChevronRight, FileText, BookOpen } from 'lucide-react'

interface SidebarProps {
  collapsed: boolean
  width: number
}

const NAV_ITEMS = [
  { id: 'project-list' as const, icon: FolderOpen, label: 'Projetos' },
  { id: 'guide' as const, icon: BookOpen, label: 'Guia de Uso' },
  { id: 'settings' as const, icon: Settings, label: 'Configurações' },
]

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
        {collapsed && (
          <button
            onClick={toggleSidebar}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 p-1 rounded transition-colors"
            style={{ color: '#475569' }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
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
```

- [ ] **Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx
git commit -m "feat(theme): Sidebar Midnight Ink — gradient logo + accent active state"
```

---

### Task A4: ProjectCard + ProjectList dark theme

**Files:**
- Modify: `frontend/src/components/project/ProjectCard.tsx`
- Modify: `frontend/src/components/project/ProjectList.tsx`

- [ ] **Update ProjectCard with dark theme**

Replace the card wrapper and styles in `ProjectCard.tsx`. Change the outer `<div>` className and inline styles:

```tsx
// In ProjectCard.tsx — replace the outer div and inner elements:

  return (
    <div
      className="rounded-xl transition-all duration-200 relative group cursor-pointer"
      style={{
        background: '#0e0e13',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(232,121,249,0.25)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 20px rgba(232,121,249,0.06)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
      }}
    >
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(project.id, project.name) }}
        className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        style={{ color: 'rgba(255,255,255,0.2)' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#f87171'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.1)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.2)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
        aria-label={`Excluir projeto ${project.name}`}
        title="Excluir projeto"
      >
        <Trash2 size={13} />
      </button>

      <div
        onClick={() => onOpen(project.id)}
        className="p-4"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen(project.id) }}
        aria-label={`Abrir projeto ${project.name}`}
      >
        <div className="flex items-start justify-between gap-2 pr-6">
          <h3 className="font-semibold text-base leading-tight" style={{ color: '#f8fafc' }}>
            {project.name}
          </h3>
          <span
            className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full"
            style={
              project.phase_status === 1
                ? { background: 'rgba(96,165,250,0.12)', color: '#60a5fa' }
                : project.phase_status === 2
                ? { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }
                : { background: 'rgba(52,211,153,0.12)', color: '#34d399' }
            }
          >
            {PHASE_LABELS[project.phase_status] ?? 'Fase 1'}
          </span>
        </div>
        {project.description && (
          <p className="mt-2 text-sm line-clamp-2" style={{ color: '#64748b' }}>
            {project.description}
          </p>
        )}
        <p className="mt-3 text-xs" style={{ color: '#334155' }}>
          Criado em {formatDate(project.created_at)} · Passo {project.current_step}
        </p>
      </div>
    </div>
  )
```

- [ ] **Update ProjectList header and modal colors**

In `ProjectList.tsx`, update:
1. The outer `<div>` background — remove `bg-white`, add inline `style={{ background: '#07070c' }}`
2. `h1` title: change `text-gray-900` to inline `style={{ color: '#f8fafc' }}`
3. Error div: replace `bg-red-50 border-red-200 text-red-700` with `style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}`
4. Skeleton divs: replace `bg-white` with `style={{ background: '#0e0e13' }}` and `bg-gray-200` with `style={{ background: 'rgba(255,255,255,0.06)' }}`
5. Empty state div: replace `bg-white border-gray-200 text-gray-500` with inline dark styles
6. Delete confirmation modal: update `bg-white` → `background: '#13131f'`, text colors → dark palette, `bg-red-100` → `rgba(239,68,68,0.15)`, `text-red-600` → `#f87171`

Full updated `ProjectList.tsx`:

```tsx
import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, X } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { getLatestRun } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { ProjectCard } from './ProjectCard'
import { NewProjectWizard } from './NewProjectWizard'

interface DeleteConfirmState { id: string; name: string }

export function ProjectList() {
  const { projects, setProjects, setActiveProject, removeProject, loading, setLoading, error, setError } = useProjectStore()
  const { setView, setPipelineView } = useUiStore()
  const { setFromExisting, reset: resetPipeline } = usePipelineStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    projectsApi.list()
      .then(data => { if (!cancelled) setProjects(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar projetos') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [setProjects, setLoading, setError])

  function handleOpen(id: string) {
    resetPipeline(); setPipelineView('idle'); setActiveProject(id); setView('project-detail')
    getLatestRun(id).then(run => {
      if (run && run.status === 'done' && run.report_md) { setFromExisting(run.report_md, run.id); setPipelineView('report') }
    })
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await projectsApi.archive(deleteConfirm.id)
      removeProject(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir projeto')
    } finally { setDeleting(false) }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#f8fafc' }}>Projetos</h1>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
        >
          <Plus size={15} />
          Novo Projeto
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="h-4 rounded w-3/4 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded w-full mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && !error && (
        <div className="text-center py-16 rounded-xl" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm mb-4" style={{ color: '#475569' }}>Nenhum projeto. Crie seu primeiro projeto VFT.</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
          >
            Criar Projeto
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard key={project.id} project={project} onOpen={handleOpen} onDelete={(id, name) => setDeleteConfirm({ id, name })} />
          ))}
        </div>
      )}

      {wizardOpen && <NewProjectWizard onClose={() => setWizardOpen(false)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <AlertTriangle size={18} style={{ color: '#f87171' }} />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-base" style={{ color: '#f8fafc' }}>Excluir projeto</h2>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  Tem certeza que deseja excluir <strong style={{ color: '#e2e8f0' }}>"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} style={{ color: '#475569' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Run TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

Expected: 0 errors.

- [ ] **Commit**

```bash
git add frontend/src/components/project/
git commit -m "feat(theme): ProjectCard + ProjectList Midnight Ink dark theme"
```

---

### Task A5: PhaseProgress dark theme

**Files:**
- Modify: `frontend/src/components/phase/PhaseProgress.tsx`

- [ ] **Read current PhaseProgress**

```bash
cat frontend/src/components/phase/PhaseProgress.tsx
```

- [ ] **Update progress bar fill to accent gradient**

Find the progress bar fill element (typically a div with `style={{ width: progressPercent + '%' }}`) and update its style:

```tsx
// Progress bar fill — replace whatever bg-* class is there:
style={{
  width: `${progressPercent}%`,
  background: 'linear-gradient(90deg, #a21caf, #e879f9)',
  transition: 'width 0.4s ease',
}}
```

Find the progress bar track (container) and update:
```tsx
style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '2px', height: '3px' }}
```

Find any text showing current step info and update color to `style={{ color: '#64748b' }}`.

- [ ] **Commit**

```bash
git add frontend/src/components/phase/PhaseProgress.tsx
git commit -m "feat(theme): PhaseProgress accent gradient bar"
```

---

### Task A6: PipelineButton dark theme

**Files:**
- Modify: `frontend/src/components/pipeline/PipelineButton.tsx`

- [ ] **Update PipelineButton inline styles**

Replace the button className string with inline styles:

```tsx
// Replace the button element:
<button
  onClick={handleStart}
  disabled={isRunning}
  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  style={{ border: '1px solid rgba(232,121,249,0.3)', color: '#e879f9', background: 'rgba(232,121,249,0.08)' }}
>
  <Play size={13} />
  VFT com IA
</button>
```

Update the modal (showModal block) to dark theme:

```tsx
// Modal overlay:
<div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
  <div className="rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 space-y-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
    <div className="flex items-center justify-between">
      <h2 className="text-base font-semibold" style={{ color: '#f8fafc' }}>Contexto do projeto</h2>
      <button onClick={() => setShowModal(false)} style={{ color: '#475569' }}><X size={16} /></button>
    </div>
    <p className="text-sm" style={{ color: '#64748b' }}>
      Descreva o problema de decisão para que os agentes tenham contexto adequado.
    </p>
    <textarea
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      placeholder="Ex: Decidir qual tecnologia adotar para o novo sistema de pagamentos..."
      rows={4}
      className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
      style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }}
    />
    <div className="flex justify-end gap-2">
      <button onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg"
        style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
        Cancelar
      </button>
      <button onClick={handleModalConfirm} className="text-sm px-4 py-2 rounded-lg"
        style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}>
        Iniciar análise
      </button>
    </div>
  </div>
</div>
```

- [ ] **Commit**

```bash
git add frontend/src/components/pipeline/PipelineButton.tsx
git commit -m "feat(theme): PipelineButton Midnight Ink modal + button"
```

---

### Task A7: ChatPanel dark theme

**Files:**
- Modify: `frontend/src/components/layout/ChatPanel.tsx`

- [ ] **Update agent badge colors to dark palette**

Find `agentBadgeColor` function and replace:

```tsx
function agentBadgeColor(agentName: string): { bg: string; color: string; border: string } {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    ARIA:    { bg: 'rgba(232,121,249,0.1)',  color: '#e879f9', border: 'rgba(232,121,249,0.25)' },
    FRAME:   { bg: 'rgba(96,165,250,0.1)',   color: '#60a5fa', border: 'rgba(96,165,250,0.25)' },
    AXIOM:   { bg: 'rgba(251,191,36,0.1)',   color: '#fbbf24', border: 'rgba(251,191,36,0.25)' },
    NOVA:    { bg: 'rgba(52,211,153,0.1)',   color: '#34d399', border: 'rgba(52,211,153,0.25)' },
    ANALYST: { bg: 'rgba(167,139,250,0.1)',  color: '#a78bfa', border: 'rgba(167,139,250,0.25)' },
  }
  return map[agentName] ?? { bg: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: 'rgba(255,255,255,0.1)' }
}
```

- [ ] **Update ChatPanel container and input area**

Find the outermost wrapping div of ChatPanel and replace `bg-white` / light colors with:
- Panel background: `style={{ background: '#0a0a0f', borderLeft: '1px solid rgba(255,255,255,0.06)' }}`
- Header: `style={{ background: '#09090e', borderBottom: '1px solid rgba(255,255,255,0.06)' }}`
- Message bubbles for user: `style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.15)' }}`
- Message bubbles for assistant: `style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}`
- Input area: `style={{ background: '#09090e', borderTop: '1px solid rgba(255,255,255,0.06)' }}`
- Textarea: `style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.08)', color: '#f8fafc' }}`
- Text colors: `#f8fafc` (primary), `#94a3b8` (secondary), `#475569` (muted)
- Badge: use the `agentBadgeColor` return value as inline style

Update the agent badge render (where the badge className is set) to use inline styles from the updated function:

```tsx
// Find where badge is rendered and update to:
const badge = agentBadgeColor(msg.agentName ?? '')
<span
  className="text-xs font-semibold px-2 py-0.5 rounded-full"
  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
>
  {msg.agentName}
</span>
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/layout/ChatPanel.tsx
git commit -m "feat(theme): ChatPanel Midnight Ink — dark messages + agent badge colors"
```

---

## Phase B — Framer Motion Animations

### Task B1: Page transitions with AnimatePresence

**Files:**
- Modify: `frontend/src/App.tsx`

- [ ] **Add AnimatePresence + motion.div to view transitions**

```tsx
// Add imports at top of App.tsx:
import { AnimatePresence, motion } from 'framer-motion'

// Wrap each view render inside App() function.
// Replace the views block inside <AppShell><ErrorBoundary>...</ErrorBoundary></AppShell>:

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.12, ease: 'easeIn' } },
}

// Inside the JSX — replace the views block:
<ErrorBoundary>
  <AnimatePresence mode="wait">
    {currentView === 'project-list' && (
      <motion.div key="project-list" {...pageVariants}><ProjectList /></motion.div>
    )}
    {currentView === 'project-detail' && (
      <motion.div key="project-detail" {...pageVariants}><ProjectDetailView /></motion.div>
    )}
    {currentView === 'settings' && (
      <motion.div key="settings" {...pageVariants}><SettingsView /></motion.div>
    )}
    {currentView === 'guide' && (
      <motion.div key="guide" {...pageVariants}><GuideView /></motion.div>
    )}
    {currentView === 'documents' && (
      <motion.div key="documents" {...pageVariants}>
        <DocumentPanel onAnalyze={() => {
          useChatStore.getState().setActiveAgent('ANALYST', 'analyst')
          useChatStore.getState().setAutoSendMessage('Analise os documentos disponíveis e extraia os valores, objetivos e posições relevantes para o projeto VFT. Cite as fontes diretamente.')
          useUiStore.getState().setChatPanelOpen(true)
          useUiStore.getState().setView('project-detail')
        }} />
      </motion.div>
    )}
  </AnimatePresence>
</ErrorBoundary>
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(anim): AnimatePresence page transitions with framer-motion"
```

---

### Task B2: Modal + Card entrance animations

**Files:**
- Modify: `frontend/src/components/project/ProjectList.tsx`
- Modify: `frontend/src/components/pipeline/PipelinePanel.tsx`

- [ ] **Add motion to delete confirmation modal in ProjectList**

```tsx
// Add import at top:
import { motion, AnimatePresence } from 'framer-motion'

// Wrap the modal overlay conditional:
<AnimatePresence>
  {deleteConfirm && (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <motion.div
        className="rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4"
        style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.94, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 8 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
      >
        {/* ...same modal content as Task A4... */}
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

- [ ] **Add AgentTurnCard entrance animation in PipelinePanel**

```tsx
// In PipelinePanel.tsx, add import:
import { motion } from 'framer-motion'

// Wrap each AgentTurnCard render:
{phaseTurns.map((turn, idx) => (
  <motion.div
    key={turn.id}
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.2, delay: idx * 0.04 }}
  >
    <AgentTurnCard turn={turn} isActive={status === 'running' && idx === phaseTurns.length - 1} />
  </motion.div>
))}
```

- [ ] **Commit**

```bash
git add frontend/src/components/project/ProjectList.tsx frontend/src/components/pipeline/PipelinePanel.tsx
git commit -m "feat(anim): modal scale-in + AgentTurnCard stagger entrance"
```

---

## Phase C — War Room Graph (vis-network)

### Task C1: WarRoomGraph component

**Files:**
- Create: `frontend/src/components/pipeline/WarRoomGraph.tsx`

- [ ] **Create WarRoomGraph.tsx**

```tsx
import { useEffect, useRef, useCallback } from 'react'
import { Network, DataSet } from 'vis-network/standalone'
import type { AgentTurn } from '../../stores/pipelineStore'

// Agent config
const AGENT_CONFIG: Record<string, { color: string; size: number }> = {
  ARIA:    { color: '#e879f9', size: 28 },
  FRAME:   { color: '#60a5fa', size: 20 },
  AXIOM:   { color: '#fbbf24', size: 20 },
  NOVA:    { color: '#34d399', size: 20 },
  ANALYST: { color: '#a78bfa', size: 18 },
}

const ALL_AGENTS = ['ARIA', 'FRAME', 'AXIOM', 'NOVA'] as const

interface Props {
  turns: AgentTurn[]
  activeAgent: string | null
}

export function WarRoomGraph({ turns, activeAgent }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const nodesRef = useRef<DataSet<{ id: string; label: string; color: { background: string; border: string }; borderWidth: number; size: number; font: { color: string; size: number; bold: boolean }; shape: string }> | null>(null)
  const edgesRef = useRef<DataSet<{ id: string; from: string; to: string; color: { color: string; opacity: number }; width: number; dashes: boolean | number[]; arrows: { to: { enabled: boolean; scaleFactor: number } } }> | null>(null)

  // Initialize network once
  useEffect(() => {
    if (!containerRef.current) return

    const nodes = new DataSet(
      ALL_AGENTS.map(name => {
        const cfg = AGENT_CONFIG[name] ?? { color: '#94a3b8', size: 18 }
        return {
          id: name,
          label: name,
          shape: 'dot',
          size: cfg.size,
          color: {
            background: cfg.color + '22',
            border: cfg.color,
          },
          borderWidth: 2,
          font: { color: cfg.color, size: 11, bold: true },
        }
      })
    )

    const edges = new DataSet<{ id: string; from: string; to: string; color: { color: string; opacity: number }; width: number; dashes: boolean | number[]; arrows: { to: { enabled: boolean; scaleFactor: number } } }>([])

    nodesRef.current = nodes
    edgesRef.current = edges

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        physics: {
          enabled: true,
          forceAtlas2Based: { gravitationalConstant: -40, springLength: 120, springConstant: 0.05 },
          solver: 'forceAtlas2Based',
          stabilization: { iterations: 80 },
        },
        edges: {
          smooth: { enabled: true, type: 'curvedCW', roundness: 0.2 },
          arrows: { to: { enabled: true, scaleFactor: 0.6 } },
        },
        nodes: { borderWidthSelected: 3 },
        interaction: { dragNodes: true, zoomView: false, hover: true },
        background: { color: 'transparent' },
      }
    )

    networkRef.current = network
    return () => { network.destroy(); networkRef.current = null }
  }, [])

  // React to turns: add/animate edges
  const edgeKeyRef = useRef(0)

  useEffect(() => {
    if (!nodesRef.current || !edgesRef.current || turns.length === 0) return

    const latest = turns[turns.length - 1]
    if (!latest.isWarRoom) return

    const speaker = latest.agentName
    const recipients = ALL_AGENTS.filter(a => a !== speaker)

    // Remove old edges from this speaker
    const toRemove = (edgesRef.current.getIds() as string[]).filter(id => id.startsWith(`${speaker}-`))
    if (toRemove.length > 0) edgesRef.current.remove(toRemove)

    // Add new edges speaker → each recipient
    const cfg = AGENT_CONFIG[speaker] ?? { color: '#94a3b8', size: 18 }
    recipients.forEach(target => {
      const edgeId = `${speaker}-${target}-${++edgeKeyRef.current}`
      edgesRef.current!.add({
        id: edgeId,
        from: speaker,
        to: target,
        color: { color: cfg.color, opacity: 0.45 },
        width: 1.5,
        dashes: [5, 4],
        arrows: { to: { enabled: true, scaleFactor: 0.5 } },
      })
      // Auto-remove edge after 3.5 seconds
      setTimeout(() => {
        try { edgesRef.current?.remove(edgeId) } catch { /* already removed */ }
      }, 3500)
    })
  }, [turns])

  // Highlight active agent node
  useEffect(() => {
    if (!nodesRef.current) return
    ALL_AGENTS.forEach(name => {
      const cfg = AGENT_CONFIG[name] ?? { color: '#94a3b8', size: 18 }
      const isActive = name === activeAgent
      nodesRef.current!.update({
        id: name,
        borderWidth: isActive ? 3 : 2,
        size: isActive ? (cfg.size + 6) : cfg.size,
        color: {
          background: isActive ? cfg.color + '33' : cfg.color + '22',
          border: cfg.color,
        },
      })
    })
  }, [activeAgent])

  return (
    <div className="relative w-full h-full" style={{ minHeight: 240 }}>
      {/* Grid background */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.4 }}
      >
        <defs>
          <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(232,121,249,0.06)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      <div ref={containerRef} className="absolute inset-0" />
    </div>
  )
}
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

Expected: 0 errors. If vis-network types error, add `// @ts-ignore` above the import as a fallback.

- [ ] **Commit**

```bash
git add frontend/src/components/pipeline/WarRoomGraph.tsx
git commit -m "feat(war-room): WarRoomGraph vis-network component with animated edges"
```

---

### Task C2: Integrate WarRoomGraph into PipelinePanel

**Files:**
- Modify: `frontend/src/components/pipeline/PipelinePanel.tsx`
- Modify: `frontend/src/components/pipeline/WarRoomTimeline.tsx`

- [ ] **Update PipelinePanel to show graph + chat side by side during War Room**

In `PipelinePanel.tsx`, replace the `{warRoomTurns.length > 0 && ...}` block:

```tsx
// Add import at top:
import { WarRoomGraph } from './WarRoomGraph'

// Replace the warRoomTurns block:
{warRoomTurns.length > 0 && (
  <div
    className="rounded-xl overflow-hidden"
    style={{ border: '1px solid rgba(255,255,255,0.07)', background: '#07070c' }}
  >
    {/* Act header */}
    <div
      className="px-4 py-2.5 flex items-center justify-between"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0f' }}
    >
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
        War Room
        {warRoomTurns[warRoomTurns.length - 1]?.act
          ? ` · Ato ${warRoomTurns[warRoomTurns.length - 1].act}`
          : ''}
      </span>
      {status === 'running' && activeAgent && (
        <span
          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#f87171', animation: 'pulse 1.2s infinite' }}
          />
          Ao vivo
        </span>
      )}
    </div>

    {/* Graph + Chat */}
    <div className="flex" style={{ height: 300 }}>
      {/* Graph */}
      <div className="flex-1" style={{ background: '#07070c' }}>
        <WarRoomGraph turns={warRoomTurns} activeAgent={activeAgent} />
      </div>
      {/* Chat timeline */}
      <div
        className="w-64 overflow-y-auto flex flex-col gap-2 p-3"
        style={{ borderLeft: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0f' }}
      >
        <WarRoomTimeline turns={warRoomTurns} activeAgent={activeAgent} />
      </div>
    </div>
  </div>
)}
```

- [ ] **Update WarRoomTimeline to dark theme**

In `WarRoomTimeline.tsx`, replace the color maps and styles:

```tsx
const AGENT_COLOR: Record<string, string> = {
  ARIA:    '#e879f9',
  FRAME:   '#60a5fa',
  AXIOM:   '#fbbf24',
  NOVA:    '#34d399',
  ANALYST: '#a78bfa',
}

// Replace return JSX:
return (
  <div className="space-y-3">
    {turns.map((turn, idx) => {
      const color = AGENT_COLOR[turn.agentName] ?? '#94a3b8'
      const isActive = activeAgent === turn.agentName && idx === turns.length - 1
      return (
        <div key={turn.id} className="flex gap-2">
          <div
            className="w-1.5 shrink-0 rounded-full mt-1"
            style={{ background: color, opacity: isActive ? 1 : 0.4, minHeight: 14 }}
          />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold mb-0.5 flex items-center gap-1.5" style={{ color }}>
              {turn.agentName}
              {isActive && (
                <span className="w-1 h-1 rounded-full inline-block" style={{ background: color, animation: 'pulse 0.8s infinite' }} />
              )}
            </div>
            <p className="text-xs leading-relaxed line-clamp-4" style={{ color: '#64748b' }}>
              {turn.text}
            </p>
          </div>
        </div>
      )
    })}
  </div>
)
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/pipeline/PipelinePanel.tsx frontend/src/components/pipeline/WarRoomTimeline.tsx
git commit -m "feat(war-room): graph + chat side-by-side layout, dark WarRoomTimeline"
```

---

### Task C3: Dark PipelinePanel running status + AgentTurnCard

**Files:**
- Modify: `frontend/src/components/pipeline/PipelinePanel.tsx`
- Modify: `frontend/src/components/pipeline/AgentTurnCard.tsx`

- [ ] **Read AgentTurnCard**

```bash
cat frontend/src/components/pipeline/AgentTurnCard.tsx
```

- [ ] **Update running status indicator in PipelinePanel**

Replace the indigo running indicator:

```tsx
{status === 'running' && (
  <div
    className="flex items-center gap-3 rounded-xl px-4 py-3"
    style={{ background: 'rgba(232,121,249,0.06)', border: '1px solid rgba(232,121,249,0.15)' }}
  >
    <div
      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
      style={{ borderColor: '#e879f9', borderTopColor: 'transparent' }}
    />
    <span className="text-sm font-medium" style={{ color: '#e879f9' }}>
      {activeAgent ? `${activeAgent} — ` : ''}
      <RotatingStatus />
    </span>
  </div>
)}
```

- [ ] **Update AgentTurnCard with dark theme**

In `AgentTurnCard.tsx`, update the card container and header colors to dark. The card body should use:
- Container: `style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '12px' }}`
- Active state adds: `borderColor: 'rgba(232,121,249,0.2)', boxShadow: '0 0 12px rgba(232,121,249,0.05)'`
- Agent name badge: use same `AGENT_COLOR` map as WarRoomTimeline
- Text body: `style={{ color: '#94a3b8' }}`
- Phase label: `style={{ color: '#334155' }}`

- [ ] **Commit**

```bash
git add frontend/src/components/pipeline/PipelinePanel.tsx frontend/src/components/pipeline/AgentTurnCard.tsx
git commit -m "feat(theme): PipelinePanel + AgentTurnCard dark theme"
```

---

## Phase D — Diagrams VFT Dark Theme + IDF Diagram

### Task D1: Shared diagram utilities

**Files:**
- Create: `frontend/src/components/diagrams/diagramTheme.ts`
- Create: `frontend/src/components/diagrams/exportPng.ts`

- [ ] **Create diagramTheme.ts**

```ts
// frontend/src/components/diagrams/diagramTheme.ts

export const DIAGRAM_BG = '#07070c'
export const DIAGRAM_BORDER = 'rgba(255,255,255,0.07)'

export const NODE_STYLES = {
  strategic: {
    background: 'rgba(232,121,249,0.15)',
    border: '1.5px solid rgba(232,121,249,0.4)',
    color: '#f0abfc',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
    fontWeight: '600',
  },
  fundamental: {
    background: 'rgba(251,191,36,0.1)',
    border: '1.5px solid rgba(251,191,36,0.35)',
    color: '#fcd34d',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  means: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#64748b',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  stakeholder: {
    background: 'rgba(96,165,250,0.1)',
    border: '1.5px solid rgba(96,165,250,0.3)',
    color: '#93c5fd',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '600',
  },
  alternative: {
    background: 'rgba(52,211,153,0.1)',
    border: '1.5px solid rgba(52,211,153,0.3)',
    color: '#6ee7b7',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '11px',
    fontWeight: '600',
  },
} as const

export const EDGE_STYLE = {
  stroke: 'rgba(255,255,255,0.15)',
  strokeWidth: 1,
}
```

- [ ] **Create exportPng.ts**

```ts
// frontend/src/components/diagrams/exportPng.ts
import { toPng } from 'html-to-image'

export async function exportDiagramPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // Ensure dark background is captured
  const original = element.style.background
  element.style.background = '#07070c'

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#07070c',
      pixelRatio: 2,
      style: { background: '#07070c' },
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
  } finally {
    element.style.background = original
  }
}
```

- [ ] **Commit**

```bash
git add frontend/src/components/diagrams/
git commit -m "feat(diagrams): shared theme tokens + html-to-image exportPng utility"
```

---

### Task D2: Retheme ObjectivesHierarchy

**Files:**
- Modify: `frontend/src/components/phase2/ObjectivesHierarchy.tsx`

- [ ] **Update HierarchyNode colors to dark theme**

Replace the `colorClass` computation and card JSX inside `HierarchyNode`:

```tsx
// Replace colorClass and the wrapper div:
function HierarchyNode({ data }: { data: HierarchyNodeData }) {
  const isFundamental = data.type === 'fundamental'

  const nodeStyle = isFundamental
    ? { background: 'rgba(251,191,36,0.08)', border: '1.5px solid rgba(251,191,36,0.3)', borderRadius: '8px' }
    : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px' }

  // ... handleParentChange stays the same ...

  return (
    <div style={{ ...nodeStyle, width: NODE_WIDTH, minHeight: NODE_HEIGHT, padding: '10px 12px' }}>
      <Handle type="target" position={Position.Top} style={{ background: '#475569', border: 'none' }} />
      <p className="text-xs font-medium line-clamp-2 mb-1.5" style={{ color: isFundamental ? '#fcd34d' : '#94a3b8' }}>
        {data.statement}
      </p>
      {data.hasAttribute && (
        <span
          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium"
          style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399', border: '1px solid rgba(52,211,153,0.2)' }}
        >
          Atributo definido
        </span>
      )}
      {data.fundamentalOptions.length > 0 && (
        <div className="mt-1.5">
          <select
            value={data.parentId ?? ''}
            onChange={e => handleParentChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full text-xs rounded px-1 py-0.5 focus:outline-none"
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}
          >
            <option value="">Pai: (raiz)</option>
            {data.fundamentalOptions
              .filter(o => o.id !== data.objectiveId)
              .map(o => (
                <option key={o.id} value={o.id}>
                  {o.statement.slice(0, 40)}{o.statement.length > 40 ? '…' : ''}
                </option>
              ))}
          </select>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} style={{ background: '#475569', border: 'none' }} />
    </div>
  )
}
```

- [ ] **Replace html2canvas export with html-to-image**

```tsx
// Replace import at top:
// Remove: import html2canvas from 'html2canvas'
// Add:
import { exportDiagramPng } from '../diagrams/exportPng'

// Replace handleExportPng:
const handleExportPng = async () => {
  if (!containerRef.current) return
  await exportDiagramPng(containerRef.current, 'objectives-hierarchy.png')
}
```

- [ ] **Update export button style in the Panel**

```tsx
<Panel position="top-right">
  <button
    type="button"
    onClick={handleExportPng}
    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
  >
    ⬇ PNG
  </button>
</Panel>
```

- [ ] **Update loading and empty state text colors**

```tsx
// Loading state:
<div className="text-sm flex items-center gap-2" style={{ color: '#475569' }}>
  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#e879f9' }} />
  Carregando hierarquia...
</div>

// Empty state:
<p className="text-sm text-center max-w-sm" style={{ color: '#334155' }}>
  Nenhum objetivo fundamental classificado ainda. Complete o WITI Test para identificar os fundamentais.
</p>
```

- [ ] **Update ReactFlow edge style**

In the `initialEdges` useMemo, update each edge:

```tsx
const rawEdges: Edge[] = included
  .filter(o => o.parent_id !== null && includedIds.has(o.parent_id!))
  .map(o => ({
    id: `hier-${o.id}`,
    source: o.parent_id!,
    target: o.id,
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)' },
    style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 },
  }))
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/phase2/ObjectivesHierarchy.tsx
git commit -m "feat(diagrams): ObjectivesHierarchy dark theme + html-to-image export"
```

---

### Task D3: Retheme MeansEndsNetwork

**Files:**
- Modify: `frontend/src/components/phase2/MeansEndsNetwork.tsx`

- [ ] **Read full MeansEndsNetwork.tsx**

```bash
cat frontend/src/components/phase2/MeansEndsNetwork.tsx
```

- [ ] **Apply same pattern as ObjectivesHierarchy**

Following the exact same changes as Task D2:

1. Replace `html2canvas` import with `import { exportDiagramPng } from '../diagrams/exportPng'`
2. Update `handleExportPng` to use `exportDiagramPng(containerRef.current, 'means-ends-network.png')`
3. Find the custom node component (similar to `HierarchyNode`) and update:
   - `fundamental` type nodes: `background: 'rgba(251,191,36,0.08)', border: '1.5px solid rgba(251,191,36,0.3)'`, text `color: '#fcd34d'`
   - `means` type nodes: `background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)'`, text `color: '#94a3b8'`
   - Handle dots: `style={{ background: '#475569', border: 'none' }}`
4. Update edges in useMemo:
   - `style: { stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1 }`
   - `markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)' }`
5. Update export button: same style as ObjectivesHierarchy (`⬇ PNG`, dark bg)
6. Update loading/empty state text to `color: '#475569'` / `color: '#334155'`

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/phase2/MeansEndsNetwork.tsx
git commit -m "feat(diagrams): MeansEndsNetwork dark theme + html-to-image export"
```

---

### Task D4: IdfDiagram — new component

**Files:**
- Create: `frontend/src/components/diagrams/IdfDiagram.tsx`

- [ ] **Create IdfDiagram.tsx**

This diagram shows stakeholders and the decision frame as a ReactFlow graph.

```tsx
// frontend/src/components/diagrams/IdfDiagram.tsx
import { useRef, useMemo } from 'react'
import {
  ReactFlow, Background, Controls, Handle, Panel, Position,
  useNodesState, useEdgesState, MarkerType, type Node, type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { exportDiagramPng } from './exportPng'
import type { Project } from '../../types'

// Types
interface StakeholderNodeData {
  label: string
  role: string
  isDecisionMaker: boolean
  [key: string]: unknown
}

interface DecisionNodeData {
  statement: string
  [key: string]: unknown
}

// Dagre layout
function layoutNodes(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 70, nodesep: 50 })
  nodes.forEach(n => g.setNode(n.id, { width: 180, height: 60 }))
  edges.forEach(e => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return {
    nodes: nodes.map(n => {
      const { x, y } = g.node(n.id)
      return { ...n, position: { x: x - 90, y: y - 30 } }
    }),
    edges,
  }
}

// Custom nodes
function DecisionNode({ data }: { data: DecisionNodeData }) {
  return (
    <div style={{
      background: 'rgba(232,121,249,0.12)',
      border: '1.5px solid rgba(232,121,249,0.4)',
      borderRadius: '10px',
      padding: '10px 14px',
      width: 200,
      minHeight: 60,
    }}>
      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#e879f9', marginBottom: '4px' }}>
        Decisão Central
      </p>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#f0abfc', lineHeight: 1.4 }}>
        {data.statement}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ background: '#e879f9', border: 'none' }} />
    </div>
  )
}

function StakeholderNode({ data }: { data: StakeholderNodeData }) {
  const isDM = data.isDecisionMaker
  return (
    <div style={{
      background: isDM ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)',
      border: isDM ? '1.5px solid rgba(96,165,250,0.35)' : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '8px 12px',
      width: 160,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#475569', border: 'none' }} />
      <p style={{ fontSize: '10px', fontWeight: 700, color: isDM ? '#93c5fd' : '#94a3b8' }}>
        {data.label}
      </p>
      <p style={{ fontSize: '9px', color: isDM ? '#60a5fa' : '#475569', marginTop: '2px' }}>
        {data.role}
      </p>
    </div>
  )
}

const nodeTypes = { decision: DecisionNode, stakeholder: StakeholderNode }

interface Props {
  project: Project
  stakeholders: Array<{ id: string; name: string; role: string; is_decision_maker: boolean }>
}

export function IdfDiagram({ project, stakeholders }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // Decision node (root)
    nodes.push({
      id: 'decision',
      type: 'decision',
      data: { statement: project.description ?? 'Decisão do Projeto' },
      position: { x: 0, y: 0 },
    })

    // Stakeholder nodes
    stakeholders.forEach(s => {
      nodes.push({
        id: s.id,
        type: 'stakeholder',
        data: { label: s.name, role: s.role, isDecisionMaker: s.is_decision_maker },
        position: { x: 0, y: 0 },
      })
      edges.push({
        id: `e-decision-${s.id}`,
        source: 'decision',
        target: s.id,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)' },
        style: { stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 },
      })
    })

    return layoutNodes(nodes, edges)
  }, [project, stakeholders])

  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const [edges] = useEdgesState(initialEdges)

  const handleExport = () => {
    if (containerRef.current) exportDiagramPng(containerRef.current, `idf-${project.name}.png`)
  }

  return (
    <div ref={containerRef} style={{ height: 400, background: '#07070c', borderRadius: '10px', overflow: 'hidden' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesConnectable={false}
      >
        <Background variant={'dots' as Parameters<typeof Background>[0]['variant']} color="rgba(255,255,255,0.04)" />
        <Controls position="bottom-left" />
        <Panel position="top-right">
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}
          >
            ⬇ PNG
          </button>
        </Panel>
      </ReactFlow>
    </div>
  )
}
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/diagrams/IdfDiagram.tsx
git commit -m "feat(diagrams): IdfDiagram component — stakeholders + decision node ReactFlow"
```

---

### Task D5: VftDiagramView — tabbed container

**Files:**
- Create: `frontend/src/components/diagrams/VftDiagramView.tsx`

- [ ] **Create VftDiagramView.tsx**

```tsx
// frontend/src/components/diagrams/VftDiagramView.tsx
import { useState } from 'react'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { IdfDiagram } from './IdfDiagram'
import type { Project } from '../../types'

type DiagramTab = 'idf' | 'objectives' | 'means-ends'

const TABS: Array<{ id: DiagramTab; label: string }> = [
  { id: 'idf', label: 'IDF' },
  { id: 'objectives', label: 'Hierarquia' },
  { id: 'means-ends', label: 'Meios-Fins' },
]

interface Props {
  project: Project
  stakeholders: Array<{ id: string; name: string; role: string; is_decision_maker: boolean }>
}

export function VftDiagramView({ project, stakeholders }: Props) {
  const [activeTab, setActiveTab] = useState<DiagramTab>('idf')

  return (
    <div className="w-full" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0a0a0f' }}
      >
        <span className="text-sm font-semibold" style={{ color: '#f8fafc' }}>
          Diagramas VFT
        </span>
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="text-xs px-3 py-1 rounded-md transition-colors"
              style={
                activeTab === tab.id
                  ? { background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }
                  : { background: 'transparent', color: '#475569', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Diagram content */}
      <div className="p-4">
        {activeTab === 'idf' && (
          <IdfDiagram project={project} stakeholders={stakeholders} />
        )}
        {activeTab === 'objectives' && (
          <div style={{ height: 400 }}>
            <ObjectivesHierarchy projectId={project.id} />
          </div>
        )}
        {activeTab === 'means-ends' && (
          <div style={{ height: 400 }}>
            <MeansEndsNetwork projectId={project.id} />
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1 | grep -i error | head -20
```

- [ ] **Commit**

```bash
git add frontend/src/components/diagrams/VftDiagramView.tsx
git commit -m "feat(diagrams): VftDiagramView tabbed container — IDF, Hierarquia, Meios-Fins"
```

---

## Phase E — Polish

### Task E1: GuideView dark theme

**Files:**
- Modify: `frontend/src/components/guide/GuideView.tsx`

- [ ] **Update GuideView hero and section colors**

In `GuideView.tsx`:
1. The hero `<div>` already has `from-indigo-600 to-indigo-800` gradient — replace with:
   `style={{ background: 'linear-gradient(135deg, #1a0a22, #0e0e1f)', border: '1px solid rgba(232,121,249,0.15)', borderRadius: '16px' }}`
2. Section `<div>` containers: replace `border-gray-200 bg-white hover:bg-gray-50` with:
   `style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden', background: '#0e0e13' }}`
3. Section button (title row): `style={{ background: '#0e0e13' }}` hover: `rgba(255,255,255,0.02)`
4. Section title text: `style={{ color: '#f8fafc' }}`
5. Section body text `text-gray-700`: → `style={{ color: '#94a3b8' }}`
6. Section body `strong`: → `style={{ color: '#e2e8f0' }}`
7. ChevronDown/Right icons: `style={{ color: '#475569' }}`
8. Mode cards grid (two cards): change `border-indigo-200 bg-white` and `border-emerald-200 bg-white` to dark variants with rgba borders
9. Footer: `style={{ color: '#334155' }}`
10. Code blocks `bg-gray-200 px-1`: → `style={{ background: 'rgba(255,255,255,0.06)', color: '#e879f9', borderRadius: '3px', padding: '1px 4px' }}`

- [ ] **Commit**

```bash
git add frontend/src/components/guide/GuideView.tsx
git commit -m "feat(theme): GuideView Midnight Ink dark theme"
```

---

### Task E2: Final TypeScript check + build

- [ ] **Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```

Expected: 0 errors. Fix any type errors before proceeding.

- [ ] **Production build**

```bash
cd frontend && npm run build 2>&1 | tail -10
```

Expected: `✓ built in X.XXs` with no errors. Chunk size warning is acceptable.

- [ ] **Final commit**

```bash
cd frontend
git add -A
git commit -m "feat(frontend): complete Midnight Ink redesign — theme, animations, War Room graph, VFT diagrams"
```

---

## Spec Coverage Verification

| Spec Section | Tasks Covering It |
|---|---|
| Midnight Ink palette + tokens | A1 |
| AppShell dark | A2 |
| Sidebar dark + logo | A3 |
| ProjectCard/List dark | A4 |
| PhaseProgress gradient | A5 |
| PipelineButton dark | A6 |
| ChatPanel dark + agent colors | A7 |
| Framer Motion page transitions | B1 |
| Modal + card animations | B2 |
| War Room vis-network graph | C1, C2 |
| War Room dark chat + timeline | C2, C3 |
| AgentTurnCard dark | C3 |
| Diagram theme utilities | D1 |
| ObjectivesHierarchy dark + export | D2 |
| MeansEndsNetwork dark + export | D3 |
| IdfDiagram new component | D4 |
| VftDiagramView tabbed container | D5 |
| GuideView dark | E1 |
| Build verification | E2 |
