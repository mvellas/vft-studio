# Manual de Uso - VFT Studio

## 1. Objetivo do software

O VFT Studio e um software desktop de apoio a decisao que operacionaliza o metodo Value-Focused Thinking (VFT), conduzindo o usuario por etapas estruturadas de enquadramento do problema, identificacao de stakeholders, elicitacao de valores, formulacao de objetivos, definicao de atributos, estruturacao de alternativas, analise de consequencias, diagramas e relatorio final.

## 2. Publico-alvo

O software e destinado a pesquisadores, analistas, facilitadores, gestores e equipes que necessitem conduzir processos decisorios complexos com rigor metodologico, rastreabilidade e apoio de inteligencia artificial.

## 3. Requisitos de uso

### macOS

- macOS 13 Ventura ou superior.
- Aplicativo instalado a partir de `VFT-Studio-macOS.dmg`.
- Chave serial valida para ativacao inicial.
- Opcional: API key da Anthropic para uso dos agentes de IA.
- Opcional: Brave Search API key para recursos de busca web.

### Windows

- Windows 10/11 64 bits.
- Instalador a ser gerado em maquina Windows a partir de `python build.py --target windows --package`.
- WebView2 Runtime, quando exigido pelo ambiente Windows.
- Chave serial valida para ativacao inicial.

## 4. Instalacao no macOS

1. Abrir o arquivo `dist/VFT-Studio-macOS.dmg`.
2. Arrastar o aplicativo `VFT Studio.app` para a pasta Aplicativos, quando aplicavel.
3. Abrir o aplicativo.
4. Informar uma serial key valida na tela de ativacao.
5. Prosseguir para a configuracao inicial.

## 5. Ativacao por serial key

Na primeira execucao, o VFT Studio apresenta uma tela de ativacao. O usuario deve inserir uma serial key no formato:

`VFT-XXXX-XXXX-XXXX-XXXX`

A validacao e realizada localmente contra um catalogo de seriais embarcado no build. A lista de seriais aceitos e mantida apenas no computador do titular/desenvolvedor em `.local/serial-keys.json` e nao deve ser enviada ao repositorio publico.

A ativacao concluida e registrada localmente no banco de dados do usuario, em `~/VFTStudio/db.sqlite`, por meio da tabela de configuracoes da aplicacao.

## 6. Configuracao das chaves de IA

O software pode funcionar como ambiente de estruturacao VFT sem expor dados para servicos externos. Para habilitar agentes de IA, o usuario deve configurar uma API key da Anthropic em Configuracoes. A chave e armazenada por mecanismo local de chaveiro/keyring quando disponivel.

Tambem e possivel configurar uma Brave Search API key para recursos de busca web assistida, quando aplicavel ao estudo.

## 7. Fluxo basico de uso

1. Criar um novo projeto VFT.
2. Registrar descricao inicial, contexto e notas do problema.
3. Avancar pelo fluxo de etapas do VFT.
4. Identificar stakeholders relevantes.
5. Registrar valores, objetivos e relacoes entre objetivos.
6. Classificar e organizar objetivos fundamentais, objetivos-meio e objetivos estrategicos.
7. Definir atributos de avaliacao para objetivos.
8. Gerar ou registrar alternativas.
9. Preencher matriz de consequencias.
10. Exportar relatorio, diagramas e materiais de apoio.

## 8. Agentes de IA

O software utiliza agentes especializados para apoiar partes do processo:

- ARIA: facilitador geral do processo VFT.
- FRAME: apoio ao enquadramento inicial da decisao.
- AXIOM: apoio a objetivos, valores, hierarquias e relacoes causais.
- NOVA: apoio a alternativas e consequencias.
- ANALYST: apoio a analise documental.
- SCRIBE: geracao de relatorio estruturado.

## 9. Armazenamento local

Os dados operacionais sao armazenados localmente em:

`~/VFTStudio/`

Essa pasta pode conter banco de dados, documentos importados, exportacoes e configuracoes locais. Deve ser tratada como repositorio sensivel quando contiver estudos reais.

## 10. Exportacao

O software permite gerar relatorios e diagramas derivados do processo VFT. Antes de compartilhar exportacoes, recomenda-se revisar o conteudo para remover dados sensiveis, nomes, informacoes pessoais, informacoes institucionais restritas ou conclusoes ainda nao publicadas.

## 11. Limitacoes conhecidas

- O build Windows deve ser realizado em maquina Windows, pois PyInstaller nao e ferramenta confiavel para cross-compilation macOS -> Windows.
- A qualidade das respostas dos agentes de IA depende da configuracao da API key e da qualidade dos dados inseridos.
- Estudos sensiveis exigem controle de acesso, revisao de conteudo e aplicacao de regras institucionais de confidencialidade.
