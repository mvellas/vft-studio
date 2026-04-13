import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { phasesApi } from '../api/phases'

interface PhaseProgressState {
  currentStep: string
  completedSteps: string[]
  totalSteps: number
  progressPercent: number
  loading: boolean
  refresh: (projectId: string) => Promise<void>
  reset: () => void
}

export const usePhaseProgressStore = create<PhaseProgressState>()(
  immer((set) => ({
    currentStep: '1.1',
    completedSteps: [],
    totalSteps: 33,
    progressPercent: 0,
    loading: false,

    refresh: async (projectId: string) => {
      try {
        const data = await phasesApi.getCurrent(projectId)
        set((s) => {
          s.currentStep = data.step.id
          s.completedSteps = data.completed_steps
          s.totalSteps = data.total_steps
          s.progressPercent = data.progress_percent
        })
      } catch {
        // silently ignore
      }
    },

    reset: () => set((s) => {
      s.currentStep = '1.1'
      s.completedSteps = []
      s.totalSteps = 33
      s.progressPercent = 0
    }),
  }))
)
