# VFT Studio — Documento Explicativo

**Ferramenta de suporte à decisão baseada em Value-Focused Thinking**  
Conforme Vieira et al. (2024) e Keeney (1992)

---

## 1. O que é o VFT Studio

O VFT Studio é um software de análise de decisão que operacionaliza o processo de **Value-Focused Thinking (VFT)** proposto por Keeney (1992) e sistematizado por Vieira et al. (2024). Seu objetivo é guiar analistas e facilitadores pelo processo completo de estruturação de um problema decisório — da identificação de stakeholders à definição de alternativas — com suporte de agentes de inteligência artificial especializados em cada etapa.

O software não toma decisões: ele ajuda a estruturar o problema de forma que os valores dos stakeholders sejam corretamente capturados, transformados em objetivos e usados para avaliar alternativas. O produto final é um conjunto de artefatos estruturados (hierarquia de objetivos, rede meios-fins, matriz de consequências, relatório) que sustentam o processo decisório subsequente.

### Dois modos de operação

O sistema oferece dois caminhos principais:

**VFT Guiado** — o analista conduz o processo passo a passo com assistência dos agentes. É o modo recomendado quando há controle metodológico necessário, múltiplos stakeholders reais envolvidos ou quando o contexto é sensível e requer validação humana em cada etapa.

**VFT Completo com IA (Pipeline Automático)** — o sistema executa as três fases do VFT de forma sequencial e automática, com cada agente especializado operando sobre o contexto acumulado pelos anteriores. O analista acompanha o progresso por um console narrativo e recebe o relatório consolidado ao final. Esse modo é adequado para análises exploratórias, pré-estruturação de problemas ou quando o tempo de facilitação é limitado.

---

## 2. O processo VFT segundo Vieira et al. (2024)

Vieira et al. (2024) apresentam um processo integrado de aplicação do VFT em três fases e aproximadamente 33 passos. O processo é condicionado à configuração de stakeholders do problema — o número de tomadores de decisão e de demais partes interessadas determina quais passos são executados e em que ordem.

```
┌────────────────────────────────────────────────────────┐
│  FASE 1 — Initial Decision Frame e Decision Statement  │  7 passos
├────────────────────────────────────────────────────────┤
│  FASE 2 — Define Decision Objectives                   │  18 passos
├────────────────────────────────────────────────────────┤
│  FASE 3 — Define Decision Alternatives                 │  8 passos
└────────────────────────────────────────────────────────┘
```

O processo começa pelo mapeamento de quem está envolvido na decisão (stakeholders), avança para a estruturação do que importa para essas pessoas (valores → objetivos), e chega à identificação de como esses valores podem ser satisfeitos (alternativas). Esse encadeamento reflete o princípio central do VFT: os valores devem guiar a busca por alternativas, não o contrário.

---

## 3. Agentes de inteligência artificial

O VFT Studio utiliza uma arquitetura de agentes especializados. Cada agente tem um papel distinto e opera sobre o contexto completo do projeto — incluindo dados persistidos de todas as etapas anteriores. Os agentes não substituem o julgamento humano: eles facilitam, questionam, estruturam e documentam.

### Princípio de contexto compartilhado

Antes de qualquer interação, cada agente recebe um **snapshot completo do projeto**: stakeholders, Initial Decision Frame (IDF), Decision Statement, objetivos elicitados, alternativas e histórico de chat. Isso garante que as respostas sejam sempre coerentes com o estado atual do processo — não com abstrações genéricas sobre VFT.

```
CONTEXTO INJETADO EM TODO AGENTE
─────────────────────────────────
• Nome e descrição do projeto
• Fase e passo atuais
• Stakeholders (nome, papel, perfil, interesses)
• IDF (Purpose, Perspective, Scope)
• Decision Statement
• Lista de objetivos e suas classificações
• Alternativas e consequências
• Passos já completados
```

---

