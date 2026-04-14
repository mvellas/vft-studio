import { apiClient } from './client'

export interface Alternative {
  id: string
  project_id: string
  name: string
  description: string
  source: string
  source_stakeholder_id: string | null
  is_status_quo: number
  order_index: number
  created_at: string
  updated_at: string
  deleted: number
}

export interface Consequence {
  id: string
  alternative_id: string
  objective_id: string
  project_id: string
  value_text: string
  attribute_level_id: string | null
  created_at: string
  updated_at: string
}

export interface AlternativeWithConsequences {
  alternative: Alternative
  consequences: Consequence[]
}

export interface ConsequenceSuggestion {
  objective_id: string
  value_text: string
}

export const alternativesApi = {
  list: (projectId: string): Promise<AlternativeWithConsequences[]> =>
    apiClient.get<AlternativeWithConsequences[]>(`/api/projects/${projectId}/alternatives`).then(r => r.data),

  create: (
    projectId: string,
    data: { name: string; description?: string; source?: string; is_status_quo?: number; order_index?: number }
  ): Promise<Alternative> =>
    apiClient.post<Alternative>(`/api/projects/${projectId}/alternatives`, data).then(r => r.data),

  update: (
    projectId: string,
    alternativeId: string,
    data: Partial<Pick<Alternative, 'name' | 'description' | 'source' | 'is_status_quo' | 'order_index'>>
  ): Promise<Alternative> =>
    apiClient.put<Alternative>(`/api/projects/${projectId}/alternatives/${alternativeId}`, data).then(r => r.data),

  remove: (projectId: string, alternativeId: string): Promise<void> =>
    apiClient.delete(`/api/projects/${projectId}/alternatives/${alternativeId}`).then(() => undefined),

  upsertConsequence: (
    projectId: string,
    alternativeId: string,
    objectiveId: string,
    data: { value_text: string; attribute_level_id?: string | null }
  ): Promise<Consequence> =>
    apiClient
      .put<Consequence>(
        `/api/projects/${projectId}/alternatives/${alternativeId}/consequences/${objectiveId}`,
        data
      )
      .then(r => r.data),

  suggestNames: (
    projectId: string
  ): Promise<{ suggestions: { name: string; description: string }[] }> =>
    apiClient
      .post<{ suggestions: { name: string; description: string }[] }>(
        `/api/projects/${projectId}/alternatives/suggest-names`,
        {}
      )
      .then(r => r.data),

  suggestConsequences: (
    projectId: string,
    alternativeId: string
  ): Promise<{ suggestions: ConsequenceSuggestion[] }> =>
    apiClient
      .post<{ suggestions: ConsequenceSuggestion[] }>(
        `/api/projects/${projectId}/alternatives/${alternativeId}/suggest-consequences`,
        {}
      )
      .then(r => r.data),
}
