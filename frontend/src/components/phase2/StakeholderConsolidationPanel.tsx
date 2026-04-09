import { useState, useEffect, useMemo } from 'react'
import { Loader2, Users, CheckCircle2 } from 'lucide-react'
import { stakeholdersApi } from '../../api/stakeholders'
import { objectivesApi } from '../../api/objectives'
import { useObjectivesStore } from '../../stores/objectivesStore'
import type { Stakeholder } from '../../types'
import type { Objective } from '../../api/objectives'

interface StakeholderConsolidationPanelProps {
  projectId: string
}

interface DuplicateGroup {
  key: string
  objectives: Objective[]
}

interface MergeModalState {
  group: DuplicateGroup
  mergedStatement: string
  selectedCanonicalId: string
  merging: boolean
}

/** Simple client-side duplicate detection: first 30 chars of trimmed lowercase statement */
function detectDuplicates(objectives: Objective[]): DuplicateGroup[] {
  const groups = new Map<string, Objective[]>()
  for (const obj of objectives) {
    const key = obj.statement.trim().toLowerCase().slice(0, 30)
    const group = groups.get(key) ?? []
    groups.set(key, [...group, obj])
  }
  return Array.from(groups.entries())
    .filter(([, objs]) => objs.length > 1)
    .map(([key, objs]) => ({ key, objectives: objs }))
}

