import { apiClient } from './client'
import type { CurrentStep } from '../types'

export const phasesApi = {
  getCurrent: (projectId: string) =>
    apiClient.get<CurrentStep>(`/api/projects/${projectId}/phase/current`).then(r => r.data),
  completeStep: (projectId: string, data: { data?: Record<string, unknown>; notes?: string }) =>
    apiClient.post(`/api/projects/${projectId}/phase/step/complete`, data).then(r => r.data),
}
