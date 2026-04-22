import { ArrowUpRight, Trash2 } from 'lucide-react'
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
  const phaseTone = project.phase_status === 1
    ? { badgeBg: 'rgba(125,211,252,0.12)', badgeColor: '#7dd3fc', glow: 'rgba(56,189,248,0.22)' }
    : project.phase_status === 2
      ? { badgeBg: 'rgba(250,204,21,0.12)', badgeColor: '#fde047', glow: 'rgba(250,204,21,0.2)' }
      : { badgeBg: 'rgba(110,231,183,0.12)', badgeColor: '#6ee7b7', glow: 'rgba(52,211,153,0.2)' }

  return (
    <div
      className="rounded-[28px] transition-all duration-200 relative group overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(7,10,18,0.98))',
        border: '1px solid rgba(148,163,184,0.12)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.border = '1px solid rgba(103,232,249,0.22)'
        el.style.boxShadow = '0 24px 60px rgba(2,6,23,0.32)'
        el.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.border = '1px solid rgba(148,163,184,0.12)'
        el.style.boxShadow = 'none'
        el.style.transform = 'translateY(0)'
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: `radial-gradient(circle at top left, ${phaseTone.glow}, transparent 65%)` }}
      />

      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(project.id, project.name) }}
        className="absolute top-4 right-4 p-1.5 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
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
        className="p-5 cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onOpen(project.id) }}
        aria-label={`Abrir projeto ${project.name}`}
      >
        <div className="flex items-start justify-between gap-2 pr-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: '#67e8f9' }}>
              Decision Room
            </p>
            <h3 className="font-semibold text-lg leading-tight mt-2" style={{ color: '#f8fafc', letterSpacing: '-0.03em' }}>
              {project.name}
            </h3>
          </div>
          <span
            className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: phaseTone.badgeBg, color: phaseTone.badgeColor, border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {PHASE_LABELS[project.phase_status] ?? 'Fase 1'}
          </span>
        </div>
        {project.description && (
          <p className="mt-3 text-sm line-clamp-3 leading-6" style={{ color: '#cbd5e1' }}>
            {project.description}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs" style={{ color: '#94a3b8' }}>
            Criado em {formatDate(project.created_at)} · Passo {project.current_step}
          </p>
          <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#67e8f9' }}>
            Abrir
            <ArrowUpRight size={13} />
          </span>
        </div>
      </div>
    </div>
  )
}
