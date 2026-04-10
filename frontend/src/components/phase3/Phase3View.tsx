import { useState, useEffect } from 'react'
import { useObjectivesStore } from '../../stores/objectivesStore'
import { alternativesApi } from '../../api/alternatives'
import type { AlternativeWithConsequences } from '../../api/alternatives'
import { AlternativesList } from './AlternativesList'
import { ConsequencesMatrix } from './ConsequencesMatrix'

interface Phase3ViewProps {
  projectId: string
  onStepComplete?: (stepId: string) => void
}

export function Phase3View({ projectId, onStepComplete: _onStepComplete }: Phase3ViewProps) {
  const { objectives, fetchObjectives } = useObjectivesStore()
  const [alternatives, setAlternatives] = useState<AlternativeWithConsequences[]>([])
  const [activeTab, setActiveTab] = useState<'alternatives' | 'matrix'>('alternatives')

  useEffect(() => {
    if (objectives.length === 0) {
      fetchObjectives(projectId)
    }
    alternativesApi.list(projectId).then(setAlternatives).catch(() => {})
  }, [projectId])

  const fundamentals = objectives.filter(
    o => o.witi_classification === 'fundamental' && o.deleted === 0
  )

  const tabs = [
    { id: 'alternatives' as const, label: 'Alternativas' },
    { id: 'matrix' as const, label: 'Matriz de Consequências' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            Fase 3
          </span>
          <h2 className="text-lg font-semibold text-gray-900">
            Alternativas e Matriz de Consequências
          </h2>
        </div>
        <p className="text-sm text-gray-500">
          Defina as alternativas de decisão e avalie como cada uma se comporta em relação aos
          objetivos fundamentais. Use NOVA para sugestões baseadas no contexto do projeto.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeTab === 'alternatives' && (
          <AlternativesList
            projectId={projectId}
            onAlternativesChange={setAlternatives}
          />
        )}
        {activeTab === 'matrix' && (
          <ConsequencesMatrix
            projectId={projectId}
            fundamentals={fundamentals}
            alternatives={alternatives}
          />
        )}
      </div>
    </div>
  )
}
