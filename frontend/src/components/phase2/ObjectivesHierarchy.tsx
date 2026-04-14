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
  const nodeStyle: React.CSSProperties = isFundamental
    ? { background: 'rgba(167,139,250,0.08)', border: '2px solid rgba(167,139,250,0.4)' }
    : { background: 'rgba(255,255,255,0.04)', border: '2px solid rgba(255,255,255,0.1)' }

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
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, borderRadius: '8px', padding: '12px', fontSize: '14px', lineHeight: 1.4, ...nodeStyle }}
    >
      <Handle type="target" position={Position.Top} />
      <p style={{ fontSize: '12px', fontWeight: 500, color: '#e2e8f0', margin: '0 0 4px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{data.statement}</p>

      {data.hasAttribute && (
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>
          Atributo definido
        </span>
      )}

      {/* Parent selector — only for non-root fundamentals to allow re-parenting */}
      {data.fundamentalOptions.length > 0 && (
        <div style={{ marginTop: '4px' }}>
          <select
            value={data.parentId ?? ''}
            onChange={e => handleParentChange(e.target.value)}
            onClick={e => e.stopPropagation()}
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: '11px', borderRadius: '4px', padding: '2px 4px', width: '100%' }}
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
      const dataUrl = await toPng(containerRef.current, { backgroundColor: '#0e0e13', pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = 'objectives-hierarchy.png'
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
          Carregando hierarquia...
        </div>
      </div>
    )
  }

  if (initialNodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center" style={{ minHeight: 500 }}>
        <p className="text-sm text-center max-w-sm" style={{ color: '#475569' }}>
          Nenhum objetivo fundamental classificado ainda. Complete o WITI Test para identificar os fundamentais.
        </p>
      </div>
    )
  }

  return (
    <div id="objectives-hierarchy" ref={containerRef} className="h-full w-full" style={{ minHeight: 500, background: '#0e0e13' }}>
      <ReactFlow
        nodes={syncedNodes}
        edges={syncedEdges}
        onNodesChange={onSyncedNodesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesConnectable={false}
        elementsSelectable={true}
        colorScheme="dark"
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
      </ReactFlow>
    </div>
  )
}
