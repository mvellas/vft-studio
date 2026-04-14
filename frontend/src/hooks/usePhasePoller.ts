import { useEffect, useRef } from 'react'
import { usePhaseProgressStore } from '../stores/phaseProgressStore'
import { usePipelineStore } from '../stores/pipelineStore'

const POLL_MS = 3000

/**
 * Polls phase progress every POLL_MS while the pipeline is running.
 * Does a final refresh when the pipeline finishes.
 */
export function usePhasePoller(projectId: string | null) {
  const refresh = usePhaseProgressStore((s) => s.refresh)
  const pipelineStatus = usePipelineStore((s) => s.status)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initial load
  useEffect(() => {
    if (!projectId) return
    refresh(projectId)
  }, [projectId, refresh])

  // Polling while running
  useEffect(() => {
    if (!projectId) return
    if (pipelineStatus === 'running') {
      intervalRef.current = setInterval(() => {
        refresh(projectId)
      }, POLL_MS)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      // Final refresh after done/error
      if (pipelineStatus === 'done' || pipelineStatus === 'error') {
        refresh(projectId)
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [projectId, pipelineStatus, refresh])
}
