import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useObjectivesStore } from '../../stores/objectivesStore'
import { ObjectiveCard } from './ObjectiveCard'

interface ObjectivesListProps {
  projectId: string
  onWITI: (id: string) => void
  onCoC: (id: string) => void
}

type FilterTab = 'all' | 'fundamental' | 'means' | 'strategic'

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'fundamental', label: 'Fundamentais' },
  { value: 'means', label: 'Meios' },
  { value: 'strategic', label: 'Estrategicos' },
]

export function ObjectivesList({ projectId, onWITI, onCoC }: ObjectivesListProps) {
  const { objectives, loading, error, fetchObjectives, addObjective } = useObjectivesStore()
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStatement, setNewStatement] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    fetchObjectives(projectId)
  }, [projectId, fetchObjectives])

  const filteredObjectives = objectives.filter(o => {
    if (activeTab === 'all') return true
    if (activeTab === 'fundamental') return o.type === 'fundamental'
    if (activeTab === 'means') return o.type === 'means'
    if (activeTab === 'strategic') return o.type === 'strategic'
    return true
  })

  const countByType = {
    fundamental: objectives.filter(o => o.type === 'fundamental').length,
    means: objectives.filter(o => o.type === 'means').length,
    strategic: objectives.filter(o => o.type === 'strategic').length,
  }

  const handleAdd = async () => {
    if (!newStatement.trim() || saving) return
    setSaving(true)
    setSaveError(null)
    try {
      await addObjective(projectId, { statement: newStatement.trim() })
      setNewStatement('')
      setShowAddForm(false)
    } catch {
      setSaveError('Erro ao salvar. Os dados nao foram persistidos — tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-lg flex flex-col" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h3 className="text-xl font-semibold text-gray-900">Objetivos</h3>
        <button
          type="button"
          onClick={() => setShowAddForm(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar Objetivo
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-0 border-b border-gray-100">
        {TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="p-4 border-b space-y-2" style={{ background: 'rgba(232,121,249,0.05)', borderColor: 'rgba(232,121,249,0.2)' }}>
          <textarea
            autoFocus
            value={newStatement}
            onChange={e => setNewStatement(e.target.value)}
            placeholder="Digite o enunciado do objetivo..."
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px', resize: 'none' as const }}
            className="w-full p-2 text-sm focus:outline-none"
            rows={2}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
            }}
          />
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewStatement('')
                setSaveError(null)
              }}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newStatement.trim() || saving}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* List area */}
      <div className="flex-1 overflow-y-auto max-h-[600px] p-4 space-y-3">
        {loading && objectives.length === 0 && (
          <>
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-24 rounded-lg border border-gray-100 bg-gray-50 animate-pulse"
              />
            ))}
          </>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && filteredObjectives.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-lg font-medium text-gray-500">
              Nenhum objetivo elicitado ainda
            </p>
            <p className="text-sm text-gray-400 mt-2 max-w-sm">
              Adicione objetivos manualmente ou use um dos dispositivos VFT para elicitar valores com o stakeholder.
            </p>
          </div>
        )}

        {filteredObjectives.map(objective => (
          <ObjectiveCard
            key={objective.id}
            objective={objective}
            projectId={projectId}
            onWITI={onWITI}
            onCoC={onCoC}
          />
        ))}
      </div>

      {/* Summary row */}
      {objectives.length > 0 && (
        <div className="px-4 py-3 border-t rounded-b-lg" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
          <p className="text-xs text-gray-500">
            {objectives.length} objetivos total
            {' | '}
            {countByType.fundamental} fundamentais
            {' | '}
            {countByType.means} meios
            {' | '}
            {countByType.strategic} estrategicos
          </p>
        </div>
      )}
    </div>
  )
}
