import { BookOpen, Brain, MessageSquare, BotMessageSquare, Cpu, Users, Target, Lightbulb, FileText, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-indigo-600">{icon}</span>
          <span className="font-semibold text-gray-900 text-sm">{title}</span>
        </div>
        {open ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRightIcon size={16} className="text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 bg-white border-t border-gray-100 text-sm text-gray-700 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

export function GuideView() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen size={28} />
          <h1 className="text-2xl font-bold">Guia de Uso — VFT Studio</h1>
        </div>
        <p className="text-indigo-200 leading-relaxed">
          O VFT Studio é uma plataforma de apoio à decisão baseada no framework <strong className="text-white">Value-Focused Thinking (VFT)</strong> de Vieira et al. Ele combina inteligência artificial e estruturação rigorosa de problemas para transformar decisões complexas em análises claras e fundamentadas.
        </p>
      </div>

      {/* Dois modos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-indigo-200 p-5 space-y-2">
          <div className="flex items-center gap-2 text-indigo-700 font-semibold">
            <Cpu size={18} />
            VFT com IA
          </div>
          <p className="text-sm text-gray-600">
            Análise automática completa. Os agentes especialistas executam todas as fases do VFT de forma autônoma — com debate em War Room e relatório final — sem intervenção do usuário.
          </p>
          <div className="pt-1">
            <Badge color="bg-indigo-100 text-indigo-700" label="Recomendado para exploração rápida" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 font-semibold">
            <BotMessageSquare size={18} />
            VFT Guiado
          </div>
          <p className="text-sm text-gray-600">
            ARIA facilita o processo passo a passo em conversa direta com o usuário. Você fornece os inputs, ARIA estrutura, valida e aciona os agentes especialistas conforme necessário.
          </p>
          <div className="pt-1">
            <Badge color="bg-emerald-100 text-emerald-700" label="Recomendado para análise aprofundada" />
          </div>
        </div>
      </div>

      {/* Seções expandíveis */}
      <div className="space-y-3">

        <Section title="O Framework VFT — Vieira et al." icon={<Brain size={18} />} defaultOpen>
          <p>
            O <strong>Value-Focused Thinking</strong> é uma metodologia de apoio à decisão que inverte a lógica tradicional: em vez de partir das alternativas disponíveis, parte dos <strong>valores e objetivos</strong> das partes envolvidas para então estruturar o problema e gerar alternativas superiores.
          </p>
          <p>O processo é dividido em <strong>3 fases</strong>:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>
              <strong>Fase 1 — Quadro Decisório Inicial (IDF):</strong> Mapeamento de stakeholders, perspectivas e elaboração da declaração de decisão.
            </li>
            <li>
              <strong>Fase 2 — Valores e Hierarquia de Objetivos:</strong> Elicitação de valores, categorização de objetivos (estratégicos, fundamentais, meios), Teste WITI, Controle de Consequências (CoC), Rede de Meios-Fins e definição de atributos.
            </li>
            <li>
              <strong>Fase 3 — Alternativas:</strong> Identificação e geração criativa de alternativas baseadas nos objetivos fundamentais, produzindo uma Matriz de Consequências.
            </li>
          </ol>
          <p className="text-gray-500 text-xs pt-1">
            Referência: Vieira et al. — <em>Value-Focused Thinking: A Path to Creative Decisionmaking</em>
          </p>
        </Section>

        <Section title="Como usar o VFT com IA" icon={<Cpu size={18} />}>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Abra ou crie um projeto na tela <strong>Projetos</strong>.</li>
            <li>No cabeçalho do projeto, clique em <strong>"VFT com IA"</strong>.</li>
            <li>Se o projeto ainda não tiver descrição, um modal solicitará o contexto do problema de decisão.</li>
            <li>O pipeline é iniciado: os agentes FRAME, AXIOM e NOVA analisam cada fase sequencialmente.</li>
            <li>Em seguida, ocorre o <strong>War Room</strong> — debate em 3 atos entre os especialistas, mediado por ARIA.</li>
            <li>Ao final, um relatório completo é gerado e pode ser exportado em PDF ou Markdown.</li>
          </ol>
          <div className="bg-indigo-50 rounded-lg p-3 text-indigo-800 text-xs mt-1">
            <strong>Dica:</strong> Quanto mais detalhada a descrição do projeto, mais precisa será a análise dos agentes.
          </div>
        </Section>

        <Section title="Como usar o VFT Guiado" icon={<BotMessageSquare size={18} />}>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Abra um projeto e clique em <strong>"VFT Guiado"</strong> no cabeçalho.</li>
            <li>O painel de chat abre com <strong>ARIA</strong> como facilitadora ativa.</li>
            <li>ARIA guia você pelos passos do framework com perguntas direcionadas.</li>
            <li>Responda naturalmente — ARIA interpreta suas respostas, estrutura os dados e os salva automaticamente no projeto.</li>
            <li>Quando necessário, ARIA consulta os agentes especialistas internamente (você verá indicadores discretos de "consultando FRAME/AXIOM/NOVA...").</li>
            <li>Ao concluir as três fases, ARIA consolida os resultados em um relatório estruturado.</li>
          </ol>
          <div className="bg-emerald-50 rounded-lg p-3 text-emerald-800 text-xs mt-1">
            <strong>Dica:</strong> Use este modo quando quiser controle granular sobre cada decisão ou quando o problema envolver múltiplos stakeholders reais.
          </div>
        </Section>

        <Section title="Os Agentes Especialistas" icon={<Users size={18} />}>
          <div className="space-y-3">
            <div className="flex gap-3">
              <Badge color="bg-indigo-100 text-indigo-700" label="ARIA" />
              <p className="flex-1">Facilitadora principal. Orquestra o processo VFT, guia o usuário, media debates e sintetiza resultados. Sempre responde em português (PT-BR).</p>
            </div>
            <div className="flex gap-3">
              <Badge color="bg-blue-100 text-blue-700" label="FRAME" />
              <p className="flex-1">Especialista da Fase 1. Foco em mapeamento de stakeholders, quadro decisório inicial (IDF) e declaração de decisão.</p>
            </div>
            <div className="flex gap-3">
              <Badge color="bg-amber-100 text-amber-700" label="AXIOM" />
              <p className="flex-1">Especialista da Fase 2. Elicitação de valores, categorização de objetivos, Teste WITI, CoC, Rede de Meios-Fins e atributos.</p>
            </div>
            <div className="flex gap-3">
              <Badge color="bg-emerald-100 text-emerald-700" label="NOVA" />
              <p className="flex-1">Especialista da Fase 3. Identificação e geração criativa de alternativas, Matriz de Consequências.</p>
            </div>
            <div className="flex gap-3">
              <Badge color="bg-purple-100 text-purple-700" label="ANALYST" />
              <p className="flex-1">Analista de documentos. Extrai valores, objetivos e posicionamentos de documentos organizacionais carregados no projeto.</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-xs mt-2">
            No chat, você pode convocar qualquer agente usando <code className="bg-gray-200 px-1 rounded">@ARIA</code>, <code className="bg-gray-200 px-1 rounded">@FRAME</code>, <code className="bg-gray-200 px-1 rounded">@AXIOM</code>, <code className="bg-gray-200 px-1 rounded">@NOVA</code> ou <code className="bg-gray-200 px-1 rounded">@ANALYST</code> na mensagem.
          </div>
        </Section>

        <Section title="Documentos e Análise Organizacional" icon={<FileText size={18} />}>
          <p>
            O VFT Studio permite carregar documentos organizacionais (PDFs, relatórios, atas) para contextualizar a análise.
          </p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Acesse <strong>Documentos</strong> na barra lateral com um projeto ativo.</li>
            <li>Carregue os arquivos relevantes.</li>
            <li>Clique em <strong>"Analisar documentos"</strong> — o agente ANALYST extrai valores, objetivos e posições relevantes, citando fontes.</li>
            <li>No modo <strong>"VFT com IA"</strong>, a Fase 4 automaticamente cruza os documentos com as análises das fases anteriores.</li>
          </ol>
        </Section>

        <Section title="Conceitos-Chave do VFT" icon={<Target size={18} />}>
          <div className="space-y-3">
            <div>
              <strong>IDF — Initial Decision Frame</strong>
              <p className="text-gray-600 mt-0.5">Enquadramento inicial do problema: quem decide, qual o escopo, qual a perspectiva. Define os limites da análise.</p>
            </div>
            <div>
              <strong>Teste WITI (Why Is That Important?)</strong>
              <p className="text-gray-600 mt-0.5">Técnica para identificar objetivos fundamentais: pergunta-se "por que isso é importante?" até chegar em valores que são fins em si mesmos.</p>
            </div>
            <div>
              <strong>CoC — Controle de Consequências</strong>
              <p className="text-gray-600 mt-0.5">Duas perguntas que validam se um objetivo é realmente fundamental: (1) Você pode controlar as consequências? (2) O objetivo é um fim em si mesmo?</p>
            </div>
            <div>
              <strong>Rede de Meios-Fins</strong>
              <p className="text-gray-600 mt-0.5">Mapa visual das relações de suporte entre objetivos de meios e fundamentais.</p>
            </div>
            <div>
              <strong>Matriz de Consequências</strong>
              <p className="text-gray-600 mt-0.5">Tabela que cruza as alternativas geradas com os objetivos fundamentais e seus atributos de medição.</p>
            </div>
          </div>
        </Section>

        <Section title="Dicas de Uso Avançado" icon={<Lightbulb size={18} />}>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Chat livre com agentes:</strong> Além dos modos estruturados, você pode conversar livremente com qualquer agente pelo botão <strong>"Chat IA"</strong> no cabeçalho do projeto.
            </li>
            <li>
              <strong>Exportação:</strong> Relatórios podem ser exportados em <strong>Markdown</strong> ou <strong>PDF</strong> pelo botão de exportação na visualização do relatório.
            </li>
            <li>
              <strong>Múltiplos projetos:</strong> Crie projetos separados para diferentes decisões. Cada projeto mantém seu próprio histórico de análise, documentos e chat.
            </li>
            <li>
              <strong>Roteamento automático:</strong> No chat, se você não especificar um agente com <code className="bg-gray-200 px-1 rounded text-xs">@</code>, o sistema roteia automaticamente para o agente mais adequado com base no conteúdo da mensagem.
            </li>
            <li>
              <strong>Histórico de análises:</strong> Cada execução do pipeline fica salva no histórico do projeto, permitindo comparar diferentes análises ao longo do tempo.
            </li>
          </ul>
        </Section>

        <Section title="Chat de Suporte" icon={<MessageSquare size={18} />}>
          <p>
            Em qualquer momento, você pode abrir o chat com ARIA para tirar dúvidas sobre o processo VFT, pedir orientação sobre qual passo executar a seguir, ou solicitar explicações sobre conceitos do framework.
          </p>
          <p>
            ARIA tem acesso ao contexto completo do seu projeto — incluindo stakeholders, objetivos e alternativas já registrados — e pode buscar informações na web quando necessário.
          </p>
          <div className="bg-indigo-50 rounded-lg p-3 text-indigo-800 text-xs">
            Clique em <strong>"Chat IA"</strong> no cabeçalho do projeto para abrir o painel de chat a qualquer momento.
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pb-4">
        VFT Studio · Baseado no framework Value-Focused Thinking de Vieira et al.
      </div>
    </div>
  )
}
