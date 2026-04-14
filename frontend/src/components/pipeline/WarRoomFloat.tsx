import { useState, useCallback, useRef, useEffect } from 'react'
import { Minus, ExternalLink, X, Radio } from 'lucide-react'
import { WarRoomGraph } from './WarRoomGraph'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface DragState {
  dragging: boolean
  startX: number
  startY: number
  originX: number
  originY: number
}

export function WarRoomFloat() {
  const { turns, status } = usePipelineStore()
  const { setWarRoomFloatOpen } = useUiStore()

  const warRoomTurns = turns.filter(t => t.isWarRoom)
  const activeAgent = status === 'running' ? (turns[turns.length - 1]?.agentName ?? null) : null

  const [pos, setPos] = useState({ x: window.innerWidth - 324, y: window.innerHeight - 268 })
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef<DragState>({ dragging: false, startX: 0, startY: 0, originX: 0, originY: 0 })

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
    }
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 300, dragRef.current.originX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 48, dragRef.current.originY + dy)),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragRef.current.dragging = false
  }, [])

  const handlePopout = useCallback(() => {
    window.open(
      '/warroom',
      'vft-warroom',
      'width=860,height=560,resizable=yes,scrollbars=no'
    )
    setWarRoomFloatOpen(false)
  }, [setWarRoomFloatOpen])

  // Clamp position when window resizes
  useEffect(() => {
    const handle = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - 300),
        y: Math.min(p.y, window.innerHeight - 48),
      }))
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  return (
    <div
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: 300,
        height: minimized ? 40 : 220,
        zIndex: 1000,
        background: '#0e0e13',
        border: '1px solid rgba(232,121,249,0.35)',
        borderRadius: 12,
        boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'height 0.15s ease',
      }}
    >
      {/* Header — drag handle */}
      <div
        onPointerDown={onHeaderPointerDown}
        style={{
          height: 40,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 6,
          cursor: 'grab',
          borderBottom: minimized ? 'none' : '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(232,121,249,0.04)',
          userSelect: 'none',
        }}
      >
        <Radio size={12} style={{ color: '#e879f9', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#e879f9', flex: 1 }}>War Room</span>
        {warRoomTurns.length > 0 && (
          <span style={{ fontSize: 10, color: '#475569' }}>
            {warRoomTurns.length} turnos
          </span>
        )}
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setMinimized(m => !m)}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title={minimized ? 'Expandir' : 'Minimizar'}
        >
          <Minus size={12} />
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={handlePopout}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title="Abrir em nova janela"
        >
          <ExternalLink size={12} />
        </button>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setWarRoomFloatOpen(false)}
          style={{ color: '#475569', padding: 2, lineHeight: 1 }}
          title="Fechar"
        >
          <X size={12} />
        </button>
      </div>

      {/* Graph body */}
      {!minimized && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {warRoomTurns.length === 0 ? (
            <div style={{
              height: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 11, color: '#334155',
            }}>
              Aguardando War Room...
            </div>
          ) : (
            <WarRoomGraph turns={warRoomTurns} activeAgent={activeAgent} />
          )}
        </div>
      )}
    </div>
  )
}
