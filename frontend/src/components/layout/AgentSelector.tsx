import { useChatStore } from '../../stores/chatStore'

const AGENTS = [
  { name: 'ARIA', type: 'facilitator', label: 'Facilitadora', description: 'Guia o processo VFT completo' },
  { name: 'FRAME', type: 'phase1_specialist', label: 'Fase 1', description: 'Especialista em Enquadramento' },
  { name: 'AXIOM', type: 'phase2_specialist', label: 'Fase 2', description: 'Especialista em Objetivos' },
  { name: 'NOVA', type: 'phase3_specialist', label: 'Fase 3', description: 'Especialista em Alternativas' },
]

export function AgentSelector() {
  const { activeAgentType, setActiveAgent } = useChatStore()

  return (
    <div className="flex gap-1 px-1">
      {AGENTS.map(agent => (
        <button
          key={agent.type}
          onClick={() => setActiveAgent(agent.name, agent.type)}
          title={agent.description}
          className={`flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors ${
            activeAgentType === agent.type
              ? 'bg-indigo-600 text-white'
              : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
          }`}
        >
          {agent.name}
        </button>
      ))}
    </div>
  )
}
