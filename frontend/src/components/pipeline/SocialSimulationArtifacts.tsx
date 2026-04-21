import { useEffect, useMemo, useState } from 'react'
import {
  getLatestSocialSimulation,
  type SocialSimulationInfo,
  type SocialSimulationParticipant,
} from '../../api/pipeline'

interface Props {
  projectId: string
}

type SocialTab = 'coalitions' | 'votes' | 'trajectory' | 'social-map'

const SOCIAL_TABS: { id: SocialTab; label: string; description: string }[] = [
  { id: 'coalitions', label: 'Coalizoes', description: 'Blocos de alinhamento e tensoes mais provaveis entre os stakeholders simulados.' },
  { id: 'votes', label: 'Votacao', description: 'Placar agregado da simulacao social antes da War Room.' },
  { id: 'trajectory', label: 'Trajetorias', description: 'Mudanca de posicao por rodada para cada stakeholder participante.' },
  { id: 'social-map', label: 'Mapa Social', description: 'Rede de conflito e convergencia entre os atores da analise.' },
]

const VOTE_LABELS: Record<string, string> = {
  approve: 'Aprova',
  approve_with_conditions: 'Aprova com condicoes',
  delay: 'Adia',
  reject: 'Rejeita',
}

const VOTE_COLORS: Record<string, string> = {
  approve: '#34d399',
  approve_with_conditions: '#fbbf24',
  delay: '#60a5fa',
  reject: '#f87171',
}

const PARTICIPANT_COLORS = ['#60a5fa', '#f97316', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#fb7185']

function colorForIndex(index: number): string {
  return PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length]
}

function positionForIndex(index: number, total: number, width: number, height: number) {
  const radius = Math.min(width, height) * 0.32
  const angle = ((Math.PI * 2) / Math.max(total, 1)) * index - Math.PI / 2
  return {
    x: width / 2 + Math.cos(angle) * radius,
    y: height / 2 + Math.sin(angle) * radius,
  }
}

function voteOptions(summary: SocialSimulationInfo | null): Array<{ key: string; label: string; count: number; color: string }> {
  const votes = summary?.summary.votes ?? {}
  return ['approve', 'approve_with_conditions', 'delay', 'reject'].map((key) => ({
    key,
    label: VOTE_LABELS[key] ?? key,
    count: votes[key] ?? 0,
    color: VOTE_COLORS[key] ?? '#94a3b8',
  }))
}

function stanceToY(value: number, height: number) {
  const min = -10
  const max = 10
  const clamped = Math.max(min, Math.min(max, value))
  return height - ((clamped - min) / (max - min)) * height
}

