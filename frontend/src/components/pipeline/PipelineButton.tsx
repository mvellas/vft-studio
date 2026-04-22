import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { streamPipeline } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { usePhaseProgressStore } from '../../stores/phaseProgressStore'
import { useUiStore } from '../../stores/uiStore'

interface Props {
  projectId: string
  projectDescription: string
}

export function PipelineButton({ projectId, projectDescription }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState(projectDescription)
  const [mainButtonHovered, setMainButtonHovered] = useState(false)
  const [closeButtonHovered, setCloseButtonHovered] = useState(false)
  const [textareaFocused, setTextareaFocused] = useState(false)
  const { status, startRun, addPhaseTurn, addWarRoomTurn, addStatus, finishRun, setError } =
    usePipelineStore()
  const { setPipelineView } = useUiStore()

  const isRunning = status === 'running'

  const handleStart = () => {
    if (!projectDescription) {
      setShowModal(true)
    } else {
      launchPipeline(projectDescription)
    }
  }

  const handleModalConfirm = () => {
    setShowModal(false)
    launchPipeline(description)
  }

  const launchPipeline = (desc: string) => {
    setPipelineView('running')
    startRun('pending')
    usePhaseProgressStore.getState().clearLiveProgress()

    streamPipeline(
      projectId,
      desc || undefined,
      (eventName, data) => {
        const d = data as Record<string, string>
        if (eventName === 'pipeline_start') {
          startRun(d.run_id)
        } else if (eventName === 'pipeline_status') {
          const payload = data as Record<string, unknown>
          usePhaseProgressStore.getState().applyPipelineStatus({
            stage: (payload.stage as string | undefined) ?? 'pipeline',
            state: (payload.state as 'running' | 'done' | undefined) ?? 'running',
            meta: (payload.meta as Record<string, unknown> | undefined) ?? {},
          })
          addStatus({
            id: (payload.id as string | undefined) ?? `${Date.now()}`,
            title: (payload.title as string | undefined) ?? 'Processando',
            detail: (payload.detail as string | undefined) ?? '',
            actor: (payload.actor as string | undefined) ?? 'ARIA',
            stage: (payload.stage as string | undefined) ?? 'pipeline',
            state: (payload.state as 'running' | 'done' | undefined) ?? 'running',
            meta: (payload.meta as Record<string, unknown> | undefined) ?? {},
          })
        } else if (eventName === 'agent_done') {
          addPhaseTurn(d.agent_name ?? d.agent ?? 'Agente', d.phase_label ?? '', d.content ?? '')
        } else if (eventName === 'war_room_turn_complete') {
          const wd = data as {
            speaker: string
            agent_name: string
            text: string
            act: number
          }
          addWarRoomTurn(wd.speaker, wd.agent_name, wd.text, wd.act)
        } else if (eventName === 'report_done') {
          usePhaseProgressStore.getState().markPipelineComplete()
          finishRun(d.report_md ?? '')
          setPipelineView('report')
          setTimeout(() => {
            void usePhaseProgressStore.getState().refresh(projectId)
          }, 250)
        }
      },
      () => {/* pipeline_done handled via report_done */},
      (msg) => {
        usePhaseProgressStore.getState().clearLiveProgress()
        setError(msg)
      },
    )
  }

  return (
    <>
      <button
        onClick={handleStart}
        disabled={isRunning}
        onMouseEnter={() => setMainButtonHovered(true)}
        onMouseLeave={() => setMainButtonHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
          fontSize: '0.75rem',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          paddingTop: '0.375rem',
          paddingBottom: '0.375rem',
          borderRadius: '0.5rem',
          border: '1px solid rgba(232,121,249,0.3)',
          color: '#e879f9',
          background: mainButtonHovered ? 'rgba(232,121,249,0.15)' : 'rgba(232,121,249,0.08)',
          transition: 'background-color 0.2s',
          fontWeight: 500,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          opacity: isRunning ? 0.5 : 1,
        }}
      >
        <Play size={13} />
        VFT com IA
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: '#13131f',
              borderRadius: '12px',
              padding: '1.5rem',
              maxWidth: '28rem',
              width: '100%',
              marginLeft: '1rem',
              marginRight: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h2
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#f8fafc',
                  margin: 0,
                }}
              >
                Contexto do projeto
              </h2>
              <button
                onClick={() => setShowModal(false)}
                onMouseEnter={() => setCloseButtonHovered(true)}
                onMouseLeave={() => setCloseButtonHovered(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: closeButtonHovered ? '#94a3b8' : '#475569',
                  transition: 'color 0.2s',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#64748b',
                margin: 0,
              }}
            >
              Descreva o problema de decisão para que os agentes tenham contexto adequado.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onFocus={() => setTextareaFocused(true)}
              onBlur={() => setTextareaFocused(false)}
              placeholder="Ex: Decidir qual tecnologia adotar para o novo sistema de pagamentos..."
              rows={4}
              style={{
                width: '100%',
                border: textareaFocused
                  ? '1px solid rgba(232,121,249,0.4)'
                  : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                paddingLeft: '0.75rem',
                paddingRight: '0.75rem',
                paddingTop: '0.5rem',
                paddingBottom: '0.5rem',
                fontSize: '0.875rem',
                color: '#f1f5f9',
                background: '#0e0e13',
                outline: 'none',
                resize: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.5rem',
              }}
            >
              <button
                onClick={() => setShowModal(false)}
                style={{
                  fontSize: '0.875rem',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#94a3b8',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#cbd5e1'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#94a3b8'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleModalConfirm}
                style={{
                  fontSize: '0.875rem',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.5rem',
                  paddingBottom: '0.5rem',
                  borderRadius: '0.5rem',
                  background: 'rgba(232,121,249,0.15)',
                  color: '#e879f9',
                  border: '1px solid rgba(232,121,249,0.3)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(232,121,249,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(232,121,249,0.15)'
                }}
              >
                Iniciar análise
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
