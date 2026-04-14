import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'
import { WarRoomGraph } from './WarRoomGraph'
import { ChevronDown, ChevronUp } from 'lucide-react'

const AGENT_COLOR: Record<string, string> = {
  ARIA:    '#e879f9',
  FRAME:   '#60a5fa',
  AXIOM:   '#fbbf24',
  NOVA:    '#34d399',
  ANALYST: '#a78bfa',
}

interface Props {
  turns: AgentTurn[]
  activeAgent: string | null
}

export function WarRoomTimeline({ turns, activeAgent }: Props) {
  const [timelineOpen, setTimelineOpen] = useState(true)

  if (turns.length === 0) return null

  // Group turns by act
  const actGroups: Record<number, AgentTurn[]> = {}
  turns.forEach(t => {
    const act = t.act ?? 1
    if (!actGroups[act]) actGroups[act] = []
    actGroups[act].push(t)
  })
  const acts = Object.keys(actGroups).map(Number).sort((a, b) => a - b)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>War Room</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: 'rgba(232,121,249,0.12)', color: '#e879f9' }}
        >
          {turns.length} turnos · {acts.length} ato{acts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Interaction graph */}
      <WarRoomGraph turns={turns} activeAgent={activeAgent} />

      {/* Timeline toggle */}
      <button
        onClick={() => setTimelineOpen(o => !o)}
        className="flex items-center gap-2 text-xs w-full"
        style={{ color: '#475569' }}
      >
        {timelineOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {timelineOpen ? 'Ocultar' : 'Mostrar'} transcrição
      </button>

      {/* Timeline by act */}
      {timelineOpen && (
        <div className="space-y-5">
          {acts.map(act => (
            <div key={act}>
              {acts.length > 1 && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-xs font-medium px-2" style={{ color: '#334155' }}>
                    Ato {act}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}

              <div className="relative">
                <div
                  className="absolute left-3 top-3 bottom-3 w-0.5"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <div className="space-y-4">
                  {actGroups[act].map((turn, idx) => {
                    const color = AGENT_COLOR[turn.agentName] ?? '#94a3b8'
                    const isActive =
                      activeAgent === turn.agentName &&
                      idx === actGroups[act].length - 1 &&
                      act === acts[acts.length - 1]

                    return (
                      <div key={turn.id} className="flex gap-3 relative">
                        {/* Agent dot */}
                        <div
                          className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center z-10 text-xs font-bold"
                          style={{
                            background: `${color}22`,
                            border: `2px solid ${color}`,
                            color,
                          }}
                        >
                          {isActive ? (
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: color, animation: 'pulse 1s ease-in-out infinite' }}
                            />
                          ) : (
                            turn.agentName[0]
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-2 min-w-0">
                          <div className="text-xs font-semibold mb-1" style={{ color }}>
                            {turn.agentName}
                            <span className="font-normal ml-1.5" style={{ color: '#334155' }}>
                              · {turn.phaseLabel}
                            </span>
                          </div>
                          <div
                            className="prose prose-sm prose-invert max-w-none prose-p:my-0.5 prose-ul:my-1 prose-li:my-0"
                            style={{ color: '#94a3b8' }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                            {isActive && (
                              <span
                                className="inline-block w-0.5 h-3 ml-0.5 align-text-bottom animate-pulse"
                                style={{ background: '#475569' }}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
