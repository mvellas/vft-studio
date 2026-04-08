# VFT Studio — Requirements

**Versão:** 0.2.0-spec | **Data:** 2026-04-07  
**Changelog v0.2:** +RF-10 Interview-Driven Flow · +RF-11 Diagram Generation · +RF-12 Graph View

---

## RF — Requisitos Funcionais

### RF-01 · Gerenciamento de Projetos

| ID | Requisito |
|----|-----------|
| RF-01.1 | Criar novo projeto VFT com nome, descrição e contexto inicial |
| RF-01.2 | Listar projetos existentes com status de fase atual e data de última modificação |
| RF-01.3 | Abrir projeto existente restaurando estado exato (fase, passo, dados) |
| RF-01.4 | Duplicar projeto (útil para comparar abordagens) |
| RF-01.5 | Arquivar/deletar projeto com confirmação |
| RF-01.6 | Exportar projeto completo como arquivo `.vft` (bundle JSON comprimido) |
| RF-01.7 | Importar projeto `.vft` |

### RF-02 · Fase 1 — Initial Decision Frame e Decision Statement

| ID | Requisito |
|----|-----------|
| RF-02.1 | Wizard guiado para mapear stakeholders (Passo 1.1) com campos: nome, tipo (Decision Authority / Customer / Owner / User / Consumer), interesses, perfil |
| RF-02.2 | Seleção automática de variante do processo baseada no número de DMs e stakeholders (1.2, 1.3, 1.4, 1.5) |
| RF-02.3 | Formulário estruturado para Initial Decision Frame: Purpose, Perspective, Scope |
| RF-02.4 | Workshop mode para múltiplos DMs: roteiro dos 7 passos do Apêndice B (Vision Statement, Issue Raising, Categorization, Decision Hierarchy, Values & Trade-offs, Influence Diagram, Schedule) |
| RF-02.5 | Geração assistida por IA do Decision Statement com base no Initial Decision Frame preenchido |
| RF-02.6 | Validação do Decision Statement: estrutura "Decide + [which/what/when/whether/how/if] + [ação]" |
| RF-02.7 | Documentação automática do Initial Decision Frame (Passo 1.6) |

### RF-03 · Fase 2 — Define Decision Objectives

| ID | Requisito |
|----|-----------|
| RF-03.1 | Seleção de técnica de modelagem qualitativa de valor: Platinum / Gold / Silver / Combined Standard |
| RF-03.2 | Se Gold/Combined: upload ou entrada de texto de documentos organizacionais; extração assistida de valores por IA |
| RF-03.3 | Preparação do questionário de elicitação (VFT Devices ou Value Stimulation Techniques) personalizado ao Initial Decision Frame |
| RF-03.4 | Wish List por stakeholder: interface de entrevista semi-estruturada com IA como entrevistador |
| RF-03.5 | VFT Devices completos (10 questões de Keeney, 1992) com guias contextuais |
| RF-03.6 | Value Stimulation Techniques (8 técnicas de Keeney, 2020) com guias contextuais |
| RF-03.7 | Conversão assistida de valores em objetivos: estrutura contexto + verbo + objeto |
| RF-03.8 | Para múltiplos stakeholders: VFB (Value-Focused Brainstorming) — entrevistas individuais + consolidação + workshop |
| RF-03.9 | Lista unificada de objetivos com eliminação de redundâncias assistida por IA |
| RF-03.10 | Categorização de objetivos: Strategic / Fundamental / Means / Other (processual) |
| RF-03.11 | WITI Test interativo por objetivo: sistema faz a pergunta "Why Is This objective Important?" e registra resposta; reclassifica automaticamente (means vs. fundamental candidate) |
| RF-03.12 | Causal Relations Map: interface para mapear relações de influência entre objetivos (grafo direcionado) |
| RF-03.13 | Control of Consequences: para cada candidato a fundamental, aplicar as 2 perguntas de verificação; refinar definição se necessário |
| RF-03.14 | Geração automática da Means-Ends Objectives Network a partir do mapa de relações causais |
| RF-03.15 | Hierarquia de Objetivos Fundamentais: decomposição interativa; verificação das 9 propriedades (Essential, Controllable, Complete, Measurable, Operational, Decomposable, Non-redundant, Concise, Understandable) |
| RF-03.16 | Definição de atributos para cada objetivo fundamental de nível mais baixo: tipo (Natural/Constructed/Proxy), descrição, escala; verificação das 5 propriedades (Unambiguous, Comprehensive, Direct, Operational, Understandable) |
| RF-03.17 | Processo guiado para seleção de atributos (Keeney & Gregory, 2005): fluxograma de 5 passos |

