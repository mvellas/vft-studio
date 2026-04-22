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
  means: { background: 'rgba(251,191,36,0.06)', border: '2px solid rgba(251,191,36,0.4)', color: '#94a3b8' },
  fundamental: { background: 'rgba(167,139,250,0.06)', border: '2px solid rgba(167,139,250,0.4)', color: '#94a3b8' },
  strategic: { background: 'rgba(96,165,250,0.06)', border: '2px solid rgba(96,165,250,0.4)', color: '#94a3b8' },
}

function ObjectiveNode({ data }: { data: ObjectiveNodeData }) {
  const nodeStyle = TYPE_STYLES[data.type] ?? { background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.1)', color: '#94a3b8' }

  return (
    <div
      className="rounded-lg p-3 text-sm text-center leading-snug"
      style={{ ...nodeStyle, width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Bottom} />
      <p className="text-center text-xs font-medium line-clamp-3" style={{ color: '#94a3b8' }}>
        {data.statement}
      </p>
      <Handle type="source" position={Position.Top} />
    </div>
  )
}

const nodeTypes = { objective: ObjectiveNode }

// ---------------------------------------------------------------------------
// CausalRelationsMap
// ---------------------------------------------------------------------------

interface CausalRelationsMapProps {
  projectId: string
}

export function CausalRelationsMap({ projectId }: CausalRelationsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const objectives = useObjectivesStore(s => s.objectives)
  const causalLinks = useObjectivesStore(s => s.causalLinks)
  const loading = useObjectivesStore(s => s.loading)
  const fetchNetwork = useObjectivesStore(s => s.fetchNetwork)

  useEffect(() => {
    fetchNetwork(projectId)
  }, [projectId, fetchNetwork])

  // Convert store data to react-flow format + apply dagre layout
  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node<ObjectiveNodeData>[] = objectives.map(o => ({
      id: o.id,
      type: 'objective',
      data: { statement: o.statement, type: o.type },
      position: { x: 0, y: 0 },
    }))

    const rawEdges: Edge[] = causalLinks.map(l => ({
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
      a.download = 'causal-relations-map.png'
      a.click()
    } catch {
      // Export failed silently
    }
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex items-center gap-2 text-sm" style={{ color: '#64748b' }}>
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando relacoes causais...
        </div>
      </div>
    )
  }

  if (objectives.length === 0 || causalLinks.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <p className="text-sm text-center max-w-sm" style={{ color: '#64748b' }}>
          Nenhuma relacao causal definida. Aplique o WITI Test nos objetivos para criar vinculos.
        </p>
      </div>
    )
  }

  return (
    <div id="causal-relations-map" ref={containerRef} className="h-full w-full" style={{ minHeight: 400, background: '#0e0e13' }}>
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
        <Background variant={'dots' as Parameters<typeof Background>[0]['variant']} />
        <Controls position="bottom-left" />
        <Panel position="top-right">
          <button
            type="button"
            onClick={handleExportPng}
            style={{ background: 'rgba(232,121,249,0.12)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.25)', borderRadius: '8px', padding: '4px 12px', fontSize: '13px', cursor: 'pointer' }}
          >
            Exportar PNG
          </button>
        </Panel>
      </ReactFlow>
    </div>
  )
}
