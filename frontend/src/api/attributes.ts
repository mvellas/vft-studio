import { apiClient } from './client'

export interface Attribute {
  id: string
  objective_id: string
  project_id: string
  attr_type: string
  description: string
  scale_description: string
  prop_unambiguous: number
  prop_comprehensive: number
  prop_direct: number
  prop_operational: number
  prop_understandable: number
  created_at: string
  updated_at: string
}

export interface AttributeLevel {
  id: string
  attribute_id: string
  label: string
  description: string
  order_index: number
  created_at: string
}

export interface AttributeWithLevels {
  attribute: Attribute
  levels: AttributeLevel[]
}

export const attributesApi = {
  list: (projectId: string): Promise<AttributeWithLevels[]> =>
    apiClient
      .get<AttributeWithLevels[]>(`/api/projects/${projectId}/attributes`)
      .then(r => r.data),

  create: (
    projectId: string,
    data: { objective_id: string; attr_type: string; description: string; scale_description?: string }
  ): Promise<Attribute> =>
    apiClient
      .post<Attribute>(`/api/projects/${projectId}/attributes`, data)
      .then(r => r.data),

  update: (
    projectId: string,
    attributeId: string,
    data: Partial<Attribute>
  ): Promise<Attribute> =>
    apiClient
      .put<Attribute>(`/api/projects/${projectId}/attributes/${attributeId}`, data)
      .then(r => r.data),

  remove: (projectId: string, attributeId: string): Promise<void> =>
    apiClient
      .delete(`/api/projects/${projectId}/attributes/${attributeId}`)
      .then(() => undefined),

  createLevel: (
    projectId: string,
    attributeId: string,
    data: { label: string; description?: string; order_index: number }
  ): Promise<AttributeLevel> =>
    apiClient
      .post<AttributeLevel>(`/api/projects/${projectId}/attributes/${attributeId}/levels`, data)
      .then(r => r.data),

  updateLevel: (
    projectId: string,
    levelId: string,
    data: Partial<AttributeLevel>
  ): Promise<AttributeLevel> =>
    apiClient
      .put<AttributeLevel>(`/api/projects/${projectId}/attributes/levels/${levelId}`, data)
      .then(r => r.data),

  removeLevel: (projectId: string, levelId: string): Promise<void> =>
    apiClient
      .delete(`/api/projects/${projectId}/attributes/levels/${levelId}`)
      .then(() => undefined),

  reorderLevels: (
    projectId: string,
    attributeId: string,
    levelIds: string[]
  ): Promise<void> =>
    apiClient
      .put(
        `/api/projects/${projectId}/attributes/${attributeId}/levels/reorder`,
        { level_ids: levelIds }
      )
      .then(() => undefined),
}