### RF-04 · Fase 3 — Define Decision Alternatives

| ID | Requisito |
|----|-----------|
| RF-04.1 | Listagem de alternativas iniciais com consequências por atributo (Passos 3.1 / 3.4) |
| RF-04.2 | Elicitação de novas alternativas: IA sugere alternativas com base nos objetivos fundamentais e na Means-Ends Network |
| RF-04.3 | Procedimento de Keeney (1992): considerar cada objetivo individualmente, depois pares, trios para identificar novas alternativas |
| RF-04.4 | Para múltiplos stakeholders: workshop para definir alternativas coletivas (Passos 3.6–3.8) |
| RF-04.5 | Lista final de alternativas com valores elicitados para cada atributo da Fase 2 |
| RF-04.6 | Identificação de oportunidades de decisão durante a fase de alternativas |

### RF-05 · Chat Interface (Core Feature)

| ID | Requisito |
|----|-----------|
| RF-05.1 | Chat sempre acessível (painel lateral ou overlay) em qualquer tela |
| RF-05.2 | Modo Facilitador: conversa com o Agente Facilitador sobre qualquer aspecto do processo |
| RF-05.3 | Modo Especialista de Fase: acesso ao especialista da fase atual para dúvidas específicas |
| RF-05.4 | Modo Stakeholder: conversar com qualquer stakeholder cadastrado (IA simula suas respostas baseado no perfil) |
| RF-05.5 | Modo Brainstorming Livre: chat sem agenda; IA sugere conexões, questiona premissas, propõe alternativas |
| RF-05.6 | Contexto automático: o agente tem acesso ao estado atual do projeto (IDF, objetivos, fase, passo) |
| RF-05.7 | Histórico de chat persistido por projeto com timestamps |
| RF-05.8 | Streaming de respostas (SSE) para experiência fluida |
| RF-05.9 | Ações rápidas: "Salvar como objetivo", "Marcar como valor", "Adicionar como alternativa" diretamente da mensagem |
| RF-05.10 | Export do histórico de chat como Markdown |

### RF-06 · Agentes de IA

| ID | Requisito |
|----|-----------|
| RF-06.1 | Facilitador Agent: orienta o processo geral; explica conceitos VFT contextualmente; identifica desvios do processo |
| RF-06.2 | Phase 1 Specialist: expert em Initial Decision Frame, stakeholder mapping, Decision Statement |
| RF-06.3 | Phase 2 Specialist: expert em elicitação de valores, WITI Test, Control of Consequences, hierarquia de objetivos, atributos |
| RF-06.4 | Phase 3 Specialist: expert em definição de alternativas e oportunidades de decisão |
| RF-06.5 | Stakeholder Agent(s): para cada stakeholder cadastrado, IA simula respostas às VFT Devices de acordo com perfil e interesses definidos |
| RF-06.6 | Documentation Agent: gera relatórios estruturados em Markdown a partir dos dados do projeto |
| RF-06.7 | Todos os agentes têm acesso ao contexto completo do projeto (memória de contexto via system prompt) |
| RF-06.8 | Modelo padrão: claude-opus-4-6 para Facilitador/Stakeholders; claude-sonnet-4-6 para especialistas e documentação |

### RF-07 · Visualizações

| ID | Requisito |
|----|-----------|
| RF-07.1 | Means-Ends Objectives Network: grafo interativo (react-flow) com nós coloridos por tipo de objetivo |
| RF-07.2 | Fundamental Objectives Hierarchy: árvore expansível com atributos nas folhas |
| RF-07.3 | Decision Frame Summary: card visual com Purpose / Perspective / Scope |
| RF-07.4 | Progress tracker: barra de progresso pelas 3 fases e passos |
| RF-07.5 | Stakeholder map: lista visual com papel, interesses e status de entrevista |

### RF-08 · Export e Relatórios

