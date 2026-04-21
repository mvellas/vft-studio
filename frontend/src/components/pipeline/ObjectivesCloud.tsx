import { useEffect, useMemo, useState } from 'react'
import { objectivesApi, type Objective } from '../../api/objectives'

interface Props {
  projectId: string
}

const CLASS_COLORS: Record<string, { bg: string; color: string }> = {
  fundamental: { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' },
  means: { bg: 'rgba(96,165,250,0.14)', color: '#60a5fa' },
  other: { bg: 'rgba(232,121,249,0.14)', color: '#e879f9' },
}

function fontSizeFor(objective: Objective): number {
  if (objective.witi_classification === 'fundamental') return 24
  if (objective.parent_id) return 18
  return 15
}

export function ObjectivesCloud({ projectId }: Props) {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    objectivesApi.list(projectId)
      .then((data) => {
        if (!cancelled) setObjectives(data.filter(o => o.deleted === 0))
      })
      .catch(() => {
        if (!cancelled) setObjectives([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId])

  const cloudItems = useMemo(
    () => objectives
      .slice()
      .sort((a, b) => fontSizeFor(b) - fontSizeFor(a))
      .map((objective) => {
        const key = objective.witi_classification === 'fundamental'
          ? 'fundamental'
          : objective.parent_id ? 'means' : 'other'
        return { objective, style: CLASS_COLORS[key] ?? CLASS_COLORS.other }
      }),
    [objectives],
  )

  if (loading) {
    return <div className="text-sm" style={{ color: '#64748b' }}>Montando nuvem de objetivos...</div>
  }

  if (cloudItems.length === 0) {
    return <div className="text-sm" style={{ color: '#64748b' }}>Nenhum objetivo disponível para exibir.</div>
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: 'radial-gradient(circle at top, rgba(232,121,249,0.10), rgba(14,14,19,0.92) 55%)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-wrap gap-3 items-center justify-center min-h-[280px]">
        {cloudItems.map(({ objective, style }) => (
          <button
            key={objective.id}
            type="button"
            title={objective.statement}
            className="rounded-full px-4 py-2 transition-transform duration-200 hover:-translate-y-0.5"
            style={{
              background: style.bg,
              color: style.color,
              fontSize: `${fontSizeFor(objective)}px`,
              fontWeight: objective.witi_classification === 'fundamental' ? 700 : 500,
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {objective.statement}
          </button>
        ))}
      </div>
    </div>
  )
}

