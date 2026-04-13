import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_DOT: Record<string, string> = {
  ARIA: 'bg-indigo-500',
  FRAME: 'bg-blue-500',
  AXIOM: 'bg-amber-500',
  NOVA: 'bg-emerald-500',
  ANALYST: 'bg-purple-500',
}

const AGENT_TEXT: Record<string, string> = {
  ARIA: 'text-indigo-700',
  FRAME: 'text-blue-700',
  AXIOM: 'text-amber-700',
  NOVA: 'text-emerald-700',
  ANALYST: 'text-purple-700',
}

interface Props {
  turns: AgentTurn[]
  activeAgent: string | null
}

export function WarRoomTimeline({ turns, activeAgent }: Props) {
  if (turns.length === 0) return null

  return (
    <div className="space-y-0">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">War Room</h3>
      <div className="relative">
        <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />
        <div className="space-y-4">
          {turns.map((turn, idx) => {
            const dotColor = AGENT_DOT[turn.agentName] ?? 'bg-gray-400'
            const textColor = AGENT_TEXT[turn.agentName] ?? 'text-gray-700'
            const isActive = activeAgent === turn.agentName && idx === turns.length - 1
            return (
              <div key={turn.id} className="flex gap-3 relative">
                <div className={`w-6 h-6 rounded-full ${dotColor} flex-shrink-0 flex items-center justify-center z-10`}>
                  {isActive && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </div>
                <div className="flex-1 pb-2">
                  <div className={`text-xs font-semibold mb-1 ${textColor}`}>
                    {turn.agentName}
                    <span className="text-gray-400 font-normal ml-1">· {turn.phaseLabel}</span>
                  </div>
                  <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-0.5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                    {isActive && (
                      <span className="inline-block w-0.5 h-3 bg-gray-500 animate-pulse ml-0.5 align-text-bottom" />
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
