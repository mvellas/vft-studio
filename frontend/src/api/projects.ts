import { apiClient } from './client'
import type { Project, ProjectCreate } from '../types'

export const projectsApi = {
  list: () => apiClient.get<Project[]>('/api/projects').then(r => r.data),
  get: (id: string) => apiClient.get<Project>(`/api/projects/${id}`).then(r => r.data),
  create: (data: ProjectCreate) => apiClient.post<Project>('/api/projects', data).then(r => r.data),
  update: (id: string, data: Partial<Project>) => apiClient.patch<Project>(`/api/projects/${id}`, data).then(r => r.data),
  archive: (id: string) => apiClient.delete(`/api/projects/${id}`),
  duplicate: (id: string) => apiClient.post<Project>(`/api/projects/${id}/duplicate`).then(r => r.data),
}
