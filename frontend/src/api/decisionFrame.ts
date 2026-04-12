import { apiClient } from './client'
import { streamChatMessage } from './chat'

export interface IDFData {
  idf_purpose: string
  idf_perspective: string
  idf_scope: string
  idf_documented_at: string | null
  decision_statement: string
  decision_statement_validated: number
  qualitative_modeling_tech: string
  org_documents_text: string
}

export interface IDFUpdate {
  idf_purpose?: string
  idf_perspective?: string
  idf_scope?: string
  decision_statement?: string
  decision_statement_validated?: number
  qualitative_modeling_tech?: string
  org_documents_text?: string
}

export const decisionFrameApi = {
  get: (projectId: string): Promise<IDFData> =>
    apiClient.get<IDFData>(`/api/projects/${projectId}/decision-frame`).then(r => r.data),

  save: (projectId: string, data: IDFUpdate): Promise<unknown> =>
    apiClient.put(`/api/projects/${projectId}/decision-frame`, data).then(r => r.data),

  generateDS: (projectId: string, hint: string = ''): Promise<{ decision_statement: string }> =>
    apiClient
      .post<{ decision_statement: string }>(`/api/projects/${projectId}/frame/generate-ds`, { hint })
      .then(r => r.data),

  saveDS: (projectId: string, decision_statement: string, validated: boolean): Promise<unknown> =>
    apiClient
      .put(`/api/projects/${projectId}/decision-frame`, {
        decision_statement,
        decision_statement_validated: validated ? 1 : 0,
      } as IDFUpdate)
      .then(r => r.data),

  document: (projectId: string): Promise<{ ok: boolean; idf_documented_at: string }> =>
    apiClient
      .post<{ ok: boolean; idf_documented_at: string }>(
        `/api/projects/${projectId}/decision-frame/document`,
      )
      .then(r => r.data),

  /**
   * Generate an IDF field suggestion via the FRAME agent (phase1_specialist).
   * Uses the SSE chat endpoint and accumulates the full streamed response into a string.
   */
  generateSuggestion: (
    projectId: string,
    field: 'purpose' | 'perspective' | 'scope',
    currentValue: string = '',
  ): Promise<string> =>
    new Promise<string>((resolve, reject) => {
      const message = `Sugira um texto para o campo "${field}" do IDF (Initial Decision Frame). Valor atual: "${currentValue}". Responda APENAS com o texto sugerido, sem explicacoes adicionais.`
      let accumulated = ''

      streamChatMessage(
        message,
        projectId,
        'phase1_specialist',
        (delta: string) => {
          accumulated += delta
        },
        () => {},
        () => {},
        () => {
          resolve(accumulated.trim())
        },
        (error: string) => {
          reject(new Error(error))
        },
      )
    }),
}
