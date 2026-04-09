import { apiClient } from './client'

export interface Objective {
  id: string
  project_id: string
  statement: string
  source_stakeholder_id: string | null
  raw_value: string
  type: string
  witi_question: string
  witi_answer: string
  witi_classification: string
  witi_implies_objective_id: string | null
  is_fundamental_candidate: number
  coc_q1_answer: string
  coc_q1_result: string
  coc_q2_answer: string
  coc_q2_result: string
  coc_refinement_needed: number
  refined_statement: string | null
  parent_id: string | null
  hierarchy_level: number
  order_index: number
  created_at: string
  updated_at: string
  deleted: number
  deleted_at: string | null
}

export interface CausalLink {
  id: string
  from_obj: string
  to_obj: string
  project_id: string
  label: string
  created_at: string
}

export interface ObjectiveNetwork {
  nodes: Objective[]
  edges: CausalLink[]
}

export interface ObjectiveCreate {
  statement: string
  source_stakeholder_id?: string
  raw_value?: string
  type?: string
  order_index?: number
}

export interface CausalLinkCreate {
  from_obj: string
  to_obj: string
  label?: string
}

export const objectivesApi = {
  list: (projectId: string): Promise<Objective[]> =>
    apiClient.get<Objective[]>(`/api/projects/${projectId}/objectives`).then(r => r.data),

  getNetwork: (projectId: string): Promise<ObjectiveNetwork> =>
    apiClient.get<ObjectiveNetwork>(`/api/projects/${projectId}/objectives/network`).then(r => r.data),

  create: (projectId: string, data: ObjectiveCreate): Promise<Objective> =>
    apiClient.post<Objective>(`/api/projects/${projectId}/objectives`, data).then(r => r.data),

  update: (projectId: string, objectiveId: string, data: Partial<Objective>): Promise<Objective> =>
    apiClient.put<Objective>(`/api/projects/${projectId}/objectives/${objectiveId}`, data).then(r => r.data),

  remove: (projectId: string, objectiveId: string): Promise<void> =>
    apiClient.delete(`/api/projects/${projectId}/objectives/${objectiveId}`).then(() => undefined),

  createCausalLink: (projectId: string, objectiveId: string, data: CausalLinkCreate): Promise<CausalLink> =>
    apiClient
      .post<CausalLink>(`/api/projects/${projectId}/objectives/${objectiveId}/causal-link`, data)
      .then(r => r.data),

  removeCausalLink: (projectId: string, linkId: string): Promise<void> =>
    apiClient
      .delete(`/api/projects/${projectId}/objectives/causal-link/${linkId}`)
      .then(() => undefined),

  witiClassify: (projectId: string, data: { objective_id: string; why_answer: string }): Promise<Objective> =>
    apiClient.post<Objective>(`/api/projects/${projectId}/axiom/witi-classify`, data).then(r => r.data),

  cocEvaluate: (
    projectId: string,
    data: { objective_id: string; q1_answer: string; q2_answer: string }
  ): Promise<Objective> =>
    apiClient.post<Objective>(`/api/projects/${projectId}/axiom/coc-evaluate`, data).then(r => r.data),

  extractValues: (projectId: string, text: string): Promise<{ values: string }> =>
    apiClient
      .post<{ values: string }>(`/api/projects/${projectId}/axiom/extract-values`, { text })
      .then(r => r.data),

  suggestAttributes: (projectId: string, objectiveId: string): Promise<{ suggestion: string }> =>
    apiClient
      .post<{ suggestion: string }>(`/api/projects/${projectId}/axiom/suggest-attributes`, {
        objective_id: objectiveId,
      })
      .then(r => r.data),

  suggestCategory: (
    projectId: string,
    objectiveId: string
  ): Promise<{ suggested_type: string; reasoning: string }> =>
    apiClient
      .post<{ suggested_type: string; reasoning: string }>(
        `/api/projects/${projectId}/axiom/suggest-category`,
        { objective_id: objectiveId }
      )
      .then(r => r.data),
}
