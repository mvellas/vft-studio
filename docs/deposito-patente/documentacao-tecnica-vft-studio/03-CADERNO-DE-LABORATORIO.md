# Caderno de Laboratorio - VFT Studio

## Identificacao

**Projeto:** VFT Studio  
**Tipo:** Software desktop de apoio a decisao baseado em Value-Focused Thinking  
**Periodo documentado:** abril a junho de 2026  
**Estado atual:** prototipo funcional com instalador macOS e preparacao para Windows

## Registro cronologico sintetico

### 2026-04 - Consolidacao do MVP

- Implementacao do fluxo principal do VFT Studio.
- Integracao entre backend FastAPI, frontend React e persistencia SQLite.
- Implementacao de componentes para projetos, stakeholders, objetivos, atributos, alternativas, consequencias e exportacao.
- Implementacao de agentes de IA especializados para apoio ao processo VFT.
- Configuracao inicial de testes automatizados.
- Criacao de especificacao PyInstaller para geracao de aplicativo macOS.

### 2026-05 - Organizacao documental e consolidacao do estado do software

- Revisao da documentacao geral do projeto.
- Atualizacao do estado do MVP.
- Registro de arquitetura, fluxos e funcionalidades implementadas.
- Preparacao de materiais explicativos do software e metodologia.

### 2026-06-17 - Licenciamento e empacotamento

- Implementada tela de ativacao por serial key antes do acesso ao software.
- Criado servico local de validacao de serial keys com hashing SHA-256.
- Criada lista local de seriais em `.local/serial-keys.json`, mantida fora do Git.
- Atualizados os scripts de build para macOS e Windows.
- Criado spec Windows (`VFTStudio.Windows.spec`).
- Criado script Inno Setup para instalador Windows.
- Gerado aplicativo macOS `dist/VFT Studio.app`.
- Gerado instalador macOS `dist/VFT-Studio-macOS.dmg`.

### 2026-06-17 - Iconografia e acabamento de instalador

- Gerados icones de aplicacao em `packaging/icons/`.
- Criado `app-icon.icns` para macOS.
- Criado `app-icon.ico` para Windows.
- Atualizado `VFTStudio.spec` para usar o icone macOS.
- Atualizado `VFTStudio.Windows.spec` e Inno Setup para usar o icone Windows.
- Refeito o build macOS e recriado o DMG com icone incorporado.

### 2026-06-18 - Dossie tecnico para deposito

- Criada pasta de documentacao tecnica para suporte ao deposito.
- Organizados manual de uso, relatorio tecnico, caderno de laboratorio, evidencias, inventario de artefatos, controle de confidencialidade e registro de imagens/videos.

## Decisoes tecnicas registradas

1. O software deve funcionar como aplicacao desktop local, preservando dados em `~/VFTStudio/`.
2. A lista de serial keys deve permanecer apenas no computador local do titular/desenvolvedor.
3. O mecanismo de licenciamento deve validar chaves localmente, sem depender de servidor externo.
4. O build macOS deve gerar `.app` e `.dmg`.
5. O build Windows deve ser executado em maquina Windows, por limitacao pratica de cross-compilation do PyInstaller.
6. Estudos reais e relatorios sensiveis nao devem ser incorporados ao repositorio publico.

## Ensaios e verificacoes realizadas

- Build de frontend via `npm run build`.
- Testes de backend de licenciamento e APIs essenciais via pytest.
- Build macOS via PyInstaller.
- Criacao de DMG via `hdiutil`.
- Verificacao do icone em `Info.plist` (`CFBundleIconFile => app-icon.icns`).
- Verificacao da inclusao do catalogo local de seriais no bundle.

## Pendencias tecnicas

- Gerar e validar instalador Windows em ambiente Windows.
- Executar teste manual de instalacao a partir do DMG em maquina limpa.
- Registrar capturas de tela e/ou video curto do fluxo de ativacao e uso.
- Opcionalmente gerar hashes dos instaladores finais para controle de integridade.

## Observacao sobre estudo aplicado

O VFT Studio foi empregado em estudo de caso sobre evasao de pilotos da FAB no periodo de 2022 a 2026. A documentacao deste dossie registra apenas a aplicacao da tecnologia, sem revelar resultados, conclusoes ou dados sensiveis do estudo. A divulgacao tecnica-cientifica dos resultados esta prevista por meio de artigo a ser submetido ao SIGE.