function ParticipantsLegend({ participants }: { participants: SocialSimulationParticipant[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {participants.map((participant, index) => (
        <div
          key={participant.name}
          className="rounded-full px-3 py-1 text-xs"
          style={{
            border: `1px solid ${colorForIndex(index)}33`,
            background: `${colorForIndex(index)}12`,
            color: colorForIndex(index),
          }}
        >
          {participant.name}
        </div>
      ))}
    </div>
  )
}

function CoalitionsView({ summary }: { summary: SocialSimulationInfo }) {
  const participantsByName = useMemo(
    () => new Map(summary.summary.participants.map((participant) => [participant.name, participant])),
    [summary],
  )

  if (summary.summary.coalitions.length === 0) {
    return <p className="text-sm" style={{ color: '#94a3b8' }}>Nenhuma coalizao consolidada nesta rodada.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {summary.summary.coalitions.map((coalition, index) => (
        <article
          key={`${coalition.tag}-${index}`}
          className="rounded-2xl p-4 space-y-3"
          style={{
            background: 'linear-gradient(145deg, rgba(15,23,42,0.92), rgba(30,41,59,0.72))',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 18px 50px rgba(15,23,42,0.18)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em]" style={{ color: '#94a3b8' }}>Coalizao</p>
              <h4 className="text-base font-semibold" style={{ color: '#f8fafc' }}>{coalition.tag}</h4>
            </div>
            <div
              className="rounded-full px-3 py-1 text-xs"
              style={{ background: 'rgba(96,165,250,0.12)', color: '#93c5fd', border: '1px solid rgba(96,165,250,0.24)' }}
            >
              {coalition.members.length} atores
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {coalition.members.map((member) => (
              <span
                key={member}
                className="rounded-full px-3 py-1 text-xs"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {member}
              </span>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {coalition.members.slice(0, 2).map((member) => {
              const participant = participantsByName.get(member)
              if (!participant) return null
              return (
                <div
                  key={`${coalition.tag}-${member}`}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <p className="text-xs uppercase tracking-[0.2em]" style={{ color: '#64748b' }}>{participant.role || participant.kind}</p>
                  <p className="text-sm font-medium mt-1" style={{ color: '#f8fafc' }}>{participant.name}</p>
                  <p className="text-xs mt-2" style={{ color: '#cbd5e1' }}>{participant.latest_position || 'Sem posicionamento registrado.'}</p>
                </div>
              )
            })}
          </div>
        </article>
      ))}
    </div>
  )
}

function VotesView({ summary }: { summary: SocialSimulationInfo }) {
  const items = voteOptions(summary)
  const max = Math.max(...items.map((item) => item.count), 1)

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.key} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span style={{ color: '#e2e8f0' }}>{item.label}</span>
            <span style={{ color: item.color }}>{item.count}</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(item.count / max) * 100}%`,
                background: `linear-gradient(90deg, ${item.color}, ${item.color}bb)`,
                boxShadow: `0 0 24px ${item.color}44`,
              }}
            />
          </div>
        </div>
      ))}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(summary.summary.participants ?? []).map((participant) => {
          const choice = participant.vote?.choice ?? 'approve_with_conditions'
          return (
            <div
              key={`${participant.name}-${choice}`}
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-sm font-medium" style={{ color: '#f8fafc' }}>{participant.name}</p>
              <p className="text-xs mt-1" style={{ color: VOTE_COLORS[choice] ?? '#94a3b8' }}>{VOTE_LABELS[choice] ?? choice}</p>
              <p className="text-xs mt-2" style={{ color: '#94a3b8' }}>{participant.vote?.rationale || 'Sem justificativa registrada.'}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TrajectoryView({ summary }: { summary: SocialSimulationInfo }) {
  const participants = summary.summary.participants ?? []
  const width = 860
  const height = 300
  const paddingX = 48
  const paddingY = 28
  const maxRound = Math.max(
    1,
    ...participants.flatMap((participant) => participant.trajectory.map((point) => point.round)),
  )

  if (participants.length === 0) {
    return <p className="text-sm" style={{ color: '#94a3b8' }}>Nenhuma trajetoria social disponivel.</p>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[720px]" role="img" aria-label="Mudanca de posicao por rodada">
          <defs>
            {participants.map((participant, index) => (
              <linearGradient key={participant.name} id={`trajectory-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={colorForIndex(index)} stopOpacity="0.4" />
                <stop offset="100%" stopColor={colorForIndex(index)} stopOpacity="1" />
              </linearGradient>
            ))}
          </defs>

          {[0, 1, 2, 3, 4].map((guide) => {
            const value = -10 + guide * 5
            const y = paddingY + stanceToY(value, height - paddingY * 2)
            return (
              <g key={`guide-${value}`}>
                <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="6 6" />
                <text x={14} y={y + 4} fill="#64748b" fontSize="11">{value}</text>
              </g>
            )
          })}

          {Array.from({ length: maxRound }, (_, idx) => {
            const round = idx + 1
            const x = paddingX + ((width - paddingX * 2) / Math.max(maxRound - 1, 1)) * idx
            return (
              <g key={`round-${round}`}>
                <line x1={x} y1={paddingY} x2={x} y2={height - paddingY} stroke="rgba(148,163,184,0.12)" />
                <text x={x} y={height - 6} fill="#94a3b8" textAnchor="middle" fontSize="11">R{round}</text>
              </g>
            )
          })}

          {participants.map((participant, index) => {
            const points = participant.trajectory.map((point) => {
              const x = paddingX + ((width - paddingX * 2) / Math.max(maxRound - 1, 1)) * Math.max(point.round - 1, 0)
              const y = paddingY + stanceToY(point.stance_score, height - paddingY * 2)
              return { x, y, round: point.round }
            })
            const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')
            return (
              <g key={participant.name}>
                <polyline
                  fill="none"
                  stroke={`url(#trajectory-${index})`}
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={polyline}
                />
                {points.map((point) => (
                  <circle key={`${participant.name}-${point.round}`} cx={point.x} cy={point.y} r="5.5" fill={colorForIndex(index)} />
                ))}
              </g>
            )
          })}
        </svg>
      </div>

      <ParticipantsLegend participants={participants} />
    </div>
  )
}

