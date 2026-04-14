import { useState, useEffect } from 'react'
import { Key, CheckCircle, XCircle, Loader2, Eye, EyeOff, Trash2, Globe } from 'lucide-react'
import { apiClient } from '../../api/client'

interface ApiKeyStatus {
  has_key: boolean
  key_preview: string
  source: string
}

interface TestResult {
  success: boolean
  message: string
}

export function SettingsView() {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [inputKey, setInputKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [braveStatus, setBraveStatus] = useState<ApiKeyStatus | null>(null)
  const [braveInput, setBraveInput] = useState('')
  const [braveSaving, setBraveSaving] = useState(false)
  const [braveTesting, setBraveTesting] = useState(false)
  const [braveTestResult, setBraveTestResult] = useState<TestResult | null>(null)
  const [braveSaveError, setBraveSaveError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<ApiKeyStatus>('/api/settings/api-key').then(r => setStatus(r.data)).catch(() => {})
    apiClient.get<ApiKeyStatus>('/api/settings/brave-api-key').then(r => setBraveStatus(r.data)).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setTestResult(null)
    try {
      const r = await apiClient.put<ApiKeyStatus>('/api/settings/api-key', { api_key: inputKey })
      setStatus(r.data)
      setInputKey('')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar API key.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Remover a API key salva?')) return
    await apiClient.delete('/api/settings/api-key')
    setStatus({ has_key: false, key_preview: '', source: 'none' })
    setTestResult(null)
  }

  const handleSaveBrave = async () => {
    setBraveSaving(true)
    setBraveSaveError(null)
    setBraveTestResult(null)
    try {
      const r = await apiClient.put<ApiKeyStatus>('/api/settings/brave-api-key', { api_key: braveInput })
      setBraveStatus(r.data)
      setBraveInput('')
    } catch (e: unknown) {
      setBraveSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setBraveSaving(false)
    }
  }

  const handleDeleteBrave = async () => {
    if (!confirm('Remover a Brave API key salva?')) return
    await apiClient.delete('/api/settings/brave-api-key')
    setBraveStatus({ has_key: false, key_preview: '', source: 'none' })
    setBraveTestResult(null)
  }

  const handleTestBrave = async () => {
    setBraveTesting(true)
    setBraveTestResult(null)
    try {
      const r = await apiClient.post<TestResult>('/api/settings/test-brave-connection', {})
      setBraveTestResult(r.data)
    } catch {
      setBraveTestResult({ success: false, message: 'Erro ao testar conexão.' })
    } finally {
      setBraveTesting(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await apiClient.post<TestResult>('/api/settings/test-connection', {})
      setTestResult(r.data)
    } catch {
      setTestResult({ success: false, message: 'Erro ao testar conexão.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#f1f5f9' }}>Configurações</h1>
        <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>Gerencie a API key da Anthropic e preferências do VFT Studio.</p>
      </div>

      {/* API Key section */}
      <div className="rounded-xl p-6 space-y-5" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Key size={18} className="text-indigo-600" />
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Anthropic API Key</h2>
        </div>

        {/* Current key status */}
        {status && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
            status.has_key ? 'bg-green-50 border border-green-100' : 'bg-amber-50 border border-amber-100'
          }`}>
            {status.has_key ? (
              <>
                <CheckCircle size={16} className="text-green-600 shrink-0" />
                <span className="text-green-800">
                  API key configurada ({status.source}) — <code className="font-mono">{status.key_preview}</code>
                </span>
                <button onClick={handleDelete} className="ml-auto text-gray-400 hover:text-red-500 transition-colors" title="Remover API key">
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-amber-600 shrink-0" />
                <span className="text-amber-800">Nenhuma API key configurada. O chat com IA não funcionará.</span>
              </>
            )}
          </div>
        )}

        {/* Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            {status?.has_key ? 'Atualizar API Key' : 'Inserir API Key'}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                placeholder="sk-ant-api03-..."
                style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
                className="w-full px-3 py-2 text-sm focus:outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || !inputKey.trim()}
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)', borderRadius: '8px' }}
            className="px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <p className="text-xs" style={{ color: '#64748b' }}>
            A chave é armazenada no macOS Keychain — nunca em texto simples.
            Obtenha sua key em <span className="font-mono">console.anthropic.com</span>.
          </p>
        </div>

        {/* Test connection */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testing || !status?.has_key}
            className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : null}
            Testar Conexão
          </button>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm ${testResult.success ? 'text-green-700' : 'text-red-600'}`}>
              {testResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testResult.message}
            </div>
          )}
        </div>
      </div>

      {/* Brave Search API Key section */}
      <div className="rounded-xl p-6 space-y-5" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2">
          <Globe size={18} className="text-indigo-600" />
          <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Brave Search API Key</h2>
          <span className="text-xs ml-1" style={{ color: '#64748b' }}>(opcional)</span>
        </div>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          Permite que ARIA, FRAME e ANALYST pesquisem na internet. Obtenha gratuitamente em{' '}
          <span className="font-mono text-xs">brave.com/search/api</span> (2.000 buscas/mês).
        </p>

        {braveStatus && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm ${
            braveStatus.has_key ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'
          }`}>
            {braveStatus.has_key ? (
              <>
                <CheckCircle size={16} className="text-green-600 shrink-0" />
                <span className="text-green-800">
                  Brave key configurada ({braveStatus.source}) — <code className="font-mono">{braveStatus.key_preview}</code>
                </span>
                <button onClick={handleDeleteBrave} className="ml-auto text-gray-400 hover:text-red-500 transition-colors" title="Remover">
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <span className="text-gray-500">Busca na web não configurada — agentes usarão apenas dados locais.</span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium" style={{ color: '#94a3b8' }}>
            {braveStatus?.has_key ? 'Atualizar Brave Key' : 'Inserir Brave Key'}
          </label>
          <div className="flex gap-2">
            <input
              type="password"
              value={braveInput}
              onChange={e => setBraveInput(e.target.value)}
              placeholder="BSA..."
              style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
              className="flex-1 px-3 py-2 text-sm focus:outline-none"
            />
            <button
              onClick={handleSaveBrave}
              disabled={braveSaving || !braveInput.trim()}
              style={{ background: 'rgba(232,121,249,0.15)', color: '#e879f9', border: '1px solid rgba(232,121,249,0.3)', borderRadius: '8px' }}
              className="px-4 py-2 text-sm transition-colors disabled:opacity-50"
            >
              {braveSaving ? <Loader2 size={15} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
          {braveSaveError && <p className="text-xs text-red-600">{braveSaveError}</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestBrave}
            disabled={braveTesting || !braveStatus?.has_key}
            className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 hover:border-indigo-300 hover:text-indigo-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {braveTesting ? <Loader2 size={14} className="animate-spin" /> : null}
            Testar Conexão
          </button>
          {braveTestResult && (
            <div className={`flex items-center gap-2 text-sm ${braveTestResult.success ? 'text-green-700' : 'text-red-600'}`}>
              {braveTestResult.success ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {braveTestResult.message}
            </div>
          )}
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl p-6 space-y-2" style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h2 className="font-semibold" style={{ color: '#f1f5f9' }}>Sobre</h2>
        <p className="text-sm" style={{ color: '#94a3b8' }}>
          <strong>VFT Studio</strong> — Facilitador inteligente do processo Value-Focused Thinking
          (Vieira et al., 2024). Versão 1.0.0 MVP.
        </p>
        <p className="text-sm text-gray-400">Dados armazenados localmente em <code className="font-mono">~/VFTStudio/</code></p>
      </div>
    </div>
  )
}
