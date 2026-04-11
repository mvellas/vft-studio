---
title: "Guia de Colaboração — VFT Studio com Claude Code"
author: "VFT Studio"
date: "2026-04-09"
geometry: margin=2.5cm
fontsize: 11pt
---

# Guia de Colaboração — VFT Studio com Claude Code

---

## 1. Setup inicial (pesquisador novo)

### Pré-requisitos

```bash
# Python via Anaconda (obrigatório — o projeto usa /opt/anaconda3/bin/python)
# Node.js 18+

# Claude Code CLI
npm install -g @anthropic-ai/claude-code

# GitHub CLI
brew install gh && gh auth login
```

### Clonar e configurar

```bash
git clone https://github.com/mvellas/vft-studio.git
cd vft-studio

# Backend
/opt/anaconda3/bin/pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install

# Criar pasta de dados
mkdir -p ~/VFTStudio

# Rodar
/opt/anaconda3/bin/python main.py
```

---

## 2. Workflow de colaboração no GitHub

### Regra principal: nunca commitar direto no `master`

Cada pesquisador trabalha em branch própria:

```bash
git checkout -b feat/nome-da-feature
# ... faz o trabalho ...
git push origin feat/nome-da-feature
gh pr create --title "Descrição clara" --body "O que foi feito e por quê"
```

O outro pesquisador revisa e faz merge via PR.

### Divisão de trabalho sugerida

Usem o ROADMAP em `.planning/ROADMAP.md` como fonte da verdade. Cada plan (`04-01`, `04-02`, etc.) é uma unidade atômica — um pesquisador assume um plan por vez para evitar conflitos.

```bash
# Ver o estado atual
cat .planning/STATE.md
cat .planning/ROADMAP.md
```

---

## 3. Usando Claude Code juntos

### Cada pesquisador roda sua própria sessão Claude Code

```bash
cd vft-studio
claude  # abre sessão interativa
```

### Comandos GSD essenciais

| Comando | Descrição |
|---------|-----------|
| `/gsd:progress` | Ver onde o projeto está |
| `/gsd:plan-phase 4` | Planejar o próximo conjunto de tasks |
| `/gsd:execute-phase 4` | Executar os plans da fase |
| `/gsd:verify-work 4` | Validar o que foi feito |

### Antes de começar qualquer sessão

```
/gsd:progress   → sincronizar com o estado atual
```

### Antes de encerrar qualquer sessão

```
/gsd:pause-work  → cria handoff com contexto para o próximo
```

O arquivo de handoff fica em `.planning/` e vai junto no commit — o outro pesquisador lê antes de continuar.

---

## 4. Evitar conflitos

| Situação | O que fazer |
|----------|-------------|
| Dois trabalhando no mesmo arquivo | Dividir por plan — um faz backend, outro frontend |
| Conflito de merge | `git pull --rebase origin master` antes de push |
| STATE.md ou ROADMAP.md divergiu | Pull + revisar manualmente — esses arquivos são a fonte da verdade |
| Dúvida sobre o que está feito | Ler `.planning/phases/` — cada `*-SUMMARY.md` documenta o que foi executado |

---

## 5. Referências do projeto

| Recurso | Localização |
|---------|-------------|
| Spec completo | Vault Mestrado → `PSM/VFT Software/` |
| Plano detalhado fases 4-7 | Obsidian → `Claude Knowledge/vft-studio/phases-4-7-original.md` |
| Decisões arquiteturais | `.planning/STATE.md` → seção Decisions |
| Roadmap simplificado | `.planning/ROADMAP.md` |
