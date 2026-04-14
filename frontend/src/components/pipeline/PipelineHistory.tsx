import { useEffect, useState } from 'react'
import { Clock, ChevronRight } from 'lucide-react'
import { listRuns, type PipelineRunInfo } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { useUiStore } from '../../stores/uiStore'

interface Props {
  projectId: string
}

export function PipelineHistory({ projectId }: Props) {
  const [runs, setRuns] = useState<PipelineRunInfo[]>([])
  const { setFromExisting } = usePipelineStore()
  const { setPipelineView } = useUiStore()

  useEffect(() => {
    listRuns(projectId).then(setRuns)
  }, [projectId])

  if (runs.length === 0) return null

  const handleOpen = (run: PipelineRunInfo) => {
    setFromExisting(run.report_md, run.id)
    setPipelineView('report')
  }

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <Clock size={12} />
        Análises anteriores
      </h3>
      <div className="space-y-1">
        {runs.map((run) => (
          <button
            key={run.id}
            onClick={() => handleOpen(run)}
            className="w-full flex items-center justify-between text-xs px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-left"
          >
            <span className="text-gray-600">{formatDate(run.created_at)}</span>
            <ChevronRight size={12} className="text-gray-400 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  )
}
