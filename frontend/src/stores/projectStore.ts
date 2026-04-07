import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { Project } from '../types'

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  loading: boolean
  error: string | null
  setProjects: (projects: Project[]) => void
  setActiveProject: (id: string | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useProjectStore = create<ProjectState>()(
  immer((set) => ({
    projects: [],
    activeProjectId: null,
    loading: false,
    error: null,
    setProjects: (projects) => set((state) => { state.projects = projects }),
    setActiveProject: (id) => set((state) => { state.activeProjectId = id }),
    addProject: (project) => set((state) => { state.projects.push(project) }),
    updateProject: (id, updates) => set((state) => {
      const idx = state.projects.findIndex(p => p.id === id)
      if (idx !== -1) Object.assign(state.projects[idx], updates)
    }),
    removeProject: (id) => set((state) => {
      state.projects = state.projects.filter(p => p.id !== id)
    }),
    setLoading: (loading) => set((state) => { state.loading = loading }),
    setError: (error) => set((state) => { state.error = error }),
  }))
)
