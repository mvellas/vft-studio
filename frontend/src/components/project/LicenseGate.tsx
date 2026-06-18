import { useState } from 'react'
import { CheckCircle, KeyRound, Loader2, XCircle } from 'lucide-react'
import { apiClient } from '../../api/client'

interface LicenseGateProps {
  catalogLoaded: boolean
  onActivated: () => void
}

interface LicenseStatus {
  activated: boolean
  key_preview: string
  serial_catalog_loaded: boolean
}

function formatSerial(value: string) {
  const raw = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const body = raw.startsWith('VFT') ? raw.slice(3) : raw
  const chunks = body.slice(0, 16).match(/.{1,4}/g) ?? []
  return ['VFT', ...chunks].join('-')
}

export function LicenseGate({ catalogLoaded, onActivated }: LicenseGateProps) {
  const [serialKey, setSerialKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleActivate = async () => {
    setSaving(true)
    setError(null)
    try {
      const r = await apiClient.post<LicenseStatus>('/api/license/activate', {
        serial_key: serialKey,
      })
      if (r.data.activated) {
        setSuccess(true)
        setTimeout(onActivated, 350)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Serial key inválida.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#080a12' }}>
      <div className="w-full max-w-md rounded-xl p-8 space-y-6" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="space-y-3 text-center">
          <div className="mx-auto w-14 h-14 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.12)' }}>
            <KeyRound size={28} style={{ color: '#60a5fa' }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>Ativar VFT Studio</h1>
            <p className="text-sm mt-2 leading-relaxed" style={{ color: '#94a3b8' }}>
              Insira sua serial key para acessar o aplicativo neste computador.
            </p>
          </div>
        </div>

        {!catalogLoaded && (
          <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <span>Este build não contém a lista local de seriais. Gere o pacote novamente nesta máquina.</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>Serial key</label>
          <input
            value={serialKey}
            onChange={e => setSerialKey(formatSerial(e.target.value))}
            placeholder="VFT-XXXX-XXXX-XXXX-XXXX"
            className="w-full px-3 py-3 text-sm font-mono focus:outline-none"
            style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && (
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle size={13} />
              Licença ativada.
            </div>
          )}
        </div>

        <button
          onClick={handleActivate}
          disabled={saving || !catalogLoaded || serialKey.length < 23}
          className="w-full flex items-center justify-center gap-2 font-semibold py-3 px-5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#4f46e5', color: '#ffffff', borderRadius: '8px' }}
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          Ativar
        </button>
      </div>
    </div>
  )
}