| ID | Requisito |
|----|-----------|
| RF-08.1 | Export do projeto completo como documento Markdown estruturado |
| RF-08.2 | Export como PDF via WeasyPrint |
| RF-08.3 | Export da Means-Ends Network como PNG/SVG |
| RF-08.4 | Relatório de Decision Frame (Phase 1) |
| RF-08.5 | Relatório de Objectives (Phase 2): categorias, WITI results, atributos |
| RF-08.6 | Relatório de Alternatives (Phase 3): lista com consequências por atributo |
| RF-08.7 | Relatório completo integrado do projeto VFT |

### RF-09 · Configurações

| ID | Requisito |
|----|-----------|
| RF-09.1 | Configuração de ANTHROPIC_API_KEY (campo seguro, nunca em texto plano visível) |
| RF-09.2 | Seleção de modelo de IA por tipo de agente |
| RF-09.3 | Idioma da interface (PT-BR padrão; EN suportado) |
| RF-09.4 | Diretório de dados local (padrão: `~/VFTStudio/`) |
| RF-09.5 | Toggle: mostrar/ocultar dicas de processo e referências ao artigo de Vieira et al. (2024) |

---

## RF-13 · Proxy de Stakeholder por Documentos (NOVO v0.3)

> **Motivação:** Em muitos contextos reais não é possível entrevistar stakeholders diretamente — chefes de Estado, organizações extintas, partes ausentes, ou fontes cujo acesso é restrito. Este requisito permite que o usuário submeta **documentos, imagens e textos** como substitutos da entrevista, e a IA extrai os valores e posições do stakeholder a partir dessas fontes, gerando um **transcript de entrevista virtual** com evidências citadas.

> **Base metodológica:** Análise de conteúdo e análise documental são métodos reconhecidos em Pesquisa Operacional e Ciências Políticas para inferir valores e posições de atores a partir de artefatos escritos (discursos, relatórios, políticas públicas, atas, etc.).

| ID | Requisito |
|----|-----------|
| RF-13.1 | **Elicitation Mode por stakeholder:** Cada stakeholder pode ter o modo de elicitação definido individualmente: `interview` (entrevista real/simulada) ou `document_analysis` (proxy documental). O modo pode ser alterado a qualquer tempo. |
| RF-13.2 | **Upload de documentos:** Interface para upload de um ou mais arquivos por stakeholder: PDF, TXT, MD, PNG, JPG, WEBP, HEIC. Limite de 20 MB por arquivo; sem limite de número de arquivos. |
| RF-13.3 | **Entrada de texto livre:** Além do upload, campo para colar texto diretamente (pronunciamentos, trechos de atas, citações, transcrições parciais). O texto é salvo como documento virtual sem arquivo físico. |
| RF-13.4 | **Metadados do documento:** Para cada documento, o usuário informa: título, tipo (`official_speech` / `policy_document` / `report` / `academic_paper` / `news_article` / `minutes` / `legal_text` / `other`), data e fonte/autoria. |
| RF-13.5 | **Análise automática:** Ao acionar "Analisar Documentos", o agente ANALYST processa todos os documentos do stakeholder e aplica os VFT Devices conceitualmente: "Com base nestes documentos, o que [stakeholder] valoriza em relação a [tópico do VFT Device]?" |
| RF-13.6 | **Transcript de entrevista virtual:** O resultado da análise é estruturado como um transcript Q&A — cada pergunta dos VFT Devices tem uma resposta inferida com **citações diretas** do(s) documento(s) de origem (trecho + fonte + página/seção quando disponível). |
| RF-13.7 | **Identificação de valores com evidência:** Cada valor/objetivo extraído é ligado a pelo menos uma citação-evidência do documento fonte. Sem evidência = não é extraído como fato, mas como inferência assinalada com `[inferência]`. |
| RF-13.8 | **Revisão e confirmação:** Antes de salvar, o usuário revisa o transcript virtual item por item: aceita, edita, rejeita ou reclassifica cada valor/objetivo extraído. Pode adicionar anotações à evidência. |
| RF-13.9 | **Rastreabilidade:** No relatório final, objetivos oriundos de análise documental são marcados com `[Fonte: análise documental]` e listam os documentos de origem. As citações são incluídas em nota de rodapé. |
| RF-13.10 | **Complemento de entrevista:** Documentos podem ser usados como complemento de uma entrevista real/simulada. Neste caso, a análise documental é executada primeiro e o resultado é injetado como contexto na entrevista subsequente. |
| RF-13.11 | **Múltiplos documentos, perspectivas divergentes:** Se documentos do mesmo stakeholder apresentarem posições contraditórias (ex.: discursos em épocas diferentes), o ANALYST sinaliza a contradição, apresenta ambas as posições com datas, e permite ao usuário escolher qual prevalece ou registrar ambiguidade. |
| RF-13.12 | **Exportação do transcript virtual:** O transcript de entrevista virtual é exportável como Markdown independente, com a mesma estrutura dos transcripts de entrevistas reais (RF-10.12). |
| RF-13.13 | **Indicador visual:** Na lista de stakeholders, ícone de status indica o modo de elicitação: 🎙️ entrevista | 📄 análise documental | 🤖 simulação por IA. |
| RF-13.14 | **Suporte a imagens:** Imagens (PNG/JPG) são enviadas ao modelo via API multimodal. Casos de uso: infográficos, quadros organizacionais, slides com posicionamento, fotografias de documentos físicos. |

