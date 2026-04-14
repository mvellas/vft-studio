import { useEffect, useMemo, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { toPng } from 'html-to-image'
import { Loader2 } from 'lucide-react'
import { useObjectivesStore } from '../../stores/objectivesStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ObjectiveNodeData {
  statement: string
  type: string
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const NODE_WIDTH = 200
const NODE_HEIGHT = 60

function getLayoutedElements(
  nodes: Node<ObjectiveNodeData>[],
  edges: Edge[],
): { nodes: Node<ObjectiveNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'BT', ranksep: 80, nodesep: 50 })

  nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach(e => g.setEdge(e.source, e.target))

  dagre.layout(g)

  const layoutedNodes = nodes.map(n => {
    const { x, y } = g.node(n.id)
    return {
      ...n,
      position: { x: x - NODE_WIDTH / 2, y: y - NODE_HEIGHT / 2 },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// ---------------------------------------------------------------------------
// Custom node
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, React.CSSProperties> = {
  means:       { background: 'rgba(251,191,36,0.06)', border: '2px solid rgba(251,191,36,0.35)' },
  fundamental: { background: 'rgba(167,139,250,0.08)', border: '2px solid rgba(167,139,250,0.4)' },
  strategic:   { background: 'rgba(96,165,250,0.06)', border: '2px solid rgba(96,165,250,0.3)' },
}

function ObjectiveNode({ data }: { data: ObjectiveNodeData }) {
  const nodeStyle = TYPE_STYLES[data.type] ?? { background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)' }

  return (
    <div
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderRadius: '8px', padding: '12px', fontSize: '14px', textAlign: 'center', lineHeight: 1.4, ...nodeStyle }}
    >
      <Handle type="target" position={Position.Bottom} />
      <p style={{ textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#e2e8f0', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
        {data.statement}
      </p>
      <Handle type="source" position={Position.Top} />
    </div>
  )
}

const nodeTypes = { objective: ObjectiveNode }

// ---------------------------------------------------------------------------
// MeansEndsNetwork
// ---------------------------------------------------------------------------

interface MeansEndsNetworkProps {
  projectId: string
}

export function MeansEndsNetwork({ projectId }: MeansEndsNetworkProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const objectives = useObjectivesStore(s => s.objectives)
  const causalLinks = useObjectivesStore(s => s.causalLinks)
  const loading = useObjectivesStore(s => s.loading)
  const fetchNetwork = useObjectivesStore(s => s.fetchNetwork)

  useEffect(() => {
    fetchNetwork(projectId)
  }, [projectId, fetchNetwork])

  // Convert store data to react-flow format — only classified non-strategic objectives
  const { initialNodes, initialEdges } = useMemo(() => {
    const filteredObjectives = objectives.filter(
      o => o.witi_classification !== '' && o.type !== 'strategic',
    )

    const rawNodes: Node<ObjectiveNodeData>[] = filteredObjectives.map(o => ({
      id: o.id,
      type: 'objective',
      data: { statement: o.statement, type: o.type },
      position: { x: 0, y: 0 },
    }))

    const nodeIds = new Set(rawNodes.map(n => n.id))
    const rawEdges: Edge[] = causalLinks
      .filter(l => nodeIds.has(l.from_obj) && nodeIds.has(l.to_obj))
      .map(l => ({
        id: l.id,
        source: l.from_obj,
        target: l.to_obj,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))

    const { nodes, edges } = getLayoutedElements(rawNodes, rawEdges)
    return { initialNodes: nodes, initialEdges: edges }
  }, [objectives, causalLinks])

  const [syncedNodes, setSyncedNodes, onSyncedNodesChange] =
    useNodesState<Node<ObjectiveNodeData>>(initialNodes)
  const [syncedEdges, setSyncedEdges] = useEdgesState<Edge>(initialEdges)

  useEffect(() => {
    setSyncedNodes(initialNodes)
    setSyncedEdges(initialEdges)
  }, [initialNodes, initialEdges, setSyncedNodes, setSyncedEdges])

  const handleExportPng = async () => {
    if (!containerRef.current) return
    try {
      const dataUrl = await toPng(containerRef.current, { backgroundColor: '#0e0e13', pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'means-ends-network.png'
      a.click()
    } catch {
      // Export failed silently
    }
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando rede...
        </div>
      </div>
    )
  }

  if (initialNodes.length === 0 || initialEdges.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <p className="text-sm text-center max-w-sm" style={{ color: '#475569' }}>
          Nenhuma relacao causal definida. Aplique o WITI Test nos objetivos para criar vinculos.
        </p>
      </div>
    )
  }

  return (
    <div id="means-ends-network" ref={containerRef} className="h-full w-full" style={{ minHeight: 500, background: '#0e0e13' }}>
      <ReactFlow
        nodes={syncedNodes}
        edges={syncedEdges}
        onNodesChange={onSyncedNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background variant={'dots' as any} color="rgba(255,255,255,0.08)" />
        <Controls position="bottom-left" />

        {/* Export button */}
        <Panel position="top-right">
          <button
            type="button"
            onClick={handleExportPng}
            style={{ background: 'rgba(232,121,249,0.12)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.25)', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', cursor: 'pointer' }}
          >
            Exportar PNG
          </button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-right">
          <div style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }} />
              Meios
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
              Fundamentais
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block' }} />
              Estrategicos
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
