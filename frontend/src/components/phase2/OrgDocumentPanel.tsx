import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { decisionFrameApi } from '../../api/decisionFrame'
import { objectivesApi } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'

interface OrgDocumentPanelProps {
  projectId: string
}

export function OrgDocumentPanel({ projectId }: OrgDocumentPanelProps) {
  const [text, setText] = useState('')
  const [extractedValues, setExtractedValues] = useState<string[]>([])
  const [extracting, setExtracting] = useState(false)
  const [addingAll, setAddingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedIndicator, setSavedIndicator] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addObjective = useObjectivesStore(s => s.addObjective)

  useEffect(() => {
    decisionFrameApi
      .get(projectId)
      .then(data => {
        if (data.org_documents_text) {
          setText(data.org_documents_text)
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Erro ao carregar documento')
      })
  }, [projectId])

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setText(value)
    setError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      decisionFrameApi
        .save(projectId, { org_documents_text: value })
        .then(() => {
          setSavedIndicator(true)
          setTimeout(() => setSavedIndicator(false), 1500)
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Erro ao salvar documento')
        })
    }, 2000)
  }

  const handleExtract = async () => {
    if (!text.trim() || extracting) return
    setExtracting(true)
    setError(null)
    setExtractedValues([])

    try {
      const result = await objectivesApi.extractValues(projectId, text)
      const lines = result.values
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0)
      setExtractedValues(lines)
    } catch {
      setError('Nao foi possivel conectar ao AXIOM. Verifique sua chave de API e tente novamente.')
    } finally {
      setExtracting(false)
    }
  }

  const handleAddAll = async () => {
    if (extractedValues.length === 0 || addingAll) return
    setAddingAll(true)
    setError(null)

    try {
      for (const value of extractedValues) {
        await addObjective(projectId, { statement: value, raw_value: value })
      }
      setExtractedValues([])
    } catch {
      setError('Erro ao salvar. Os dados nao foram persistidos — tente novamente.')
    } finally {
      setAddingAll(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900">
          Analise de Documentos Organizacionais
        </h3>
        <span className="text-xs text-gray-400">
          {savedIndicator && 'Salvo'}
        </span>
      </div>

      <p className="text-xs text-gray-500">
        Cole o texto de documentos organizacionais (planejamento estrategico, politicas, relatorios)
        para que o AXIOM identifique valores e objetivos implicitos.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <textarea
        value={text}
        onChange={handleTextChange}
        placeholder="Cole o texto do documento organizacional aqui..."
        className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
        style={{ minHeight: '200px' }}
      />

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExtract}
          disabled={!text.trim() || extracting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {extracting && <Loader2 className="w-4 h-4 animate-spin" />}
          {extracting ? 'Extraindo valores...' : 'Extrair Valores'}
        </button>
      </div>

      {extractedValues.length > 0 && (
        <div className="space-y-3">
          <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 mb-2">
              Valores extraidos ({extractedValues.length}):
            </p>
            <ul className="space-y-1">
              {extractedValues.map((value, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 flex items-start gap-2"
                >
                  <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  {value}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddAll}
              disabled={addingAll}
              className="inline-flex items-center gap-2 px-4 py-2 border border-indigo-600 text-indigo-600 text-sm font-medium rounded-md hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {addingAll && <Loader2 className="w-4 h-4 animate-spin" />}
              {addingAll ? 'Adicionando...' : 'Adicionar como Objetivos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
