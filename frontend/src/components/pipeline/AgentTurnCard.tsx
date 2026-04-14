import { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { AgentTurn } from '../../stores/pipelineStore'

interface ColorScheme {
  bg: CSSProperties
  badge: CSSProperties
}

const AGENT_COLORS: Record<string, ColorScheme> = {
  ARIA: {
    bg: { background: 'rgba(232,121,249,0.06)', border: '1px solid rgba(232,121,249,0.15)' } as CSSProperties,
    badge: { background: 'rgba(232,121,249,0.15)', color: '#e879f9' } as CSSProperties,
  },
  FRAME: {
    bg: { background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)' } as CSSProperties,
    badge: { background: 'rgba(96,165,250,0.15)', color: '#60a5fa' } as CSSProperties,
  },
  AXIOM: {
    bg: { background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)' } as CSSProperties,
    badge: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' } as CSSProperties,
  },
  NOVA: {
    bg: { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' } as CSSProperties,
    badge: { background: 'rgba(52,211,153,0.15)', color: '#34d399' } as CSSProperties,
  },
  ANALYST: {
    bg: { background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' } as CSSProperties,
    badge: { background: 'rgba(167,139,250,0.15)', color: '#a78bfa' } as CSSProperties,
  },
}

const DEFAULT_COLORS: ColorScheme = {
  bg: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as CSSProperties,
  badge: { background: 'rgba(255,255,255,0.08)', color: '#94a3b8' } as CSSProperties,
}

interface Props {
  turn: AgentTurn
  isActive: boolean
}

export function AgentTurnCard({ turn, isActive }: Props) {
  const colors = AGENT_COLORS[turn.agentName] ?? DEFAULT_COLORS

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="rounded-xl p-4 space-y-2"
      style={colors.bg}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={colors.badge}
        >
          {turn.agentName}
        </span>
        <span style={{ color: '#475569' }} className="text-xs">{turn.phaseLabel}</span>
        {isActive && (
          <span
            className="inline-block w-1.5 h-1.5 rounded-full animate-pulse ml-auto"
            style={{ background: '#e879f9' }}
          />
        )}
      </div>
      {turn.text && (
        <div
          className="prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:my-2"
          style={{ color: '#e2e8f0' }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
        </div>
      )}
    </motion.div>
  )
}