### Fluxo de Proxy Documental

```
[Cadastrar stakeholder]
  ↓ Definir modo: "Análise Documental"
[Upload de documentos + metadados]
  ↓ [Analisar Documentos]
ANALYST processa documentos
  ↓
Gera transcript virtual: VFT Device → Resposta inferida + Citação
  ↓
[Usuário revisa item a item]
  ↓ [Confirmar e Salvar]
Valores/objetivos salvos com rastreabilidade documental
  ↓
Transcript disponível para download
  Objetivos marcados [Fonte: análise documental] no relatório
```

### Tipos de Documento e Casos de Uso

| Tipo | Exemplo | Valores típicos que revela |
|------|---------|---------------------------|
| `official_speech` | Discurso presidencial, declaração ministerial | Objetivos estratégicos, prioridades políticas |
| `policy_document` | Plano Nacional, Portaria, Decreto | Metas, restrições, critérios formais |
| `report` | Relatório anual, relatório de auditoria | Preocupações operacionais, resultados valorizados |
| `academic_paper` | Artigo de pesquisador como especialista | Framework analítico, variáveis relevantes |
| `news_article` | Entrevista publicada, cobertura jornalística | Posições declaradas publicamente |
| `minutes` | Ata de reunião, registro de deliberação | Argumentos, votos, posições em debate |
| `legal_text` | Lei, contrato, regulação | Obrigações, direitos, limites de escopo |

---

## RNF — Requisitos Não-Funcionais

### RNF-01 · Performance

| ID | Requisito | Métrica |
|----|-----------|---------|
| RNF-01.1 | Startup da aplicação | < 3 segundos |
| RNF-01.2 | Latência de resposta da API (excl. tempo Claude) | < 100ms |
| RNF-01.3 | Primeira token de streaming visível | < 2 segundos após envio |
| RNF-01.4 | Carregamento de projeto existente | < 500ms |
| RNF-01.5 | Renderização de grafo (até 50 nós) | < 300ms |

### RNF-02 · Usabilidade

| ID | Requisito |
|----|-----------|
| RNF-02.1 | Usuário sem treinamento em VFT deve conseguir completar a Fase 1 sem documentação externa |
| RNF-02.2 | Cada passo do processo deve exibir: (a) o que é, (b) por que fazer, (c) como fazer |
| RNF-02.3 | Referências ao artigo Vieira et al. (2024) devem ser citadas inline em cada passo |
| RNF-02.4 | Desfazer/refazer em formulários |
| RNF-02.5 | Salvamento automático a cada alteração (debounce 2s) |

### RNF-03 · Confiabilidade

| ID | Requisito |
|----|-----------|
| RNF-03.1 | Nenhuma perda de dados em caso de crash; estado restaurável via SQLite |
| RNF-03.2 | Retry automático de chamadas à API Claude (máx. 3 tentativas, backoff exponencial) |
| RNF-03.3 | Tratamento gracioso de API key ausente/inválida com mensagem clara |
| RNF-03.4 | Aplicação funciona em modo offline (sem IA) para visualização/edição de dados existentes |