## 4. Fase 1 — Initial Decision Frame e Decision Statement

### O que acontece nesta fase

A Fase 1 estabelece o enquadramento do problema decisório. Seu produto é o **Initial Decision Frame (IDF)** — composto por Propósito, Perspectiva e Escopo — e o **Decision Statement**, uma sentença que sintetiza o que está sendo decidido e por quem.

O Propósito responde por que a decisão está sendo tomada e quais são suas consequências relevantes. A Perspectiva define de quem são os valores que importam — quem são os tomadores de decisão e quais suas posições. O Escopo delimita que alternativas estão dentro da decisão e qual é o status quo.

O Decision Statement estrutura a decisão na forma: *"Decidir [verbo + objeto + restrições]"*.

### Passos da Fase 1

```
1.1  Mapeamento de stakeholders
1.2  IDF — único DM, único stakeholder            [condicional]
1.3  IDF — único DM, múltiplos stakeholders       [condicional]
1.4  Workshop para IDF — múltiplos DMs            [condicional]
1.5  IDF — múltiplos DMs, múltiplos stakeholders  [condicional]
1.6  Documentação do Initial Decision Frame
1.7  Definição do Decision Statement
```

Os passos 1.2 a 1.5 são mutuamente exclusivos: apenas um é executado dependendo da configuração de stakeholders.

### Agente FRAME

**FRAME** (Framing and Requirements Analysis for Meaningful Engagement) é o especialista da Fase 1. Seu papel é auxiliar na construção rigorosa do IDF e do Decision Statement.

**O que FRAME faz:**

```
FASE 1 — RESPONSABILIDADES DO FRAME
─────────────────────────────────────

Passo 1.1 — Mapeamento de Stakeholders
  → Identifica e classifica atores segundo taxonomia de 5 tipos:
      Decision Authority, Customer, Owner, User, Consumer
  → Avalia se há tomadores de decisão ausentes
  → Propõe stakeholders não identificados com base no contexto

Passo 1.2 / 1.3 / 1.5 — Construção do IDF
  → Elicita o Propósito:
      "Por que esta decisão está sendo tomada?"
      "Quando deve ser tomada?"
      "Quais consequências importam?"
  → Elicita a Perspectiva:
      "Quem observa esta decisão?"
      "De quem são os valores que definem 'bom'?"
  → Elicita o Escopo:
      "Quais alternativas estão dentro do escopo?"
      "Qual é o status quo?"
  → Identifica ambiguidades no IDF que comprometem a Fase 2
  → Valida que os três elementos estejam presentes e coerentes

Passo 1.4 — Workshop com múltiplos DMs
  → Conduz roteiro de 7 etapas (Apêndice B de Vieira et al., 2024):
      Vision Statement → Levantamento de Issues → Categorização
      → Hierarquia Decisória → Valores e Trade-offs
      → Diagrama de Influência → Cronograma

Passo 1.7 — Decision Statement
  → Verifica se o IDF está completo (pré-condição)
  → Gera proposta de Decision Statement com base no IDF preenchido
  → Valida estrutura: "Decidir + [verbo/objeto/restrições]"
  → Propõe refinamentos quando a sentença está ambígua ou ampla demais
```

**Quando consultar FRAME:** Em qualquer momento da Fase 1 em que o analista tenha dúvidas sobre quem deve ser stakeholder, o que incluir no Escopo, ou como formular o Decision Statement.

---

## 5. Fase 2 — Define Decision Objectives

### O que acontece nesta fase

A Fase 2 é o núcleo metodológico do VFT. Aqui os valores dos stakeholders são elicitados, transformados em objetivos bem formados, classificados, testados logicamente e organizados em duas estruturas complementares: a **Rede Meios-Fins** e a **Hierarquia de Objetivos Fundamentais**.

Um objetivo bem formado em VFT tem a estrutura: *[contexto do IDF] + [verbo de direção: maximizar/minimizar/garantir/etc.] + [objeto mensurável]*.

