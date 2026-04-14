import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, MessageSquare, RotateCcw } from 'lucide-react'
import type { AgentTurn } from '../../stores/pipelineStore'

const AGENT_LABELS: Record<string, string> = {
  FRAME:   'Fase 1 — Stakeholders',
  AXIOM:   'Fase 2 — Valores e Objetivos',
  NOVA:    'Fase 3 — Alternativas',
  ANALYST: 'Evidências Documentais',
}

const AGENT_COLORS: Record<string, { badge: string; border: string; bg: string }> = {
  ARIA:    { badge: 'bg-indigo-100 text-indigo-700', border: 'border-l-indigo-400', bg: 'bg-indigo-50' },
  FRAME:   { badge: 'bg-blue-100 text-blue-700',    border: 'border-l-blue-400',   bg: 'bg-blue-50' },
  AXIOM:   { badge: 'bg-amber-100 text-amber-700',  border: 'border-l-amber-400',  bg: 'bg-amber-50' },
  NOVA:    { badge: 'bg-emerald-100 text-emerald-700', border: 'border-l-emerald-400', bg: 'bg-emerald-50' },
  ANALYST: { badge: 'bg-purple-100 text-purple-700', border: 'border-l-purple-400', bg: 'bg-purple-50' },
}

interface Props {
  reportMd: string
  projectName: string
  runId: string | null
  phaseTurns: AgentTurn[]
  warRoomTurns: AgentTurn[]
  onDiscussInChat: () => void
  onRedo: () => void
}

export function ReportView({
  reportMd,
  projectName,
  runId,
  phaseTurns,
  warRoomTurns,
  onDiscussInChat,
  onRedo,
}: Props) {
  // Group phase turns by agent (in order)
  const phaseByAgent = (() => {
    const map: Record<string, string> = {}
    for (const t of phaseTurns) {
      map[t.agentName] = (map[t.agentName] ?? '') + t.text
    }
    return map
  })()

  const hasPhases = Object.keys(phaseByAgent).length > 0
  const hasWarRoom = warRoomTurns.length > 0
  // Fall back to reportMd if no turns in store (loaded from history)
  const reportOnly = !hasPhases && !hasWarRoom

  // Build plain-text full document for MD export
  const buildFullMd = (): string => {
    const parts: string[] = [`# Análise VFT Completa — ${projectName}\n`]

    for (const agent of ['FRAME', 'AXIOM', 'NOVA', 'ANALYST']) {
      const text = phaseByAgent[agent]
      if (text?.trim()) {
        parts.push(`## ${AGENT_LABELS[agent]} (${agent})\n\n${text}`)
      }
    }

    if (hasWarRoom) {
      const transcript = warRoomTurns
        .map((t) => `**${t.agentName}:** ${t.text}`)
        .join('\n\n')
      parts.push(`## War Room — Transcrição do Debate\n\n${transcript}`)
    }

    if (reportMd.trim()) {
      parts.push(`---\n\n${reportMd}`)
    }

    return parts.join('\n\n---\n\n')
  }

  const handleExportMarkdown = () => {
    // Prefer backend endpoint (stores the full assembled document)
    if (runId) {
      const link = document.createElement('a')
      link.href = `/api/pipeline/export/${runId}`
      link.click()
      return
    }
    // Fallback: build client-side
    const content = buildFullMd()
    const blob = new Blob([content], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vft-analise-${projectName.replace(/\s+/g, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    // Use the already-rendered HTML from the full document div
    const el = document.getElementById('full-document-content')
    const html = el?.innerHTML ?? ''

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Análise VFT — ${projectName}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.7; }
    h1 { font-size: 1.6rem; border-bottom: 2px solid #333; padding-bottom: 8px; margin-top: 2.5rem; }
    h2 { font-size: 1.2rem; margin-top: 2rem; color: #222; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 1rem; color: #444; margin-top: 1.5rem; }
    p { margin: 0.75rem 0; }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    strong { font-weight: 600; }
    em { font-style: italic; }
    hr { border: none; border-top: 2px solid #ddd; margin: 2rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.9em; }
    th, td { border: 1px solid #ddd; padding: 7px 11px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    blockquote { border-left: 4px solid #ddd; margin: 0.5rem 0; padding: 4px 16px; color: #555; background: #fafafa; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.85em; font-family: monospace; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.85em; }
    .section-badge { display: inline-block; font-size: 0.75rem; font-weight: 600; padding: 2px 8px; border-radius: 99px; margin-right: 8px; }
    @media print { body { margin: 20px; } h1, h2 { page-break-after: avoid; } }
  </style>
</head>
<body>
<h1>Análise VFT Completa — ${projectName}</h1>
${html}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 600)
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleExportPdf}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
        >
          <FileText size={13} />
          Exportar PDF
        </button>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
        >
          <Download size={13} />
          Exportar Markdown
        </button>
        <button
          onClick={onDiscussInChat}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <MessageSquare size={13} />
          Discutir no Chat
        </button>
        <button
          onClick={onRedo}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors ml-auto"
        >
          <RotateCcw size={13} />
          Refazer análise
        </button>
      </div>

      {/* Full document — display and print source */}
      <div
        id="full-document-content"
        className="space-y-0 select-text cursor-text"
      >
        {/* Phase analyses */}
        {!reportOnly && ['FRAME', 'AXIOM', 'NOVA', 'ANALYST'].map((agent) => {
          const text = phaseByAgent[agent]
          if (!text?.trim()) return null
          const colors = AGENT_COLORS[agent] ?? AGENT_COLORS['FRAME']
          return (
            <div key={agent} className={`border-l-4 ${colors.border} ${colors.bg} rounded-r-xl px-5 py-4 mb-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>
                  {agent}
                </span>
                <span className="text-xs text-gray-500 font-medium">{AGENT_LABELS[agent]}</span>
              </div>
              <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-headings:my-2 prose-li:my-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
              </div>
            </div>
          )
        })}

        {/* War Room transcript */}
        {hasWarRoom && (
          <div className="border border-gray-300 rounded-xl overflow-hidden mb-4">
            <div className="bg-gray-100 px-5 py-3 border-b border-gray-300">
              <h3 className="text-sm font-semibold text-gray-700">⚔ War Room — Transcrição do Debate</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {warRoomTurns.map((turn) => {
                const colors = AGENT_COLORS[turn.agentName] ?? AGENT_COLORS['FRAME']
                return (
                  <div key={turn.id} className={`px-5 py-3 ${colors.bg}`}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colors.badge} mr-2`}>
                      {turn.agentName}
                    </span>
                    <span className="text-xs text-gray-400">Ato {turn.act}</span>
                    <div className="prose prose-sm max-w-none text-gray-700 prose-p:my-1 mt-1">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.text}</ReactMarkdown>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Divider before final report */}
        {!reportOnly && reportMd.trim() && (
          <div className="flex items-center gap-3 py-2 mb-2">
            <div className="flex-1 h-px bg-gray-300" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Relatório Final VFT</span>
            <div className="flex-1 h-px bg-gray-300" />
          </div>
        )}

        {/* Final VFT report */}
        {reportMd.trim() && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
