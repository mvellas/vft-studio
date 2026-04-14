import { useState } from 'react'
import { ChevronRight, Key, BookOpen, FolderPlus, CheckCircle, Loader2, Globe } from 'lucide-react'
import { apiClient } from '../../api/client'

interface OnboardingFlowProps {
  onComplete: () => void
}

const SCREENS = [
  {
    id: 'welcome',
    icon: BookOpen,
    title: 'Bem-vindo ao VFT Studio',
    body: `VFT Studio é um facilitador inteligente do processo Value-Focused Thinking — uma metodologia de apoio à decisão que estrutura o problema a partir dos seus valores e objetivos, não apenas das alternativas disponíveis.\n\nEm 3 fases e 33 passos, você e sua equipe vão do enquadramento inicial à avaliação de alternativas, com suporte contínuo de agentes de IA especializados.`,
    action: 'Começar',
  },
  {
    id: 'api-key',
    icon: Key,
    title: 'Configure sua API Key',
    body: `Os agentes de IA (ARIA, FRAME, AXIOM, NOVA) usam a Anthropic Claude API.\n\nVocê precisará de uma API key para usar o chat. Obtenha a sua em console.anthropic.com.\n\nA chave é armazenada localmente no macOS Keychain — nunca é enviada a terceiros.`,
    action: 'Continuar',
  },
  {
    id: 'brave-key',
    icon: Globe,
    title: 'Busca na Web (opcional)',
    body: `Os agentes ARIA, FRAME e ANALYST podem pesquisar na internet para buscar legislações, referências e dados públicos.\n\nVocê precisará de uma Brave Search API key.\nObtenha gratuitamente em brave.com/search/api (2.000 buscas/mês).`,
    action: 'Continuar',
  },
  {
    id: 'ready',
    icon: FolderPlus,
    title: 'Tudo pronto!',
    body: `Crie seu primeiro projeto VFT para começar.\n\nCada projeto representa uma decisão que você quer estruturar. Você pode ter vários projetos e retomar cada um de onde parou.\n\nO assistente ARIA vai te guiar pelo processo do início ao fim.`,
    action: 'Criar primeiro projeto',
  },
]

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [screen, setScreen] = useState(0)
  const [apiKey, setApiKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [braveKey, setBraveKey] = useState('')
  const [braveSaved, setBraveSaved] = useState(false)

  const current = SCREENS[screen]
  const Icon = current.icon
  const isLast = screen === SCREENS.length - 1
  const isApiKeyScreen = current.id === 'api-key'
  const isBraveKeyScreen = current.id === 'brave-key'

  const handleSaveKey = async () => {
    if (!apiKey.trim()) {
      setScreen(s => s + 1)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await apiClient.put('/api/settings/api-key', { api_key: apiKey.trim() })
      setSaved(true)
      setTimeout(() => setScreen(s => s + 1), 600)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveBraveKey = async () => {
    if (!braveKey.trim()) {
      setScreen(s => s + 1)
      return
    }
    setSaving(true)
    setSaveError(null)
    try {
      await apiClient.put('/api/settings/brave-api-key', { api_key: braveKey.trim() })
      setBraveSaved(true)
      setTimeout(() => setScreen(s => s + 1), 600)
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleNext = async () => {
    if (isApiKeyScreen) {
      handleSaveKey()
      return
    }
    if (isBraveKeyScreen) {
      handleSaveBraveKey()
      return
    }
    if (isLast) {
      await apiClient.post('/api/settings/onboarding-completed', {}).catch(() => {})
      onComplete()
      return
    }
    setScreen(s => s + 1)
  }

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6" style={{ background: '#13131f' }}>
        {/* Step indicator */}
        <div className="flex gap-1.5 justify-center">
          {SCREENS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === screen ? 'w-6 bg-indigo-600' : i < screen ? 'w-3 bg-indigo-300' : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <Icon size={32} className="text-indigo-600" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-3">
          <h2 className="text-xl font-bold" style={{ color: '#f1f5f9' }}>{current.title}</h2>
          <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: '#94a3b8' }}>{current.body}</p>
        </div>

        {/* API key input on screen 2 */}
        {isApiKeyScreen && (
          <div className="space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-... (opcional agora)"
              style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
              className="w-full px-3 py-2 text-sm focus:outline-none"
            />
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle size={13} />
                API key salva no Keychain!
              </div>
            )}
            <p className="text-xs text-gray-400">Você pode pular e configurar depois em Configurações.</p>
          </div>
        )}

        {isBraveKeyScreen && (
          <div className="space-y-2">
            <input
              type="password"
              value={braveKey}
              onChange={e => setBraveKey(e.target.value)}
              placeholder="BSA... (opcional)"
              style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9', borderRadius: '8px' }}
              className="w-full px-3 py-2 text-sm focus:outline-none"
            />
            {saveError && <p className="text-xs text-red-500">{saveError}</p>}
            {braveSaved && <p className="text-xs text-green-600">Brave key salva!</p>}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : null}
          {current.action}
          {!saving && !isLast && <ChevronRight size={16} />}
        </button>
      </div>
    </div>
  )
}
