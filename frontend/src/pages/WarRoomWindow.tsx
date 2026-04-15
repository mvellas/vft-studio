import { useEffect, useState } from 'react'
import { WarRoomGraph } from '../components/pipeline/WarRoomGraph'
import { WarRoomTimeline } from '../components/pipeline/WarRoomTimeline'
import type { AgentTurn } from '../stores/pipelineStore'
import { Radio } from 'lucide-react'

export function WarRoomWindow() {
  const [turns, setTurns] = useState<AgentTurn[]>([])
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel('vft-warroom')
      setConnected(true)
      channel.onmessage = (e: MessageEvent<{ turns: AgentTurn[] }>) => {
        setTurns(e.data.turns)
      }
    } catch {
      setConnected(false)
    }
    return () => { channel?.close() }
  }, [])

  const warRoomTurns = turns.filter(t => t.isWarRoom)
  const activeAgent: string | null = null

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#07070c',
      color: '#f1f5f9',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{
        height: 44,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 8,
        background: '#0a0a0f',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <Radio size={14} style={{ color: '#e879f9' }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#e879f9' }}>War Room</span>
        <span style={{ fontSize: 11, color: '#334155' }}>— VFT Studio</span>
        <div style={{ flex: 1 }} />
        {connected && (
          <span style={{ fontSize: 11, color: '#34d399' }}>● ao vivo</span>
        )}
        {!connected && (
          <span style={{ fontSize: 11, color: '#ef4444' }}>● BroadcastChannel indisponível</span>
        )}
        {warRoomTurns.length > 0 && (
          <span style={{ fontSize: 11, color: '#475569' }}>
            {warRoomTurns.length} turnos
          </span>
        )}
      </div>

      {/* Body */}
      {warRoomTurns.length === 0 ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: '#334155',
        }}>
          Aguardando dados da análise...
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Graph — 55% width */}
          <div style={{ width: '55%', borderRight: '1px solid rgba(255,255,255,0.06)', padding: 16 }}>
            <WarRoomGraph turns={warRoomTurns} activeAgent={activeAgent} />
          </div>
          {/* Timeline — 45% width, scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <WarRoomTimeline turns={warRoomTurns} activeAgent={activeAgent} />
          </div>
        </div>
      )}
    </div>
  )
}
