import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useState } from 'react'
import { toPng } from 'html-to-image'
import { Download, FileImage, FileText, Globe, MessageSquare, RotateCcw } from 'lucide-react'
import { objectivesApi } from '../../api/objectives'
import { getLatestSocialSimulation } from '../../api/pipeline'
import type { AgentTurn } from '../../stores/pipelineStore'
import {
  buildHtmlPreviewShell,
  buildMarkdownPreviewHtml,
  buildPngPreviewHtml,
  isDesktopBridgeAvailable,
  openPreviewWindow,
} from '../../lib/desktopExport'
import { ArtifactExportSurface } from './ArtifactExportSurface'
import { InteractiveArtifacts } from './InteractiveArtifacts'
import { buildInteractiveReportHtml, buildPrintableReportHtml } from './reportExport'
import { SocialExecutiveSummary } from './SocialExecutiveSummary'

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
  projectId: string
  reportMd: string
  projectName: string
  runId: string | null
  phaseTurns: AgentTurn[]
  warRoomTurns: AgentTurn[]
  onDiscussInChat: (message: string) => void
  onRedo: () => void
}

export function ReportView({
  projectId,
  reportMd,
  projectName,
  runId,
  phaseTurns,
  warRoomTurns,
  onDiscussInChat,
  onRedo,
}: Props) {
  const [exporting, setExporting] = useState<'pdf' | 'md' | 'html' | 'png' | null>(null)
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
    const openNativePreview = (content: string) => {
      const fileName = `vft-analise-${projectName.replace(/\s+/g, '-').toLowerCase()}.md`
      const title = `Relatório Markdown — ${projectName}`
      const previewHtml = buildMarkdownPreviewHtml(title, fileName, content)
      return openPreviewWindow(title, previewHtml, 1160, 860)
    }

    // Prefer backend endpoint (stores the full assembled document)
    if (runId && !isDesktopBridgeAvailable()) {
      const link = document.createElement('a')
      link.href = `/api/pipeline/export/${runId}`
      link.click()
      return
    }

    setExporting('md')
    const finalize = () => setExporting(null)

    if (runId) {
      fetch(`/api/pipeline/export/${runId}`)
        .then(async (response) => {
          if (!response.ok) throw new Error('Falha ao carregar Markdown do relatório.')
          const content = await response.text()
          const opened = await openNativePreview(content)
          if (!opened) {
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
        })
        .finally(finalize)
      return
    }

    const content = buildFullMd()
    void openNativePreview(content)
      .then((opened) => {
        if (opened) return
        const blob = new Blob([content], { type: 'application/octet-stream' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `vft-analise-${projectName.replace(/\s+/g, '-').toLowerCase()}.md`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      })
      .finally(finalize)
  }

  const handleExportPdf = async () => {
    setExporting('pdf')

    const fullDocumentHtml = document.getElementById('full-document-content')?.innerHTML ?? ''
    const reportHtml = document.getElementById('final-report-markdown')?.innerHTML ?? ''
    const [socialSimulation, objectives, objectiveNetwork] = await Promise.all([
      getLatestSocialSimulation(projectId),
      objectivesApi.list(projectId).catch(() => []),
      objectivesApi.getNetwork(projectId).catch(() => null),
    ])

    const printableHtml = buildPrintableReportHtml({
      projectName,
      reportHtml,
      fullDocumentHtml,
      socialSimulation,
      objectives,
      objectiveNetwork,
    })

    const fileName = `vft-relatorio-${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`
    const title = `PDF Editorial — ${projectName}`
    const previewHtml = buildHtmlPreviewShell(
      title,
      'Pré-visualização pronta para impressão e salvamento em PDF.',
      fileName,
      'pdf',
      printableHtml,
    )

    const opened = await openPreviewWindow(title, previewHtml, 1320, 920)
    if (!opened) {
      const printWindow = window.open('', '_blank', 'width=1100,height=820')
      if (!printWindow) {
        setExporting(null)
        return
      }
      printWindow.document.write(printableHtml)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 600)
    }
    setExporting(null)
  }

  const handleExportInteractiveHtml = async () => {
    setExporting('html')
    const fullDocumentHtml = document.getElementById('full-document-content')?.innerHTML ?? ''
    const reportHtml = document.getElementById('final-report-markdown')?.innerHTML ?? ''

    const [socialSimulation, objectives, objectiveNetwork] = await Promise.all([
      getLatestSocialSimulation(projectId),
      objectivesApi.list(projectId).catch(() => []),
      objectivesApi.getNetwork(projectId).catch(() => null),
    ])

    const content = buildInteractiveReportHtml({
      projectName,
      reportHtml,
      fullDocumentHtml,
      socialSimulation,
      objectives,
      objectiveNetwork,
    })

    const fileName = `vft-apresentacao-${projectName.replace(/\s+/g, '-').toLowerCase()}.html`
    const title = `Slides Interativos — ${projectName}`
    const previewHtml = buildHtmlPreviewShell(
      title,
      'Apresentação em formato de slides interativos, pronta para revisão e salvamento.',
      fileName,
      'html',
      content,
    )

    const opened = await openPreviewWindow(title, previewHtml, 1400, 940)
    if (!opened) {
      const blob = new Blob([content], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
    setExporting(null)
  }

  const handleExportAllDiagrams = async () => {
    setExporting('png')
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

    await wait(1200)

    const targets: Array<{ id: string; name: string }> = [
      { id: 'export-objectives-cloud', name: 'nuvem-de-objetivos.png' },
      { id: 'export-objectives-hierarchy', name: 'hierarquia-de-objetivos.png' },
      { id: 'export-means-ends-network', name: 'rede-meios-fins.png' },
      { id: 'export-causal-relations-map', name: 'mapa-causal.png' },
      { id: 'export-social-simulation', name: 'simulacao-social.png' },
    ]

    const captures: Array<{ name: string; dataUrl: string }> = []
    for (const target of targets) {
      const node = document.getElementById(target.id)
      if (!node) continue
      try {
        const dataUrl = await toPng(node, {
          pixelRatio: 2,
          backgroundColor: '#020617',
          cacheBust: true,
        })
        captures.push({ name: target.name, dataUrl })
      } catch {
        // Skip failed diagrams and keep the rest exportable.
      }
    }

    if (captures.length === 0) {
      setExporting(null)
      return
    }

    const title = `Diagramas PNG — ${projectName}`
    const previewHtml = buildPngPreviewHtml(
      title,
      'Pré-visualização de todos os diagramas exportáveis do relatório.',
      captures,
    )
    const opened = await openPreviewWindow(title, previewHtml, 1380, 920)
    if (!opened) {
      for (const capture of captures) {
        const a = document.createElement('a')
        a.href = capture.dataUrl
        a.download = capture.name
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    }
    setExporting(null)
  }

  const handleDiscussInChat = () => {
    const summary = [
      `ARIA, quero revisar a análise VFT completa do projeto "${projectName}".`,
      'Considere o relatório final atual como a base da conversa e me ajude a propor mudanças metodológicas e de conteúdo.',
      'Se alguma mudança afetar stakeholders, objetivos, relações causais, alternativas, consequências, relatório final ou a simulação social, trate isso explicitamente.',
      'Comece resumindo o estado atual da análise e depois me pergunte qual alteração eu quero fazer primeiro.',
      '',
      'Relatório final atual:',
      reportMd.trim(),
    ].join('\n')

    onDiscussInChat(summary)
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div
        className="flex items-center gap-2 flex-wrap sticky top-4 z-20 rounded-2xl px-4 py-3 backdrop-blur-md"
        style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 12px 34px rgba(15,23,42,0.08)' }}
      >
        <button
          onClick={() => { void handleExportPdf() }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(99,102,241,0.18)', color: '#4338ca', background: 'rgba(99,102,241,0.08)' }}
        >
          <FileText size={13} />
          {exporting === 'pdf' ? 'Abrindo PDF...' : 'Exportar PDF'}
        </button>
        <button
          onClick={handleExportMarkdown}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(14,165,233,0.18)', color: '#0369a1', background: 'rgba(14,165,233,0.08)' }}
        >
          <Download size={13} />
          {exporting === 'md' ? 'Abrindo Markdown...' : 'Exportar Markdown'}
        </button>
        <button
          onClick={() => { void handleExportInteractiveHtml() }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(6,182,212,0.18)', color: '#0f766e', background: 'rgba(20,184,166,0.08)' }}
        >
          <Globe size={13} />
          {exporting === 'html' ? 'Abrindo Slides...' : 'Exportar HTML Interativo'}
        </button>
        <button
          onClick={() => { void handleExportAllDiagrams() }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
          style={{ borderColor: 'rgba(245,158,11,0.2)', color: '#b45309', background: 'rgba(245,158,11,0.1)' }}
        >
          <FileImage size={13} />
          {exporting === 'png' ? 'Montando PNGs...' : 'Exportar Diagramas PNG'}
        </button>
        <button
          onClick={handleDiscussInChat}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <MessageSquare size={13} />
          Solicitar mudanças à ARIA
        </button>
        <button
          onClick={onRedo}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600 transition-colors ml-auto"
        >
          <RotateCcw size={13} />
          Refazer análise
        </button>
      </div>

      <ArtifactExportSurface projectId={projectId} />

      {/* Full document — display and print source */}
      <div
        id="full-document-content"
        className="space-y-0 select-text cursor-text"
      >
        <div className="mb-5">
          <SocialExecutiveSummary projectId={projectId} />
        </div>

        <div className="mb-5">
          <InteractiveArtifacts projectId={projectId} />
        </div>

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
            <div
              id="final-report-markdown"
              className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-li:text-gray-700 prose-strong:text-gray-900"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{reportMd}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
