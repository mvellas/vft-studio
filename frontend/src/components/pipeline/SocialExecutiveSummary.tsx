import { useEffect, useMemo, useState } from 'react'
import { getLatestSocialSimulation, type SocialSimulationInfo } from '../../api/pipeline'

interface Props {
  projectId: string
}

function dominantVote(summary: SocialSimulationInfo | null): { label: string; count: number } | null {
  if (!summary) return null
  const entries = Object.entries(summary.summary.votes ?? {})
  if (entries.length === 0) return null
  const [key, count] = entries.sort((a, b) => b[1] - a[1])[0]
  const labels: Record<string, string> = {
    approve: 'Aprovação',
    approve_with_conditions: 'Aprovação com condições',
    delay: 'Adiar',
    reject: 'Rejeição',
  }
  return { label: labels[key] ?? key, count }
}

export function SocialExecutiveSummary({ projectId }: Props) {
  const [simulation, setSimulation] = useState<SocialSimulationInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getLatestSocialSimulation(projectId)
      .then((data) => {
        if (!cancelled) setSimulation(data)
      })
      .catch(() => {
        if (!cancelled) setSimulation(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [projectId])

  const primaryCoalition = useMemo(
    () => simulation?.summary.coalitions
      ?.slice()
      .sort((a, b) => b.members.length - a.members.length)[0] ?? null,
    [simulation],
  )
  const dominant = useMemo(() => dominantVote(simulation), [simulation])

  if (loading) {
    return (
      <div
        className="rounded-2xl p-5"
        style={{ background: 'linear-gradient(135deg, rgba(14,14,19,0.96), rgba(30,41,59,0.84))', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm" style={{ color: '#94a3b8' }}>Consolidando dinâmica social...</p>
      </div>
    )
  }

  if (!simulation) return null

  const participantsCount = simulation.summary.participants.length
  const coalitionsCount = simulation.summary.coalitions.length
  const conflictsCount = simulation.summary.top_conflicts.length
  const roundsCount = simulation.rounds_count

  return (
    <section
      className="rounded-[28px] p-5 space-y-5"
      style={{
        background: 'linear-gradient(145deg, rgba(8,8,14,0.98), rgba(15,23,42,0.92))',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 80px rgba(15,23,42,0.18)',
      }}
    >
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: '#38bdf8' }}>
            Dinâmica Social
          </p>
          <h3 className="mt-2 text-xl font-semibold" style={{ color: '#f8fafc' }}>
            Resumo executivo da simulação
          </h3>
          <p className="mt-2 text-sm leading-6" style={{ color: '#cbd5e1' }}>
            A camada social consolidou alinhamentos, fricções e tendências de voto antes da War Room.
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1.5 text-xs"
          style={{ background: 'rgba(56,189,248,0.12)', color: '#67e8f9', border: '1px solid rgba(56,189,248,0.24)' }}
        >
          {roundsCount} rodadas simuladas
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Participantes', value: String(participantsCount), color: '#60a5fa' },
          { label: 'Coalizões', value: String(coalitionsCount), color: '#34d399' },
          { label: 'Conflitos principais', value: String(conflictsCount), color: '#f87171' },
          { label: 'Voto dominante', value: dominant ? `${dominant.label} (${dominant.count})` : 'Sem consenso', color: '#fbbf24' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>{item.label}</p>
            <p className="mt-3 text-lg font-semibold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>Coalizão líder</p>
          <p className="mt-2 text-base font-semibold" style={{ color: '#f8fafc' }}>
            {primaryCoalition?.tag ?? 'Sem bloco dominante'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(primaryCoalition?.members ?? []).map((member) => (
              <span
                key={member}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: 'rgba(96,165,250,0.12)', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.18)' }}
              >
                {member}
              </span>
            ))}
          </div>
        </div>

        <div
          className="rounded-2xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>Tensão mais forte</p>
          <p className="mt-2 text-base font-semibold" style={{ color: '#fecaca' }}>
            {simulation.summary.top_conflicts[0] ?? 'Sem conflito dominante'}
          </p>
          <p className="mt-3 text-sm leading-6" style={{ color: '#94a3b8' }}>
            Use os artefatos interativos para explorar o mapa completo de convergências, conflitos e mudança de posição.
          </p>
        </div>
      </div>
    </section>
  )
}
