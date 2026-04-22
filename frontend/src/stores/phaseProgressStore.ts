import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { phasesApi } from '../api/phases'

interface PhaseProgressState {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  progressPercent: number
  livePhaseCounts: Record<number, number> | null
  liveCurrentPhase: number | null
  loading: boolean
  refresh: (projectId: string) => Promise<void>
  applyPipelineStatus: (item: {
    stage: string
    state: 'running' | 'done'
    meta?: Record<string, unknown>
  }) => void
  markPipelineComplete: () => void
  clearLiveProgress: () => void
  reset: () => void
}

const PHASE_TOTALS: Record<number, number> = {
  1: 7,
  2: 18,
  3: 8,
}

function clampCount(phase: number, value: number): number {
  const total = PHASE_TOTALS[phase] ?? value
  return Math.max(0, Math.min(total, value))
}

function countsToPercent(counts: Record<number, number>): number {
  const completed = Object.values(counts).reduce((sum, value) => sum + value, 0)
  const total = Object.values(PHASE_TOTALS).reduce((sum, value) => sum + value, 0)
  return Math.round((completed / Math.max(total, 1)) * 100)
}

function nextLiveState(
  currentCounts: Record<number, number>,
  item: { stage: string; state: 'running' | 'done'; meta?: Record<string, unknown> },
): { counts: Record<number, number>; currentPhase: number } {
  const counts = { ...currentCounts }
  const meta = item.meta ?? {}

  if (item.stage === 'setup') {
    counts[1] = Math.max(counts[1], item.state === 'done' ? 2 : 1)
    return { counts, currentPhase: 1 }
  }

  if (item.stage === 'stakeholders') {
    counts[1] = Math.max(counts[1], item.state === 'done' ? 4 : 3)
    return { counts, currentPhase: 1 }
  }

  if (item.stage === 'phase') {
    const agent = String(meta.active_agent ?? meta.completed_agent ?? '')
    if (agent === 'FRAME') {
      counts[1] = Math.max(counts[1], item.state === 'done' ? 7 : 5)
      return { counts, currentPhase: 1 }
    }
    if (agent === 'AXIOM') {
      counts[2] = Math.max(counts[2], item.state === 'done' ? 11 : 6)
      return { counts, currentPhase: 2 }
    }
    if (agent === 'ANALYST') {
      counts[2] = Math.max(counts[2], item.state === 'done' ? 14 : 9)
      return { counts, currentPhase: 2 }
    }
    if (agent === 'NOVA') {
      counts[3] = Math.max(counts[3], item.state === 'done' ? 6 : 3)
      return { counts, currentPhase: 3 }
    }
  }

  if (item.stage === 'war-room') {
    counts[3] = Math.max(counts[3], item.state === 'done' ? 7 : 6)
    return { counts, currentPhase: 3 }
  }

  if (item.stage === 'report') {
    counts[1] = PHASE_TOTALS[1]
    counts[2] = PHASE_TOTALS[2]
    counts[3] = item.state === 'done' ? PHASE_TOTALS[3] : Math.max(counts[3], 7)
    return { counts, currentPhase: 3 }
  }

  return { counts, currentPhase: 1 }
}

export const usePhaseProgressStore = create<PhaseProgressState>()(
  immer((set) => ({
    currentStep: '1.1',
    completedSteps: [],
    totalSteps: 33,
    progressPercent: 0,
    livePhaseCounts: null,
    liveCurrentPhase: null,
    loading: false,

    refresh: async (projectId: string) => {
      try {
        const data = await phasesApi.getCurrent(projectId)
        set((s) => {
          s.currentStep = data.step.id
          s.completedSteps = data.completed_steps
          s.totalSteps = data.total_steps
          s.progressPercent = data.progress_percent
          s.livePhaseCounts = null
          s.liveCurrentPhase = null
        })
      } catch {
        // silently ignore
      }
    },

    applyPipelineStatus: (item) => set((s) => {
      const baseCounts = s.livePhaseCounts ?? { 1: 0, 2: 0, 3: 0 }
      const { counts, currentPhase } = nextLiveState(baseCounts, item)
      s.livePhaseCounts = {
        1: clampCount(1, counts[1] ?? 0),
        2: clampCount(2, counts[2] ?? 0),
        3: clampCount(3, counts[3] ?? 0),
      }
      s.liveCurrentPhase = currentPhase
      s.progressPercent = countsToPercent(s.livePhaseCounts)
    }),

    markPipelineComplete: () => set((s) => {
      s.livePhaseCounts = { 1: PHASE_TOTALS[1], 2: PHASE_TOTALS[2], 3: PHASE_TOTALS[3] }
      s.liveCurrentPhase = 3
      s.progressPercent = 100
    }),

    clearLiveProgress: () => set((s) => {
      s.livePhaseCounts = null
      s.liveCurrentPhase = null
    }),

    reset: () => set((s) => {
      s.currentStep = '1.1'
      s.completedSteps = []
      s.totalSteps = 33
      s.progressPercent = 0
      s.livePhaseCounts = null
      s.liveCurrentPhase = null
    }),
  }))
)
