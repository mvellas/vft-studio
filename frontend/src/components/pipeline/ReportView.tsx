import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Download, FileText, MessageSquare, RotateCcw } from 'lucide-react'

interface Props {
  reportMd: string
  projectName: string
  onDiscussInChat: () => void
  onRedo: () => void
}

export function ReportView({ reportMd, projectName, onDiscussInChat, onRedo }: Props) {
  const handleExportMarkdown = () => {
    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vft-analise-${projectName.replace(/\s+/g, '-').toLowerCase()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportPdf = () => {
    window.print()
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

      <div className="bg-white border border-gray-200 rounded-xl p-6 print:border-0 print:p-0">
        <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
