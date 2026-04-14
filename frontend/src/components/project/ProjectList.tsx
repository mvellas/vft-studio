import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, X } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { getLatestRun } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { ProjectCard } from './ProjectCard'
import { NewProjectWizard } from './NewProjectWizard'

interface DeleteConfirmState {
  id: string
  name: string
}

export function ProjectList() {
  const { projects, setProjects, setActiveProject, removeProject, loading, setLoading, error, setError } =
    useProjectStore()
  const { setView, setPipelineView } = useUiStore()
  const { setFromExisting, reset: resetPipeline } = usePipelineStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    projectsApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data)
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Erro ao carregar projetos')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [setProjects, setLoading, setError])

  function handleOpen(id: string) {
    resetPipeline()
    setPipelineView('idle')
    setActiveProject(id)
    setView('project-detail')
    getLatestRun(id).then((run) => {
      if (run && run.status === 'done' && run.report_md) {
        setFromExisting(run.report_md, run.id)
        setPipelineView('report')
      }
    })
  }

  function handleDeleteRequest(id: string, name: string) {
    setDeleteConfirm({ id, name })
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return
    setDeleting(true)
    try {
      await projectsApi.archive(deleteConfirm.id)
      removeProject(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir projeto')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Projetos</h1>
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Novo Projeto
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && !error && (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 text-sm">
            Nenhum projeto. Crie seu primeiro projeto VFT.
          </p>
          <button
            onClick={() => setWizardOpen(true)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            Criar Projeto
          </button>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={handleOpen}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      {/* New project wizard */}
      {wizardOpen && <NewProjectWizard onClose={() => setWizardOpen(false)} />}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900 text-base">Excluir projeto</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tem certeza que deseja excluir <strong className="text-gray-700">"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="text-gray-400 hover:text-gray-600 shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