### RNF-04 · Segurança e Privacidade

| ID | Requisito |
|----|-----------|
| RNF-04.1 | API key armazenada no macOS Keychain, não em arquivo de texto |
| RNF-04.2 | Dados do projeto nunca transmitidos a terceiros (exceto a API Anthropic para inferência) |
| RNF-04.3 | Conteúdo de decisões sensíveis permanece local |

### RNF-05 · Manutenibilidade

| ID | Requisito |
|----|-----------|
| RNF-05.1 | Cobertura de testes ≥ 70% no backend |
| RNF-05.2 | Cada módulo Python < 400 linhas |
| RNF-05.3 | Cada componente React < 300 linhas |
| RNF-05.4 | Prompts dos agentes em arquivos `.md` separados (não hardcoded) |
| RNF-05.5 | Schema de banco com migrations via Alembic |

### RNF-06 · Compatibilidade

| ID | Requisito |
|----|-----------|
| RNF-06.1 | macOS 13 Ventura ou superior |
| RNF-06.2 | Apple Silicon (M1/M2/M3) e Intel Mac |
| RNF-06.3 | Python 3.12+ |
| RNF-06.4 | Resolução mínima: 1280×800 |
| RNF-06.5 | Suporte a Dark Mode e Light Mode do macOS |

---

## RF-10 · Interview-Driven Flow (NOVO v0.2)

> **Princípio:** Para cada abordagem prevista no framework (Wish List, VFT Devices, Value Stimulation Techniques, Workshop, WITI, CoC), o sistema deve oferecer um modo entrevista onde **a IA formula as perguntas** e o **usuário digita as respostas**, com a IA compilando e analisando em tempo real.

| ID | Requisito |
|----|-----------|
| RF-10.1 | **Interview Session Mode:** Para qualquer passo que envolva elicitação de informação de stakeholder, o sistema oferece modo "Conduzir Entrevista" além do modo "Preencher Formulário" |
| RF-10.2 | **AI como Entrevistador:** O agente especialista da fase formula perguntas calibradas ao contexto do projeto (IDF, Decision Statement, perfil do stakeholder) e ao dispositivo VFT em uso |
| RF-10.3 | **Fluxo pergunta → resposta → análise:** Após cada resposta do usuário, a IA analisa inline: extrai valores/objetivos implícitos, identifica lacunas, decide se há follow-up ou avança para próxima pergunta |
| RF-10.4 | **Estado da Entrevista (máquina de estados):** IDLE → BRIEFING → QUESTIONING → [FOLLOW_UP ↔ QUESTIONING] → SYNTHESIS → COMPLETED. Estado persistido; entrevista pode ser pausada e retomada |
| RF-10.5 | **Síntese automática:** Ao final de cada sessão de entrevista, a IA compila: lista de valores identificados, objetivos candidatos, quotes relevantes das respostas, lacunas detectadas |
| RF-10.6 | **Confirmação pelo usuário:** Antes de salvar, usuário revisa e edita os objetivos/valores que a IA extraiu das respostas; pode adicionar, remover ou reformular |
| RF-10.7 | **Entrevista de Stakeholder Real:** Usuário responde como se fosse o stakeholder (stakeholder presente fisicamente); IA mantém contexto do perfil para sinalizar inconsistências |
| RF-10.8 | **Entrevista Simulada:** IA simula as respostas do stakeholder com base no perfil cadastrado; usuário pode intervir/corrigir a simulação |
| RF-10.9 | **Modo Workshop Facilitado:** Para múltiplos DMs, a IA guia o roteiro do Apêndice B passo a passo; cada sub-etapa (Vision Statement, Issue Raising, etc.) tem sua própria sessão de perguntas |
| RF-10.10 | **WITI Test como Entrevista:** Para cada objetivo, a IA faz a pergunta WITI de forma conversacional, faz follow-ups se a resposta for ambígua, e classifica ao final com explicação |
| RF-10.11 | **CoC como Entrevista:** As 2 perguntas de Control of Consequences são conduzidas como diálogo; a IA explica as implicações de cada resposta e sugere refinamentos ao enunciado |
| RF-10.12 | **Transcrição completa:** Toda entrevista gera uma transcrição persistida (pergunta + resposta + análise da IA) exportável como Markdown |
| RF-10.13 | **Indicador de progresso na entrevista:** Mostra dispositivo atual / total, perguntas respondidas, tempo estimado restante |

