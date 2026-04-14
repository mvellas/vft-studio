import { useEffect, useRef } from 'react'
import { Network, DataSet } from 'vis-network/standalone'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_COLOR: Record<string, string> = {
  ARIA: '#e879f9',
  FRAME: '#60a5fa',
  AXIOM: '#fbbf24',
  NOVA: '#34d399',
  ANALYST: '#a78bfa',
}

const AGENTS = ['ARIA', 'FRAME', 'AXIOM', 'NOVA', 'ANALYST']

interface Props {
  turns: AgentTurn[]
}

export function WarRoomGraph({ turns }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const edgesRef = useRef<DataSet<any> | null>(null)
  const edgeCountRef = useRef(0)

  useEffect(() => {
    if (!containerRef.current) return

    const nodes = new DataSet(
      AGENTS.map((name) => ({
        id: name,
        label: name,
        color: {
          background: AGENT_COLOR[name] ?? '#94a3b8',
          border: AGENT_COLOR[name] ?? '#94a3b8',
          highlight: { background: AGENT_COLOR[name] ?? '#94a3b8', border: '#ffffff' },
        },
        font: { color: '#f8fafc', size: 13, face: 'Inter, sans-serif' },
        size: 24,
        shape: 'dot',
      }))
    )

    const edges = new DataSet<any>([])
    edgesRef.current = edges

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        physics: { enabled: true, stabilization: { iterations: 100 } },
        interaction: { dragNodes: true, zoomView: false },
        edges: {
          arrows: { to: { enabled: true, scaleFactor: 0.6 } },
          color: { color: 'rgba(255,255,255,0.2)', highlight: '#e879f9' },
          width: 1.5,
          smooth: { enabled: true, type: 'dynamic', roundness: 0.3 },
          dashes: true,
        },
        nodes: { borderWidth: 2 },
        background: { color: '#0e0e13' } as any,
      }
    )
    networkRef.current = network

    return () => {
      network.destroy()
      networkRef.current = null
      edgesRef.current = null
      edgeCountRef.current = 0
    }
  }, [])

  // Add edge whenever a new turn arrives
  useEffect(() => {
    if (!edgesRef.current) return
    const warRoomTurns = turns.filter((t) => t.isWarRoom)
    // Only add edges we haven't added yet
    const newTurns = warRoomTurns.slice(edgeCountRef.current)
    newTurns.forEach((turn, i) => {
      const prevTurn = warRoomTurns[edgeCountRef.current + i - 1]
      const from = prevTurn ? prevTurn.agentName : turn.agentName
      const to = turn.agentName
      edgesRef.current!.add({
        id: turn.id,
        from,
        to,
        color: { color: AGENT_COLOR[from] ?? 'rgba(255,255,255,0.3)' },
      })
    })
    edgeCountRef.current = warRoomTurns.length
  }, [turns])

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: 260,
        background: '#0e0e13',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12,
      }}
    />
  )
}
