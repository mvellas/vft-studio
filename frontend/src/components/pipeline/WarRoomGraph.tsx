import { useMemo } from 'react'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_COLOR: Record<string, string> = {
  ARIA:    '#e879f9',
  FRAME:   '#60a5fa',
  AXIOM:   '#fbbf24',
  NOVA:    '#34d399',
  ANALYST: '#a78bfa',
}

const AGENTS = ['ARIA', 'FRAME', 'AXIOM', 'NOVA', 'ANALYST']

// Pentagon layout — top-centered, clockwise
const W = 400
const H = 270
const CX = 200
const CY = 122
const R = 88

const POSITIONS: Record<string, { x: number; y: number }> = {}
AGENTS.forEach((name, i) => {
  const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
  POSITIONS[name] = {
    x: CX + R * Math.cos(angle),
    y: CY + R * Math.sin(angle),
  }
})

const NODE_R = 20

interface Props {
  turns: AgentTurn[]
  activeAgent?: string | null
}

interface EdgeDatum {
  id: string
  from: string
  to: string
  color: string
  isNew: boolean
}

export function WarRoomGraph({ turns, activeAgent }: Props) {
  const warTurns = turns.filter(t => t.isWarRoom)

  const speakCount = useMemo(() => {
    const c: Record<string, number> = {}
    warTurns.forEach(t => { c[t.agentName] = (c[t.agentName] ?? 0) + 1 })
    return c
  }, [warTurns])

  const edges = useMemo<EdgeDatum[]>(() => {
    return warTurns.slice(1).map((turn, i) => {
      const prev = warTurns[i]
      return {
        id: `${prev.agentName}->${turn.agentName}-${i}`,
        from: prev.agentName,
        to: turn.agentName,
        color: AGENT_COLOR[prev.agentName] ?? '#94a3b8',
        isNew: i >= warTurns.length - 3,
      }
    })
  }, [warTurns])

  // Last speaker highlight
  const lastSpeaker = warTurns[warTurns.length - 1]?.agentName

  return (
    <div
      style={{
        width: '100%',
        background: '#0a0a0f',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          padding: '8px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Grafo de Interações
        </span>
        {activeAgent && (
          <span
            style={{
              fontSize: 10,
              color: AGENT_COLOR[activeAgent] ?? '#94a3b8',
              background: `${AGENT_COLOR[activeAgent] ?? '#94a3b8'}18`,
              border: `1px solid ${AGENT_COLOR[activeAgent] ?? '#94a3b8'}40`,
              borderRadius: 99,
              padding: '1px 8px',
              fontWeight: 600,
            }}
          >
            {activeAgent} está falando
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#334155' }}>
          {warTurns.length} turnos
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', display: 'block' }}
        aria-label="Grafo de interações entre agentes no War Room"
      >
        <defs>
          {/* Arrow markers per agent color */}
          {AGENTS.map(name => (
            <marker
              key={name}
              id={`arrow-${name}`}
              markerWidth="7"
              markerHeight="7"
              refX="5"
              refY="3"
              orient="auto"
            >
              <path d="M0,0.5 L0,5.5 L6,3 z" fill={AGENT_COLOR[name] ?? '#94a3b8'} fillOpacity={0.8} />
            </marker>
          ))}

          {/* Glow filter for active node */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Animation for new edges */}
          <style>{`
            @keyframes drawEdge {
              from { stroke-dashoffset: 200; }
              to   { stroke-dashoffset: 0; }
            }
            @keyframes pulse-outer {
              0%   { opacity: 0.5; transform: scale(1); }
              100% { opacity: 0;   transform: scale(1.7); }
            }
            .edge-new {
              stroke-dasharray: 200;
              stroke-dashoffset: 200;
              animation: drawEdge 0.45s ease-out forwards;
            }
            .pulse-outer {
              transform-box: fill-box;
              transform-origin: center;
              animation: pulse-outer 1.4s ease-out infinite;
            }
          `}</style>
        </defs>

        {/* Subtle pentagon guide */}
        <polygon
          points={AGENTS.map(n => `${POSITIONS[n].x},${POSITIONS[n].y}`).join(' ')}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={1}
        />

        {/* Edges */}
        {edges.map(edge => {
          if (edge.from === edge.to) {
            // Self-loop: small arc above the node
            const p = POSITIONS[edge.from]
            if (!p) return null
            const rx = 14
            const ry = 10
            const sx = p.x - NODE_R * 0.6
            const sy = p.y - NODE_R * 0.8
            const ex = p.x + NODE_R * 0.6
            const ey = p.y - NODE_R * 0.8
            return (
              <path
                key={edge.id}
                d={`M ${sx} ${sy} A ${rx} ${ry} 0 1 1 ${ex} ${ey}`}
                fill="none"
                stroke={edge.color}
                strokeWidth={1.2}
                strokeOpacity={edge.isNew ? 0.7 : 0.2}
                markerEnd={`url(#arrow-${edge.from})`}
                className={edge.isNew ? 'edge-new' : undefined}
              />
            )
          }

          const from = POSITIONS[edge.from]
          const to = POSITIONS[edge.to]
          if (!from || !to) return null

          // Direction vector
          const dx = to.x - from.x
          const dy = to.y - from.y
          const len = Math.hypot(dx, dy) || 1

          // Perpendicular curve offset (so bidirectional edges don't overlap)
          const offsetScale = 16
          const cx2 = (from.x + to.x) / 2 - (dy / len) * offsetScale
          const cy2 = (from.y + to.y) / 2 + (dx / len) * offsetScale

          // Trim endpoints by node radius so arrow doesn't overlap node
          const trim = NODE_R + 4
          const x1 = from.x + (dx / len) * NODE_R
          const y1 = from.y + (dy / len) * NODE_R
          // End point: approach from control point direction
          const dcx = to.x - cx2
          const dcy = to.y - cy2
          const clen = Math.hypot(dcx, dcy) || 1
          const x2 = to.x - (dcx / clen) * trim
          const y2 = to.y - (dcy / clen) * trim

          return (
            <path
              key={edge.id}
              d={`M ${x1} ${y1} Q ${cx2} ${cy2} ${x2} ${y2}`}
              fill="none"
              stroke={edge.color}
              strokeWidth={edge.isNew ? 1.8 : 1}
              strokeOpacity={edge.isNew ? 0.75 : 0.22}
              markerEnd={`url(#arrow-${edge.from})`}
              className={edge.isNew ? 'edge-new' : undefined}
            />
          )
        })}

        {/* Agent nodes */}
        {AGENTS.map(name => {
          const pos = POSITIONS[name]
          const color = AGENT_COLOR[name] ?? '#94a3b8'
          const count = speakCount[name] ?? 0
          const hasSeen = count > 0
          const isActive = activeAgent === name || lastSpeaker === name

          return (
            <g key={name} transform={`translate(${pos.x},${pos.y})`}>
              {/* Pulse rings for active agent */}
              {isActive && (
                <>
                  <circle
                    r={NODE_R + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth={1.5}
                    opacity={0}
                    className="pulse-outer"
                    style={{ animationDelay: '0s' }}
                  />
                  <circle
                    r={NODE_R + 4}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    opacity={0}
                    className="pulse-outer"
                    style={{ animationDelay: '0.4s' }}
                  />
                </>
              )}

              {/* Node background glow when active */}
              {isActive && (
                <circle
                  r={NODE_R + 2}
                  fill={`${color}18`}
                  filter="url(#glow)"
                />
              )}

              {/* Main circle */}
              <circle
                r={NODE_R}
                fill={hasSeen ? `${color}1a` : 'rgba(255,255,255,0.03)'}
                stroke={hasSeen ? color : 'rgba(255,255,255,0.1)'}
                strokeWidth={hasSeen ? 2 : 1}
              />

              {/* Agent initial */}
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={hasSeen ? 12 : 10}
                fontWeight={hasSeen ? 700 : 400}
                fill={hasSeen ? color : '#334155'}
                fontFamily="Inter, ui-sans-serif, sans-serif"
              >
                {name[0]}
              </text>

              {/* Label below node */}
              <text
                y={NODE_R + 13}
                textAnchor="middle"
                fontSize={9}
                fontWeight={hasSeen ? 600 : 400}
                fill={hasSeen ? color : '#334155'}
                fontFamily="Inter, ui-sans-serif, sans-serif"
              >
                {name}
              </text>

              {/* Turn-count badge */}
              {count > 0 && (
                <g transform={`translate(${NODE_R - 5}, ${-NODE_R + 5})`}>
                  <circle r={8} fill={color} />
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={8}
                    fontWeight={700}
                    fill="#07070c"
                    fontFamily="Inter, ui-sans-serif, sans-serif"
                  >
                    {count}
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
