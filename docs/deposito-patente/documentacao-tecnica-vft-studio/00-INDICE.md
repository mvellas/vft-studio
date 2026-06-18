# Documentacao Tecnica - VFT Studio

**Finalidade:** dossie tecnico organizado para suporte a deposito de patente/programa de computador do VFT Studio.

**Data de organizacao:** 2026-06-18  
**Tecnologia:** VFT Studio - software de apoio a decisao baseado em Value-Focused Thinking  
**Responsavel pelo projeto:** Marcus Vellasquez  
**Status:** prototipo funcional demonstrado em ambiente relevante

## Conteudo da pasta

| Arquivo | Finalidade |
|---|---|
| `01-MANUAL-DE-USO.md` | Instrucao de instalacao, ativacao e uso operacional do software. |
| `02-RELATORIO-TECNICO.md` | Descricao tecnica da arquitetura, componentes, fluxo VFT e diferenciais. |
| `03-CADERNO-DE-LABORATORIO.md` | Registro cronologico de desenvolvimento, testes e decisoes tecnicas. |
| `04-EVIDENCIAS-TESTES-E-BUILD.md` | Evidencias de testes, build, empacotamento e verificacoes realizadas. |
| `05-INVENTARIO-ARTEFATOS.md` | Inventario de artefatos tecnicos, executaveis, instaladores e codigo-fonte. |
| `06-CONFIDENCIALIDADE-E-CONTROLE.md` | Classificacao de sensibilidade, restricoes de compartilhamento e cuidados. |
| `07-REGISTRO-DE-IMAGENS-E-VIDEOS.md` | Registro de evidencias visuais existentes ou a produzir. |
| `assets/` | Pasta para imagens, capturas de tela, icones e material visual. |
| `evidencias/` | Pasta para logs, comprovantes de teste, hashes, videos ou capturas exportadas. |
| `evidencias/SHA256SUMS.txt` | Hashes SHA-256 de artefatos locais relevantes. |

## Observacao de confidencialidade

Esta pasta foi preparada para documentar a tecnologia sem expor resultados sensiveis de estudos aplicados, incluindo o estudo de caso relacionado a evasao de pilotos da FAB. Caso sejam anexadas evidencias visuais, logs ou relatorios adicionais, recomenda-se revisar previamente o conteudo para evitar divulgacao de dados institucionais, pessoais ou estrategicos.

## Estado dos artefatos locais

- Instalador macOS gerado localmente: `dist/VFT-Studio-macOS.dmg`
- Aplicativo macOS gerado localmente: `dist/VFT Studio.app`
- Icone macOS do aplicativo: `packaging/icons/app-icon.icns`
- Icone Windows do aplicativo: `packaging/icons/app-icon.ico`
- Lista local de serial keys: `.local/serial-keys.json` (nao deve ser versionada nem enviada ao GitHub)

## Como usar este dossie

1. Anexar os arquivos desta pasta como documentacao tecnica organizada.
2. Usar o manual e o relatorio tecnico como documentos principais.
3. Usar o caderno de laboratorio e as evidencias de build/teste como comprovacao de maturidade.
4. Manter fora de anexos publicos qualquer arquivo sensivel, especialmente `.local/serial-keys.json`, bancos de dados locais e relatorios com conteudo institucional restrito.
