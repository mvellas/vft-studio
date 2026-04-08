import { apiClient } from './client'
import type { Stakeholder } from '../types'

export interface StakeholderCreate {
  name: string
  role: string
  is_decision_maker?: number
  profile?: string
  interests?: string
  elicitation_mode?: string
}

export const stakeholdersApi = {
  list: (projectId: string): Promise<Stakeholder[]> =>
    apiClient.get<Stakeholder[]>(`/api/projects/${projectId}/stakeholders`).then(r => r.data),

  create: (projectId: string, data: StakeholderCreate): Promise<Stakeholder> =>
    apiClient.post<Stakeholder>(`/api/projects/${projectId}/stakeholders`, data).then(r => r.data),

  update: (projectId: string, id: string, data: Partial<StakeholderCreate>): Promise<Stakeholder> =>
    apiClient.patch<Stakeholder>(`/api/projects/${projectId}/stakeholders/${id}`, data).then(r => r.data),

  remove: (projectId: string, id: string): Promise<void> =>
    apiClient.delete(`/api/projects/${projectId}/stakeholders/${id}`).then(() => undefined),
}
