export interface PipelineTurn {
  id: string
  event: string
  agent: string
  agentName: string
  phaseLabel: string
  text: string
  act?: number
  isDelta?: boolean
}

export interface PipelineRunInfo {
  id: string
  project_id: string
  status: string
  report_md: string
  created_at: string
  completed_at: string | null
}

export function streamPipeline(
  projectId: string,
  problemDescription: string | undefined,
  onEvent: (eventName: string, data: unknown) => void,
  onDone: () => void,
  onError: (msg: string) => void,
): () => void {
  const ctrl = new AbortController()

  fetch('/api/pipeline/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, problem_description: problemDescription }),
    signal: ctrl.signal,
  }).then(async (resp) => {
    if (!resp.ok) { onError(`HTTP ${resp.status}`); return }
    const reader = resp.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim()
        } else if (line.startsWith('data:')) {
          const raw = line.slice(5).trim()
          try {
            const parsed = JSON.parse(raw)
            onEvent(currentEvent, parsed)
            if (currentEvent === 'pipeline_done') onDone()
            if (currentEvent === 'error') onError(parsed.message ?? 'Unknown error')
          } catch {
            // skip malformed
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(String(err))
  })

  return () => ctrl.abort()
}

export async function getLatestRun(projectId: string): Promise<PipelineRunInfo | null> {
  try {
    const resp = await fetch(`/api/pipeline/${projectId}`)
    if (!resp.ok) return null
    return await resp.json()
  } catch {
    return null
  }
}
