import { MessageSquare } from 'lucide-react'
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
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-semibold text-gray-900 text-base">{step.name}</h3>
        <span className="shrink-0 text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          Passo {step.id}
        </span>
      </div>

      {/* O QUE */}
      <div className="pl-4 border-l-2 border-blue-500">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">O QUE</p>
        <p className="text-sm text-gray-700">{step.description}</p>
      </div>

      <div className="border-t border-gray-100" />

      {/* POR QUE */}
      <div className="pl-4 border-l-2 border-amber-500">
        <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-1">POR QUE</p>
        <p className="text-sm text-gray-700">{step.why}</p>
        {step.reference && (
          <p className="mt-1 text-xs text-gray-400 italic">[{step.reference}]</p>
        )}
      </div>

      <div className="border-t border-gray-100" />

      {/* COMO */}
      <div className="pl-4 border-l-2 border-emerald-500">
        <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-1">COMO</p>
        <p className="text-sm text-gray-700">{step.how}</p>
      </div>

      <div className="border-t border-gray-100 pt-2">
        <button
          onClick={handleStartChat}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
        >
          <MessageSquare size={15} />
          Iniciar com {agent.name}
        </button>
      </div>
    </div>
  )
}