### Estado da Máquina de Entrevista

```
IDLE
  ↓ [Iniciar Entrevista com Stakeholder X / Iniciar WITI / Iniciar CoC]
BRIEFING
  IA apresenta: objetivo da sessão, dispositivos que serão usados, estimativa de duração
  ↓ [Pronto para começar]
QUESTIONING
  IA formula pergunta contextualizada
  Usuário digita resposta
  IA analisa: extrai valores/objetivos, identifica se precisa de follow-up
  ↓ [follow-up?]
  ├── SIM → FOLLOW_UP (pergunta adicional) → volta a QUESTIONING
  └── NÃO → próximo dispositivo VFT ou próximo objetivo (WITI)
DEVICE_SUMMARY (entre dispositivos VFT)
  IA resume o que foi identificado até agora; usuário confirma ou adiciona
  ↓ [Próximo Dispositivo]
SYNTHESIS
  IA compila tudo: valores → objetivos candidatos → quotes
  Usuário revisa e confirma
  ↓ [Confirmar e Salvar]
COMPLETED
  Objetivos/valores salvos no projeto
  Transcrição disponível para download
```

---

## RF-11 · Geração de Diagramas Visuais (NOVO v0.2)

> **Princípio:** O relatório final deve incluir **imagens reais** (não apenas descrições textuais) de todos os diagramas previstos no framework de Vieira et al. (2024). Os diagramas devem ser gerados automaticamente a partir dos dados do projeto e exportados como PNG para embedding no relatório PDF/Markdown.

| ID | Requisito |
|----|-----------|
| RF-11.1 | **Diagrama: Initial Decision Frame** — Card visual estruturado (Purpose / Perspective / Scope / Stakeholders) gerado como imagem. Baseado na Figura 18 do artigo. |
| RF-11.2 | **Diagrama: Causal Relations Map** — Grafo direcionado de relações causais entre objetivos (resultado do WITI Test). Nós coloridos por tipo. Baseado nas Figuras 6, 8, 19, 24 do artigo. |
| RF-11.3 | **Diagrama: Means-Ends Objectives Network** — Grafo interativo com layout automático (dagre top-down). Nós: meios (roxo), fundamentais (azul), estratégico (âmbar). Baseado nas Figuras 9, 10, 21, 25. |
| RF-11.4 | **Diagrama: Fundamental Objectives Hierarchy** — Árvore hierárquica com atributos nas folhas. Baseado nas Figuras 11, 22, 26 do artigo. |
| RF-11.5 | **Diagrama: Stakeholder Map** — Organograma visual com papel, nome e status de entrevista de cada stakeholder. |
| RF-11.6 | **Diagrama: Decision Process Flowchart** — Fluxograma do processo de decisão das 3 fases com passos completados destacados. Baseado na Figura 15 (Apêndice A). |
| RF-11.7 | **Diagrama: Decision Frame (conceitual)** — Diagrama de caixas aninhadas mostrando contexto estratégico vs. específico com objetivos. Baseado na Figura 7. |
| RF-11.8 | **Geração tecnológica:** Diagramas de grafo (RF-11.2, RF-11.3, RF-11.4) usam **react-flow** no frontend → captura PNG via `html2canvas`. Diagramas estruturados (RF-11.1, RF-11.5, RF-11.6) usam **Mermaid.js** renderizado no frontend → captura PNG. |
| RF-11.9 | **Exportação para relatório:** Ao gerar PDF/Markdown, o sistema captura todos os diagramas como PNG e os embute no documento. No Markdown, como `![Figura X](diagrams/figX.png)`. No PDF, inline via WeasyPrint. |
| RF-11.10 | **Visualização interativa vs. estática:** Dentro do app, diagramas são interativos (react-flow: zoom, pan, click). No relatório exportado, são imagens estáticas de alta resolução (2x DPR). |
| RF-11.11 | **Export individual:** Usuário pode exportar qualquer diagrama individualmente (botão "Exportar como PNG" em cada visualização). |
| RF-11.12 | **Legenda automática:** Todos os diagramas gerados incluem legenda com tipos de nós/arestas e referência ao passo do framework. |

