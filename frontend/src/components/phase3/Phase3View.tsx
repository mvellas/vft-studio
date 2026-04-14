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
      <div className="rounded-lg p-6" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: '#334155', background: 'rgba(255,255,255,0.06)' }}>
            Fase 3
          </span>
          <h2 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>
            Alternativas e Matriz de Consequências
          </h2>
        </div>
        <p className="text-sm" style={{ color: '#64748b' }}>
          Defina as alternativas de decisão e avalie como cada uma se comporta em relação aos
          objetivos fundamentais. Use NOVA para sugestões baseadas no contexto do projeto.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit" style={{ background: 'rgba(255,255,255,0.05)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="px-4 py-2 text-sm rounded-md font-medium transition-colors"
            style={activeTab === tab.id
              ? { background: '#13131f', color: '#f8fafc' }
              : { color: '#64748b' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-lg p-6" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}>
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
