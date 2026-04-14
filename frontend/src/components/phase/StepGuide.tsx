import { BotMessageSquare } from 'lucide-react'
import type { StepConfig } from '../../types'
import { useUiStore } from '../../stores/uiStore'
import { useChatStore } from '../../stores/chatStore'
import { useChat } from '../../hooks/useChat'

interface StepGuideProps {
  step: StepConfig
}

const ARIA = { name: 'ARIA', type: 'facilitator' }

function agentForStep(_stepId: string) {
  return ARIA
}

export function StepGuide({ step }: StepGuideProps) {
  const { setChatPanelOpen } = useUiStore()
  const { setActiveAgent } = useChatStore()
  const { sendMessage } = useChat()

  const agent = agentForStep(step.id)

  function handleStartChat() {
    setActiveAgent(agent.name, agent.type)
    setChatPanelOpen(true)
    sendMessage(
      `Estou no passo ${step.id} — "${step.name}". Por favor, me guie neste passo.`,
      { agentName: agent.name, agentType: agent.type }
    )
  }

  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-base" style={{ color: '#f8fafc' }}>{step.name}</h3>
        <span
          className="shrink-0 text-xs font-mono px-2 py-0.5 rounded"
          style={{ background: 'rgba(232,121,249,0.1)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.2)' }}
        >
          Passo {step.id}
        </span>
      </div>

      {/* O QUE */}
      <div className="pl-4" style={{ borderLeft: '2px solid #60a5fa' }}>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: '#60a5fa', letterSpacing: '0.08em' }}
        >
          O QUE
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>{step.description}</p>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* POR QUE */}
      <div className="pl-4" style={{ borderLeft: '2px solid #fbbf24' }}>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: '#fbbf24', letterSpacing: '0.08em' }}
        >
          POR QUE
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>{step.why}</p>
        {step.reference && (
          <p className="mt-1 text-xs italic" style={{ color: '#334155' }}>[{step.reference}]</p>
        )}
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

      {/* COMO */}
      <div className="pl-4" style={{ borderLeft: '2px solid #34d399' }}>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-1"
          style={{ color: '#34d399', letterSpacing: '0.08em' }}
        >
          COMO
        </p>
        <p className="text-sm" style={{ color: '#94a3b8' }}>{step.how}</p>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
        <button
          onClick={handleStartChat}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium py-2.5 rounded-lg transition-colors"
          style={{
            background: 'rgba(232,121,249,0.12)',
            color: '#e879f9',
            border: '1px solid rgba(232,121,249,0.3)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(232,121,249,0.2)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(232,121,249,0.12)'
          }}
        >
          <BotMessageSquare size={15} />
          Iniciar com {agent.name}
        </button>
      </div>
    </div>
  )
}
