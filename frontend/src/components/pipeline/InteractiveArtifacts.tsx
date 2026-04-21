import { useMemo, useState } from 'react'
import { ObjectivesCloud } from './ObjectivesCloud'
import { SocialSimulationArtifacts } from './SocialSimulationArtifacts'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { CausalRelationsMap } from '../phase2/CausalRelationsMap'

interface Props {
  projectId: string
}

type ArtifactTab = 'cloud' | 'hierarchy' | 'means-ends' | 'causal' | 'social'

const TABS: { id: ArtifactTab; label: string; description: string }[] = [
  { id: 'cloud', label: 'Nuvem de Objetivos', description: 'Visão sintética dos objetivos mais salientes da análise.' },
  { id: 'hierarchy', label: 'Hierarquia', description: 'Estrutura top-down dos objetivos fundamentais e derivados.' },
  { id: 'means-ends', label: 'Rede Meios-Fins', description: 'Relações de suporte entre objetivos e resultados desejados.' },
  { id: 'causal', label: 'Mapa Causal', description: 'Relações causais entre objetivos e efeitos percebidos.' },
  { id: 'social', label: 'Simulação Social', description: 'Coalizões, votação, trajetória e rede de conflito/convergência da camada social.' },
]

export function InteractiveArtifacts({ projectId }: Props) {
  const [activeTab, setActiveTab] = useState<ArtifactTab>('cloud')
  const active = useMemo(() => TABS.find(tab => tab.id === activeTab) ?? TABS[0], [activeTab])

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#f8fafc' }}>Artefatos interativos</h3>
          <p className="text-sm" style={{ color: '#94a3b8' }}>{active.description}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="text-xs px-3 py-1.5 rounded-full transition-colors"
              style={activeTab === tab.id
                ? { background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.28)' }
                : { background: 'rgba(255,255,255,0.04)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl p-4"
        style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {activeTab === 'cloud' && <ObjectivesCloud projectId={projectId} />}
        {activeTab === 'hierarchy' && (
          <div style={{ height: 560 }}>
            <ObjectivesHierarchy projectId={projectId} />
          </div>
        )}
        {activeTab === 'means-ends' && (
          <div style={{ height: 560 }}>
            <MeansEndsNetwork projectId={projectId} />
          </div>
        )}
        {activeTab === 'causal' && (
          <div style={{ height: 560 }}>
            <CausalRelationsMap projectId={projectId} />
          </div>
        )}
        {activeTab === 'social' && <SocialSimulationArtifacts projectId={projectId} />}
      </div>
    </section>
  )
}
