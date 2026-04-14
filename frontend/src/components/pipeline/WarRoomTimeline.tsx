import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'
import { WarRoomGraph } from './WarRoomGraph'

const AGENT_DOT_COLOR: Record<string, string> = {
  ARIA: '#e879f9',
  FRAME: '#60a5fa',
  AXIOM: '#fbbf24',
  NOVA: '#34d399',
  ANALYST: '#a78bfa',
}

const AGENT_TEXT_COLOR: Record<string, string> = {
  ARIA: '#e879f9',
  FRAME: '#60a5fa',
  AXIOM: '#fbbf24',
  NOVA: '#34d399',
  ANALYST: '#a78bfa',
}

interface Props {
  turns: AgentTurn[]
  activeAgent: string | null
}

export function WarRoomTimeline({ turns, activeAgent }: Props) {
  if (turns.length === 0) return null

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-semibold mb-3" style={{ color: '#94a3b8' }}>War Room</h3>
      <WarRoomGraph turns={turns} />
      <div className="relative mt-4">
        <div className="absolute left-3 top-3 bottom-3 w-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="space-y-4">
          {turns.map((turn, idx) => {
            const dotColor = AGENT_DOT_COLOR[turn.agentName] ?? '#94a3b8'
            const textColor = AGENT_TEXT_COLOR[turn.agentName] ?? '#94a3b8'
            const isActive = activeAgent === turn.agentName && idx === turns.length - 1
            return (
              <div key={turn.id} className="flex gap-3 relative">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center z-10"
                  style={{ background: dotColor }}
                >
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className="text-xs font-semibold mb-1" style={{ color: textColor }}>
                    {turn.agentName}
                    <span className="font-normal ml-1" style={{ color: '#475569' }}>· {turn.phaseLabel}</span>
                  </div>
                  <div className="prose prose-sm prose-invert max-w-none prose-p:my-0.5" style={{ color: '#cbd5e1' }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                    {isActive && (
                      <span className="inline-block w-0.5 h-3 animate-pulse ml-0.5 align-text-bottom" style={{ background: '#94a3b8' }} />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