export function StakeholderConsolidationPanel({ projectId }: StakeholderConsolidationPanelProps) {
  const { objectives, fetchObjectives, updateObjective, removeObjective } = useObjectivesStore()
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loadingStakeholders, setLoadingStakeholders] = useState(false)
  const [activeTab, setActiveTab] = useState<string>('all')
  const [reviewedTabs, setReviewedTabs] = useState<Set<string>>(new Set())
  const [mergeModal, setMergeModal] = useState<MergeModalState | null>(null)
  const [consolidating, setConsolidating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Per-stakeholder excluded objective IDs (local state only — no DB delete)
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLoadingStakeholders(true)
    stakeholdersApi
      .list(projectId)
      .then(data => setStakeholders(data))
      .catch(err => setError(err instanceof Error ? err.message : 'Erro ao carregar stakeholders'))
      .finally(() => setLoadingStakeholders(false))
  }, [projectId])

  useEffect(() => {
    fetchObjectives(projectId)
  }, [projectId, fetchObjectives])

  const objectivesByStakeholder = useMemo(() => {
    const map = new Map<string, Objective[]>()
    for (const obj of objectives) {
      if (!obj.source_stakeholder_id) continue
      const list = map.get(obj.source_stakeholder_id) ?? []
      map.set(obj.source_stakeholder_id, [...list, obj])
    }
    return map
  }, [objectives])

  const duplicateGroups = useMemo(() => {
    if (activeTab !== 'all') return []
    return detectDuplicates(objectives)
  }, [objectives, activeTab])

  const filteredObjectives = useMemo(() => {
    if (activeTab === 'all') return objectives
    return (objectivesByStakeholder.get(activeTab) ?? []).filter(o => !excluded.has(o.id))
  }, [activeTab, objectives, objectivesByStakeholder, excluded])

  const handleToggleExclude = (id: string) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMarkTabReviewed = (tabId: string) => {
    setReviewedTabs(prev => new Set([...prev, tabId]))
  }

  const handleOpenMerge = (group: DuplicateGroup) => {
    setMergeModal({
      group,
      mergedStatement: group.objectives[0].statement,
      selectedCanonicalId: group.objectives[0].id,
      merging: false,
    })
  }

  const handleConfirmMerge = async () => {
    if (!mergeModal || mergeModal.merging) return
    setMergeModal(prev => prev ? { ...prev, merging: true } : null)

    const { group, mergedStatement, selectedCanonicalId } = mergeModal
    const duplicates = group.objectives.filter(o => o.id !== selectedCanonicalId)

    try {
      await updateObjective(projectId, selectedCanonicalId, { statement: mergedStatement.trim() })
      for (const dup of duplicates) {
        await removeObjective(projectId, dup.id)
      }
      setMergeModal(null)
    } catch {
      setError('Erro ao mesclar objetivos. Tente novamente.')
      setMergeModal(prev => prev ? { ...prev, merging: false } : null)
    }
  }

  const handleConsolidationComplete = async () => {
    setConsolidating(true)
    try {
      await fetchObjectives(projectId)
    } finally {
      setConsolidating(false)
    }
  }

  const allTabsReviewed = stakeholders.every(s => reviewedTabs.has(s.id))
  const totalObjectives = objectives.length
  const uniqueStakeholders = stakeholders.filter(s =>
    objectivesByStakeholder.has(s.id)
  ).length

  const getStakeholderName = (id: string): string => {
    return stakeholders.find(s => s.id === id)?.name ?? id
  }

  if (loadingStakeholders) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-2" />
        <span className="text-sm text-gray-500">Carregando stakeholders...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <Users className="w-5 h-5 text-indigo-600" />
        <h3 className="text-xl font-semibold text-gray-900">Consolidacao de Objetivos</h3>
        <span className="text-xs text-gray-400 ml-auto">Passos 2.8–2.12</span>
      </div>

      {error && (
        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Stakeholder tabs + "Todos" */}
      <div className="flex gap-0 border-b border-gray-100 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Todos
          <span className="ml-1.5 text-xs text-gray-400">{objectives.length}</span>
        </button>

        {stakeholders.map(s => {
          const count = objectivesByStakeholder.get(s.id)?.length ?? 0
          const isReviewed = reviewedTabs.has(s.id)
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveTab(s.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                activeTab === s.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {isReviewed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
              {s.name}
              <span className="text-xs text-gray-400">{count} objetivos</span>
            </button>
          )
        })}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto max-h-[500px] p-4 space-y-3">
        {/* Stakeholder individual view */}
        {activeTab !== 'all' && (
          <>
            {filteredObjectives.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">
                Nenhum objetivo registrado para este stakeholder.
              </p>
            ) : (
              filteredObjectives.map(obj => {
                const isExcluded = excluded.has(obj.id)
                const badgeColors: Record<string, string> = {
                  means: 'bg-amber-100 text-amber-700',
                  fundamental: 'bg-purple-100 text-purple-700',
                  strategic: 'bg-blue-100 text-blue-700',
                  uncategorized: 'bg-gray-100 text-gray-500',
                }
                const typeKey = obj.type ?? 'uncategorized'
                const badgeClass = badgeColors[typeKey] ?? badgeColors.uncategorized

                return (
                  <div
                    key={obj.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                      isExcluded ? 'border-gray-100 bg-gray-50 opacity-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!isExcluded}
                      onChange={() => handleToggleExclude(obj.id)}
                      className="mt-0.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      title="Incluir na lista consolidada"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{obj.statement}</p>
                    </div>
                    <span
                      className={`flex-shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded-full ${badgeClass}`}
                    >
                      {typeKey}
                    </span>
                  </div>
                )
              })
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleMarkTabReviewed(activeTab)}
                disabled={reviewedTabs.has(activeTab)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-emerald-300 text-emerald-600 rounded-md hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {reviewedTabs.has(activeTab) ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Revisado
                  </>
                ) : (
                  'Marcar como revisado'
                )}
              </button>
            </div>
          </>
        )}

        {/* Todos tab — consolidation view */}
        {activeTab === 'all' && (
          <>
            {duplicateGroups.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-gray-700">
                  Grupos de duplicatas detectados ({duplicateGroups.length}):
                </p>
                {duplicateGroups.map(group => (
                  <details key={group.key} className="rounded-lg border border-yellow-200 bg-yellow-50">
                    <summary className="flex items-center justify-between p-3 cursor-pointer select-none">
                      <span className="text-sm font-medium text-yellow-800">
                        {group.objectives.length} objetivos similares
                      </span>
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault()
                          handleOpenMerge(group)
                        }}
                        className="text-xs text-indigo-600 border border-indigo-200 rounded-md px-2 py-0.5 hover:bg-indigo-50 transition-colors"
                      >
                        Mesclar
                      </button>
                    </summary>
                    <div className="px-3 pb-3 space-y-1.5">
                      {group.objectives.map(obj => (
                        <div key={obj.id} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400" />
                          <span className="flex-1">{obj.statement}</span>
                          {obj.source_stakeholder_id && (
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {getStakeholderName(obj.source_stakeholder_id)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {objectives.length === 0 && (
              <p className="text-sm text-gray-400 py-8 text-center">
                Nenhum objetivo registrado ainda.
              </p>
            )}

            {objectives.length > 0 && duplicateGroups.length === 0 && (
              <p className="text-sm text-emerald-600 py-4 text-center">
                Nenhum grupo de duplicatas detectado.
              </p>
            )}
          </>
        )}
      </div>

      {/* Summary bar */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 rounded-b-lg flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-500">
          {totalObjectives} objetivos no total
          {' | '}
          {uniqueStakeholders} stakeholders contribuiram
          {' | '}
          {duplicateGroups.length} grupos de duplicatas detectados
        </p>

        <button
          type="button"
          onClick={handleConsolidationComplete}
          disabled={!allTabsReviewed || consolidating}
          title={!allTabsReviewed ? 'Revise todos os stakeholders antes de concluir' : undefined}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {consolidating && <Loader2 className="w-4 h-4 animate-spin" />}
          Consolidacao completa
        </button>
      </div>

      {/* Merge modal */}
      {mergeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <h4 className="text-base font-semibold text-gray-900">Mesclar Objetivos Similares</h4>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Selecione o objetivo canonico:</p>
              {mergeModal.group.objectives.map(obj => (
                <label
                  key={obj.id}
                  className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer ${
                    mergeModal.selectedCanonicalId === obj.id
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="canonical"
                    value={obj.id}
                    checked={mergeModal.selectedCanonicalId === obj.id}
                    onChange={() =>
                      setMergeModal(prev =>
                        prev
                          ? {
                              ...prev,
                              selectedCanonicalId: obj.id,
                              mergedStatement: obj.statement,
                            }
                          : null
                      )
                    }
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-800">{obj.statement}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600">
                Enunciado mesclado (editavel):
              </label>
              <textarea
                value={mergeModal.mergedStatement}
                onChange={e =>
                  setMergeModal(prev =>
                    prev ? { ...prev, mergedStatement: e.target.value } : null
                  )
                }
                className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMergeModal(null)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmMerge}
                disabled={mergeModal.merging || !mergeModal.mergedStatement.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {mergeModal.merging && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Mesclagem
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
