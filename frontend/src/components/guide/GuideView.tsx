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
    <div style={{ background: '#0e0e13', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem',
          background: '#0e0e13',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
          textAlign: 'left'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        onMouseLeave={(e) => e.currentTarget.style.background = '#0e0e13'}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ color: '#e879f9' }}>{icon}</span>
          <span style={{ fontWeight: '600', color: '#f1f5f9', fontSize: '0.875rem' }}>{title}</span>
        </div>
        {open ? <ChevronDown size={16} style={{ color: '#475569' }} /> : <ChevronRightIcon size={16} style={{ color: '#475569' }} />}
      </button>
      {open && (
        <div style={{ padding: '0.25rem 1.25rem 1.25rem 1.25rem', background: '#0e0e13', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.875rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Badge({ color, label }: { color: string; label: string }) {
  const badgeStyles: { [key: string]: { background: string; color: string } } = {
    'bg-indigo-100 text-indigo-700': { background: 'rgba(232,121,249,0.12)', color: '#e879f9' },
    'bg-emerald-100 text-emerald-700': { background: 'rgba(16,185,129,0.12)', color: '#10b981' },
    'bg-blue-100 text-blue-700': { background: 'rgba(59,130,246,0.12)', color: '#3b82f6' },
    'bg-amber-100 text-amber-700': { background: 'rgba(245,158,11,0.12)', color: '#f59e0b' },
    'bg-purple-100 text-purple-700': { background: 'rgba(168,85,247,0.12)', color: '#a855f7' },
  }

  const style = badgeStyles[color] || { background: 'rgba(232,121,249,0.12)', color: '#e879f9' }

  return (
    <span style={{ display: 'inline-block', fontSize: '0.75rem', fontWeight: '500', padding: '0.125rem 0.5rem', borderRadius: '9999px', ...style }}>
      {label}
    </span>
  )
}

export function GuideView() {
  return (
    <div style={{ maxWidth: '48rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(to bottom right, #e879f9, #a855f7)', borderRadius: '1rem', padding: '2rem', color: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <BookOpen size={28} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Guia de Uso — VFT Studio</h1>
        </div>
        <p style={{ lineHeight: '1.625', color: '#e879f9' }}>
          O VFT Studio é uma plataforma de apoio à decisão baseada no framework <strong style={{ color: '#f8fafc' }}>Value-Focused Thinking (VFT)</strong> de Vieira et al. Ele combina inteligência artificial e estruturação rigorosa de problemas para transformar decisões complexas em análises claras e fundamentadas.
        </p>
      </div>

      {/* Dois modos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div style={{ background: '#0e0e13', borderRadius: '0.75rem', border: '1px solid rgba(232,121,249,0.2)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e879f9', fontWeight: '600' }}>
            <Cpu size={18} />
            VFT com IA
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            Análise automática completa. Os agentes especialistas executam todas as fases do VFT de forma autônoma — com debate em War Room e relatório final — sem intervenção do usuário.
          </p>
          <div style={{ paddingTop: '0.25rem' }}>
            <Badge color="bg-indigo-100 text-indigo-700" label="Recomendado para exploração rápida" />
          </div>
        </div>
        <div style={{ background: '#0e0e13', borderRadius: '0.75rem', border: '1px solid rgba(16,185,129,0.2)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: '600' }}>
            <BotMessageSquare size={18} />
            VFT Guiado
          </div>
          <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
            ARIA facilita o processo passo a passo em conversa direta com o usuário. Você fornece os inputs, ARIA estrutura, valida e aciona os agentes especialistas conforme necessário.
          </p>
          <div style={{ paddingTop: '0.25rem' }}>
            <Badge color="bg-emerald-100 text-emerald-700" label="Recomendado para análise aprofundada" />
          </div>
        </div>
      </div>

      {/* Seções expandíveis */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        <Section title="O Framework VFT — Vieira et al." icon={<Brain size={18} />} defaultOpen>
          <p style={{ color: '#94a3b8' }}>
            O <strong style={{ color: '#f1f5f9' }}>Value-Focused Thinking</strong> é uma metodologia de apoio à decisão que inverte a lógica tradicional: em vez de partir das alternativas disponíveis, parte dos <strong style={{ color: '#f1f5f9' }}>valores e objetivos</strong> das partes envolvidas para então estruturar o problema e gerar alternativas superiores.
          </p>
          <p style={{ color: '#94a3b8' }}>O processo é dividido em <strong style={{ color: '#f1f5f9' }}>3 fases</strong>:</p>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Fase 1 — Quadro Decisório Inicial (IDF):</strong> Mapeamento de stakeholders, perspectivas e elaboração da declaração de decisão.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Fase 2 — Valores e Hierarquia de Objetivos:</strong> Elicitação de valores, categorização de objetivos (estratégicos, fundamentais, meios), Teste WITI, Controle de Consequências (CoC), Rede de Meios-Fins e definição de atributos.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Fase 3 — Alternativas:</strong> Identificação e geração criativa de alternativas baseadas nos objetivos fundamentais, produzindo uma Matriz de Consequências.
            </li>
          </ol>
          <p style={{ color: '#64748b', fontSize: '0.75rem', paddingTop: '0.25rem' }}>
            Referência: Vieira et al. — <em>Value-Focused Thinking: A Path to Creative Decisionmaking</em>
          </p>
        </Section>

        <Section title="Como usar o VFT com IA" icon={<Cpu size={18} />}>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ color: '#94a3b8' }}>Abra ou crie um projeto na tela <strong style={{ color: '#f1f5f9' }}>Projetos</strong>.</li>
            <li style={{ color: '#94a3b8' }}>No cabeçalho do projeto, clique em <strong style={{ color: '#f1f5f9' }}>"VFT com IA"</strong>.</li>
            <li style={{ color: '#94a3b8' }}>Se o projeto ainda não tiver descrição, um modal solicitará o contexto do problema de decisão.</li>
            <li style={{ color: '#94a3b8' }}>O pipeline é iniciado: os agentes FRAME, AXIOM e NOVA analisam cada fase sequencialmente.</li>
            <li style={{ color: '#94a3b8' }}>Em seguida, ocorre o <strong style={{ color: '#f1f5f9' }}>War Room</strong> — debate em 3 atos entre os especialistas, mediado por ARIA.</li>
            <li style={{ color: '#94a3b8' }}>Ao final, um relatório completo é gerado e pode ser exportado em PDF ou Markdown.</li>
          </ol>
          <div style={{ background: 'rgba(232,121,249,0.08)', borderRadius: '0.5rem', padding: '0.75rem', color: '#e879f9', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <strong>Dica:</strong> Quanto mais detalhada a descrição do projeto, mais precisa será a análise dos agentes.
          </div>
        </Section>

        <Section title="Como usar o VFT Guiado" icon={<BotMessageSquare size={18} />}>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ color: '#94a3b8' }}>Abra um projeto e clique em <strong style={{ color: '#f1f5f9' }}>"VFT Guiado"</strong> no cabeçalho.</li>
            <li style={{ color: '#94a3b8' }}>O painel de chat abre com <strong style={{ color: '#f1f5f9' }}>ARIA</strong> como facilitadora ativa.</li>
            <li style={{ color: '#94a3b8' }}>ARIA guia você pelos passos do framework com perguntas direcionadas.</li>
            <li style={{ color: '#94a3b8' }}>Responda naturalmente — ARIA interpreta suas respostas, estrutura os dados e os salva automaticamente no projeto.</li>
            <li style={{ color: '#94a3b8' }}>Quando necessário, ARIA consulta os agentes especialistas internamente (você verá indicadores discretos de "consultando FRAME/AXIOM/NOVA...").</li>
            <li style={{ color: '#94a3b8' }}>Ao concluir as três fases, ARIA consolida os resultados em um relatório estruturado.</li>
          </ol>
          <div style={{ background: 'rgba(16,185,129,0.08)', borderRadius: '0.5rem', padding: '0.75rem', color: '#10b981', fontSize: '0.75rem', marginTop: '0.25rem' }}>
            <strong>Dica:</strong> Use este modo quando quiser controle granular sobre cada decisão ou quando o problema envolver múltiplos stakeholders reais.
          </div>
        </Section>

        <Section title="Os Agentes Especialistas" icon={<Users size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Badge color="bg-indigo-100 text-indigo-700" label="ARIA" />
              <p style={{ flex: 1, color: '#94a3b8' }}>Facilitadora principal. Orquestra o processo VFT, guia o usuário, media debates e sintetiza resultados. Sempre responde em português (PT-BR).</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Badge color="bg-blue-100 text-blue-700" label="FRAME" />
              <p style={{ flex: 1, color: '#94a3b8' }}>Especialista da Fase 1. Foco em mapeamento de stakeholders, quadro decisório inicial (IDF) e declaração de decisão.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Badge color="bg-amber-100 text-amber-700" label="AXIOM" />
              <p style={{ flex: 1, color: '#94a3b8' }}>Especialista da Fase 2. Elicitação de valores, categorização de objetivos, Teste WITI, CoC, Rede de Meios-Fins e atributos.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Badge color="bg-emerald-100 text-emerald-700" label="NOVA" />
              <p style={{ flex: 1, color: '#94a3b8' }}>Especialista da Fase 3. Identificação e geração criativa de alternativas, Matriz de Consequências.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Badge color="bg-purple-100 text-purple-700" label="ANALYST" />
              <p style={{ flex: 1, color: '#94a3b8' }}>Analista de documentos. Extrai valores, objetivos e posicionamentos de documentos organizacionais carregados no projeto.</p>
            </div>
          </div>
          <div style={{ background: '#07070c', borderRadius: '0.5rem', padding: '0.75rem', color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.06)' }}>
            No chat, você pode convocar qualquer agente usando <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa' }}>@ARIA</code>, <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa' }}>@FRAME</code>, <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa' }}>@AXIOM</code>, <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa' }}>@NOVA</code> ou <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa' }}>@ANALYST</code> na mensagem.
          </div>
        </Section>

        <Section title="Documentos e Análise Organizacional" icon={<FileText size={18} />}>
          <p style={{ color: '#94a3b8' }}>
            O VFT Studio permite carregar documentos organizacionais (PDFs, relatórios, atas) para contextualizar a análise.
          </p>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ color: '#94a3b8' }}>Acesse <strong style={{ color: '#f1f5f9' }}>Documentos</strong> na barra lateral com um projeto ativo.</li>
            <li style={{ color: '#94a3b8' }}>Carregue os arquivos relevantes.</li>
            <li style={{ color: '#94a3b8' }}>Clique em <strong style={{ color: '#f1f5f9' }}>"Analisar documentos"</strong> — o agente ANALYST extrai valores, objetivos e posições relevantes, citando fontes.</li>
            <li style={{ color: '#94a3b8' }}>No modo <strong style={{ color: '#f1f5f9' }}>"VFT com IA"</strong>, a Fase 4 automaticamente cruza os documentos com as análises das fases anteriores.</li>
          </ol>
        </Section>

        <Section title="Conceitos-Chave do VFT" icon={<Target size={18} />}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <strong style={{ color: '#f1f5f9' }}>IDF — Initial Decision Frame</strong>
              <p style={{ color: '#94a3b8', marginTop: '0.125rem' }}>Enquadramento inicial do problema: quem decide, qual o escopo, qual a perspectiva. Define os limites da análise.</p>
            </div>
            <div>
              <strong style={{ color: '#f1f5f9' }}>Teste WITI (Why Is That Important?)</strong>
              <p style={{ color: '#94a3b8', marginTop: '0.125rem' }}>Técnica para identificar objetivos fundamentais: pergunta-se "por que isso é importante?" até chegar em valores que são fins em si mesmos.</p>
            </div>
            <div>
              <strong style={{ color: '#f1f5f9' }}>CoC — Controle de Consequências</strong>
              <p style={{ color: '#94a3b8', marginTop: '0.125rem' }}>Duas perguntas que validam se um objetivo é realmente fundamental: (1) Você pode controlar as consequências? (2) O objetivo é um fim em si mesmo?</p>
            </div>
            <div>
              <strong style={{ color: '#f1f5f9' }}>Rede de Meios-Fins</strong>
              <p style={{ color: '#94a3b8', marginTop: '0.125rem' }}>Mapa visual das relações de suporte entre objetivos de meios e fundamentais.</p>
            </div>
            <div>
              <strong style={{ color: '#f1f5f9' }}>Matriz de Consequências</strong>
              <p style={{ color: '#94a3b8', marginTop: '0.125rem' }}>Tabela que cruza as alternativas geradas com os objetivos fundamentais e seus atributos de medição.</p>
            </div>
          </div>
        </Section>

        <Section title="Dicas de Uso Avançado" icon={<Lightbulb size={18} />}>
          <ul style={{ listStyleType: 'disc', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Chat livre com agentes:</strong> Além dos modos estruturados, você pode conversar livremente com qualquer agente pelo botão <strong style={{ color: '#f1f5f9' }}>"Chat IA"</strong> no cabeçalho do projeto.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Exportação:</strong> Relatórios podem ser exportados em <strong style={{ color: '#f1f5f9' }}>Markdown</strong> ou <strong style={{ color: '#f1f5f9' }}>PDF</strong> pelo botão de exportação na visualização do relatório.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Múltiplos projetos:</strong> Crie projetos separados para diferentes decisões. Cada projeto mantém seu próprio histórico de análise, documentos e chat.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Roteamento automático:</strong> No chat, se você não especificar um agente com <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '3px', color: '#a78bfa', fontSize: '0.75rem' }}>@</code>, o sistema roteia automaticamente para o agente mais adequado com base no conteúdo da mensagem.
            </li>
            <li style={{ color: '#94a3b8' }}>
              <strong style={{ color: '#f1f5f9' }}>Histórico de análises:</strong> Cada execução do pipeline fica salva no histórico do projeto, permitindo comparar diferentes análises ao longo do tempo.
            </li>
          </ul>
        </Section>

        <Section title="Chat de Suporte" icon={<MessageSquare size={18} />}>
          <p style={{ color: '#94a3b8' }}>
            Em qualquer momento, você pode abrir o chat com ARIA para tirar dúvidas sobre o processo VFT, pedir orientação sobre qual passo executar a seguir, ou solicitar explicações sobre conceitos do framework.
          </p>
          <p style={{ color: '#94a3b8' }}>
            ARIA tem acesso ao contexto completo do seu projeto — incluindo stakeholders, objetivos e alternativas já registrados — e pode buscar informações na web quando necessário.
          </p>
          <div style={{ background: 'rgba(232,121,249,0.08)', borderRadius: '0.5rem', padding: '0.75rem', color: '#e879f9', fontSize: '0.75rem' }}>
            Clique em <strong>"Chat IA"</strong> no cabeçalho do projeto para abrir o painel de chat a qualquer momento.
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', paddingBottom: '1rem' }}>
        VFT Studio · Baseado no framework Value-Focused Thinking de Vieira et al.
      </div>
    </div>
  )
}
