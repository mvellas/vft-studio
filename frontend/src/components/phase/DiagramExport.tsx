import { useState } from 'react'
import html2canvas from 'html2canvas'
import { FileText, Image, Loader2 } from 'lucide-react'
import { apiClient } from '../../api/client'

interface DiagramExportProps {
  projectId: string
  projectName: string
}

const DIAGRAM_ELEMENTS = [
  { id: 'causal-relations-map', label: 'Mapa de Relações Causais' },
  { id: 'means-ends-network', label: 'Rede Meios-Fins' },
  { id: 'objectives-hierarchy', label: 'Hierarquia de Objetivos' },
]

async function captureElement(elementId: string): Promise<string | null> {
  const el = document.getElementById(elementId)
  if (!el) return null
  try {
    const canvas = await html2canvas(el, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#0e0e13',
    })
    return canvas.toDataURL('image/png')
  } catch {
    return null
  }
}

export function DiagramExport({ projectId, projectName }: DiagramExportProps) {
  const [exportingMarkdown, setExportingMarkdown] = useState(false)
  const [capturingDiagrams, setCapturingDiagrams] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const handleExportMarkdown = async () => {
    setExportingMarkdown(true)
    setStatus(null)
    try {
      const response = await apiClient.get<string>(
        `/api/projects/${projectId}/export/markdown`,
        { responseType: 'text' }
      )
      const blob = new Blob([response.data], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectName.replace(/\s+/g, '_')}_relatorio.md`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('Relatório exportado com sucesso.')
    } catch {
      setStatus('Erro ao exportar relatório.')
    } finally {
      setExportingMarkdown(false)
    }
  }

  const handleExportDiagrams = async () => {
    setCapturingDiagrams(true)
    setStatus(null)
    const captured: { label: string; dataUrl: string }[] = []
    for (const diagram of DIAGRAM_ELEMENTS) {
      const dataUrl = await captureElement(diagram.id)
      if (dataUrl) {
        captured.push({ label: diagram.label, dataUrl })
      }
    }
    if (captured.length === 0) {
      setStatus('Nenhum diagrama encontrado na tela atual. Navegue até a aba de diagramas primeiro.')
      setCapturingDiagrams(false)
      return
    }
    // Download each diagram as PNG
    for (const { label, dataUrl } of captured) {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `${projectName.replace(/\s+/g, '_')}_${label.replace(/\s+/g, '_')}.png`
      a.click()
    }
    setStatus(`${captured.length} diagrama(s) exportado(s) com sucesso.`)
    setCapturingDiagrams(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleExportMarkdown}
        disabled={exportingMarkdown}
        title="Exportar relatório Markdown via SCRIBE"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}
      >
        {exportingMarkdown ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
        Relatório .md
      </button>
      <button
        onClick={handleExportDiagrams}
        disabled={capturingDiagrams}
        title="Exportar diagramas como PNG"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        style={{ color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)', background: 'transparent' }}
      >
        {capturingDiagrams ? <Loader2 size={13} className="animate-spin" /> : <Image size={13} />}
        Diagramas .png
      </button>
      {status && (
        <span className="text-xs ml-1" style={{ color: '#64748b' }}>{status}</span>
      )}
    </div>
  )
}

/** Helper: download a string as a file */
export function downloadText(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
