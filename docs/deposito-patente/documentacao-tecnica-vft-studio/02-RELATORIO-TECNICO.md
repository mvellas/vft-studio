# Relatorio Tecnico - VFT Studio

## 1. Descricao geral

O VFT Studio e uma aplicacao desktop destinada a apoiar a estruturacao de decisoes complexas por meio do metodo Value-Focused Thinking. A tecnologia organiza o processo decisorio a partir de valores, objetivos, stakeholders, atributos, alternativas e consequencias, mantendo rastreabilidade entre as etapas e fornecendo suporte computacional por agentes de inteligencia artificial.

## 2. Problema tecnico enfrentado

A aplicacao manual do VFT tende a depender fortemente de facilitadores especializados, entrevistas, workshops, planilhas, registros textuais e consolidacao posterior. Esse modo de execucao pode gerar perda de informacao, baixa padronizacao, dificuldade de rastreabilidade e limitacoes quando stakeholders relevantes nao estao disponiveis ou nao podem abrir informacoes de forma irrestrita.

O VFT Studio minimiza essas dificuldades ao transformar o processo VFT em um fluxo computacional guiado, documentado e assistido, capaz de preservar contexto, registrar etapas, apoiar a analise de documentos e estruturar informacoes mesmo quando ha restricoes de disponibilidade ou acesso a stakeholders.

## 3. Arquitetura tecnica

### Camada desktop

- PyWebView para execucao em janela desktop nativa.
- FastAPI/uvicorn em processo local para servir API e frontend.
- Frontend React/TypeScript compilado e embarcado no pacote.

### Camada backend

- FastAPI para APIs locais.
- SQLAlchemy e SQLite para persistencia.
- Alembic para estrutura de migracao.
- Servicos de dominio para fases, objetivos, atributos, documentos, pipeline e licenciamento.

### Camada frontend

- React com TypeScript.
- Zustand/React Query para estado e comunicacao.
- Componentes visuais para fluxo VFT, stakeholders, objetivos, atributos, alternativas, consequencias, diagramas e configuracoes.

### Camada de IA

- Agentes especializados integrados a API externa quando configurada pelo usuario.
- Prompts separados por agente.
- Streaming e historico de chat por projeto/agente.

### Camada de licenciamento

- Tela de ativacao por serial key antes do acesso ao software.
- Catalogo local de hashes/chaves embarcado no build.
- Estado de ativacao registrado localmente no banco de dados.
- Lista de seriais mantida fora do controle de versao.

## 4. Componentes principais

| Componente | Funcao tecnica |
|---|---|
| `main.py` | Inicializacao desktop, servidor local e ponte nativa. |
| `backend/app.py` | Aplicacao FastAPI e roteamento de APIs. |
| `backend/api/license.py` | Endpoints de status e ativacao por serial key. |
| `backend/services/licensing.py` | Normalizacao, hashing e validacao de serial keys. |
| `frontend/src/App.tsx` | Controle de acesso inicial, onboarding e renderizacao das views. |
| `frontend/src/components/project/LicenseGate.tsx` | Interface de ativacao por serial key. |
| `VFTStudio.spec` | Empacotamento macOS com PyInstaller. |
| `VFTStudio.Windows.spec` | Empacotamento Windows com PyInstaller. |
| `build.py` | Script unificado de build macOS/Windows. |
| `packaging/icons/` | Icones de aplicacao para macOS e Windows. |

## 5. Fluxo VFT implementado

O software organiza o processo decisorio em fases e passos, incluindo:

- enquadramento inicial da decisao;
- identificacao e organizacao de stakeholders;
- registro de valores e objetivos;
- classificacao de objetivos;
- estruturacao de hierarquia e relacoes causais;
- definicao de atributos;
- geracao e organizacao de alternativas;
- matriz de consequencias;
- exportacao de relatorio e diagramas.

## 6. Diferenciais tecnicos

- Execucao desktop local, com dados armazenados no computador do usuario.
- Assistencia de agentes de IA especializados por etapa do processo.
- Registro estruturado de etapas, objetos decisorios e historico.
- Apoio a analise documental e simulacao de perspectivas.
- Exportacao de artefatos para documentacao e auditoria.
- Empacotamento instalavel para macOS e estrutura preparada para Windows.
- Ativacao local por serial key.

## 7. Aplicacao demonstrativa

A tecnologia foi aplicada em estudo de caso real sobre a evasao de pilotos da FAB no periodo de 2022 a 2026. O estudo gerou relatorio final de analise com apoio do VFT Studio. Por se tratar de tema sensivel e com resultados destinados a comunicacao academica, os detalhes e achados especificos nao sao reproduzidos nesta documentacao tecnica. Os resultados serao encaminhados em forma de artigo ao SIGE.

## 8. Nivel de maturidade tecnologica

A tecnologia e classificada, de forma conservadora, como **TRL 6**, pois ha prototipo funcional demonstrado em ambiente relevante, com build desktop, ativacao, aplicacao em estudo real e testes funcionais. Ainda nao ha evidencia de operacao continuada em todas as condicoes, homologacao institucional ampla ou uso rotineiro em escala.

## 9. Riscos e cuidados

- Estudos reais podem conter informacoes sensiveis e devem ser tratados com controle de acesso.
- Relatorios exportados devem ser revisados antes de divulgacao.
- Serial keys e dados locais nao devem ser enviados ao GitHub.
- Builds Windows devem ser validados em maquina Windows.
