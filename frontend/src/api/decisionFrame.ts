import { apiClient } from './client'
import { streamChatMessage } from './chat'

export interface IDFData {
  idf_purpose: string
  idf_perspective: string
  idf_scope: string
  idf_documented_at: string | null
}

export interface IDFUpdate {
  idf_purpose?: string
  idf_perspective?: string
  idf_scope?: string
}

export const decisionFrameApi = {
  get: (projectId: string): Promise<IDFData> =>
    apiClient.get<IDFData>(`/api/projects/${projectId}/decision-frame`).then(r => r.data),

  save: (projectId: string, data: IDFUpdate): Promise<unknown> =>
    apiClient.put(`/api/projects/${projectId}/decision-frame`, data).then(r => r.data),

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
        () => {
          resolve(accumulated.trim())
        },
        (error: string) => {
          reject(new Error(error))
        },
      )
    }),
}
