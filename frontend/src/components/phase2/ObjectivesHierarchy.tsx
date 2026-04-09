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
import { objectivesApi } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HierarchyNodeData {
  statement: string
  type: string
  hasAttribute: boolean
  objectiveId: string
  parentId: string | null
  projectId: string
  fundamentalOptions: Array<{ id: string; statement: string }>
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const NODE_WIDTH = 220
const NODE_HEIGHT = 70

function getLayoutedElements(
  nodes: Node<HierarchyNodeData>[],
  edges: Edge[],
): { nodes: Node<HierarchyNodeData>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges }

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 })

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
// Custom hierarchy node
// ---------------------------------------------------------------------------

function HierarchyNode({ data }: { data: HierarchyNodeData }) {
  const isFundamental = data.type === 'fundamental'
  const colorClass = isFundamental
    ? 'bg-purple-50 border-purple-500'
    : 'bg-gray-50 border-gray-300'

  const handleParentChange = async (newParentId: string) => {
    if (!newParentId || newParentId === data.objectiveId) return
    try {
      const parent = data.fundamentalOptions.find(o => o.id === newParentId)
      const parentLevel = parent ? 1 : 0
      await objectivesApi.update(data.projectId, data.objectiveId, {
        parent_id: newParentId,
        hierarchy_level: parentLevel + 1,
      })
      // Refresh store
      useObjectivesStore.getState().fetchObjectives(data.projectId)
    } catch {
      // Silent failure — user can retry
    }
  }

  return (
    <div
      className={`rounded-lg border-2 p-3 text-sm leading-snug ${colorClass}`}
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT }}
    >
      <Handle type="target" position={Position.Top} />
      <p className="text-xs font-medium text-gray-700 line-clamp-2 mb-1">{data.statement}</p>

      {data.hasAttribute && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
          Atributo definido
        </span>
      )}

      {/* Parent selector — only for non-root fundamentals to allow re-parenting */}
      {data.fundamentalOptions.length > 0 && (
        <div className="mt-1">
          <select
            value={data.parentId ?? ''}
            onChange={e => handleParentChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            className="w-full text-xs border border-gray-200 rounded px-1 py-0.5 text-gray-500 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Pai: (raiz)</option>
            {data.fundamentalOptions
              .filter(o => o.id !== data.objectiveId)
              .map(o => (
                <option key={o.id} value={o.id}>
                  {o.statement.slice(0, 40)}{o.statement.length > 40 ? '…' : ''}
                </option>
              ))}
          </select>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}

const nodeTypes = { hierarchy: HierarchyNode }

// ---------------------------------------------------------------------------
// ObjectivesHierarchy
// ---------------------------------------------------------------------------

interface ObjectivesHierarchyProps {
  projectId: string
}

export function ObjectivesHierarchy({ projectId }: ObjectivesHierarchyProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const objectives = useObjectivesStore(s => s.objectives)
  const loading = useObjectivesStore(s => s.loading)
  const fetchObjectives = useObjectivesStore(s => s.fetchObjectives)

  useEffect(() => {
    fetchObjectives(projectId)
  }, [projectId, fetchObjectives])

  // Only fundamental objectives (or those with a parent_id pointing to a fundamental)
  const fundamentalOptions = useMemo(
    () => objectives.filter(o => o.witi_classification === 'fundamental'),
    [objectives],
  )

  const { initialNodes, initialEdges } = useMemo(() => {
    // Include fundamentals and any objectives that have parent_id set
    const included = objectives.filter(
      o => o.witi_classification === 'fundamental' || o.parent_id !== null,
    )

    const includedIds = new Set(included.map(o => o.id))

    const rawNodes: Node<HierarchyNodeData>[] = included.map(o => ({
      id: o.id,
      type: 'hierarchy',
      data: {
        statement: o.statement,
        type: o.type,
        hasAttribute: Boolean(o.witi_classification === 'fundamental' && o.coc_q1_result),
        objectiveId: o.id,
        parentId: o.parent_id,
        projectId,
        fundamentalOptions,
      },
      position: { x: 0, y: 0 },
    }))

    // Build edges from parent_id — NOT from causal links (per RESEARCH.md Pitfall 5)
    const rawEdges: Edge[] = included
      .filter(o => o.parent_id !== null && includedIds.has(o.parent_id!))
      .map(o => ({
        id: `hier-${o.id}`,
        source: o.parent_id!,
        target: o.id,
        markerEnd: { type: MarkerType.ArrowClosed },
      }))

    const { nodes, edges } = getLayoutedElements(rawNodes, rawEdges)
    return { initialNodes: nodes, initialEdges: edges }
  }, [objectives, fundamentalOptions, projectId])

  const [syncedNodes, setSyncedNodes, onSyncedNodesChange] =
    useNodesState<Node<HierarchyNodeData>>(initialNodes)
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
        a.download = 'objectives-hierarchy.png'
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
          Carregando hierarquia...
        </div>
      </div>
    )
  }

  if (initialNodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <p className="text-sm text-gray-400 text-center max-w-sm">
          Nenhum objetivo fundamental classificado ainda. Complete o WITI Test para identificar os fundamentais.
        </p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="h-full w-full" style={{ minHeight: 500 }}>
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
      </ReactFlow>
    </div>
  )
}
