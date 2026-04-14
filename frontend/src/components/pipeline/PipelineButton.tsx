import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { streamPipeline } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface Props {
  projectId: string
  projectDescription: string
}

export function PipelineButton({ projectId, projectDescription }: Props) {
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState(projectDescription)
  const { status, startRun, appendDelta, addWarRoomTurn, appendReportDelta, finishRun, setError } =
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

    streamPipeline(
      projectId,
      desc || undefined,
      (eventName, data) => {
        const d = data as Record<string, string>
        if (eventName === 'pipeline_start') {
          startRun(d.run_id)
        } else if (eventName === 'agent_delta') {
          appendDelta(d.agent, d.agent_name ?? d.agent, d.phase_label ?? '', d.text ?? '')
        } else if (eventName === 'war_room_turn') {
          const wd = data as {
            speaker: string
            agent_name: string
            text: string
            is_delta: boolean
            act: number
          }
          addWarRoomTurn(wd.speaker, wd.agent_name, wd.text, wd.is_delta, wd.act)
        } else if (eventName === 'report_delta') {
          appendReportDelta(d.text ?? '')
        } else if (eventName === 'report_done') {
          finishRun(d.report_md ?? '')
          setPipelineView('report')
        }
      },
      () => {/* pipeline_done handled via report_done */},
      (msg) => setError(msg),
    )
  }

  return (
    <>
      <button
        onClick={handleStart}
        disabled={isRunning}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        <Play size={13} />
        VFT com IA
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Contexto do projeto</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Descreva o problema de decisão para que os agentes tenham contexto adequado.
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Decidir qual tecnologia adotar para o novo sistema de pagamentos..."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleModalConfirm}
                className="text-sm px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
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