A distinção central da Fase 2 é entre **objetivos-meios** (importantes porque levam a outros objetivos) e **objetivos fundamentais** (importantes por si mesmos no contexto desta decisão). Essa distinção determina quais objetivos entram na avaliação de alternativas e quais apenas informam o raciocínio.

### Passos da Fase 2

```
2.1   Seleção da técnica de modelagem qualitativa de valor
2.2   Identificação de valores em documentos organizacionais  [se Gold/Combined]
2.3   Conversão de valores organizacionais em objetivos       [se Gold/Combined]
2.4   Preparação do questionário de elicitação
2.5   Wish List — único stakeholder                           [condicional]
2.6   VFT Devices / Value Stimulation — único stakeholder     [condicional]
2.7   Conversão de valores em objetivos — único stakeholder   [condicional]
2.8   Wish List — múltiplos stakeholders                      [condicional]
2.9   VFT Devices / Value Stimulation — múltiplos stk         [condicional]
2.10  Conversão de valores individuais — múltiplos stk        [condicional]
2.11  Workshop para identificar objetivos coletivos            [condicional]
2.12  Apresentação + identificação de objetivos coletivos      [condicional]
2.13  Categorização de objetivos
2.14  Mapeamento de relações causais (WITI Test)
2.15  Control of Consequences
2.16  Rede Meios-Fins de Objetivos
2.17  Hierarquia de Objetivos Fundamentais
2.18  Definição de Atributos para Objetivos Fundamentais
```

### Técnicas de elicitação de valores

A Fase 2 usa três instrumentos complementares de elicitação:

**VFT Devices (Keeney, 1992)** — dez dispositivos de elicitação que exploram ângulos distintos dos valores do stakeholder: wish list, contraste entre alternativas, problemas e deficiências, consequências valorizadas/temidas, metas e restrições, diferentes perspectivas, objetivos estratégicos, valores genéricos, estruturação (proto-WITI) e quantificação de objetivos.

**Value Stimulation Techniques (Keeney, 2020)** — oito técnicas adicionais para ampliar o espectro de valores considerados, especialmente úteis quando o stakeholder tem dificuldade em articular o que valoriza.

**Wish List** — levantamento inicial de desejos e aspirações sem restrições, usado como ponto de partida antes da aplicação dos VFT Devices.

### Agente AXIOM

**AXIOM** (Axiomatic Values and Integrated Objectives Modeler) é o especialista da Fase 2. Seu papel é conduzir a elicitação de valores com rigor socrático e garantir que os objetivos resultantes tenham a qualidade metodológica necessária para sustentar a Fase 3.

**O que AXIOM faz:**

