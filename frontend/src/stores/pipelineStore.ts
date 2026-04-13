import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

export interface AgentTurn {
  id: string
  event: 'agent_start' | 'agent_delta' | 'agent_done' | 'war_room_turn' | 'report_delta'
  agent: string
  agentName: string
  phaseLabel: string
  text: string
  act?: number
  isDelta?: boolean
  isWarRoom?: boolean
}

interface PipelineState {
  runId: string | null
  status: 'idle' | 'running' | 'done' | 'error'
  turns: AgentTurn[]
  reportMd: string
  errorMessage: string | null
  startRun: (runId: string) => void
  appendDelta: (agent: string, agentName: string, phaseLabel: string, text: string) => void
  addWarRoomTurn: (speaker: string, agentName: string, text: string, isDelta: boolean, act: number) => void
  appendReportDelta: (text: string) => void
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
    reportMd: '',
    errorMessage: null,

    startRun: (runId) => set((s) => {
      s.runId = runId
      s.status = 'running'
      s.turns = []
      s.reportMd = ''
      s.errorMessage = null
    }),

    appendDelta: (agent, agentName, phaseLabel, text) => set((s) => {
      const last = s.turns[s.turns.length - 1]
      if (last && last.agent === agent && last.event === 'agent_delta') {
        last.text += text
      } else {
        s.turns.push({
          id: `${agent}-${Date.now()}`,
          event: 'agent_delta',
          agent,
          agentName,
          phaseLabel,
          text,
          isWarRoom: false,
        })
      }
    }),

    addWarRoomTurn: (speaker, agentName, text, isDelta, act) => set((s) => {
      const last = s.turns[s.turns.length - 1]
      if (isDelta && last && last.agent === speaker && last.isWarRoom) {
        last.text += text
      } else {
        s.turns.push({
          id: `wr-${speaker}-${Date.now()}`,
          event: 'war_room_turn',
          agent: speaker,
          agentName,
          phaseLabel: `War Room — Ato ${act}`,
          text,
          act,
          isDelta,
          isWarRoom: true,
        })
      }
    }),

    appendReportDelta: (text) => set((s) => { s.reportMd += text }),
    finishRun: (reportMd) => set((s) => { s.status = 'done'; s.reportMd = reportMd }),
    setError: (msg) => set((s) => { s.status = 'error'; s.errorMessage = msg }),
    reset: () => set((s) => { s.status = 'idle'; s.turns = []; s.reportMd = ''; s.runId = null; s.errorMessage = null }),
    setFromExisting: (reportMd, runId) => set((s) => { s.reportMd = reportMd; s.runId = runId; s.status = 'done' }),
  }))
)
