import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, X } from 'lucide-react'
import { projectsApi } from '../../api/projects'
import { useProjectStore } from '../../stores/projectStore'
import { useUiStore } from '../../stores/uiStore'
import { getLatestRun } from '../../api/pipeline'
import { usePipelineStore } from '../../stores/pipelineStore'
import { BrandLogo } from '../layout/BrandLogo'
import { ProjectCard } from './ProjectCard'
import { NewProjectWizard } from './NewProjectWizard'

interface DeleteConfirmState { id: string; name: string }

export function ProjectList() {
  const { projects, setProjects, setActiveProject, removeProject, loading, setLoading, error, setError } = useProjectStore()
  const { setView, setPipelineView } = useUiStore()
  const { setFromExisting, reset: resetPipeline } = usePipelineStore()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true); setError(null)
    projectsApi.list()
      .then(data => { if (!cancelled) setProjects(data) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar projetos') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [setProjects, setLoading, setError])

  function handleOpen(id: string) {
    resetPipeline(); setPipelineView('idle'); setActiveProject(id); setView('project-detail')
    getLatestRun(id).then(run => {
      if (run && run.status === 'done' && run.report_md) { setFromExisting(run.report_md, run.id); setPipelineView('report') }
    })
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
    } finally { setDeleting(false) }
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div
        className="rounded-[32px] p-6 md:p-8 mb-6"
        style={{
          background: 'radial-gradient(circle at top left, rgba(14,165,233,0.18), rgba(15,23,42,0.96) 42%, rgba(6,9,16,0.98))',
          border: '1px solid rgba(148,163,184,0.14)',
          boxShadow: '0 26px 80px rgba(2,6,23,0.28)',
        }}
      >
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="max-w-2xl">
            <BrandLogo size={52} subtitle="Decision Intelligence Studio" />
            <div className="mt-6">
              <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: '#67e8f9' }}>
                Workspace
              </p>
              <h1 className="text-3xl md:text-4xl font-semibold mt-2" style={{ color: '#f8fafc', letterSpacing: '-0.04em' }}>
                Estruture decisões complexas com clareza visual e rigor VFT.
              </h1>
              <p className="text-sm md:text-base mt-4 leading-7" style={{ color: '#cbd5e1' }}>
                Reúna contexto, stakeholders, objetivos, alternativas e análises conduzidas pela ARIA em um único estúdio.
                Cada projeto vira uma sala de decisão persistente, pronta para retomar, revisar e apresentar.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 min-w-[260px]">
            <div
              className="rounded-[24px] p-4"
              style={{ background: 'rgba(15,23,42,0.55)', border: '1px solid rgba(103,232,249,0.12)' }}
            >
              <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: '#67e8f9' }}>
                Ambiente
              </p>
              <p className="text-3xl font-semibold mt-2" style={{ color: '#f8fafc' }}>
                {projects.length}
              </p>
              <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                projeto{projects.length === 1 ? '' : 's'} no estúdio
              </p>
            </div>
            <button
              onClick={() => setWizardOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-colors"
              style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.18), rgba(16,185,129,0.16))', color: '#ecfeff', border: '1px solid rgba(103,232,249,0.28)' }}
            >
              <Plus size={15} />
              Novo Projeto
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          {error}
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="h-4 rounded w-3/4 mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 rounded w-full mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.04)' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && !error && (
        <div
          className="text-center py-16 rounded-[28px]"
          style={{
            background: 'linear-gradient(180deg, rgba(15,23,42,0.9), rgba(10,14,22,0.96))',
            border: '1px solid rgba(148,163,184,0.12)',
          }}
        >
          <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>Nenhum projeto ainda. Abra sua primeira sala de decisão VFT.</p>
          <button
            onClick={() => setWizardOpen(true)}
            className="px-4 py-2 rounded-2xl text-sm font-medium"
            style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.16), rgba(16,185,129,0.12))', color: '#ecfeff', border: '1px solid rgba(103,232,249,0.22)' }}
          >
            Criar Projeto
          </button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={handleOpen}
              onDelete={(id, name) => setDeleteConfirm({ id, name })}
            />
          ))}
        </div>
      )}

      {wizardOpen && <NewProjectWizard onClose={() => setWizardOpen(false)} />}

      {deleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 space-y-4" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.12)' }}>
                <AlertTriangle size={18} style={{ color: '#f87171' }} />
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-base" style={{ color: '#f8fafc' }}>Excluir projeto</h2>
                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                  Tem certeza que deseja excluir <strong style={{ color: '#e2e8f0' }}>"{deleteConfirm.name}"</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <button onClick={() => setDeleteConfirm(null)} style={{ color: '#475569' }}>
                <X size={16} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', background: 'transparent' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="text-sm px-4 py-2 rounded-lg disabled:opacity-50"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
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
