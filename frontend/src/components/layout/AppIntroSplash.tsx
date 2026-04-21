import { motion } from 'framer-motion'

interface Props {
  onFinish: () => void
  mode: 'welcome' | 'workspace' | 'project'
  projectCount: number
  projectName?: string | null
}

function splashCopy(mode: Props['mode'], projectCount: number, projectName?: string | null) {
  if (mode === 'project') {
    return {
      kicker: 'Projeto ativo',
      title: 'Retomando a',
      accent: 'sala de decisao',
      description: `O estúdio está reabrindo o contexto de ${projectName || 'seu projeto'}, preparando stakeholders, objetivos e histórico recente para continuidade da análise.`,
      statusLines: [
        `Carregando contexto de ${projectName || 'seu projeto'}`,
        'Reidratando objetivos, alternativas e artefatos',
        'Sincronizando ambiente de facilitacao com a ARIA',
      ],
    }
  }

  if (mode === 'workspace') {
    return {
      kicker: 'Workspace em operacao',
      title: 'Reabrindo o',
      accent: 'estudio VFT',
      description: `Encontramos ${projectCount} projeto${projectCount === 1 ? '' : 's'} no workspace. O ambiente está sendo preparado para retomar análises e facilitar novas rodadas de decisão.`,
      statusLines: [
        'Indexando projetos e historico de execucoes',
        'Restaurando contexto metodologico do workspace',
        'Preparando console de analise e facilitacao',
      ],
    }
  }

  return {
    kicker: 'Primeira entrada',
    title: 'Entrando na',
    accent: 'sala de decisao',
    description: 'O estúdio está organizando contexto, perspectivas e estruturas de valor para facilitar análises VFT completas desde a primeira sessão.',
    statusLines: [
      'ARIA sincronizando contexto inicial',
      'Mapeando valores, objetivos e stakeholders',
      'Preparando ambiente de facilitacao VFT',
    ],
  }
}

export function AppIntroSplash({ onFinish, mode, projectCount, projectName }: Props) {
  const copy = splashCopy(mode, projectCount, projectName)
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.65, ease: 'easeInOut' } }}
      className="fixed inset-0 z-[100] overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at top, rgba(56,189,248,0.16), transparent 20%), radial-gradient(circle at 80% 24%, rgba(232,121,249,0.16), transparent 18%), #05060a',
      }}
      onAnimationComplete={() => {
        // noop; lifetime is controlled by parent timer
      }}
    >
      <div className="absolute inset-0">
        {Array.from({ length: 6 }, (_, index) => (
          <motion.div
            key={index}
            className="absolute left-1/2 top-1/2 rounded-full border"
            animate={{ rotate: index % 2 === 0 ? 360 : -360, scale: [0.92, 1.06, 0.92] }}
            transition={{ duration: 10 + index * 3, repeat: Infinity, ease: 'linear' }}
            style={{
              width: 220 + index * 84,
              height: 220 + index * 84,
              marginLeft: -(110 + index * 42),
              marginTop: -(110 + index * 42),
              borderColor: index < 2 ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.06)',
              transform: `rotateX(72deg) translateZ(${index * 12}px)`,
              boxShadow: index === 0 ? '0 0 64px rgba(56,189,248,0.16)' : 'none',
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0">
        {Array.from({ length: 18 }, (_, index) => {
          const angle = (360 / 18) * index
          const color = ['#38bdf8', '#e879f9', '#60a5fa', '#34d399'][index % 4]
          return (
            <motion.div
              key={index}
              className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
              animate={{
                rotate: 360,
                opacity: [0.18, 0.9, 0.18],
                scale: [0.8, 1.4, 0.8],
              }}
              transition={{
                rotate: { duration: 9 + index * 0.2, repeat: Infinity, ease: 'linear' },
                opacity: { duration: 2.2 + index * 0.08, repeat: Infinity, ease: 'easeInOut' },
                scale: { duration: 2.2 + index * 0.08, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{
                background: color,
                boxShadow: `0 0 18px ${color}`,
                transform: `rotate(${angle}deg) translateY(-172px)`,
                transformOrigin: 'center 172px',
              }}
            />
          )
        })}
      </div>

      <div className="relative z-10 flex h-full items-center justify-center px-6">
        <div className="w-full max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="inline-flex items-center gap-3 rounded-full px-4 py-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#67e8f9',
            }}
          >
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: '#38bdf8', boxShadow: '0 0 18px #38bdf8' }} />
            <span className="text-xs font-semibold uppercase tracking-[0.24em]">{copy.kicker}</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: 'easeOut' }}
            className="mt-7 text-5xl md:text-7xl font-semibold tracking-[-0.04em]"
            style={{ color: '#f8fafc', textShadow: '0 16px 70px rgba(56,189,248,0.18)' }}
          >
            {copy.title}
            <span style={{ color: '#67e8f9' }}> {copy.accent}</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.16, ease: 'easeOut' }}
            className="mx-auto mt-5 max-w-2xl text-sm md:text-base leading-7"
            style={{ color: '#cbd5e1' }}
          >
            {copy.description}
          </motion.p>

          <div className="mt-10 space-y-3">
            {copy.statusLines.map((line, index) => (
              <motion.div
                key={line}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.55, delay: 0.34 + index * 0.16, ease: 'easeOut' }}
                className="mx-auto flex max-w-xl items-center gap-3 rounded-2xl px-4 py-3 text-left"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <motion.span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.35, 0.9] }}
                  transition={{ duration: 1.8, delay: index * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ background: index === 0 ? '#38bdf8' : index === 1 ? '#e879f9' : '#34d399' }}
                />
                <span className="text-sm" style={{ color: '#e2e8f0' }}>{line}</span>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0.86 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.52, ease: 'easeOut' }}
            className="mx-auto mt-10 h-1.5 w-full max-w-xl overflow-hidden rounded-full"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="h-full rounded-full"
              animate={{ x: ['-100%', '0%'] }}
              transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #38bdf8, #60a5fa 40%, #e879f9 78%, #34d399)',
                boxShadow: '0 0 32px rgba(56,189,248,0.35)',
              }}
              onAnimationComplete={onFinish}
            />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}
