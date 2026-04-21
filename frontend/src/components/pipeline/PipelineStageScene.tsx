import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Bot, FileSearch, Sparkles, Users, Waypoints } from 'lucide-react'
import type { PipelineStatusItem } from '../../stores/pipelineStore'

interface Props {
  statusFeed: PipelineStatusItem[]
}

type StageId = 'setup' | 'stakeholders' | 'phase' | 'war-room' | 'report'

interface StageDef {
  id: StageId
  label: string
  subtitle: string
  icon: typeof Sparkles
  angle: number
  depth: number
}

const STAGES: StageDef[] = [
  { id: 'setup', label: 'Contexto', subtitle: 'ARIA organiza o problema', icon: Sparkles, angle: -32, depth: 0.84 },
  { id: 'stakeholders', label: 'Stakeholders', subtitle: 'perspectivas são definidas', icon: Users, angle: -12, depth: 0.92 },
  { id: 'phase', label: 'Especialistas', subtitle: 'FRAME, AXIOM, NOVA e ANALYST', icon: Bot, angle: 8, depth: 1 },
  { id: 'war-room', label: 'War Room', subtitle: 'perspectivas entram em confronto', icon: Waypoints, angle: 22, depth: 0.92 },
  { id: 'report', label: 'Relatório', subtitle: 'síntese final e artefatos', icon: FileSearch, angle: 34, depth: 0.84 },
]

function stageIndexFromId(id: string): number {
  const idx = STAGES.findIndex((stage) => stage.id === id)
  return idx === -1 ? 0 : idx
}

function actorColor(actor: string): string {
  const colors: Record<string, string> = {
    ARIA: '#e879f9',
    FRAME: '#60a5fa',
    AXIOM: '#fbbf24',
    NOVA: '#34d399',
    ANALYST: '#a78bfa',
  }
  if (colors[actor]) return colors[actor]
  const palette = ['#fb7185', '#22c55e', '#f59e0b', '#38bdf8', '#c084fc', '#f97316']
  const hash = Array.from(actor).reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return palette[hash % palette.length]
}

function latestStageMeta(statusFeed: PipelineStatusItem[], stage: StageId): Record<string, unknown> {
  for (let i = statusFeed.length - 1; i >= 0; i -= 1) {
    if (statusFeed[i].stage === stage) return statusFeed[i].meta ?? {}
  }
  return {}
}

function stageAccent(stage: StageId): string {
  const map: Record<StageId, string> = {
    setup: '#e879f9',
    stakeholders: '#60a5fa',
    phase: '#34d399',
    'war-room': '#f59e0b',
    report: '#c084fc',
  }
  return map[stage]
}

function currentStageMetrics(stage: StageId, statusFeed: PipelineStatusItem[]): Array<{ label: string; value: string; tone: string }> {
  const setupMeta = latestStageMeta(statusFeed, 'setup')
  const stakeholdersMeta = latestStageMeta(statusFeed, 'stakeholders')
  const phaseMeta = latestStageMeta(statusFeed, 'phase')
  const warMeta = latestStageMeta(statusFeed, 'war-room')
  const reportMeta = latestStageMeta(statusFeed, 'report')

  if (stage === 'setup') {
    return [
      { label: 'Documentos', value: String(Number(setupMeta.documents_count ?? 0)), tone: '#60a5fa' },
      { label: 'Descrição', value: Boolean(setupMeta.has_description ?? false) ? 'Definida' : 'Pendente', tone: '#e879f9' },
    ]
  }

  if (stage === 'stakeholders') {
    return [
      { label: 'Stakeholders', value: String(Number(stakeholdersMeta.stakeholders_count ?? 0)), tone: '#60a5fa' },
      { label: 'Decisores', value: String(Number(stakeholdersMeta.decision_makers_count ?? 0)), tone: '#f59e0b' },
    ]
  }

  if (stage === 'phase') {
    return [
      {
        label: 'Etapas concluídas',
        value: String(statusFeed.filter((item) => item.stage === 'phase' && item.state === 'done').length),
        tone: '#34d399',
      },
      { label: 'Agente ativo', value: String(phaseMeta.active_agent ?? phaseMeta.completed_agent ?? 'ARIA'), tone: actorColor(String(phaseMeta.active_agent ?? phaseMeta.completed_agent ?? 'ARIA')) },
    ]
  }

  if (stage === 'war-room') {
    return [
      { label: 'Participantes', value: String(Number(warMeta.participants_count ?? warMeta.stakeholders_count ?? 0)), tone: '#60a5fa' },
      { label: 'Rodada', value: String(Number(warMeta.round ?? warMeta.act ?? 1)), tone: '#f59e0b' },
      { label: 'Coalizões', value: String(Number(warMeta.coalitions_count ?? 0)), tone: '#34d399' },
      { label: 'Conflitos', value: String(Number(warMeta.conflicts_count ?? 0)), tone: '#f87171' },
    ]
  }

  return [
    { label: 'Artefato', value: `${Math.max(1, Math.round(Number(reportMeta.report_length ?? 0) / 1000))}k chars`, tone: '#c084fc' },
    { label: 'Fases usadas', value: String(Number(reportMeta.phase_outputs_count ?? 0)), tone: '#60a5fa' },
  ]
}