```
FASE 2 — RESPONSABILIDADES DO AXIOM
──────────────────────────────────────

Passos 2.4–2.12 — Elicitação de Valores
  → Aplica os 10 VFT Devices como roteiro de entrevista
  → Aplica Value Stimulation Techniques quando a wish list é rasa
  → Para múltiplos stakeholders: conduz entrevistas individuais e
    facilita a convergência em objetivos coletivos (VFB)
  → Para cada valor capturado:
      - Reformula na estrutura [contexto + verbo + objeto]
      - Remove objetivos que são meios disfarçados de fins

Passo 2.13 — Categorização de Objetivos
  → Classifica cada objetivo em:
      Strategic (alinhamento com missão/visão)
      Fundamental (candidato — importa por si mesmo)
      Means (importa porque leva a outro objetivo)
      Other (fora do escopo ou irrelevante para a decisão)
  → Identifica e propõe fusão de objetivos redundantes

Passo 2.14 — WITI Test
  → Para cada objetivo, formula a pergunta:
      "Por que [objetivo X] é importante no contexto desta decisão?"
  → Classifica a resposta:
      Se a resposta aponta outro objetivo → MEANS
      Se a resposta é uma razão intrínseca → FUNDAMENTAL CANDIDATE
      Se a resposta é estratégica/contextual → STRATEGIC
  → Registra a relação causal identificada na resposta (A → B)
  → Atualiza tipo do objetivo no banco de dados

Passo 2.15 — Control of Consequences
  → Para cada FUNDAMENTAL CANDIDATE, aplica duas perguntas de verificação:
      Q1: "Este objetivo contribui para os objetivos estratégicos
           do contexto desta decisão?" (testa alinhamento com Purpose/Perspective)
      Q2: "Há alguma forma de influenciar o alcance deste objetivo
           por meio de alternativas fora do escopo desta decisão?"
           (testa aderência ao Scope do IDF)
           → Se SIM: o objetivo é muito amplo; refinar sua definição
  → Confirma ou revisa a classificação como FUNDAMENTAL

Passos 2.16–2.17 — Estruturas de Objetivos
  → Monta a Rede Meios-Fins a partir das relações causais do WITI Test
      (ligações direcionadas de objetivos-meios para objetivos que suportam)
  → Monta a Hierarquia de Objetivos Fundamentais
      (árvore com decomposição dos fundamentais em sub-objetivos mensuráveis)
  → Verifica as 9 propriedades da hierarquia de fundamentais:
      Essencial, Controlável, Completo, Mensurável, Operacional,
      Decomponível, Não-redundante, Conciso, Compreensível

Passo 2.18 — Atributos
  → Para cada objetivo fundamental folha (nível mais baixo da hierarquia):
      - Propõe tipo de atributo: Natural, Construído ou Proxy
      - Define a escala de medição (descrição + níveis)
      - Verifica as 5 propriedades do atributo:
          Sem ambiguidade, Abrangente, Direto, Operacional, Compreensível
```

**Quando consultar AXIOM:** Em qualquer momento da Fase 2 — especialmente quando houver dúvida sobre se um objetivo é meio ou fim, quando a wish list parece incompleta ou quando a hierarquia apresenta redundâncias.

### WITI Test — pseudoalgoritmo

```
PARA CADA objetivo na lista de objetivos não-classificados:

  1. Formular pergunta:
       "Por que [objetivo.statement] é importante no contexto de [decision_statement]?"

  2. Registrar resposta do stakeholder (ou gerar simulação via agente)

  3. Classificar resposta:
       SE a resposta menciona outro objetivo que este apoia
         → tipo = MEANS
         → registrar relação causal: (objetivo → objetivo_mencionado)
       
       SE a resposta expressa uma razão intrínseca de interesse
         → tipo = FUNDAMENTAL_CANDIDATE
         → encaminhar para Control of Consequences (Passo 2.15)
       
       SE a resposta conecta a objetivos estratégicos/missão
         → tipo = STRATEGIC
       
       SENÃO
         → tipo = OTHER (verificar com analista)

  4. Atualizar objetivo no banco de dados com:
       tipo, resposta ao WITI, relação causal (se houver)

FIM PARA
```

### Control of Consequences — pseudoalgoritmo

```
PARA CADA objetivo do tipo FUNDAMENTAL_CANDIDATE:

  1. Aplicar Q1:
       "Este objetivo contribui para os objetivos estratégicos
        do contexto desta decisão?"
       SE NÃO → rever se objetivo é relevante para esta decisão
       SE SIM → continuar

  2. Aplicar Q2:
       "Há alguma forma de influenciar o alcance deste objetivo
        por alternativas fora do escopo desta decisão?"
       SE SIM → objetivo está muito amplo
                refinar definição (restringir escopo ou reformular)
                reaplicar Q1 e Q2 na versão refinada
       SE NÃO → objetivo está dentro do escopo

  3. Se passou Q1 e Q2:
       → confirmar tipo = FUNDAMENTAL
       → adicionar à hierarquia de objetivos fundamentais

FIM PARA
```

---