function SocialMapView({ summary }: { summary: SocialSimulationInfo }) {
  const participants = summary.summary.participants ?? []
  const width = 820
  const height = 520

  if (participants.length === 0) {
    return <p className="text-sm" style={{ color: '#94a3b8' }}>Nenhum mapa social disponivel.</p>
  }

  const nodes = participants.map((participant, index) => ({
    participant,
    index,
    ...positionForIndex(index, participants.length, width, height),
  }))
  const nodeByName = new Map(nodes.map((node) => [node.participant.name, node]))

  const edges = participants.flatMap((participant) => {
    const source = nodeByName.get(participant.name)
    if (!source) return []

    const allianceEdges = participant.alliances
      .map((targetName) => {
        const target = nodeByName.get(targetName)
        if (!target || target.participant.name < source.participant.name) return null
        return { kind: 'alliance' as const, source, target }
      })
      .filter((edge): edge is { kind: 'alliance'; source: typeof source; target: typeof source } => edge !== null)

    const conflictEdges = participant.conflicts
      .map((targetName) => {
        const target = nodeByName.get(targetName)
        if (!target || target.participant.name < source.participant.name) return null
        return { kind: 'conflict' as const, source, target }
      })
      .filter((edge): edge is { kind: 'conflict'; source: typeof source; target: typeof source } => edge !== null)

    return [...allianceEdges, ...conflictEdges]
  })

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl p-4 overflow-hidden"
        style={{ background: 'radial-gradient(circle at top, rgba(56,189,248,0.12), rgba(15,23,42,0.95) 62%)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Mapa social de conflito e convergencia">
          <defs>
            <filter id="social-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {edges.map((edge, index) => (
            <g key={`${edge.kind}-${edge.source.participant.name}-${edge.target.participant.name}-${index}`}>
              <line
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={edge.kind === 'alliance' ? 'rgba(52,211,153,0.7)' : 'rgba(248,113,113,0.7)'}
                strokeWidth={edge.kind === 'alliance' ? 3 : 2.5}
                strokeDasharray={edge.kind === 'alliance' ? '0' : '8 8'}
                filter="url(#social-glow)"
              />
            </g>
          ))}

          {nodes.map((node) => (
            <g key={node.participant.name} transform={`translate(${node.x}, ${node.y})`}>
              <circle r="38" fill={`${colorForIndex(node.index)}20`} stroke={colorForIndex(node.index)} strokeWidth="2.5" />
              <circle r="7" fill={colorForIndex(node.index)} />
              <text y="54" textAnchor="middle" fill="#f8fafc" fontSize="13" fontWeight="600">{node.participant.name}</text>
              <text y="70" textAnchor="middle" fill="#94a3b8" fontSize="11">{node.participant.role || node.participant.kind}</text>
            </g>
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="rounded-full px-3 py-1" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.22)' }}>Convergencia</span>
        <span className="rounded-full px-3 py-1" style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.22)' }}>Conflito</span>
      </div>

      {summary.summary.top_conflicts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {summary.summary.top_conflicts.map((conflict) => (
            <div
              key={conflict}
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(248,113,113,0.08)', color: '#fecaca', border: '1px solid rgba(248,113,113,0.16)' }}
            >
              {conflict}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function SocialSimulationArtifacts({ projectId }: Props) {
  const [simulation, setSimulation] = useState<SocialSimulationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<SocialTab>('coalitions')

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

  const active = useMemo(
    () => SOCIAL_TABS.find((tab) => tab.id === activeTab) ?? SOCIAL_TABS[0],
    [activeTab],
  )

  if (loading) {
    return <div className="text-sm" style={{ color: '#64748b' }}>Lendo a simulacao social consolidada...</div>
  }

  if (!simulation) {
    return <div className="text-sm" style={{ color: '#64748b' }}>Nenhuma simulacao social foi registrada para este projeto ainda.</div>
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>Simulacao social</h3>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{active.description}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {SOCIAL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={activeTab === tab.id
                ? { background: 'rgba(56,189,248,0.14)', color: '#67e8f9', border: '1px solid rgba(56,189,248,0.24)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {activeTab === 'coalitions' && <CoalitionsView summary={simulation} />}
        {activeTab === 'votes' && <VotesView summary={simulation} />}
        {activeTab === 'trajectory' && <TrajectoryView summary={simulation} />}
        {activeTab === 'social-map' && <SocialMapView summary={simulation} />}
      </div>
    </section>
  )
}