function SetupScene({ documentsCount, hasDescription }: { documentsCount: number; hasDescription: boolean }) {
  return (
    <div className="relative mx-auto h-[280px] max-w-[520px]" style={{ transformStyle: 'preserve-3d' }}>
      {Array.from({ length: Math.max(3, Math.min(5, documentsCount + 2)) }, (_, ring) => (
        <motion.div
          key={ring}
          className="absolute left-1/2 top-1/2 rounded-full border"
          animate={{ rotate: ring % 2 === 0 ? 360 : -360, scale: [0.95, 1.04, 0.95] }}
          transition={{ duration: 12 + ring * 5, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 180 + ring * 54,
            height: 180 + ring * 54,
            marginLeft: -(90 + ring * 27),
            marginTop: -(90 + ring * 27),
            borderColor: ring === 0 ? 'rgba(232,121,249,0.28)' : 'rgba(255,255,255,0.12)',
            transform: `rotateX(72deg) translateZ(${ring * 14}px)`,
            boxShadow: ring === 0 ? '0 0 40px rgba(232,121,249,0.22)' : 'none',
          }}
        />
      ))}
      <motion.div
        className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-[28px]"
        animate={{ rotateY: 360, rotateX: [8, -8, 8] }}
        transition={{ rotateY: { duration: 8, repeat: Infinity, ease: 'linear' }, rotateX: { duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
        style={{
          background: hasDescription
            ? 'linear-gradient(135deg, rgba(232,121,249,0.38), rgba(96,165,250,0.18))'
            : 'linear-gradient(135deg, rgba(248,113,113,0.34), rgba(232,121,249,0.16))',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 28px 80px rgba(232,121,249,0.28)',
        }}
      />
    </div>
  )
}

function StakeholdersScene({ stakeholdersCount, decisionMakersCount }: { stakeholdersCount: number; decisionMakersCount: number }) {
  const count = Math.max(3, Math.min(8, stakeholdersCount || 3))
  const nodes = Array.from({ length: count }, (_, index) => ({
    x: 26 + index * (430 / Math.max(1, count - 1)),
    y: 52 + ((index % 3) * 42),
    z: 12 + (index % 4) * 8,
    color: index < decisionMakersCount ? '#f59e0b' : ['#60a5fa', '#38bdf8', '#34d399', '#c084fc'][index % 4],
  }))
  return (
    <div className="relative mx-auto h-[280px] max-w-[520px]" style={{ transformStyle: 'preserve-3d' }}>
      <div
        className="absolute inset-x-6 top-1/2 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(96,165,250,0.5), transparent)' }}
      />
      {nodes.map((node, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          animate={{
            y: [0, -12 - (index % 3) * 4, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{ duration: 3 + index * 0.4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            left: node.x,
            top: node.y,
            width: 30,
            height: 30,
            background: node.color,
            boxShadow: `0 0 28px ${node.color}`,
            transform: `translateZ(${node.z}px)`,
          }}
        />
      ))}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 280" fill="none">
        {nodes.slice(0, -1).map((node, index) => (
          <motion.path
            key={index}
            d={`M ${node.x + 15} ${node.y + 15} Q ${180 + index * 36} ${24 + index * 26} ${nodes[index + 1].x + 15} ${nodes[index + 1].y + 15}`}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeDasharray="6 8"
            animate={{ strokeDashoffset: [0, -28] }}
            transition={{ duration: 2.6 + index * 0.3, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>
    </div>
  )
}

function SpecialistsScene({ completedCount, activeAgent }: { completedCount: number; activeAgent: string }) {
  const labels = ['FRAME', 'AXIOM', 'NOVA', 'ANALYST']
  const cards = labels.slice(0, Math.max(3, Math.min(4, completedCount || 4))).map((label, idx) => ({
    label,
    x: 30 + idx * 125,
    color: actorColor(label),
  }))
  return (
    <div className="relative mx-auto h-[280px] max-w-[560px]" style={{ transformStyle: 'preserve-3d' }}>
      {cards.map((card, index) => (
        <motion.div
          key={card.label}
          className="absolute rounded-[24px] px-4 py-5 text-center"
          animate={{ y: [0, -18, 0], rotateY: [0, 10, 0] }}
          transition={{ duration: 4.4 + index * 0.35, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            left: card.x,
            top: 72 + (index % 2) * 22,
            width: 110,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(14,14,19,0.88))',
            border: `1px solid ${card.label === activeAgent ? card.color + 'aa' : card.color + '55'}`,
            boxShadow: `0 24px 48px ${card.label === activeAgent ? card.color + '55' : card.color + '22'}`,
            transform: `rotateX(16deg) translateZ(${18 + index * 8}px)`,
          }}
        >
          <div
            className="mx-auto mb-3 h-10 w-10 rounded-2xl"
            style={{ background: `${card.color}22`, boxShadow: `0 0 22px ${card.color}33` }}
          />
          <p className="text-xs font-semibold tracking-[0.18em]" style={{ color: card.color }}>
            {card.label}
          </p>
        </motion.div>
      ))}
      <motion.div
        className="absolute inset-x-12 bottom-8 h-px"
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)' }}
      />
    </div>
  )
}

function WarRoomScene({ participantsCount, act, turnLength }: { participantsCount: number; act: number; turnLength: number }) {
  const count = Math.max(4, Math.min(9, participantsCount || 5))
  const orbiters = Array.from({ length: count }, (_, index) => ({
    angle: (360 / count) * index,
    color: ['#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#38bdf8', '#f97316'][index % 7],
  }))
  const radius = 88 + Math.min(34, Math.floor((turnLength || 0) / 30))
  return (
    <div className="relative mx-auto h-[280px] max-w-[520px]" style={{ transformStyle: 'preserve-3d' }}>
      <motion.div
        className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full"
        animate={{ scale: [0.92, 1.08, 0.92] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: act >= 3
            ? 'radial-gradient(circle, rgba(192,132,252,0.46), rgba(232,121,249,0.16))'
            : 'radial-gradient(circle, rgba(245,158,11,0.45), rgba(232,121,249,0.16))',
          boxShadow: act >= 3 ? '0 0 80px rgba(192,132,252,0.35)' : '0 0 80px rgba(245,158,11,0.35)',
        }}
      />
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
        style={{ width: radius * 2, height: radius * 2, borderColor: 'rgba(245,158,11,0.22)', transformStyle: 'preserve-3d' }}
      >
        {orbiters.map((orbiter, index) => (
          <motion.div
            key={index}
            className="absolute left-1/2 top-0 h-8 w-8 -translate-x-1/2 rounded-full"
            animate={{ scale: [1, 1.16, 1] }}
            transition={{ duration: 1.8 + index * 0.22, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: orbiter.color,
              boxShadow: `0 0 22px ${orbiter.color}`,
              transform: `rotate(${orbiter.angle}deg) translateY(-14px) translateZ(${8 + index * 4}px)`,
              transformOrigin: `center ${radius}px`,
            }}
          />
        ))}
      </motion.div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 280" fill="none">
        {orbiters.map((orbiter, index) => (
          <motion.line
            key={index}
            x1="260"
            y1="140"
            x2={260 + Math.cos((orbiter.angle * Math.PI) / 180) * radius}
            y2={140 + Math.sin((orbiter.angle * Math.PI) / 180) * radius}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="5 8"
            animate={{ strokeDashoffset: [0, -18] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </svg>
    </div>
  )
}

function ReportScene({ reportLength, phaseOutputsCount }: { reportLength: number; phaseOutputsCount: number }) {
  const base = Math.max(4, Math.min(6, phaseOutputsCount || 4))
  const bars = Array.from({ length: base }, (_, index) => 110 + ((reportLength || 0) / 180) % 90 + index * 12)
  return (
    <div className="relative mx-auto h-[280px] max-w-[520px]" style={{ transformStyle: 'preserve-3d' }}>
      <motion.div
        className="absolute left-1/2 top-1/2 h-[210px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-[28px]"
        animate={{ rotateX: [8, 2, 8], rotateY: [-10, 10, -10] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(180deg, rgba(192,132,252,0.18), rgba(14,14,19,0.96))',
          border: '1px solid rgba(192,132,252,0.32)',
          boxShadow: '0 30px 80px rgba(192,132,252,0.22)',
        }}
      />
      <div className="absolute left-1/2 top-1/2 flex w-[240px] -translate-x-1/2 -translate-y-1/2 items-end justify-between gap-3">
        {bars.map((height, index) => (
          <motion.div
            key={index}
            className="w-8 rounded-t-2xl"
            animate={{ height: [height * 0.72, height, height * 0.82] }}
            transition={{ duration: 3 + index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              background: index % 2 === 0 ? 'rgba(192,132,252,0.9)' : 'rgba(96,165,250,0.9)',
              boxShadow: '0 0 26px rgba(192,132,252,0.16)',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function StageMicroScene({ stage, statusFeed }: { stage: StageId; statusFeed: PipelineStatusItem[] }) {
  const setupMeta = latestStageMeta(statusFeed, 'setup')
  const stakeholdersMeta = latestStageMeta(statusFeed, 'stakeholders')
  const phaseMeta = latestStageMeta(statusFeed, 'phase')
  const warMeta = latestStageMeta(statusFeed, 'war-room')
  const reportMeta = latestStageMeta(statusFeed, 'report')
  switch (stage) {
    case 'stakeholders':
      return (
        <StakeholdersScene
          stakeholdersCount={Number(stakeholdersMeta.stakeholders_count ?? 0)}
          decisionMakersCount={Number(stakeholdersMeta.decision_makers_count ?? 0)}
        />
      )
    case 'phase':
      return (
        <SpecialistsScene
          completedCount={statusFeed.filter((item) => item.stage === 'phase' && item.state === 'done').length}
          activeAgent={String(phaseMeta.active_agent ?? phaseMeta.completed_agent ?? '')}
        />
      )
    case 'war-room':
      return (
        <WarRoomScene
          participantsCount={Number(warMeta.participants_count ?? warMeta.stakeholders_count ?? 5)}
          act={Number(warMeta.act ?? 2)}
          turnLength={Number(warMeta.turn_length ?? 0)}
        />
      )
    case 'report':
      return (
        <ReportScene
          reportLength={Number(reportMeta.report_length ?? 0)}
          phaseOutputsCount={Number(reportMeta.phase_outputs_count ?? 4)}
        />
      )
    case 'setup':
    default:
      return (
        <SetupScene
          documentsCount={Number(setupMeta.documents_count ?? 0)}
          hasDescription={Boolean(setupMeta.has_description ?? true)}
        />
      )
  }
}

export function PipelineStageScene({ statusFeed }: Props) {
  const lastStatus = statusFeed[statusFeed.length - 1] ?? null
  const activeStageIndex = stageIndexFromId(lastStatus?.stage ?? 'setup')
  const [selectedStage, setSelectedStage] = useState<StageId | null>(null)
  const effectiveStage = selectedStage ?? (STAGES[activeStageIndex]?.id ?? 'setup')
  const latestStatuses = useMemo(
    () => statusFeed.filter((item) => item.stage === effectiveStage).slice(-4).reverse(),
    [effectiveStage, statusFeed],
  )
  const activeStage = STAGES.find((stage) => stage.id === effectiveStage) ?? STAGES[0]
  const stageMetrics = useMemo(
    () => currentStageMetrics(effectiveStage, statusFeed),
    [effectiveStage, statusFeed],
  )

  return (
    <section
      className="rounded-[28px] overflow-hidden"
      style={{
        background: 'radial-gradient(circle at top, rgba(232,121,249,0.20), rgba(56,189,248,0.08) 28%, rgba(7,7,12,0.96) 68%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 40px 120px rgba(0,0,0,0.45)',
      }}
    >
      <div
        className="relative px-6 py-8 md:px-8 md:py-10"
        style={{
          perspective: '1400px',
          minHeight: 460,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          backgroundPosition: 'center',
        }}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 38, repeat: Infinity, ease: 'linear' }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 380,
              height: 380,
              border: '1px solid rgba(232,121,249,0.14)',
              boxShadow: '0 0 90px rgba(232,121,249,0.16)',
            }}
          />
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: 280,
              height: 280,
              border: '1px dashed rgba(96,165,250,0.18)',
            }}
          />
        </motion.div>

        <div
          className="relative z-10 grid gap-8 lg:grid-cols-[1.5fr_1fr] items-center"
          style={{ transformStyle: 'preserve-3d' }}
        >
          <div className="relative min-h-[300px]">
            <div className="mb-6">
              <StageMicroScene stage={effectiveStage} statusFeed={statusFeed} />
            </div>

            <motion.div
              className="absolute left-8 right-8 top-[72%] h-[2px] -translate-y-1/2"
              animate={{ opacity: [0.35, 0.85, 0.35] }}
              transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                background: `linear-gradient(90deg, rgba(255,255,255,0.08), ${stageAccent(effectiveStage)}, rgba(96,165,250,0.12))`,
                boxShadow: `0 0 22px ${stageAccent(effectiveStage)}44`,
              }}
            />

            <div className="relative flex items-end justify-between gap-3 min-h-[132px]">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon
                const isReached = index <= activeStageIndex
                const isActive = index === activeStageIndex
                const isSelected = effectiveStage === stage.id
                const xOffset = index * 4
                return (
                  <motion.div
                    key={stage.id}
                    className="relative flex-1"
                    onHoverStart={() => setSelectedStage(stage.id)}
                    onHoverEnd={() => setSelectedStage(null)}
                    initial={false}
                    animate={{
                      y: isActive ? [-6, 6, -6] : 0,
                    }}
                    transition={{ duration: 5.8, repeat: Infinity, ease: 'easeInOut', delay: index * 0.2 }}
                    style={{
                      transform: `rotateY(${stage.angle}deg) scale(${stage.depth}) translateX(${xOffset}px)`,
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onFocus={() => setSelectedStage(stage.id)}
                      onBlur={() => setSelectedStage(null)}
                      className="mx-auto max-w-[150px] rounded-[24px] px-4 py-5 backdrop-blur-md"
                      style={{
                        cursor: 'pointer',
                        background: isSelected
                          ? `linear-gradient(180deg, ${stageAccent(stage.id)}33, rgba(14,14,19,0.96))`
                          : isActive
                            ? `linear-gradient(180deg, ${stageAccent(stage.id)}3d, rgba(14,14,19,0.94))`
                          : isReached
                            ? 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(14,14,19,0.92))'
                            : 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(14,14,19,0.75))',
                        border: isSelected
                          ? `1px solid ${stageAccent(stage.id)}66`
                          : isActive
                            ? `1px solid ${stageAccent(stage.id)}66`
                          : isReached
                            ? '1px solid rgba(255,255,255,0.12)'
                            : '1px solid rgba(255,255,255,0.06)',
                        boxShadow: isActive
                          ? `0 20px 48px ${stageAccent(stage.id)}33`
                          : '0 14px 36px rgba(0,0,0,0.24)',
                      }}
                    >
                      <motion.div
                        className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                        animate={isActive ? { rotateY: [0, 180, 360] } : undefined}
                        transition={isActive ? { duration: 4, repeat: Infinity, ease: 'linear' } : undefined}
                        style={{
                          background: isActive ? `${stageAccent(stage.id)}22` : 'rgba(255,255,255,0.06)',
                          color: isActive ? stageAccent(stage.id) : isReached ? '#cbd5e1' : '#64748b',
                          transformStyle: 'preserve-3d',
                        }}
                      >
                        <Icon size={20} />
                      </motion.div>
                      <div className="text-center">
                        <p className="text-sm font-semibold" style={{ color: isReached ? '#f8fafc' : '#64748b' }}>
                          {stage.label}
                        </p>
                        <p className="mt-1 text-[11px] leading-4" style={{ color: isReached ? '#94a3b8' : '#475569' }}>
                          {stage.subtitle}
                        </p>
                      </div>
                    </div>
                    {isActive && (
                      <motion.div
                        className="absolute inset-x-6 top-1/2 -z-10 h-20 -translate-y-1/2 rounded-full blur-2xl"
                        animate={{ opacity: [0.18, 0.42, 0.18], scale: [0.9, 1.08, 0.9] }}
                        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ background: `${stageAccent(stage.id)}55` }}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded-[24px] p-5 backdrop-blur-md"
              style={{ background: 'rgba(8,8,14,0.62)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: '#64748b' }}>
                Agora
              </p>
              <p className="mt-2 text-xl font-semibold" style={{ color: '#f8fafc' }}>
                {selectedStage ? activeStage.label : (lastStatus?.title ?? 'Preparando a análise')}
              </p>
              <p className="mt-2 text-sm leading-6" style={{ color: '#cbd5e1' }}>
                {selectedStage
                  ? activeStage.subtitle
                  : (lastStatus?.detail ?? 'ARIA está montando o fluxo completo em background.')}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: stageAccent(effectiveStage), boxShadow: `0 0 18px ${stageAccent(effectiveStage)}` }}
                />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: stageAccent(effectiveStage) }}>
                  {activeStage.label}
                </span>
              </div>

              {stageMetrics.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {stageMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-full px-3 py-1.5 text-xs"
                      style={{
                        background: `${metric.tone}14`,
                        color: metric.tone,
                        border: `1px solid ${metric.tone}2a`,
                      }}
                    >
                      {metric.label}: {metric.value}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              {latestStatuses.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 16, rotateX: -14 }}
                  animate={{ opacity: 1, x: 0, rotateX: 0 }}
                  transition={{ duration: 0.35, delay: index * 0.06 }}
                  className="rounded-[20px] px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background: actorColor(item.actor),
                        boxShadow: `0 0 16px ${actorColor(item.actor)}`,
                      }}
                    />
                    <span className="text-xs font-semibold" style={{ color: '#f8fafc' }}>
                      {item.actor}
                    </span>
                    <span className="text-[11px]" style={{ color: '#64748b' }}>
                      {item.state === 'done' ? 'concluiu' : 'em andamento'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm" style={{ color: '#cbd5e1' }}>
                    {item.title}
                  </p>
                </motion.div>
              ))}
              {latestStatuses.length === 0 && (
                <div
                  className="rounded-[20px] px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <p className="text-sm" style={{ color: '#94a3b8' }}>
                    Ainda não há eventos registrados nesta etapa.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