## 6. Fase 3 — Define Decision Alternatives

### O que acontece nesta fase

A Fase 3 utiliza os objetivos fundamentais e a Rede Meios-Fins como guias para identificar e organizar alternativas de decisão. O diferencial do VFT aqui é que as alternativas são elicitadas *a partir dos valores*, não o contrário: ao invés de perguntar "quais alternativas temos?", pergunta-se "que alternativas seriam capazes de maximizar o desempenho nos objetivos fundamentais?".

O produto da Fase 3 é a **lista final de alternativas** com suas consequências estimadas para cada atributo definido na Fase 2 — a base para a avaliação e escolha posterior.

### Passos da Fase 3

```
3.1  Mapeamento de consequências — alternativas iniciais, único stk   [condicional]
3.2  Elicitação de novas alternativas — único stakeholder             [condicional]
3.3  Organização das alternativas finais — único stakeholder          [condicional]
3.4  Mapeamento de consequências — alternativas iniciais, multi stk   [condicional]
3.5  Elicitação de novas alternativas — múltiplos stakeholders        [condicional]
3.6  Workshop para definição de alternativas                          [condicional]
3.7  Apresentação + elicitação de alternativas coletivas              [condicional]
3.8  Organização das alternativas finais — múltiplos stakeholders     [condicional]
```

### Agente NOVA

**NOVA** (New Options and Viable Alternatives) é o especialista da Fase 3. Seu papel é usar a estrutura de objetivos produzida pela Fase 2 como motor de busca por alternativas.

**O que NOVA faz:**

```
FASE 3 — RESPONSABILIDADES DO NOVA
─────────────────────────────────────

Passos 3.1 / 3.4 — Consequências das Alternativas Iniciais
  → Para cada alternativa já identificada:
      Estima ou elicita as consequências nos atributos da Fase 2
      Preenche a Matriz de Consequências (alternativas × atributos)
  → Identifica alternativas dominadas (piores em todos os atributos)
  → Identifica lacunas de informação

Passos 3.2 / 3.5 — Elicitação de Novas Alternativas
  → Aplica o procedimento de Keeney (1992):

      ROUND 1 — Objetivos individuais
        Para cada objetivo fundamental:
          "Que alternativas podem melhorar o desempenho em [atributo X]?"

      ROUND 2 — Pares de objetivos
        Para cada par de fundamentais:
          "Que alternativas podem melhorar simultaneamente [X] e [Y]?"

      ROUND 3 — Trios e combinações maiores
        (repete lógica com subconjuntos maiores de objetivos)

      ROUND 4 — Rede Meios-Fins como fonte
        "Os objetivos-meios sugerem que tipo de solução?"
        (um meio objetivo bem ativado pode gerar um tipo de alternativa)

      ROUND 5 — Oportunidades de decisão
        "Há uma alternativa que mudaria o próprio escopo do possível?"
        (alternativas transformadoras, fora do conjunto considerado inicialmente)

Passos 3.3 / 3.8 — Organização Final
  → Verifica que cada alternativa está dentro do Escopo do IDF
  → Consolida lista sem duplicatas
  → Completa a Matriz de Consequências final
  → Identifica alternativas interessantes para aprofundamento posterior
```

---

## 7. Agente ANALYST — Proxy Documental

### Papel no processo

Quando um stakeholder não pode ser entrevistado diretamente — por indisponibilidade, afastamento, ou por ser uma instituição representada por documentos — o ANALYST substitui a entrevista presencial por análise documental. Documentos como relatórios, atas, políticas, apresentações ou declarações públicas são tratados como fontes primárias do que o stakeholder valoriza.

O ANALYST pode ser usado em qualquer fase do processo: para embasar a construção do IDF (Fase 1), apoiar a elicitação de valores (Fase 2) ou informar consequências de alternativas (Fase 3).

**O que ANALYST faz:**

