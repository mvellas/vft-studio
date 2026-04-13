import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, MessageSquare, RotateCcw } from 'lucide-react'
import type { AgentTurn } from '../../stores/pipelineStore'

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
  // Build full markdown document for export (phases + war room + report)
  const buildFullDocument = (): string => {
    const parts: string[] = [`# Análise VFT Completa — ${projectName}\n`]

    // Group phase turns by agent
    const byAgent: Record<string, AgentTurn[]> = {}
    for (const t of phaseTurns) {
      if (!byAgent[t.agentName]) byAgent[t.agentName] = []
      byAgent[t.agentName].push(t)
    }
    const agentOrder = ['FRAME', 'AXIOM', 'NOVA', 'ANALYST']
    for (const agent of agentOrder) {
      if (byAgent[agent]?.length) {
        const text = byAgent[agent].map((t) => t.text).join('\n\n')
        if (text.trim()) {
          parts.push(`## ${agent} — ${byAgent[agent][0].phaseLabel}\n\n${text}`)
        }
      }
    }

    // War room transcript
    if (warRoomTurns.length > 0) {
      const transcript = warRoomTurns
        .map((t) => `**${t.agentName}:** ${t.text}`)
        .join('\n\n')
      parts.push(`## War Room — Transcrição do Debate\n\n${transcript}`)
    }

    // Final report
    if (reportMd.trim()) {
      parts.push(`---\n\n${reportMd}`)
    }

    return parts.join('\n\n---\n\n')
  }

  const handleExportMarkdown = () => {
    // If we have a run saved in DB, use backend (reliable download in PyWebView)
    if (runId) {
      const link = document.createElement('a')
      link.href = `/api/pipeline/export/${runId}`
      link.click()
      return
    }
    // Fallback: build client-side and download via blob
    const content = buildFullDocument()
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

    const fullDoc = buildFullDocument()

    // Simple markdown → HTML conversion for print
    const htmlBody = fullDoc
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n{2,}/g, '</p><p>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Análise VFT — ${projectName}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.7; }
    h1 { font-size: 1.6rem; border-bottom: 2px solid #333; padding-bottom: 8px; page-break-before: auto; }
    h2 { font-size: 1.2rem; margin-top: 2rem; color: #222; border-bottom: 1px solid #eee; padding-bottom: 4px; }
    h3 { font-size: 1rem; color: #444; }
    p { margin: 0.75rem 0; }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    strong { font-weight: 600; }
    hr { border: none; border-top: 2px solid #ddd; margin: 2rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #555; }
    @media print { body { margin: 20px; } h2 { page-break-before: auto; } }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  return (
    <div className="space-y-4">
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

      <div className="bg-white border border-gray-200 rounded-xl p-6 print:border-0 print:p-0 select-text cursor-text">
        <div
          id="report-content"
          className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900 select-text"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
