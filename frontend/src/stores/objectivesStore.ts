import { create } from 'zustand'
import { objectivesApi } from '../api/objectives'
import type { CausalLink, CausalLinkCreate, Objective, ObjectiveCreate } from '../api/objectives'

interface ObjectivesState {
  objectives: Objective[]
  causalLinks: CausalLink[]
  loading: boolean
  error: string | null
  fetchObjectives: (projectId: string) => Promise<void>
  fetchNetwork: (projectId: string) => Promise<void>
  addObjective: (projectId: string, data: ObjectiveCreate) => Promise<Objective>
  updateObjective: (projectId: string, id: string, data: Partial<Objective>) => Promise<Objective>
  removeObjective: (projectId: string, id: string) => Promise<void>
  addCausalLink: (projectId: string, objId: string, data: CausalLinkCreate) => Promise<CausalLink>
  removeCausalLink: (projectId: string, linkId: string) => Promise<void>
}

export const useObjectivesStore = create<ObjectivesState>((set) => ({
  objectives: [],
  causalLinks: [],
  loading: false,
  error: null,

  fetchObjectives: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const objectives = await objectivesApi.list(projectId)
      set({ objectives, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch objectives' })
    }
  },

  fetchNetwork: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const network = await objectivesApi.getNetwork(projectId)
      set({ objectives: network.nodes, causalLinks: network.edges, loading: false })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to fetch network' })
    }
  },

  addObjective: async (projectId, data) => {
    set({ loading: true, error: null })
    try {
      const created = await objectivesApi.create(projectId, data)
      set((state) => ({
        objectives: [...state.objectives, created],
        loading: false,
      }))
      return created
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to create objective' })
      throw err
    }
  },

  updateObjective: async (projectId, id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await objectivesApi.update(projectId, id, data)
      set((state) => ({
        objectives: state.objectives.map((o) => (o.id === id ? updated : o)),
        loading: false,
      }))
      return updated
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to update objective' })
      throw err
    }
  },

  removeObjective: async (projectId, id) => {
    set({ loading: true, error: null })
    try {
      await objectivesApi.remove(projectId, id)
      set((state) => ({
        objectives: state.objectives.filter((o) => o.id !== id),
        loading: false,
      }))
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to remove objective' })
      throw err
    }
  },

  addCausalLink: async (projectId, objId, data) => {
    set({ loading: true, error: null })
    try {
      const link = await objectivesApi.createCausalLink(projectId, objId, data)
      set((state) => ({
        causalLinks: [...state.causalLinks, link],
        loading: false,
      }))
      return link
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to create causal link' })
      throw err
    }
  },

  removeCausalLink: async (projectId, linkId) => {
    set({ loading: true, error: null })
    try {
      await objectivesApi.removeCausalLink(projectId, linkId)
      set((state) => ({
        causalLinks: state.causalLinks.filter((l) => l.id !== linkId),
        loading: false,
      }))
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'Failed to remove causal link' })
      throw err
    }
  },
}))