```
DADO um conjunto de documentos associados a um stakeholder:

  1. Processar cada documento como fonte primária
     (PDF nativo, PDF escaneado, imagem, texto, markdown)

  2. Para cada VFT Device (1 a 10), inferir a "resposta" do stakeholder
     a partir do conteúdo documental:
       - Extrair citação direta → HIGH confidence
       - Parafrasear com base textual clara → MEDIUM confidence
       - Inferir com base em padrão → LOW confidence [sinalizar]
       - Especulação sem base textual → [sinalizar explicitamente]

  3. Gerar "transcrição de entrevista virtual":
     cada resposta é escrita em primeira pessoa, como se o
     stakeholder estivesse respondendo, seguida das evidências documentais

  4. Identificar contradições entre documentos:
     → Reportar AMBAS as posições com datas; não resolver arbitrariamente

  5. Rastrear cada valor/objetivo extraído à sua fonte documental exata
     (título, data, seção/página quando disponível)

PRODUTO: Entrevista virtual estruturada, com evidências, nível de
confiança por item e flags de limitação — equivalente funcional
à wish list de um stakeholder entrevistado diretamente
```

---

## 8. Agente ARIA — Facilitadora Principal

### Papel no processo

**ARIA** (Analytical Reasoning and Integration Assistant) é a facilitadora central do VFT Studio. Diferentemente dos especialistas de fase, ARIA está disponível em todo momento e em qualquer view. Ela não executa a análise técnica — ela orienta o analista no processo, explica conceitos, identifica lacunas e conecta insights entre fases.

ARIA também assume o papel de revisora pós-relatório: após o relatório final ser gerado, é com a ARIA que o analista discute mudanças, refinamentos e iterações.

**O que ARIA faz:**

```
DISPONÍVEL EM QUALQUER MOMENTO DO PROCESSO

Orientação processual:
  → Explica o que cada fase e passo representam metodologicamente
  → Cita a seção relevante de Vieira et al. (2024) quando pertinente
  → Alerta quando o analista tenta pular etapas obrigatórias
  → Sugere quando invocar um especialista de fase

Conexão entre fases:
  → Identifica quando um valor elicitado na Fase 2 conecta
     com um stakeholder identificado na Fase 1
  → Sinaliza quando um objetivo pode estar criando problemas
     para a elicitação de alternativas na Fase 3
  → Detecta lacunas: "Stakeholder X não teve valores elicitados ainda"

Postura metodológica:
  → Não toma partido sobre qual alternativa é melhor
  → Não impõe qual objetivo deve ser fundamental
  → Questiona sem responder: faz o analista chegar à resposta
  → Comunica em português brasileiro por padrão

Revisão pós-relatório:
  → Recebe o relatório final como contexto
  → Discute mudanças em qualquer seção:
       stakeholders, objetivos, relações causais,
       alternativas, consequências, narrativa
  → Transforma a análise automática em iteração facilitada
```

---

## 9. Stakeholder Agents — Simulação de Perspectivas

### Papel no processo

Para cada stakeholder cadastrado no projeto, o sistema pode criar um agente simulado que responde como aquele stakeholder responderia — baseado em seu perfil, interesses e papel definidos no Passo 1.1. Essa simulação é usada durante as entrevistas de elicitação (Fase 2) e na War Room (Pipeline Automático).

**O que cada Stakeholder Agent faz:**

```
DADO o perfil do stakeholder (nome, papel, interesses, descrição):

  → Responder às perguntas do VFT Devices
     como aquele stakeholder responderia, mantendo consistência
     com seus interesses e perspectiva de papel

  → Responder ao WITI Test como o stakeholder responderia:
     "Por que [objetivo X] é importante para você?"

  → Gerar wish list plausível a partir do perfil
     (valores que o stakeholder mencionaria espontaneamente)

  → Manter posições coerentes ao longo da sessão
     (não mudar de opinião sem razão contextual)

  → Representar conflitos genuínos com outros stakeholders
     quando os interesses são contraditórios

LIMITAÇÃO EXPLÍCITA:
  A simulação é baseada apenas nas informações fornecidas
  no cadastro do stakeholder. Quanto mais rico o perfil,
  mais fidedigna a simulação. Não é substituta de entrevista real.
```

