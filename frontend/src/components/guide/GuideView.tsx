import { useState } from 'react'
import {
  BookOpen,
  Brain,
  BotMessageSquare,
  Cpu,
  FileImage,
  FileText,
  Globe,
  Lightbulb,
  MessageSquare,
  Presentation,
  Sparkles,
  Target,
  Users,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { BrandLogo } from '../layout/BrandLogo'

interface SectionProps {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, rgba(15,23,42,0.94), rgba(8,12,20,0.96))',
        border: '1px solid rgba(148,163,184,0.12)',
        borderRadius: '24px',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.35rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          transition: 'background 0.2s',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: 0 }}>
          <span style={{ color: '#67e8f9' }}>{icon}</span>
          <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.94rem' }}>{title}</span>
        </div>
        {open
          ? <ChevronDown size={16} style={{ color: '#64748b' }} />
          : <ChevronRightIcon size={16} style={{ color: '#64748b' }} />}
      </button>
      {open && (
        <div
          style={{
            padding: '0.25rem 1.35rem 1.35rem 1.35rem',
            borderTop: '1px solid rgba(148,163,184,0.1)',
            fontSize: '0.9rem',
            color: '#cbd5e1',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.8rem',
            lineHeight: 1.7,
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function Badge({ label, tone = 'cyan' }: { label: string; tone?: 'cyan' | 'green' | 'amber' | 'pink' | 'violet' }) {
  const tones = {
    cyan: { background: 'rgba(103,232,249,0.12)', color: '#67e8f9', border: '1px solid rgba(103,232,249,0.22)' },
    green: { background: 'rgba(110,231,183,0.12)', color: '#6ee7b7', border: '1px solid rgba(110,231,183,0.2)' },
    amber: { background: 'rgba(253,224,71,0.12)', color: '#fde047', border: '1px solid rgba(253,224,71,0.18)' },
    pink: { background: 'rgba(244,114,182,0.12)', color: '#f9a8d4', border: '1px solid rgba(249,168,212,0.18)' },
    violet: { background: 'rgba(196,181,253,0.12)', color: '#c4b5fd', border: '1px solid rgba(196,181,253,0.18)' },
  }
  const style = tones[tone]

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.74rem',
        fontWeight: 600,
        ...style,
      }}
    >
      {label}
    </span>
  )
}

function GuideList({ items, ordered = false }: { items: React.ReactNode[]; ordered?: boolean }) {
  const ListTag = ordered ? 'ol' : 'ul'
  return (
    <ListTag style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.55rem', listStyleType: ordered ? 'decimal' : 'disc' }}>
      {items.map((item, index) => (
        <li key={index} style={{ color: '#cbd5e1' }}>{item}</li>
      ))}
    </ListTag>
  )
}

export function GuideView() {
  return (
    <div style={{ maxWidth: '54rem', marginLeft: 'auto', marginRight: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div
        style={{
          background: 'radial-gradient(circle at top left, rgba(14,165,233,0.22), rgba(15,23,42,0.96) 42%, rgba(8,12,20,0.98))',
          borderRadius: '32px',
          padding: '2rem',
          border: '1px solid rgba(148,163,184,0.14)',
          boxShadow: '0 26px 80px rgba(2,6,23,0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <BrandLogo size={52} subtitle="Guide" />
          <Badge label="VFT Studio" tone="cyan" />
          <Badge label="Uso Atualizado" tone="green" />
        </div>

        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '-0.04em', margin: 0 }}>
          Guia de Uso
        </h1>
        <p style={{ marginTop: '0.9rem', color: '#cbd5e1', lineHeight: 1.8, maxWidth: '44rem' }}>
          O VFT Studio estrutura problemas complexos com <strong style={{ color: '#f8fafc' }}>Value-Focused Thinking</strong>,
          agentes especialistas, simulação social e uma facilitadora central chamada <strong style={{ color: '#f8fafc' }}>ARIA</strong>.
          O objetivo do produto é transformar contexto difuso em stakeholders, objetivos, relações, alternativas e um relatório final realmente apresentável.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(103,232,249,0.14)', borderRadius: '24px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#67e8f9', fontWeight: 600, marginBottom: '0.5rem' }}>
            <Cpu size={18} />
            VFT Completo com IA
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>
            O sistema pesquisa, estrutura e executa a análise quase inteira em background. Você acompanha o progresso por estados narrativos e recebe o relatório completo no final.
          </p>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(110,231,183,0.14)', borderRadius: '24px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#6ee7b7', fontWeight: 600, marginBottom: '0.5rem' }}>
            <BotMessageSquare size={18} />
            VFT Guiado
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>
            Você conduz o processo junto com a ARIA, passo a passo. É o melhor modo quando quer validar decisões metodológicas, refinar objetivos ou trabalhar com mais controle humano.
          </p>
        </div>

        <div style={{ background: 'rgba(15,23,42,0.82)', border: '1px solid rgba(196,181,253,0.14)', borderRadius: '24px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#c4b5fd', fontWeight: 600, marginBottom: '0.5rem' }}>
            <MessageSquare size={18} />
            Revisão Pós-Relatório
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: 1.7 }}>
            Depois da análise completa, você pode pedir mudanças à ARIA no Chat IA. O relatório final passa a ser tratado como material de trabalho, não como artefato fechado.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        <Section title="O que o VFT Studio faz hoje" icon={<Sparkles size={18} />} defaultOpen>
          <GuideList items={[
            <>Ajuda a conduzir o processo VFT em <strong style={{ color: '#f8fafc' }}>3 fases</strong>, cobrindo enquadramento decisório, objetivos, atributos, alternativas e consequências.</>,
            <>Permite análise automática com <strong style={{ color: '#f8fafc' }}>especialistas por fase</strong>, War Room, simulação social e relatório final.</>,
            <>Mantém um <strong style={{ color: '#f8fafc' }}>Chat IA contínuo</strong> com ARIA e outros agentes para suporte metodológico e revisão do projeto.</>,
            <>Gera artefatos visuais como <strong style={{ color: '#f8fafc' }}>nuvem de objetivos, hierarquia, rede meios-fins, mapa causal e simulação social</strong>.</>,
            <>Exporta resultados em <strong style={{ color: '#f8fafc' }}>Markdown, PDF editorial, HTML interativo em formato de slides e PNGs dos diagramas</strong>.</>,
          ]} />
        </Section>

        <Section title="Como começar um projeto" icon={<BookOpen size={18} />}>
          <GuideList ordered items={[
            <>Abra a tela <strong style={{ color: '#f8fafc' }}>Projetos</strong> e clique em <strong style={{ color: '#f8fafc' }}>Novo Projeto</strong>.</>,
            <>Defina um <strong style={{ color: '#f8fafc' }}>nome claro</strong>, uma descrição do problema e, se possível, notas de contexto organizacional.</>,
            <>Escolha a configuração inicial de stakeholders. Isso é um ponto de partida; a análise completa pode propor novos atores depois.</>,
            <>Entre no projeto e use o cabeçalho superior para escolher entre <strong style={{ color: '#f8fafc' }}>VFT Completo com IA</strong>, <strong style={{ color: '#f8fafc' }}>VFT Guiado</strong>, <strong style={{ color: '#f8fafc' }}>Chat IA</strong> ou <strong style={{ color: '#f8fafc' }}>Diagramas</strong>.</>,
          ]} />
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            Quanto melhor o contexto inicial, melhor a qualidade da definição de stakeholders, objetivos e alternativas.
          </p>
        </Section>

        <Section title="Como funciona o VFT Completo com IA" icon={<Cpu size={18} />}>
          <GuideList ordered items={[
            <>Clique em <strong style={{ color: '#f8fafc' }}>VFT Completo com IA</strong> no cabeçalho do projeto.</>,
            <>Durante a execução, a interface mostra um <strong style={{ color: '#f8fafc' }}>console visual de status</strong>. O relatório não é exibido parcialmente; ele é montado em background.</>,
            <>A análise pode passar por etapas como <strong style={{ color: '#f8fafc' }}>preparação do contexto, mapeamento de stakeholders, especialistas por fase, simulação social, War Room e síntese final</strong>.</>,
            <>Ao fim da execução, o sistema exibe o <strong style={{ color: '#f8fafc' }}>relatório consolidado</strong> junto com os artefatos interativos.</>,
            <>Depois disso, você pode clicar em <strong style={{ color: '#f8fafc' }}>Solicitar mudanças à ARIA</strong> para abrir o Chat IA já com contexto de revisão do relatório.</>,
          ]} />
          <div style={{ background: 'rgba(103,232,249,0.08)', borderRadius: '16px', padding: '0.85rem 1rem', color: '#cceff6', border: '1px solid rgba(103,232,249,0.12)' }}>
            A intenção desse modo é chegar o mais perto possível de um VFT “completo de verdade”: preencher lacunas metodológicas, propor stakeholders, estruturar objetivos e articular alternativas e consequências.
          </div>
        </Section>

        <Section title="Como funciona o VFT Guiado" icon={<BotMessageSquare size={18} />}>
          <GuideList ordered items={[
            <>Clique em <strong style={{ color: '#f8fafc' }}>VFT Guiado</strong>. A ARIA assume o papel de facilitadora principal.</>,
            <>Use o chat para responder às perguntas, validar formulações e ajustar o rumo metodológico em cada passo.</>,
            <>Quando necessário, a ARIA ajuda a transformar conversa em estrutura VFT: stakeholders, objetivos, relações, atributos e alternativas.</>,
            <>Esse modo é o melhor quando você quer <strong style={{ color: '#f8fafc' }}>mais controle humano</strong> sobre a formulação do problema, especialmente em contextos sensíveis.</>,
          ]} />
        </Section>

        <Section title="O que acontece depois do relatório final" icon={<MessageSquare size={18} />}>
          <GuideList items={[
            <>O botão <strong style={{ color: '#f8fafc' }}>Solicitar mudanças à ARIA</strong> envia você para o Chat IA com o relatório final como contexto inicial.</>,
            <>A ARIA pode discutir mudanças em <strong style={{ color: '#f8fafc' }}>stakeholders, objetivos, relações causais, alternativas, consequências, recomendações e narrativa do relatório</strong>.</>,
            <>Esse fluxo serve para transformar a análise automática em uma <strong style={{ color: '#f8fafc' }}>iteração facilitada</strong>, em vez de obrigar você a rerodar tudo sempre do zero.</>,
          ]} />
        </Section>

        <Section title="Agentes e papéis" icon={<Users size={18} />}>
          <GuideList items={[
            <><strong style={{ color: '#f8fafc' }}>ARIA</strong>: facilitadora principal, revisora pós-relatório e mediadora da War Room.</>,
            <><strong style={{ color: '#f8fafc' }}>FRAME</strong>: especialista da Fase 1, com foco em stakeholders, IDF e declaração de decisão.</>,
            <><strong style={{ color: '#f8fafc' }}>AXIOM</strong>: especialista da Fase 2, com foco em valores, objetivos, WITI, CoC e estruturação de objetivos.</>,
            <><strong style={{ color: '#f8fafc' }}>NOVA</strong>: especialista da Fase 3, com foco em alternativas e consequências.</>,
            <><strong style={{ color: '#f8fafc' }}>ANALYST</strong>: leitura e análise de documentos para apoiar o processo com evidências.</>,
            <>Além disso, a análise completa pode usar <strong style={{ color: '#f8fafc' }}>stakeholder agents</strong> e uma camada de simulação social para introduzir perspectivas, tensão, coalizões e votação.</>,
          ]} />
        </Section>

        <Section title="Documentos e base contextual" icon={<FileText size={18} />}>
          <GuideList ordered items={[
            <>Abra a área <strong style={{ color: '#f8fafc' }}>Documentos</strong> com um projeto ativo.</>,
            <>Envie PDFs, textos, atas, relatórios ou outros materiais relevantes.</>,
            <>Use a análise documental para permitir que o <strong style={{ color: '#f8fafc' }}>ANALYST</strong> extraia valores, objetivos, tensões e fontes.</>,
            <>Esses documentos podem ser usados tanto no <strong style={{ color: '#f8fafc' }}>VFT Guiado</strong> quanto no <strong style={{ color: '#f8fafc' }}>VFT Completo com IA</strong>.</>,
          ]} />
        </Section>

        <Section title="Artefatos visuais e diagramas" icon={<Target size={18} />}>
          <GuideList items={[
            <><strong style={{ color: '#f8fafc' }}>Nuvem de Objetivos</strong>: visão rápida dos objetivos mais salientes.</>,
            <><strong style={{ color: '#f8fafc' }}>Hierarquia</strong>: organização top-down de objetivos fundamentais e derivados.</>,
            <><strong style={{ color: '#f8fafc' }}>Rede Meios-Fins</strong>: ligações de suporte entre meios e fins.</>,
            <><strong style={{ color: '#f8fafc' }}>Mapa Causal</strong>: relações de influência entre objetivos e efeitos.</>,
            <><strong style={{ color: '#f8fafc' }}>Simulação Social</strong>: coalizões, votos, trajetórias de posição e convergência/conflito.</>,
          ]} />
          <p style={{ color: '#94a3b8', fontSize: '0.82rem' }}>
            Você pode acessar os diagramas pela aba lateral de <strong style={{ color: '#f8fafc' }}>Diagramas</strong> ou pelo bloco de artefatos interativos no relatório final.
          </p>
        </Section>

        <Section title="Exportações disponíveis" icon={<Presentation size={18} />}>
          <GuideList items={[
            <><strong style={{ color: '#f8fafc' }}>Markdown</strong>: ideal para documentação textual e versionamento.</>,
            <><strong style={{ color: '#f8fafc' }}>PDF editorial</strong>: pronto para leitura, impressão e compartilhamento.</>,
            <><strong style={{ color: '#f8fafc' }}>HTML interativo</strong>: apresentação em formato de slides, com foco executivo.</>,
            <><strong style={{ color: '#f8fafc' }}>PNG dos diagramas</strong>: exportação em lote dos artefatos visuais do relatório.</>,
          ]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <div style={{ borderRadius: '18px', padding: '0.9rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#67e8f9', marginBottom: '0.35rem' }}>
                <FileText size={15} />
                Relatório
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.83rem' }}>Abre em janela separada e permite escolher onde salvar.</p>
            </div>
            <div style={{ borderRadius: '18px', padding: '0.9rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fde047', marginBottom: '0.35rem' }}>
                <FileImage size={15} />
                Diagramas PNG
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.83rem' }}>Gera pré-visualização dos diagramas e salva todos os arquivos em lote.</p>
            </div>
            <div style={{ borderRadius: '18px', padding: '0.9rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(148,163,184,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', marginBottom: '0.35rem' }}>
                <Globe size={15} />
                Slides HTML
              </div>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.83rem' }}>Abre como apresentação interativa em janela própria antes do salvamento.</p>
            </div>
          </div>
        </Section>

        <Section title="Conceitos-chave do framework VFT" icon={<Brain size={18} />}>
          <GuideList items={[
            <><strong style={{ color: '#f8fafc' }}>IDF</strong>: enquadramento inicial do problema decisório, com propósito, escopo, perspectiva e declaração de decisão.</>,
            <><strong style={{ color: '#f8fafc' }}>WITI</strong>: pergunta “Why Is That Important?” para distinguir meios de fins.</>,
            <><strong style={{ color: '#f8fafc' }}>CoC</strong>: verificação complementar para validar se um objetivo é realmente fundamental.</>,
            <><strong style={{ color: '#f8fafc' }}>Atributos</strong>: forma de medir o desempenho das alternativas sobre os objetivos fundamentais.</>,
            <><strong style={{ color: '#f8fafc' }}>Matriz de Consequências</strong>: cruzamento entre alternativas e objetivos, apoiando a comparação final.</>,
          ]} />
        </Section>

        <Section title="Boas práticas para obter melhores análises" icon={<Lightbulb size={18} />}>
          <GuideList items={[
            <>Escreva uma descrição de projeto que explique <strong style={{ color: '#f8fafc' }}>quem decide, o que está em jogo, quais restrições existem e quais tensões já são percebidas</strong>.</>,
            <>Envie documentos sempre que houver base institucional, regulatória ou histórica relevante.</>,
            <>Use o <strong style={{ color: '#f8fafc' }}>VFT Completo com IA</strong> para gerar uma primeira estrutura ampla e depois refine com a ARIA via chat.</>,
            <>Não trate o relatório final como encerramento obrigatório. Ele deve ser usado como <strong style={{ color: '#f8fafc' }}>base para iteração</strong>.</>,
            <>Se um diagrama aparecer vazio, isso normalmente indica falta de dados persistidos naquela camada metodológica, não apenas um problema visual.</>,
          ]} />
        </Section>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', paddingBottom: '1rem' }}>
        VFT Studio · Guia alinhado ao fluxo atual de análise completa, revisão via ARIA e exportações nativas
      </div>
    </div>
  )
}
