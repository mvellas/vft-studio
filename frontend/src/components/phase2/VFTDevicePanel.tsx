import { Play } from 'lucide-react'

interface VFTDevicePanelProps {
  projectId: string
  stakeholderId: string | null
}

interface VFTDevice {
  id: number
  name: string
  question: string
}

const VFT_DEVICES: VFTDevice[] = [
  {
    id: 1,
    name: 'Wish List',
    question: 'Se voce pudesse ter qualquer resultado desejado nesta decisao, o que desejaria?',
  },
  {
    id: 2,
    name: 'Alternatives',
    question: 'Que alternativas voce consideraria? O que diferencia uma boa alternativa de uma ruim?',
  },
  {
    id: 3,
    name: 'Problems and Shortcomings',
    question: 'Quais problemas ou deficiencias existem na situacao atual?',
  },
  {
    id: 4,
    name: 'Consequences',
    question: 'Quais consequencias voce mais teme ou mais valoriza?',
  },
  {
    id: 5,
    name: 'Goals, Constraints and Guidelines',
    question: 'Quais metas, restricoes ou diretrizes devem ser respeitadas?',
  },
  {
    id: 6,
    name: 'Different Perspectives',
    question: 'Como outros stakeholders veriam esta decisao?',
  },
  {
    id: 7,
    name: 'Strategic Objectives',
    question: 'Quais objetivos estrategicos de alto nivel esta decisao deveria apoiar?',
  },
  {
    id: 8,
    name: 'Generic Objectives',
    question:
      'Quais valores genericos (clientes, funcionarios, sociedade, meio ambiente) sao relevantes?',
  },
  {
    id: 9,
    name: 'Structuring Objectives',
    question: 'Por que cada objetivo e importante? (proto-WITI)',
  },
  {
    id: 10,
    name: 'Quantifying Objectives',
    question: 'Como voce mediria o sucesso de cada objetivo?',
  },
]

export function VFTDevicePanel({ projectId: _projectId, stakeholderId }: VFTDevicePanelProps) {
  const handleStart = (device: VFTDevice) => {
    // Placeholder: actual interview integration via AXIOM chat endpoints (03-01)
    console.info('Starting VFT device interview:', device.id, device.name)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold" style={{ color: '#f8fafc' }}>Dispositivos VFT</h3>
        <span className="text-xs" style={{ color: '#64748b' }}>
          {VFT_DEVICES.length} dispositivos disponíveis
        </span>
      </div>

      {!stakeholderId && (
        <div className="rounded-md p-3" style={{ background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.2)' }}>
          <p className="text-sm" style={{ color: '#60a5fa' }}>
            Selecione um stakeholder para iniciar a elicitacao com dispositivos VFT
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {VFT_DEVICES.map(device => (
          <div
            key={device.id}
            className="rounded-lg p-4 flex flex-col gap-3"
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center" style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9' }}>
                {device.id}
              </span>
              <span className="text-sm font-semibold" style={{ color: '#f8fafc' }}>{device.name}</span>
            </div>

            <p className="text-sm leading-relaxed flex-1" style={{ color: '#94a3b8' }}>{device.question}</p>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => handleStart(device)}
                disabled={!stakeholderId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)' }}
              >
                <Play className="w-3.5 h-3.5" />
                Iniciar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
