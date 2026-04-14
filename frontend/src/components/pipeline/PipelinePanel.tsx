import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'
import { AgentTurnCard } from './AgentTurnCard'
import { WarRoomTimeline } from './WarRoomTimeline'
import { ReportView } from './ReportView'

const STATUS_MESSAGES = ['Pesquisando...', 'Analisando...', 'Considerando...', 'Formulando...']

function RotatingStatus() {
  const idxRef = useRef(0)
  const [label, setLabel] = useState(STATUS_MESSAGES[0])

  useEffect(() => {
    const id = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % STATUS_MESSAGES.length
      setLabel(STATUS_MESSAGES[idxRef.current])
    }, 4000)
    return () => clearInterval(id)
  }, [])

  return <>{label}</>
}

interface Props {
  projectName: string
}

export function PipelinePanel({ projectName }: Props) {
  const { status, turns, reportMd, errorMessage, reset, runId } = usePipelineStore()
  const { pipelineView, setPipelineView, setChatPanelOpen } = useUiStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  const phaseTurns = turns.filter((t) => !t.isWarRoom && t.event !== 'report_delta')
  const warRoomTurns = turns.filter((t) => t.isWarRoom)
  const activeTurn = turns[turns.length - 1]
  const activeAgent = status === 'running' ? (activeTurn?.agentName ?? null) : null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [turns])

  const handleDiscussInChat = () => {
    setPipelineView('idle')
    setChatPanelOpen(true)
  }

  const handleRedo = () => {
    reset()
    setPipelineView('idle')
  }

  if (pipelineView === 'idle') return null

  return (
    <div className="space-y-6">
      {status === 'running' && (
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.2)', borderRadius: '12px' }}
        >
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#e879f9' }} />
          <span className="text-sm font-medium" style={{ color: '#e879f9' }}>
            {activeAgent ? `${activeAgent} — ` : ''}
            <RotatingStatus />
          </span>
        </div>
      )}

      {phaseTurns.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold" style={{ color: '#94a3b8' }}>Análise sequencial</h3>
          {phaseTurns.map((turn, idx) => (
            <AgentTurnCard
              key={turn.id}
              turn={turn}
              isActive={status === 'running' && idx === phaseTurns.length - 1}
            />
          ))}
        </div>
      )}

      {warRoomTurns.length > 0 && (
        <WarRoomTimeline turns={warRoomTurns} activeAgent={activeAgent} />
      )}

      {status === 'done' && reportMd && (
        <ReportView
          reportMd={reportMd}
          projectName={projectName}
          runId={runId}
          phaseTurns={phaseTurns}
          warRoomTurns={warRoomTurns}
          onDiscussInChat={handleDiscussInChat}
          onRedo={handleRedo}
        />
      )}

      {status === 'error' && (
        <div
          className="rounded-xl p-4 text-sm"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}
        >
          Erro: {errorMessage}
          <button
            onClick={handleRedo}
            className="ml-3"
            style={{ textDecoration: 'underline', color: '#f87171' }}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
