import { apiClient } from './client'
import type { Document, DocumentCreate } from '../types'

export const documentsApi = {
  list(projectId: string, stakeholderId?: string): Promise<Document[]> {
    const params: Record<string, string> = { project_id: projectId }
    if (stakeholderId) params.stakeholder_id = stakeholderId
    return apiClient
      .get<Document[]>(`/api/projects/${projectId}/documents`, { params })
      .then(r => r.data)
  },

  create(projectId: string, data: DocumentCreate): Promise<Document> {
    return apiClient
      .post<Document>(`/api/projects/${projectId}/documents`, data)
      .then(r => r.data)
  },

  upload(projectId: string, formData: FormData): Promise<Document> {
    return apiClient
      .post<Document>(`/api/projects/${projectId}/documents/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data)
  },

  delete(projectId: string, docId: string): Promise<void> {
    return apiClient.delete(`/api/projects/${projectId}/documents/${docId}`).then(() => {})
  },
}