### Tecnologia por Diagrama

| Diagrama | Tecnologia | Rendering |
|---------|-----------|----------|
| Causal Relations Map | react-flow + dagre layout | Client-side → PNG via html2canvas |
| Means-Ends Network | react-flow + dagre layout | Client-side → PNG |
| Objectives Hierarchy | react-flow tree layout | Client-side → PNG |
| Decision Frame Card | React component estilizado | Client-side → PNG |
| Stakeholder Map | Mermaid.js `graph TD` | Client-side Mermaid → SVG → PNG |
| Process Flowchart | Mermaid.js `flowchart` | Client-side Mermaid → SVG → PNG |
| Decision Frame Conceitual | Mermaid.js `block-beta` | Client-side Mermaid → SVG → PNG |

---

## RF-12 · Graph View — Visão de Conhecimento (NOVO v0.2)

> **Princípio:** Além das visualizações por fase, o sistema deve oferecer uma **visão unificada de grafo** (semelhante ao Graph View do Obsidian) mostrando TODAS as entidades do projeto e suas interrelações em um único grafo força-dirigido interativo.

| ID | Requisito |
|----|-----------|
| RF-12.1 | **Graph View global:** Tela dedicada acessível por `⌘G` ou botão na sidebar, mostrando todas as entidades do projeto como nós em um grafo força-dirigido |
| RF-12.2 | **Tipos de nós:** Stakeholder (ícone pessoa), Objective/Means (círculo roxo), Objective/Fundamental (círculo azul), Objective/Strategic (diamante âmbar), Alternative (hexágono verde), Attribute (quadrado cinza), Decision Frame (retângulo especial) |
| RF-12.3 | **Tipos de arestas:** causal_influence (sólida, direcionada), hierarchical_parent (tracejada), contributed_by_stakeholder (pontilhada laranja), measured_by_attribute (tracejada cinza), alternative_achieves (sólida verde) |
| RF-12.4 | **Layout força-dirigido:** Nós se organizam automaticamente por força gravitacional; nós mais conectados ficam no centro; clusters emergem naturalmente |
| RF-12.5 | **Interatividade:** Click em nó → abre painel lateral com detalhes e link para editar; hover → destaca todas as arestas conectadas; drag para reposicionar; scroll para zoom |
| RF-12.6 | **Filtros visuais:** Painel de filtros para mostrar/ocultar por tipo de nó, por fase de origem, por stakeholder. Slider de "profundidade" (mostra apenas N hops a partir do nó selecionado) |
| RF-12.7 | **Busca no grafo:** Campo de busca que destaca nós pelo nome; nós não-matching ficam semi-transparentes |
| RF-12.8 | **Tamanho dos nós proporcional:** Nós com mais conexões são maiores; nós fundamentais têm peso visual maior |
| RF-12.9 | **Mini-map:** Mapa de navegação no canto inferior direito (como Obsidian) |
| RF-12.10 | **Export do Graph View:** Captura o estado atual do grafo como PNG de alta resolução |
| RF-12.11 | **Inclusão no relatório:** Versão estática do Graph View incluída como diagrama de abertura no relatório completo |
| RF-12.12 | **Evolução temporal:** Toggle para ver o grafo em diferentes fases do processo (ao final da Fase 1, Fase 2, Fase 3) — mostra como o conhecimento foi acumulado |

### Tecnologia do Graph View

```
Frontend: D3.js force simulation (não react-flow — mais flexível para força-dirigido)
  + d3-force: forceLink, forceManyBody, forceCenter, forceCollide
  + Nós como SVG groups (circle + text)
  + Arestas como SVG paths com markers (setas)
  + Zoom/pan via d3-zoom
  + Mini-map via canvas overlay

Backend: GET /api/projects/{id}/graph-view
  → Retorna: { nodes: GraphNode[], edges: GraphEdge[] }
  → GraphNode: { id, label, type, entity_type, connections_count, phase }
  → GraphEdge: { source, target, type, label }

Dados computados no backend (não no frontend):
  - Todos os nós de todas as entidades do projeto
  - Todas as arestas de todas as relações (causais, hierárquicas, stakeholder→objetivo, etc.)
```
