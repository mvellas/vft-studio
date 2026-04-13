import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, MessageSquare, RotateCcw } from 'lucide-react'

interface Props {
  reportMd: string
  projectName: string
  runId: string | null
  onDiscussInChat: () => void
  onRedo: () => void
}

export function ReportView({ reportMd, projectName, runId, onDiscussInChat, onRedo }: Props) {
  const handleExportMarkdown = () => {
    if (!runId) return
    const link = document.createElement('a')
    link.href = `/api/pipeline/export/${runId}`
    link.click()
  }

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    const reportEl = document.getElementById('report-content')
    const html = reportEl?.innerHTML ?? reportMd

    printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Análise VFT — ${projectName}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 800px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.7; }
    h1 { font-size: 1.6rem; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 1.2rem; margin-top: 2rem; color: #222; }
    h3 { font-size: 1rem; color: #444; }
    p { margin: 0.75rem 0; }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.25rem 0; }
    strong { font-weight: 600; }
    code { background: #f5f5f5; padding: 2px 5px; border-radius: 3px; font-size: 0.85em; }
    pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f0f0f0; font-weight: 600; }
    blockquote { border-left: 4px solid #ddd; margin: 0; padding-left: 16px; color: #555; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
${html}
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
          disabled={!runId}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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

      <div className="bg-white border border-gray-200 rounded-xl p-6 print:border-0 print:p-0">
        <div id="report-content" className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
