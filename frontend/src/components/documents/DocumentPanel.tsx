import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, FileText, Globe, Loader2, X, Upload } from 'lucide-react'
import { documentsApi } from '../../api/documents'
import { useProjectStore } from '../../stores/projectStore'
import type { Document, DocumentCreate } from '../../types'
import { DOC_TYPE_LABELS } from '../../types'

const DOC_TYPES = Object.entries(DOC_TYPE_LABELS)

interface UploadModalProps {
  projectId: string
  onSave: (doc: Document) => void
  onClose: () => void
}

function UploadModal({ projectId, onSave, onClose }: UploadModalProps) {
  const [mode, setMode] = useState<'text' | 'file'>('text')
  const [title, setTitle] = useState('')
  const [docType, setDocType] = useState('other')
  const [dateRef, setDateRef] = useState('')
  const [source, setSource] = useState('')
  const [contentText, setContentText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!title.trim()) { setError('Título obrigatório.'); return }
    setSaving(true)
    setError(null)
    try {
      if (mode === 'file' && file) {
        const fd = new FormData()
        fd.append('title', title)
        fd.append('doc_type', docType)
        if (dateRef) fd.append('date_reference', dateRef)
        if (source) fd.append('source', source)
        fd.append('file', file)
        const doc = await documentsApi.upload(projectId, fd)
        onSave(doc)
      } else {
        const data: DocumentCreate = { title, doc_type: docType, content_text: contentText, source }
        if (dateRef) data.date_reference = dateRef
        const doc = await documentsApi.create(projectId, data)
        onSave(doc)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Adicionar Documento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>

        <div className="flex gap-2">
          {(['text', 'file'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${
                mode === m ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {m === 'text' ? 'Colar texto' : 'Upload arquivo'}
            </button>
          ))}
        </div>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título (obrigatório)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <div className="flex gap-2">
          <select
            value={docType}
            onChange={e => setDocType(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            {DOC_TYPES.map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <input
            value={dateRef}
            onChange={e => setDateRef(e.target.value)}
            placeholder="Data (ex: 2012-06)"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <input
          value={source}
          onChange={e => setSource(e.target.value)}
          placeholder="Fonte / autoria (opcional)"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        {mode === 'text' ? (
          <textarea
            value={contentText}
            onChange={e => setContentText(e.target.value)}
            placeholder="Cole o texto do documento aqui..."
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
        ) : (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500 cursor-pointer hover:border-indigo-400 transition-colors"
            onClick={() => document.getElementById('doc-file-input')?.click()}
          >
            <Upload size={20} className="mx-auto mb-2 text-gray-400" />
            {file ? file.name : 'Clique ou arraste um arquivo (PDF, TXT, imagem)'}
            <input
              id="doc-file-input"
              type="file"
              accept=".pdf,.txt,.md,image/*"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin inline" /> : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

interface DocumentPanelProps {
  onAnalyze: () => void
}

export function DocumentPanel({ onAnalyze }: DocumentPanelProps) {
  const { activeProjectId } = useProjectStore()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const data = await documentsApi.list(activeProjectId)
      setDocs(data)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { load() }, [load])

  const handleDocSaved = (doc: Document) => {
    setDocs(prev => [doc, ...prev])
    setShowModal(false)
  }

  const handleDelete = async (docId: string) => {
    if (!activeProjectId || !confirm('Excluir este documento?')) return
    setDeletingId(docId)
    try {
      await documentsApi.delete(activeProjectId, docId)
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {
      // silent
    } finally {
      setDeletingId(null)
    }
  }

  if (!activeProjectId) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 text-gray-400 text-sm">
        Selecione um projeto para ver seus documentos.
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500 mt-1">Documentos de referência para análise do ANALYST.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          Adicionar
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      )}

      {!loading && docs.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
          <FileText size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Nenhum documento adicionado.</p>
          <p className="text-gray-400 text-xs mt-1">Adicione PDFs, textos ou imagens para o ANALYST analisar.</p>
        </div>
      )}

      {docs.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
              <FileText size={16} className="text-indigo-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                <p className="text-xs text-gray-400">
                  {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}
                  {doc.date_reference && ` · ${doc.date_reference}`}
                  {doc.source && ` · ${doc.source}`}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
                title="Excluir"
              >
                {deletingId === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <button
          onClick={onAnalyze}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          <Globe size={16} />
          Analisar com ANALYST
        </button>
      )}

      {showModal && activeProjectId && (
        <UploadModal
          projectId={activeProjectId}
          onSave={handleDocSaved}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
