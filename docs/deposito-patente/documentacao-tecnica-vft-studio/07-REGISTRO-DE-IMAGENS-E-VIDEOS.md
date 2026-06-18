# Registro de Imagens e Videos

## 1. Objetivo

Este arquivo registra as evidencias visuais recomendadas para comprovar a existencia, funcionamento e maturidade do VFT Studio. As imagens e videos devem ser armazenados preferencialmente nas pastas `assets/` ou `evidencias/`.

## 2. Evidencias visuais recomendadas

| Evidencia | Arquivo sugerido | Status |
|---|---|---|
| Icone do aplicativo | `assets/app-icon-1024.png` | Gerado em `packaging/icons/app-icon-1024.png`; pode ser copiado para `assets/`. |
| Tela de ativacao por serial key | `assets/01-ativacao-serial.png` | Pendente. |
| Tela de configuracao inicial | `assets/02-configuracao-inicial.png` | Pendente. |
| Tela de lista/criacao de projetos | `assets/03-projetos.png` | Pendente. |
| Tela de stakeholders | `assets/04-stakeholders.png` | Pendente. |
| Tela de objetivos VFT | `assets/05-objetivos.png` | Pendente. |
| Tela de alternativas/consequencias | `assets/06-alternativas-consequencias.png` | Pendente. |
| Tela de relatorio/exportacao | `assets/07-relatorio-exportacao.png` | Pendente. |
| Video de instalacao macOS | `evidencias/video-instalacao-macos.mov` | Pendente. |
| Video de fluxo demonstrativo VFT | `evidencias/video-fluxo-vft-demo.mov` | Pendente. |

## 3. Regras para capturas

- Usar projeto demonstrativo ou anonimo.
- Nao exibir dados da pesquisa sobre evasao de pilotos da FAB.
- Nao exibir serial keys, API keys, nomes reais ou documentos institucionais.
- Verificar a tela inteira antes de capturar para evitar informacoes sensiveis em segundo plano.
- Preferir imagens em PNG.
- Preferir videos curtos, objetivos e sem audio, salvo necessidade especifica.

## 4. Evidencias visuais ja disponiveis no projeto

| Caminho | Descricao |
|---|---|
| `packaging/icons/app-icon-1024.png` | Imagem fonte do icone do aplicativo. |
| `packaging/icons/app-icon.icns` | Icone macOS do aplicativo. |
| `packaging/icons/app-icon.ico` | Icone Windows do aplicativo. |
| `frontend/src/assets/hero.png` | Imagem visual usada no frontend. |

## 5. Sugestao de roteiro para video demonstrativo

1. Abrir o instalador macOS.
2. Abrir o VFT Studio.
3. Inserir serial key valida sem mostrar a chave completa.
4. Acessar tela inicial.
5. Criar projeto demonstrativo.
6. Registrar um stakeholder ficticio.
7. Registrar um objetivo ficticio.
8. Mostrar area de exportacao ou relatorio demonstrativo.
9. Encerrar o aplicativo.

## 6. Controle de versao de midia

Imagens demonstrativas sem dados sensiveis podem ser versionadas se forem necessarias para documentacao. Videos, relatorios reais e capturas com informacoes sensiveis devem permanecer fora do repositorio publico.
