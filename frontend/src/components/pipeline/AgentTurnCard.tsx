import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_COLORS: Record<string, { bg: string; badge: string; border: string }> = {
  ARIA:    { bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-700',   border: 'border-indigo-200' },
  FRAME:   { bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-700',       border: 'border-blue-200' },
  AXIOM:   { bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-700',     border: 'border-amber-200' },
  NOVA:    { bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' },
  ANALYST: { bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-700',   border: 'border-purple-200' },
}

interface Props {
  turn: AgentTurn
  isActive: boolean
}

export function AgentTurnCard({ turn, isActive }: Props) {
  const colors = AGENT_COLORS[turn.agentName] ?? {
    bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-600', border: 'border-gray-200',
  }

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 space-y-2`}>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
          {turn.agentName}
        </span>
        <span className="text-xs text-gray-500">{turn.phaseLabel}</span>
        {isActive && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse ml-auto" />
        )}
      </div>
      {turn.text && (
        <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-headings:my-2">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}
