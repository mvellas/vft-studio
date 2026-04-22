import type { CSSProperties } from 'react'
import { ObjectivesCloud } from './ObjectivesCloud'
import { SocialSimulationArtifacts } from './SocialSimulationArtifacts'
import { ObjectivesHierarchy } from '../phase2/ObjectivesHierarchy'
import { MeansEndsNetwork } from '../phase2/MeansEndsNetwork'
import { CausalRelationsMap } from '../phase2/CausalRelationsMap'

interface Props {
  projectId: string
}

const shellStyle: CSSProperties = {
  position: 'fixed',
  left: '-20000px',
  top: 0,
  width: '1400px',
  padding: '24px',
  background: '#020617',
  pointerEvents: 'none',
  zIndex: -1,
}

const cardStyle: CSSProperties = {
  borderRadius: '28px',
  border: '1px solid rgba(148,163,184,0.14)',
  background: '#0b1120',
  boxShadow: '0 18px 48px rgba(15,23,42,0.35)',
  padding: '18px',
  marginBottom: '20px',
}

const titleStyle: CSSProperties = {
  color: '#f8fafc',
  fontSize: '18px',
  fontWeight: 700,
  marginBottom: '10px',
}

export function ArtifactExportSurface({ projectId }: Props) {
  return (
    <div aria-hidden="true" style={shellStyle}>
      <section id="export-objectives-cloud" style={cardStyle}>
        <div style={titleStyle}>Nuvem de Objetivos</div>
        <ObjectivesCloud projectId={projectId} />
      </section>

      <section id="export-objectives-hierarchy" style={cardStyle}>
        <div style={titleStyle}>Hierarquia de Objetivos</div>
        <div style={{ height: 720 }}>
          <ObjectivesHierarchy projectId={projectId} />
        </div>
      </section>

      <section id="export-means-ends-network" style={cardStyle}>
        <div style={titleStyle}>Rede Meios-Fins</div>
        <div style={{ height: 720 }}>
          <MeansEndsNetwork projectId={projectId} />
        </div>
      </section>

      <section id="export-causal-relations-map" style={cardStyle}>
        <div style={titleStyle}>Mapa Causal</div>
        <div style={{ height: 720 }}>
          <CausalRelationsMap projectId={projectId} />
        </div>
      </section>

      <section id="export-social-simulation" style={cardStyle}>
        <div style={titleStyle}>Simulação Social</div>
        <SocialSimulationArtifacts projectId={projectId} />
      </section>
    </div>
  )
}
