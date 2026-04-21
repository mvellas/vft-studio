import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface AgentTurn {
  id: string
  event: 'agent_done' | 'war_room_turn_complete'
  agent: string
  agentName: string
  phaseLabel: string
  text: string
  act?: number
  isWarRoom?: boolean
}

export interface PipelineStatusItem {
  id: string
  title: string
  detail: string
  actor: string
  stage: string
  state: 'running' | 'done'
  meta?: Record<string, unknown>
}

interface PipelineState {
  runId: string | null
  status: 'idle' | 'running' | 'done' | 'error'
  turns: AgentTurn[]
  statusFeed: PipelineStatusItem[]
  reportMd: string
  errorMessage: string | null
  startRun: (runId: string) => void
  addPhaseTurn: (agentName: string, phaseLabel: string, text: string) => void
  addWarRoomTurn: (speaker: string, agentName: string, text: string, act: number) => void
  addStatus: (item: PipelineStatusItem) => void
  finishRun: (reportMd: string) => void
  setError: (msg: string) => void
  reset: () => void
  setFromExisting: (reportMd: string, runId: string) => void
}

export const usePipelineStore = create<PipelineState>()(
  immer((set) => ({
    runId: null,
    status: 'idle',
    turns: [],
    statusFeed: [],
    reportMd: '',
    errorMessage: null,

    startRun: (runId) => set((s) => {
      s.runId = runId
      s.status = 'running'
      s.turns = []
      s.statusFeed = []
      s.reportMd = ''
      s.errorMessage = null
    }),

    addPhaseTurn: (agentName, phaseLabel, text) => {
      set((s) => {
        s.turns.push({
          id: `${agentName}-${Date.now()}`,
          event: 'agent_done',
          agent: agentName,
          agentName,
          phaseLabel,
          text,
          isWarRoom: false,
        })
      })
    },

    addWarRoomTurn: (speaker, agentName, text, act) => {
      set((s) => {
        s.turns.push({
          id: `wr-${speaker}-${Date.now()}`,
          event: 'war_room_turn_complete',
          agent: speaker,
          agentName,
          phaseLabel: `War Room — Ato ${act}`,
          text,
          act,
          isWarRoom: true,
        })
      })
    },

    addStatus: (item) => set((s) => {
      const existing = s.statusFeed.find((entry) => entry.id === item.id)
      if (!existing) {
        s.statusFeed.push(item)
      }
    }),
    finishRun: (reportMd) => set((s) => { s.status = 'done'; s.reportMd = reportMd }),
    setError: (msg) => set((s) => { s.status = 'error'; s.errorMessage = msg }),
    reset: () => {
      set((s) => {
        s.status = 'idle'
        s.turns = []
        s.statusFeed = []
        s.reportMd = ''
        s.runId = null
        s.errorMessage = null
      })
    },
    setFromExisting: (reportMd, runId) => set((s) => {
      s.reportMd = reportMd
      s.runId = runId
      s.status = 'done'
      s.statusFeed = []
    }),
  }))
)
