import type { Project } from '../../types'

interface ProjectCardProps {
  project: Project
  onOpen: (id: string) => void
}

const PHASE_LABELS: Record<number, string> = {
  1: 'Fase 1',
  2: 'Fase 2',
  3: 'Fase 3',
}

const PHASE_COLORS: Record<number, string> = {
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-purple-100 text-purple-700',
  3: 'bg-emerald-100 text-emerald-700',
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return isoString
  }
}

export function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const phaseLabel = PHASE_LABELS[project.phase_status] ?? 'Fase 1'
  const phaseColor = PHASE_COLORS[project.phase_status] ?? PHASE_COLORS[1]

  return (
    <div
      onClick={() => onOpen(project.id)}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md cursor-pointer transition-shadow"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpen(project.id)
      }}
      aria-label={`Abrir projeto ${project.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 text-base leading-tight">{project.name}</h3>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${phaseColor}`}>
          {phaseLabel}
        </span>
      </div>
      {project.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{project.description}</p>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Criado em {formatDate(project.created_at)} · Passo {project.current_step}
      </p>
    </div>
  )
}
