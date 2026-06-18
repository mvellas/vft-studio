# Inventario de Artefatos - VFT Studio

## 1. Codigo-fonte principal

| Caminho | Descricao |
|---|---|
| `main.py` | Entrada desktop do aplicativo. |
| `backend/` | Backend FastAPI, servicos, agentes, banco e APIs. |
| `frontend/` | Frontend React/TypeScript. |
| `alembic/` | Estrutura de migracao/organizacao de banco. |
| `tests/` | Testes automatizados. |

## 2. Componentes de licenciamento

| Caminho | Descricao | Sensibilidade |
|---|---|---|
| `backend/api/license.py` | API local de status e ativacao de licenca. | Nao sensivel. |
| `backend/services/licensing.py` | Normalizacao, hashing e validacao de serial keys. | Nao sensivel. |
| `frontend/src/components/project/LicenseGate.tsx` | Tela de ativacao por serial key. | Nao sensivel. |
| `.local/serial-keys.json` | Lista local de seriais aceitos. | Sensivel; nao versionar; nao publicar. |

## 3. Artefatos de build e instalacao

| Caminho | Descricao | Status |
|---|---|---|
| `build.py` | Script unificado de build macOS/Windows. | Preparado. |
| `VFTStudio.spec` | Spec PyInstaller para macOS. | Preparado e testado. |
| `VFTStudio.Windows.spec` | Spec PyInstaller para Windows. | Preparado; pendente teste em Windows. |
| `installer/windows/vft-studio.iss` | Script Inno Setup para Windows. | Preparado; pendente teste em Windows. |
| `dist/VFT Studio.app` | Aplicativo macOS gerado localmente. | Gerado. |
| `dist/VFT-Studio-macOS.dmg` | Instalador macOS gerado localmente. | Gerado. |

## 4. Icones e material visual

| Caminho | Descricao |
|---|---|
| `packaging/icons/app-icon-1024.png` | PNG fonte do icone do aplicativo. |
| `packaging/icons/app-icon.icns` | Icone macOS. |
| `packaging/icons/app-icon.ico` | Icone Windows. |
| `packaging/icons/app-icon.iconset/` | Conjunto de PNGs para geracao do `.icns`. |
| `scripts/generate_app_icons.py` | Script reprodutivel para gerar icones. |

## 5. Documentacao tecnica criada para deposito

| Caminho | Descricao |
|---|---|
| `docs/deposito-patente/documentacao-tecnica-vft-studio/00-INDICE.md` | Indice do dossie. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/01-MANUAL-DE-USO.md` | Manual de uso. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/02-RELATORIO-TECNICO.md` | Relatorio tecnico. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/03-CADERNO-DE-LABORATORIO.md` | Caderno de laboratorio. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/04-EVIDENCIAS-TESTES-E-BUILD.md` | Evidencias de build e teste. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/06-CONFIDENCIALIDADE-E-CONTROLE.md` | Controle de confidencialidade. |
| `docs/deposito-patente/documentacao-tecnica-vft-studio/07-REGISTRO-DE-IMAGENS-E-VIDEOS.md` | Registro de imagens e videos. |

## 6. Artefatos que nao devem ser publicados

- `.local/serial-keys.json`
- `~/VFTStudio/db.sqlite`
- `~/VFTStudio/documents/`
- `~/VFTStudio/exports/` quando contiver estudos reais
- relatorios sensiveis de estudos institucionais
- credenciais de API
- logs contendo dados pessoais ou institucionais sensiveis

## 7. Observacao sobre GitHub

O codigo do mecanismo de licenciamento pode ser versionado. A lista real de serial keys nao deve ser versionada. O `.gitignore` foi configurado para ignorar `.local/` e `dist/`.