---

## 10. Pipeline Automático — VFT Completo com IA

### Visão geral

O Pipeline Automático executa as três fases do VFT de forma sequencial, com os agentes especializados operando sobre o contexto acumulado pelas fases anteriores. O processo inclui ainda uma etapa de debate estruturado (War Room) e uma camada de modelagem de dinâmicas sociais (Simulação Social).

### Sequência de execução

```
PIPELINE AUTOMÁTICO — SEQUÊNCIA COMPLETA
──────────────────────────────────────────

ETAPA 1 — FRAME (Fase 1 — Stakeholders e IDF)
  Entrada: nome do projeto, descrição, notas de contexto
  Tarefa: identificar stakeholders, mapear papéis, estruturar IDF,
          formular Decision Statement
  Saída: texto estruturado com IDF completo e lista de stakeholders

                ↓ (output da ETAPA 1 é injetado como contexto)

ETAPA 2 — AXIOM (Fase 2 — Valores e Objetivos)
  Entrada: output da ETAPA 1 + dados do projeto
  Tarefa: elicitar valores por stakeholder, converter em objetivos,
          aplicar WITI Test, aplicar CoC, montar hierarquia e rede meios-fins,
          propor atributos
  Saída: texto estruturado com hierarquia de objetivos e rede meios-fins

                ↓ (outputs das ETAPAs 1 e 2 são injetados como contexto)

ETAPA 3 — NOVA (Fase 3 — Alternativas)
  Entrada: outputs das ETAPAs 1 e 2 + dados do projeto
  Tarefa: mapear consequências das alternativas iniciais,
          elicitar novas alternativas a partir dos objetivos fundamentais,
          preencher Matriz de Consequências
  Saída: texto estruturado com alternativas e consequências

ETAPA 4 — ANALYST (Fase 4 — Evidências Documentais)
  [Executada apenas se há documentos cadastrados no projeto]
  Entrada: outputs das ETAPAs 1–3 + documentos
  Tarefa: cruzar documentos com os achados das fases anteriores,
          identificar evidências, lacunas e contradições
  Saída: análise documental com citações e flags de confiança

                ↓

ETAPA 5 — SIMULAÇÃO SOCIAL
  Participantes: stakeholders do projeto (agents simulados)
  Estrutura: rodadas de interação
  Tarefa para cada rodada:
    → Cada stakeholder atualiza sua posição com base nos
       outputs das fases e nas posições dos demais
    → Sistema computa coalizões (grupos de posições alinhadas)
    → Sistema computa votação sobre as alternativas
    → Sistema registra trajetória de cada posição ao longo das rodadas
  Saída: mapa de coalizões, resultado da votação, trajetórias,
         conflitos mais relevantes

                ↓

ETAPA 6 — WAR ROOM
  Participantes: FRAME, AXIOM, NOVA, ANALYST + ARIA (mediadora)
  Estrutura: debate estruturado em atos
    Ato 1: ARIA abre o debate; cada agente apresenta sua análise da fase
    Ato 2: cada agente questiona os outros — pontos críticos,
            lacunas, inconsistências entre fases
    Ato 3: ARIA sintetiza as tensões identificadas e propõe encaminhamento
  Saída: transcript do debate com pontos críticos e síntese

                ↓

ETAPA 7 — MATERIALIZAÇÃO
  Tarefa: extrair dos textos produzidos pelas etapas anteriores
          os artefatos estruturados e persisti-los no banco de dados:
          stakeholders, objetivos (com tipo e relações causais),
          alternativas e consequências
  Saída: entidades persistidas; contadores de materializados

                ↓

ETAPA 8 — RELATÓRIO FINAL
  Tarefa: consolidar todos os artefatos em relatório estruturado
  Seções: IDF documentado, hierarquia de objetivos, rede meios-fins,
          simulação social, War Room, alternativas e consequências,
          artefatos visuais interativos
  Exportações disponíveis: Markdown, PDF editorial,
                            HTML interativo (slides), PNG dos diagramas
```

