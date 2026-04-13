import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { getLatestRun } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { ProjectCard } from './ProjectCard'
import { NewProjectWizard } from './NewProjectWizard'

export function ProjectList() {
  const { projects, setProjects, setActiveProject, loading, setLoading, error, setError } =
    useProjectStore()
  const { setView, setPipelineView } = useUiStore()
  const { setFromExisting, reset: resetPipeline } = usePipelineStore()
  const [wizardOpen, setWizardOpen] = useState(false)

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
            <ProjectCard key={project.id} project={project} onOpen={handleOpen} />
          ))}
        </div>
      )}

      {/* New project wizard */}
      {wizardOpen && <NewProjectWizard onClose={() => setWizardOpen(false)} />}
    </div>
  )
}
