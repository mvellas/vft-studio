import { useState, useCallback, useRef, useEffect } from 'react'
import { Minus, ExternalLink, X, Radio } from 'lucide-react'
import { WarRoomGraph } from './WarRoomGraph'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface InteractState {
  active: boolean
  startX: number
  startY: number
  originX: number
  originY: number
  originW?: number
  originH?: number
}

const MIN_W = 220
const MIN_H = 160
const HEADER_H = 40

export function WarRoomFloat() {
  const { turns, status } = usePipelineStore()
  const { setWarRoomFloatOpen } = useUiStore()

  const warRoomTurns = turns.filter(t => t.isWarRoom)
  const activeAgent = status === 'running' ? (turns[turns.length - 1]?.agentName ?? null) : null

  const [pos, setPos] = useState({ x: window.innerWidth - 324, y: window.innerHeight - 268 })
  const [size, setSize] = useState({ w: 300, h: 220 })
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef<InteractState>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 })
  const resizeRef = useRef<InteractState>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0, originW: 300, originH: 220 })

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y }
  }, [pos])

  const onDragPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - size.w, dragRef.current.originX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - HEADER_H, dragRef.current.originY + dy)),
    })
  }, [size.w])

  const onDragPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current.active = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const onResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = { active: true, startX: e.clientX, startY: e.clientY, originX: pos.x, originY: pos.y, originW: size.w, originH: size.h }
  }, [pos, size])

  const onResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeRef.current.active) return
    const dx = e.clientX - resizeRef.current.startX
    const dy = e.clientY - resizeRef.current.startY
    setSize({
      w: Math.max(MIN_W, (resizeRef.current.originW ?? MIN_W) + dx),
      h: Math.max(MIN_H, (resizeRef.current.originH ?? MIN_H) + dy),
    })
  }, [])

  const onResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    resizeRef.current.active = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }, [])

  const handlePopout = useCallback(() => {
    const win = window.open(
      '/warroom',
      'vft-warroom',
      'width=860,height=560,resizable=yes,scrollbars=no'
    )
    if (win) {
      setWarRoomFloatOpen(false)
    }
  }, [setWarRoomFloatOpen])

  // Clamp position when window resizes
  useEffect(() => {
    const handle = () => {
      setPos(p => ({
        x: Math.min(p.x, window.innerWidth - size.w),
        y: Math.min(p.y, window.innerHeight - HEADER_H),
      }))
    }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [size.w])

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: minimized ? HEADER_H : size.h,
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
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
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
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
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

          {/* Resize handle — bottom-right corner */}
          <div
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 16,
              height: 16,
              cursor: 'se-resize',
              zIndex: 10,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" style={{ position: 'absolute', bottom: 3, right: 3 }}>
              <path d="M9 1L1 9M9 5L5 9M9 9" stroke="rgba(232,121,249,0.4)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