### Fluxo de contexto acumulado

Uma característica central do pipeline é que cada agente recebe o output completo de todos os agentes anteriores. Isso significa que AXIOM não parte do zero — ele lê o que FRAME produziu sobre os stakeholders. NOVA não infere os objetivos — ela os recebe do AXIOM. A War Room debate com base nos produtos concretos das três fases.

```
FRAME output → AXIOM context
FRAME output + AXIOM output → NOVA context
FRAME + AXIOM + NOVA outputs → ANALYST context
FRAME + AXIOM + NOVA + ANALYST outputs → Simulação Social
Todos os outputs → War Room
Todos os outputs + War Room transcript → Materialização → Relatório
```

---

## 11. Interações entre modos de uso

### VFT Guiado → revisão via Chat

Ao trabalhar no modo guiado, o analista pode a qualquer momento abrir o chat lateral e consultar ARIA, FRAME, AXIOM, NOVA ou um Stakeholder Agent — sem sair do passo em que está. O chat tem acesso ao estado completo do projeto e ao passo ativo.

### Pipeline → iteração pós-relatório

Ao concluir o pipeline, o botão "Solicitar mudanças à ARIA" abre o chat com o relatório completo como contexto inicial. O analista pode pedir ajustes em qualquer parte — desde a classificação de um objetivo até a narrativa de uma seção inteira — sem precisar reexecutar o pipeline completo.

### Documentos → qualquer fase

O ANALYST pode ser invocado a qualquer momento para analisar documentos carregados, independentemente de o analista estar no modo guiado ou no pipeline. Os valores extraídos pelos documentos podem ser incorporados manualmente aos objetivos da Fase 2 no modo guiado.

---

## 12. Artefatos produzidos

| Artefato | Fase | Descrição |
|----------|------|-----------|
| Initial Decision Frame | 1 | Purpose, Perspective, Scope documentados |
| Decision Statement | 1 | Sentença estruturada da decisão |
| Lista de Stakeholders | 1 | Atores com papéis, perfis e interesses |
| Wish List por Stakeholder | 2 | Valores brutos elicitados |
| Lista de Objetivos | 2 | Todos os objetivos com classificação (WITI + CoC) |
| Rede Meios-Fins | 2 | Grafo direcionado de relações causais entre objetivos |
| Hierarquia de Objetivos Fundamentais | 2 | Árvore de fundamentais com sub-objetivos nas folhas |
| Atributos | 2 | Escala de medição para cada fundamental folha |
| Matriz de Consequências | 3 | Alternativas × Atributos com valores estimados |
| Lista de Alternativas | 3 | Alternativas dentro do escopo do IDF |
| Simulação Social | Pipeline | Coalizões, votação, trajetórias, convergência |
| Transcript da War Room | Pipeline | Debate estruturado entre agentes com síntese |
| Relatório Final | Pipeline/Guiado | Documento consolidado com todos os artefatos |

---

## 13. Referências

**Keeney, R. L. (1992).** *Value-Focused Thinking: A Path to Creative Decisionmaking*. Harvard University Press.

**Keeney, R. L. (2020).** Value-focused brainstorming. *Decision Analysis*, 17(4), 303–319.

**Keeney, R. L., & Gregory, R. S. (2005).** Selecting attributes to measure the achievement of objectives. *Operations Research*, 53(1), 1–11.

**Vieira, G. B. et al. (2024).** Using value-focused thinking in an integrated process to support decisions. *Pesquisa Operacional*, 44: e276110.
