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
import html2canvas from 'html2canvas'
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
      const canvas = await html2canvas(containerRef.current, { scale: 2 })
      canvas.toBlob(blob => {
        if (!blob) return
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'means-ends-network.png'
        a.click()
        URL.revokeObjectURL(url)
      })
    } catch {
      // Export failed silently — user can retry
    }
  }

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando rede...
        </div>
      </div>
    )
  }

  if (initialNodes.length === 0 || initialEdges.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <p className="text-sm text-gray-400 text-center max-w-sm">
          Nenhuma relacao causal definida. Aplique o WITI Test nos objetivos para criar vinculos.
        </p>
      </div>
    )
  }

  return (
    <div id="means-ends-network" ref={containerRef} className="h-full w-full" style={{ minHeight: 500 }}>
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

        {/* Export button */}
        <Panel position="top-right">
          <button
            type="button"
            onClick={handleExportPng}
            className="bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-gray-50 transition-colors"
          >
            Exportar PNG
          </button>
        </Panel>

        {/* Legend */}
        <Panel position="bottom-right">
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-sm flex items-center gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
              Meios
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" />
              Fundamentais
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
              Estrategicos
            </span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
