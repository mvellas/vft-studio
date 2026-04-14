import { Trash2 } from 'lucide-react'
import type { Project } from '../../types'

interface ProjectCardProps {
  project: Project
  onOpen: (id: string) => void
  onDelete: (id: string, name: string) => void
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Fase 1',
  2: 'Fase 2',
  3: 'Fase 3',
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch {
    return isoString
  }
}

export function ProjectCard({ project, onOpen, onDelete }: ProjectCardProps) {
  return (
    <div
      className="rounded-xl transition-all duration-200 relative group"
      style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.border = '1px solid rgba(232,121,249,0.25)'
        el.style.boxShadow = '0 0 20px rgba(232,121,249,0.06)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.border = '1px solid rgba(255,255,255,0.07)'
        el.style.boxShadow = 'none'
      }}
    >
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(project.id, project.name) }}
        className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
        style={{ color: 'rgba(255,255,255,0.2)', background: 'transparent' }}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = '#f87171'
          el.style.background = 'rgba(239,68,68,0.1)'
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLButtonElement
          el.style.color = 'rgba(255,255,255,0.2)'
          el.style.background = 'transparent'
        }}
        aria-label={`Excluir projeto ${project.name}`}
        title="Excluir projeto"
      >
        <Trash2 size={13} />
      </button>

      <div
        onClick={() => onOpen(project.id)}
        className="p-4 cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(project.id) }}
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
}
