import type { Objective, ObjectiveNetwork } from '../../api/objectives'
import type { SocialSimulationInfo } from '../../api/pipeline'

interface BuildInteractiveReportArgs {
  projectName: string
  reportHtml: string
  fullDocumentHtml: string
  socialSimulation: SocialSimulationInfo | null
  objectives: Objective[]
  objectiveNetwork: ObjectiveNetwork | null
}

interface BuildPrintableReportArgs extends BuildInteractiveReportArgs {
  exportedAt?: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function objectiveTone(objective: Objective): { bg: string; color: string } {
  if (objective.witi_classification === 'fundamental') {
    return { bg: 'rgba(251,191,36,0.14)', color: '#fbbf24' }
  }
  if (objective.parent_id) {
    return { bg: 'rgba(96,165,250,0.14)', color: '#60a5fa' }
  }
  return { bg: 'rgba(232,121,249,0.14)', color: '#e879f9' }
}

function buildObjectivesCloud(objectives: Objective[]): string {
  const visible = objectives.filter((objective) => objective.deleted === 0)
  if (visible.length === 0) {
    return '<p class="muted">Nenhum objetivo disponivel.</p>'
  }
  return `
    <div class="tag-cloud">
      ${visible.map((objective) => {
        const tone = objectiveTone(objective)
        const size = objective.witi_classification === 'fundamental' ? 1.35 : objective.parent_id ? 1.08 : 0.96
        return `
          <span class="tag-pill" style="background:${tone.bg};color:${tone.color};font-size:${size}rem">
            ${escapeHtml(objective.statement)}
          </span>
        `
      }).join('')}
    </div>
  `
}

function buildObjectivesHierarchy(objectives: Objective[]): string {
  const visible = objectives.filter((objective) => objective.deleted === 0)
  if (visible.length === 0) {
    return '<p class="muted">Nenhuma hierarquia disponivel.</p>'
  }

  const byParent = new Map<string | null, Objective[]>()
  visible.forEach((objective) => {
    const key = objective.parent_id ?? null
    const current = byParent.get(key) ?? []
    current.push(objective)
    byParent.set(key, current)
  })

  const renderTree = (parentId: string | null): string => {
    const children = (byParent.get(parentId) ?? [])
      .slice()
      .sort((a, b) => a.order_index - b.order_index || a.statement.localeCompare(b.statement))
    if (children.length === 0) return ''
    return `
      <ul class="tree-list">
        ${children.map((objective) => `
          <li>
            <div class="tree-card">
              <strong>${escapeHtml(objective.statement)}</strong>
              <span>${escapeHtml(objective.witi_classification || objective.type || 'objetivo')}</span>
            </div>
            ${renderTree(objective.id)}
          </li>
        `).join('')}
      </ul>
    `
  }

  return renderTree(null)
}

function buildObjectiveNetwork(objectives: Objective[], network: ObjectiveNetwork | null): string {
  const visibleObjectives = objectives.filter((objective) => objective.deleted === 0)
  const visibleNodes = network?.nodes?.filter((node) => node.deleted === 0) ?? visibleObjectives
  const visibleEdges = network?.edges ?? []
  if (visibleNodes.length === 0) {
    return '<p class="muted">Nenhuma rede de objetivos disponivel.</p>'
  }

  const width = 920
  const height = 420
  const radius = Math.min(width, height) * 0.34
  const positions = new Map<string, { x: number; y: number }>()
  visibleNodes.forEach((node, index) => {
    const angle = ((Math.PI * 2) / Math.max(visibleNodes.length, 1)) * index - Math.PI / 2
    positions.set(node.id, {
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    })
  })

  return `
    <svg viewBox="0 0 ${width} ${height}" class="network-svg" role="img" aria-label="Rede de objetivos">
      ${visibleEdges.map((edge) => {
        const from = positions.get(edge.from_obj)
        const to = positions.get(edge.to_obj)
        if (!from || !to) return ''
        return `
          <line
            x1="${from.x}"
            y1="${from.y}"
            x2="${to.x}"
            y2="${to.y}"
            stroke="rgba(96,165,250,0.35)"
            stroke-width="2"
            stroke-dasharray="6 8"
          />
        `
      }).join('')}
      ${visibleNodes.map((node) => {
        const position = positions.get(node.id)
        if (!position) return ''
        const tone = objectiveTone(node)
        return `
          <g transform="translate(${position.x}, ${position.y})">
            <circle r="34" fill="${tone.bg.replace('0.14', '0.24')}" stroke="${tone.color}" stroke-width="2.5" />
            <foreignObject x="-78" y="44" width="156" height="72">
              <div xmlns="http://www.w3.org/1999/xhtml" class="network-label" style="color:${tone.color}">
                ${escapeHtml(node.statement)}
              </div>
            </foreignObject>
          </g>
        `
      }).join('')}
    </svg>
  `
}

function buildSocialSection(socialSimulation: SocialSimulationInfo | null): string {
  if (!socialSimulation) {
    return '<p class="muted">Nenhuma simulacao social foi registrada para este projeto.</p>'
  }

  const dominantVote = Object.entries(socialSimulation.summary.votes ?? {}).sort((a, b) => b[1] - a[1])[0]
  const dominantVoteLabel = dominantVote
    ? ({
        approve: 'Aprova',
        approve_with_conditions: 'Aprova com condicoes',
        delay: 'Adia',
        reject: 'Rejeita',
      }[dominantVote[0]] ?? dominantVote[0])
    : 'Sem consenso'

  const participants = socialSimulation.summary.participants ?? []
  const maxVote = Math.max(1, ...Object.values(socialSimulation.summary.votes ?? {}))

  return `
    <div class="stats-grid">
      <div class="stat-card"><span>Participantes</span><strong>${participants.length}</strong></div>
      <div class="stat-card"><span>Coalizoes</span><strong>${socialSimulation.summary.coalitions.length}</strong></div>
      <div class="stat-card"><span>Conflitos</span><strong>${socialSimulation.summary.top_conflicts.length}</strong></div>
      <div class="stat-card"><span>Voto dominante</span><strong>${escapeHtml(dominantVoteLabel)}</strong></div>
    </div>

    <div class="subtabs" data-tab-group="social">
      <button class="subtab active" data-tab-target="social-coalitions">Coalizoes</button>
      <button class="subtab" data-tab-target="social-votes">Votacao</button>
      <button class="subtab" data-tab-target="social-trajectory">Trajetorias</button>
      <button class="subtab" data-tab-target="social-map">Mapa social</button>
    </div>

    <div class="subtab-panel active" data-tab-panel="social-coalitions">
      <div class="card-grid">
        ${socialSimulation.summary.coalitions.map((coalition) => `
          <article class="surface-card">
            <p class="eyebrow">Coalizao</p>
            <h4>${escapeHtml(coalition.tag)}</h4>
            <div class="chip-row">
              ${coalition.members.map((member) => `<span class="mini-chip">${escapeHtml(member)}</span>`).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    </div>

    <div class="subtab-panel" data-tab-panel="social-votes">
      <div class="bars">
        ${Object.entries(socialSimulation.summary.votes ?? {}).map(([key, value]) => `
          <div class="bar-row">
            <div class="bar-head">
              <span>${escapeHtml(({ approve: 'Aprova', approve_with_conditions: 'Aprova com condicoes', delay: 'Adia', reject: 'Rejeita' }[key] ?? key))}</span>
              <strong>${value}</strong>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width:${(value / maxVote) * 100}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="subtab-panel" data-tab-panel="social-trajectory">
      ${buildSocialTrajectorySvg(participants)}
    </div>

    <div class="subtab-panel" data-tab-panel="social-map">
      ${buildSocialMapSvg(participants)}
      ${socialSimulation.summary.top_conflicts.length > 0 ? `
        <div class="chip-row top-space">
          ${socialSimulation.summary.top_conflicts.map((conflict) => `<span class="mini-chip conflict-chip">${escapeHtml(conflict)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `
}

function buildSocialTrajectorySvg(participants: SocialSimulationInfo['summary']['participants']): string {
  if (!participants || participants.length === 0) {
    return '<p class="muted">Nenhuma trajetoria social disponivel.</p>'
  }

  const width = 920
  const height = 320
  const paddingX = 48
  const paddingY = 24
  const palette = ['#60a5fa', '#f97316', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#fb7185']
  const maxRound = Math.max(1, ...participants.flatMap((participant) => participant.trajectory.map((point) => point.round)))
  const mapY = (score: number) => {
    const clamped = Math.max(-10, Math.min(10, score))
    return height - paddingY - ((clamped + 10) / 20) * (height - paddingY * 2)
  }

  return `
    <svg viewBox="0 0 ${width} ${height}" class="network-svg" role="img" aria-label="Trajetoria social">
      ${[-10, -5, 0, 5, 10].map((value) => {
        const y = mapY(value)
        return `
          <g>
            <line x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" stroke="rgba(148,163,184,0.18)" stroke-dasharray="6 8" />
            <text x="12" y="${y + 4}" fill="#64748b" font-size="11">${value}</text>
          </g>
        `
      }).join('')}
      ${Array.from({ length: maxRound }, (_, idx) => {
        const round = idx + 1
        const x = paddingX + ((width - paddingX * 2) / Math.max(maxRound - 1, 1)) * idx
        return `
          <g>
            <line x1="${x}" y1="${paddingY}" x2="${x}" y2="${height - paddingY}" stroke="rgba(148,163,184,0.10)" />
            <text x="${x}" y="${height - 6}" fill="#94a3b8" font-size="11" text-anchor="middle">R${round}</text>
          </g>
        `
      }).join('')}
      ${participants.map((participant, index) => {
        const color = palette[index % palette.length]
        const points = participant.trajectory.map((point) => {
          const x = paddingX + ((width - paddingX * 2) / Math.max(maxRound - 1, 1)) * Math.max(point.round - 1, 0)
          const y = mapY(point.stance_score)
          return `${x},${y}`
        }).join(' ')
        return `
          <g>
            <polyline fill="none" stroke="${color}" stroke-width="3.5" points="${points}" />
            ${participant.trajectory.map((point) => {
              const x = paddingX + ((width - paddingX * 2) / Math.max(maxRound - 1, 1)) * Math.max(point.round - 1, 0)
              const y = mapY(point.stance_score)
              return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" />`
            }).join('')}
          </g>
        `
      }).join('')}
    </svg>
    <div class="chip-row">
      ${participants.map((participant, index) => `<span class="mini-chip" style="border-color:${palette[index % palette.length]}44;color:${palette[index % palette.length]}">${escapeHtml(participant.name)}</span>`).join('')}
    </div>
  `
}

function buildSocialMapSvg(participants: SocialSimulationInfo['summary']['participants']): string {
  if (!participants || participants.length === 0) {
    return '<p class="muted">Nenhum mapa social disponivel.</p>'
  }

  const width = 920
  const height = 520
  const radius = Math.min(width, height) * 0.32
  const palette = ['#60a5fa', '#f97316', '#34d399', '#f472b6', '#fbbf24', '#38bdf8', '#a78bfa', '#fb7185']
  const nodes = participants.map((participant, index) => {
    const angle = ((Math.PI * 2) / Math.max(participants.length, 1)) * index - Math.PI / 2
    return {
      participant,
      color: palette[index % palette.length],
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
    }
  })
  const nodeByName = new Map(nodes.map((node) => [node.participant.name, node]))

  return `
    <svg viewBox="0 0 ${width} ${height}" class="network-svg" role="img" aria-label="Mapa social">
      ${participants.flatMap((participant) => participant.alliances.map((ally) => {
        const from = nodeByName.get(participant.name)
        const to = nodeByName.get(ally)
        if (!from || !to || participant.name > ally) return ''
        return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(52,211,153,0.75)" stroke-width="3" />`
      })).join('')}
      ${participants.flatMap((participant) => participant.conflicts.map((other) => {
        const from = nodeByName.get(participant.name)
        const to = nodeByName.get(other)
        if (!from || !to || participant.name > other) return ''
        return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke="rgba(248,113,113,0.72)" stroke-width="2.5" stroke-dasharray="8 8" />`
      })).join('')}
      ${nodes.map((node) => `
        <g transform="translate(${node.x}, ${node.y})">
          <circle r="38" fill="${node.color}22" stroke="${node.color}" stroke-width="2.5" />
          <circle r="7" fill="${node.color}" />
          <foreignObject x="-84" y="44" width="168" height="74">
            <div xmlns="http://www.w3.org/1999/xhtml" class="network-label" style="color:${node.color}">
              ${escapeHtml(node.participant.name)}
            </div>
          </foreignObject>
        </g>
      `).join('')}
    </svg>
  `
}

function buildObjectivesSection(objectives: Objective[], network: ObjectiveNetwork | null): string {
  return `
    <div class="subtabs" data-tab-group="objectives">
      <button class="subtab active" data-tab-target="objectives-cloud">Nuvem</button>
      <button class="subtab" data-tab-target="objectives-hierarchy">Hierarquia</button>
      <button class="subtab" data-tab-target="objectives-network">Rede</button>
    </div>
    <div class="subtab-panel active" data-tab-panel="objectives-cloud">${buildObjectivesCloud(objectives)}</div>
    <div class="subtab-panel" data-tab-panel="objectives-hierarchy">${buildObjectivesHierarchy(objectives)}</div>
    <div class="subtab-panel" data-tab-panel="objectives-network">${buildObjectiveNetwork(objectives, network)}</div>
  `
}

export function buildInteractiveReportHtml({
  projectName,
  reportHtml,
  fullDocumentHtml,
  socialSimulation,
  objectives,
  objectiveNetwork,
}: BuildInteractiveReportArgs): string {
  const exportedAt = new Date().toLocaleString('pt-BR')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Análise VFT Interativa - ${escapeHtml(projectName)}</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07070d;
      --panel: rgba(15, 23, 42, 0.78);
      --panel-strong: rgba(8, 8, 14, 0.96);
      --line: rgba(255, 255, 255, 0.08);
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --accent-2: #e879f9;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      background:
        radial-gradient(circle at top, rgba(56,189,248,0.18), transparent 22%),
        radial-gradient(circle at right, rgba(232,121,249,0.14), transparent 18%),
        var(--bg);
      color: var(--text);
    }
    .shell {
      width: min(1320px, calc(100vw - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }
    .hero, .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 28px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.28);
      backdrop-filter: blur(18px);
    }
    .hero { padding: 28px; }
    .hero p { margin: 0; color: var(--muted); }
    .hero h1 { margin: 10px 0 8px; font-size: clamp(2rem, 3vw, 3rem); }
    .meta-row, .top-nav, .subtabs, .chip-row, .stats-grid, .card-grid { display: flex; flex-wrap: wrap; gap: 12px; }
    .meta-pill, .tab-button, .subtab, .mini-chip {
      border-radius: 999px;
      border: 1px solid var(--line);
      background: rgba(255,255,255,0.04);
      color: var(--muted);
      padding: 10px 14px;
      font-size: 0.82rem;
    }
    .top-nav { margin: 20px 0 18px; }
    .tab-button, .subtab { cursor: pointer; }
    .tab-button.active, .subtab.active {
      color: var(--text);
      border-color: rgba(56,189,248,0.34);
      background: rgba(56,189,248,0.16);
    }
    .panel { padding: 22px; display: none; }
    .panel.active, .subtab-panel.active { display: block; }
    .subtab-panel { display: none; margin-top: 18px; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      margin-bottom: 18px;
    }
    .stat-card, .surface-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 16px;
    }
    .stat-card span, .eyebrow { color: var(--muted); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.12em; }
    .stat-card strong { display: block; margin-top: 10px; font-size: 1.3rem; color: var(--text); }
    .card-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    }
    .surface-card h4 { margin: 10px 0 0; font-size: 1rem; }
    .bars { display: grid; gap: 14px; }
    .bar-head { display: flex; justify-content: space-between; gap: 12px; color: var(--text); font-size: 0.92rem; margin-bottom: 6px; }
    .bar-track { height: 12px; border-radius: 999px; background: rgba(255,255,255,0.06); overflow: hidden; }
    .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--accent), var(--accent-2)); }
    .tag-cloud { display: flex; flex-wrap: wrap; gap: 14px; }
    .tag-pill { display: inline-flex; align-items: center; padding: 10px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.08); }
    .tree-list { list-style: none; padding-left: 18px; margin: 0; border-left: 1px solid rgba(255,255,255,0.08); }
    .tree-list > li { margin: 16px 0; padding-left: 14px; }
    .tree-card {
      display: inline-flex;
      flex-direction: column;
      gap: 6px;
      background: rgba(255,255,255,0.03);
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 12px 14px;
    }
    .tree-card span { color: var(--muted); font-size: 0.82rem; }
    .network-svg { width: 100%; min-height: 320px; }
    .network-label {
      text-align: center;
      font-size: 12px;
      line-height: 1.35;
      font-weight: 600;
      word-break: break-word;
    }
    .muted { color: var(--muted); }
    .document-view {
      background: rgba(255,255,255,0.02);
      border: 1px solid var(--line);
      border-radius: 24px;
      padding: 22px;
      overflow: hidden;
    }
    .document-view * { max-width: 100%; }
    .document-view .prose, .document-view .prose * { color: #e5e7eb !important; }
    .document-view h1, .document-view h2, .document-view h3, .document-view h4 { color: #ffffff !important; }
    .document-view table { width: 100%; border-collapse: collapse; }
    .document-view th, .document-view td { border: 1px solid rgba(255,255,255,0.08); padding: 8px 10px; }
    .document-view blockquote { border-left: 4px solid rgba(56,189,248,0.42); padding-left: 12px; margin-left: 0; color: #cbd5e1; }
    .document-view hr { border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0; }
    .top-space { margin-top: 16px; }
    .conflict-chip { color: #fca5a5; border-color: rgba(248,113,113,0.24); }
    @media (max-width: 840px) {
      .shell { width: min(100vw - 20px, 100%); padding-top: 20px; }
      .hero, .panel { border-radius: 22px; padding: 18px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="hero">
      <p>Apresentacao interativa exportada da plataforma VFT Studio</p>
      <h1>${escapeHtml(projectName)}</h1>
      <div class="meta-row">
        <span class="meta-pill">Exportado em ${escapeHtml(exportedAt)}</span>
        <span class="meta-pill">Relatorio + artefatos interativos</span>
        <span class="meta-pill">Uso offline no navegador</span>
      </div>
    </section>

    <nav class="top-nav" data-tab-group="main">
      <button class="tab-button active" data-tab-target="panel-document">Documento</button>
      <button class="tab-button" data-tab-target="panel-social">Camada social</button>
      <button class="tab-button" data-tab-target="panel-objectives">Objetivos</button>
      <button class="tab-button" data-tab-target="panel-report">Relatorio final</button>
    </nav>

    <section id="panel-document" class="panel active" data-tab-panel="panel-document">
      <div class="document-view">${fullDocumentHtml}</div>
    </section>

    <section id="panel-social" class="panel" data-tab-panel="panel-social">
      ${buildSocialSection(socialSimulation)}
    </section>

    <section id="panel-objectives" class="panel" data-tab-panel="panel-objectives">
      ${buildObjectivesSection(objectives, objectiveNetwork)}
    </section>

    <section id="panel-report" class="panel" data-tab-panel="panel-report">
      <div class="document-view">${reportHtml}</div>
    </section>
  </main>

  <script>
    document.querySelectorAll('[data-tab-group]').forEach(function(group) {
      var buttons = Array.from(group.querySelectorAll('[data-tab-target]'));
      buttons.forEach(function(button) {
        button.addEventListener('click', function() {
          var target = button.getAttribute('data-tab-target');
          var scope = group.parentElement || document;
          buttons.forEach(function(item) { item.classList.remove('active'); });
          button.classList.add('active');
          scope.querySelectorAll('[data-tab-panel]').forEach(function(panel) {
            if (panel.getAttribute('data-tab-panel') === target) {
              panel.classList.add('active');
            } else if (group.getAttribute('data-tab-group') === 'main' || panel.parentElement === scope) {
              panel.classList.remove('active');
            }
          });
        });
      });
    });
  </script>
</body>
</html>`
}

export function buildPrintableReportHtml({
  projectName,
  reportHtml,
  fullDocumentHtml,
  socialSimulation,
  objectives,
  exportedAt,
}: BuildPrintableReportArgs): string {
  const stamp = exportedAt ?? new Date().toLocaleString('pt-BR')
  const dominantVote = socialSimulation
    ? Object.entries(socialSimulation.summary.votes ?? {}).sort((a, b) => b[1] - a[1])[0]
    : null
  const voteLabelMap: Record<string, string> = {
    approve: 'Aprova',
    approve_with_conditions: 'Aprova com condicoes',
    delay: 'Adia',
    reject: 'Rejeita',
  }
  const leadCoalition = socialSimulation?.summary.coalitions
    ?.slice()
    .sort((a, b) => b.members.length - a.members.length)[0]
  const visibleObjectives = objectives.filter((objective) => objective.deleted === 0)
  const sections = [
    { index: '01', title: 'Resumo Executivo', note: 'Contexto social e sinais principais da analise.' },
    { index: '02', title: 'Stakeholders e Objetivos', note: 'Panorama dos objetivos e perspectivas estruturadas.' },
    { index: '03', title: 'Relatorio Final', note: 'Sintese VFT consolidada para decisao.' },
    { index: '04', title: 'Documento Consolidado', note: 'Registro expandido com o conteudo completo exportado.' },
  ]

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Análise VFT - ${escapeHtml(projectName)}</title>
  <style>
    @page { size: A4; margin: 18mm 16mm 20mm; }
    body {
      counter-reset: page;
      margin: 0;
      font-family: "Aptos", "Segoe UI", Arial, sans-serif;
      color: #172033;
      background: #fff;
      line-height: 1.65;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      position: relative;
      page-break-after: always;
      padding-bottom: 14mm;
    }
    .page:last-child { page-break-after: auto; }
    .page::after {
      content: counter(page);
      counter-increment: page;
      position: absolute;
      bottom: 2mm;
      right: 0;
      font-size: 11px;
      color: #64748b;
    }
    .cover {
      min-height: calc(100vh - 36mm);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12mm 4mm 0;
      background: radial-gradient(circle at top, rgba(56,189,248,0.18), transparent 28%), linear-gradient(180deg, #f8fbff, #fff 58%);
    }
    .cover-kicker {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      border: 1px solid rgba(56,189,248,0.28);
      color: #0369a1;
      background: rgba(56,189,248,0.08);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .cover h1 { margin: 22px 0 10px; font-size: 30px; line-height: 1.1; color: #0f172a; }
    .cover p { max-width: 620px; color: #475569; font-size: 14px; }
    .cover-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
    .cover-meta span {
      padding: 8px 12px;
      border: 1px solid rgba(15,23,42,0.08);
      border-radius: 999px;
      background: rgba(248,250,252,0.92);
      font-size: 12px;
      color: #334155;
    }
    .cover-footer {
      border-top: 2px solid #e2e8f0;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      color: #64748b;
      font-size: 12px;
    }
    .contents-list {
      list-style: none;
      padding: 0;
      margin: 20px 0 0;
      display: grid;
      gap: 14px;
    }
    .contents-item {
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 14px;
      align-items: start;
      padding: 14px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .contents-index {
      font-size: 22px;
      font-weight: 700;
      color: #38bdf8;
    }
    .contents-item strong {
      display: block;
      font-size: 15px;
      color: #0f172a;
    }
    .contents-item span {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 13px;
    }
    .section-cover {
      min-height: 42mm;
      display: flex;
      align-items: end;
      margin-bottom: 20px;
      padding: 0 0 10px;
      border-bottom: 2px solid #dbeafe;
      background: linear-gradient(180deg, rgba(56,189,248,0.08), rgba(255,255,255,0));
    }
    .section-cover span {
      display: block;
      color: #38bdf8;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .section-cover h2 {
      margin: 8px 0 0;
      padding: 0;
      border: none;
      font-size: 28px;
    }
    .section-cover p {
      margin: 8px 0 0;
      color: #64748b;
      max-width: 560px;
    }
    .print-section { margin: 0 0 18px; page-break-inside: avoid; }
    .print-section h2 {
      margin: 0 0 14px;
      padding-bottom: 6px;
      border-bottom: 2px solid #dbeafe;
      color: #0f172a;
      font-size: 20px;
    }
    .print-columns, .print-stats {
      display: grid;
      gap: 12px;
    }
    .print-stats { grid-template-columns: repeat(4, 1fr); margin-bottom: 14px; }
    .print-columns { grid-template-columns: 1fr 1fr; }
    .print-stat, .print-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #f8fafc;
      padding: 12px;
    }
    .print-stat span {
      display: block;
      color: #64748b;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .print-stat strong { display: block; margin-top: 8px; font-size: 16px; color: #0f172a; }
    .tag-cloud { display: flex; flex-wrap: wrap; gap: 8px; }
    .tag-pill {
      display: inline-flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 999px;
      border: 1px solid rgba(15,23,42,0.08);
    }
    .document-view * { max-width: 100%; }
    .document-view h1, .document-view h2, .document-view h3, .document-view h4 { color: #0f172a !important; page-break-after: avoid; }
    .document-view p, .document-view li, .document-view td, .document-view th { color: #334155 !important; }
    .document-view table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    .document-view th, .document-view td { border: 1px solid #dbe2ea; padding: 8px 10px; }
    .document-view blockquote { margin-left: 0; padding-left: 12px; border-left: 4px solid #93c5fd; background: #f8fbff; }
    .document-view hr { border: none; border-top: 1px solid #dbe2ea; margin: 22px 0; }
    @media print { .page { break-after: page; } }
  </style>
</head>
<body>
  <section class="page cover">
    <div>
      <span class="cover-kicker">Análise VFT Completa</span>
      <h1>${escapeHtml(projectName)}</h1>
      <p>Documento editorial de exportacao com capa, resumo executivo e relatorio consolidado pronto para impressao e compartilhamento.</p>
      <div class="cover-meta">
        <span>Exportado em ${escapeHtml(stamp)}</span>
        <span>${socialSimulation?.summary.participants.length ?? 0} participantes sociais</span>
        <span>${visibleObjectives.length} objetivos mapeados</span>
      </div>
    </div>
    <div class="cover-footer">
      <span>VFT Studio</span>
      <span>Documento gerado automaticamente</span>
    </div>
  </section>

  <section class="page">
    <section class="print-section">
      <h2>Sumario</h2>
      <ol class="contents-list">
        ${sections.map((section) => `
          <li class="contents-item">
            <span class="contents-index">${section.index}</span>
            <div>
              <strong>${escapeHtml(section.title)}</strong>
              <span>${escapeHtml(section.note)}</span>
            </div>
          </li>
        `).join('')}
      </ol>
    </section>
  </section>

  <section class="page">
    <div class="section-cover">
      <div>
        <span>01</span>
        <h2>Resumo Executivo</h2>
        <p>Visao de abertura com dinamica social, tensoes prioritarias e principais sinais para decisao.</p>
      </div>
    </div>
    <section class="print-section">
      <h2>Resumo Executivo</h2>
      <div class="print-stats">
        <div class="print-stat"><span>Participantes</span><strong>${socialSimulation?.summary.participants.length ?? 0}</strong></div>
        <div class="print-stat"><span>Coalizoes</span><strong>${socialSimulation?.summary.coalitions.length ?? 0}</strong></div>
        <div class="print-stat"><span>Conflitos</span><strong>${socialSimulation?.summary.top_conflicts.length ?? 0}</strong></div>
        <div class="print-stat"><span>Voto dominante</span><strong>${escapeHtml(dominantVote ? (voteLabelMap[dominantVote[0]] ?? dominantVote[0]) : 'Sem consenso')}</strong></div>
      </div>
      <div class="print-columns">
        <div class="print-card">
          <h3>Coalizao lider</h3>
          <p><strong>${escapeHtml(leadCoalition?.tag ?? 'Sem bloco dominante')}</strong></p>
          <p>${escapeHtml((leadCoalition?.members ?? []).join(', ') || 'Sem membros destacados')}</p>
        </div>
        <div class="print-card">
          <h3>Tensao central</h3>
          <p><strong>${escapeHtml(socialSimulation?.summary.top_conflicts[0] ?? 'Sem conflito dominante')}</strong></p>
          <p>A camada social foi sintetizada antes da War Room para explicitar alinhamentos e friccoes relevantes.</p>
        </div>
      </div>
    </section>
  </section>

  <section class="page">
    <div class="section-cover">
      <div>
        <span>02</span>
        <h2>Stakeholders e Objetivos</h2>
        <p>Mapa sintese dos objetivos emergentes que orientam a estrutura VFT do problema.</p>
      </div>
    </div>
    <section class="print-section">
      <h2>Panorama de Objetivos</h2>
      ${buildObjectivesCloud(objectives)}
    </section>
  </section>

  <section class="page">
    <div class="section-cover">
      <div>
        <span>03</span>
        <h2>Relatorio Final</h2>
        <p>Sintese principal da analise, preparada para leitura executiva e compartilhamento formal.</p>
      </div>
    </div>
    <section class="print-section">
      <h2>Relatorio Final</h2>
      <div class="document-view">${reportHtml}</div>
    </section>
  </section>

  <section class="page">
    <div class="section-cover">
      <div>
        <span>04</span>
        <h2>Documento Consolidado</h2>
        <p>Registro expandido com o conteudo integral produzido durante a analise completa.</p>
      </div>
    </div>
    <section class="print-section">
      <h2>Documento Consolidado</h2>
      <div class="document-view">${fullDocumentHtml}</div>
    </section>
  </section>
</body>
</html>`
}
