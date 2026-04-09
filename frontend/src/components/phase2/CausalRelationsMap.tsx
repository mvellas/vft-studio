import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
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

const TYPE_COLORS: Record<string, string> = {
  means: 'bg-amber-50 border-amber-400',
  fundamental: 'bg-purple-50 border-purple-500',
  strategic: 'bg-blue-50 border-blue-400',
}

function ObjectiveNode({ data }: { data: ObjectiveNodeData }) {
  const colorClass = TYPE_COLORS[data.type] ?? 'bg-gray-50 border-gray-300'

  return (
    <div
      className={`rounded-lg border-2 p-3 text-sm text-center leading-snug ${colorClass}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Bottom} />
      <p className="text-center text-xs font-medium text-gray-700 line-clamp-3">
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

  const [nodes, , onNodesChange] = useNodesState<Node<ObjectiveNodeData>>(initialNodes)
  const [edges] = useEdgesState<Edge>(initialEdges)

  // Sync layouted nodes/edges when store data changes
  // useNodesState init only fires once; we need to reset on dependency change
  const [syncedNodes, setSyncedNodes, onSyncedNodesChange] =
    useNodesState<Node<ObjectiveNodeData>>(initialNodes)
  const [syncedEdges, setSyncedEdges] = useEdgesState<Edge>(initialEdges)

  useEffect(() => {
    setSyncedNodes(initialNodes)
    setSyncedEdges(initialEdges)
  }, [initialNodes, initialEdges, setSyncedNodes, setSyncedEdges])

  // Suppress unused vars from the non-synced state
  void nodes
  void onNodesChange
  void edges

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando relacoes causais...
        </div>
      </div>
    )
  }

  if (objectives.length === 0 || causalLinks.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 400 }}>
        <p className="text-sm text-gray-400 text-center max-w-sm">
          Nenhuma relacao causal definida. Aplique o WITI Test nos objetivos para criar vinculos.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full w-full" style={{ minHeight: 400 }}>
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
      </ReactFlow>
    </div>
  )
}
