import { useEffect, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useChatStore } from '../../stores/chatStore'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'
import { ReportView } from './ReportView'
import { PipelineStageScene } from './PipelineStageScene'

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
  projectId: string
  projectName: string
}

export function PipelinePanel({ projectId, projectName }: Props) {
  const { status, turns, statusFeed, reportMd, errorMessage, reset, runId } = usePipelineStore()
  const { pipelineView, setPipelineView, setChatPanelOpen } = useUiStore()
  const { setActiveAgent, setAutoSendMessage } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  const phaseTurns = turns.filter((t) => !t.isWarRoom)
  const warRoomTurns = turns.filter((t) => t.isWarRoom)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [statusFeed, status])

  const handleDiscussInChat = (message: string) => {
    setActiveAgent('ARIA', 'facilitator')
    setAutoSendMessage(message)
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
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, rgba(232,121,249,0.13), rgba(96,165,250,0.06))', border: '1px solid rgba(232,121,249,0.2)' }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(232,121,249,0.14)', color: '#e879f9' }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#f8fafc' }}>VFT Completo com IA em execução</p>
                <p className="text-sm" style={{ color: '#cbd5e1' }}>
                  O relatório está sendo montado em background e será exibido somente quando a análise terminar.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm" style={{ color: '#e879f9' }}>
              <Loader2 size={16} className="animate-spin shrink-0" />
              <span><RotatingStatus /></span>
            </div>
          </div>

          <PipelineStageScene statusFeed={statusFeed} />
        </div>
      )}

      {status === 'done' && reportMd && (
        <ReportView
          projectId={projectId}
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
