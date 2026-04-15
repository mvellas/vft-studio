import { useState } from 'react'
import { X, BarChart2 } from 'lucide-react'
import { useUiStore } from '../../stores/uiStore'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { CausalRelationsMap } from '../phase2/CausalRelationsMap'

type DiagramTab = 'hierarchy' | 'means-ends' | 'causal'

const TABS: { id: DiagramTab; label: string; shortLabel: string }[] = [
  { id: 'hierarchy', label: 'Hierarquia de Objetivos', shortLabel: 'Hierarquia' },
  { id: 'means-ends', label: 'Rede Meios-Fins', shortLabel: 'Meios-Fins' },
  { id: 'causal', label: 'Mapa de Relações Causais', shortLabel: 'Mapa Causal' },
]

interface DiagramsPanelProps {
  projectId: string
  width: number
}

export function DiagramsPanel({ projectId, width: _width }: DiagramsPanelProps) {
  const { setRightPanel } = useUiStore()
  const [activeTab, setActiveTab] = useState<DiagramTab>('hierarchy')

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#0a0a0f', width: '100%' }}
    >
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-2 px-4"
        style={{
          height: 44,
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: '#0a0a0f',
        }}
      >
        <BarChart2 size={13} style={{ color: '#60a5fa' }} />
        <span className="text-xs font-semibold" style={{ color: '#60a5fa' }}>
          Diagramas VFT
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setRightPanel('none')}
          className="p-1 rounded transition-colors"
          style={{ color: '#475569' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8' }}
          onMouseLeave={e => { e.currentTarget.style.color = '#475569' }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Tab bar */}
      <div
        className="shrink-0 flex"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-medium transition-colors"
            style={
              activeTab === tab.id
                ? {
                    color: '#60a5fa',
                    borderBottom: '2px solid #60a5fa',
                    background: 'rgba(96,165,250,0.05)',
                  }
                : { color: '#475569', borderBottom: '2px solid transparent' }
            }
          >
            {tab.shortLabel}
          </button>
        ))}
      </div>

      {/* Diagram area — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'hierarchy' && (
          <ObjectivesHierarchy projectId={projectId} />
        )}
        {activeTab === 'means-ends' && (
          <MeansEndsNetwork projectId={projectId} />
        )}
        {activeTab === 'causal' && (
          <CausalRelationsMap projectId={projectId} />
        )}
      </div>
    </div>
  )
}
