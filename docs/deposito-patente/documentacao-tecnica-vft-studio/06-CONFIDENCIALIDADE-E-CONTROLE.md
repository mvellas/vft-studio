# Confidencialidade e Controle de Acesso

## 1. Classificacao geral

Esta documentacao tecnica pode ser utilizada como suporte ao deposito e a avaliacao institucional da tecnologia. No entanto, alguns artefatos relacionados ao software podem conter informacoes sensiveis e devem ser tratados com acesso restrito.

## 2. Itens de baixa sensibilidade

Podem ser compartilhados em contexto de avaliacao tecnica, desde que revisados:

- manual de uso;
- relatorio tecnico geral;
- caderno de laboratorio sem dados sensiveis;
- evidencias de build e teste;
- capturas de tela demonstrativas sem dados reais;
- descricao de arquitetura;
- lista de componentes e arquivos.

## 3. Itens sensiveis ou restritos

Nao devem ser publicados nem enviados ao GitHub:

- serial keys reais;
- banco de dados local de estudos reais;
- documentos importados ao software;
- relatorios finais contendo resultados sensiveis;
- credenciais de API;
- logs com informacoes pessoais, institucionais ou operacionais;
- material da pesquisa sobre evasao de pilotos que ainda sera submetido ao SIGE.

## 4. Estudo de caso aplicado

O VFT Studio foi aplicado em estudo de caso sobre evasao de pilotos da FAB no periodo de 2022 a 2026. Para esta documentacao, somente a existencia da aplicacao e mencionada. Resultados, conclusoes, dados, nomes, valores quantitativos e detalhes metodologicos sensiveis nao devem ser expostos ate a conclusao do processo adequado de submissao e divulgacao academica.

## 5. Controle de serial keys

A lista de serial keys foi gerada localmente e armazenada em:

`.local/serial-keys.json`

Esse arquivo:

- deve permanecer apenas no computador local autorizado;
- nao deve ser versionado;
- nao deve ser enviado ao GitHub;
- nao deve ser anexado a documentacao publica;
- deve ser copiado para builds apenas quando necessario gerar versoes distribuiveis.

## 6. Recomendacoes para anexos

Antes de anexar imagens, videos, relatorios ou logs:

1. Remover nomes de pessoas, unidades, dados pessoais e informacoes institucionais restritas.
2. Usar projetos demonstrativos ou anonimizados.
3. Evitar mostrar serial keys, API keys ou caminhos de arquivos sensiveis.
4. Revisar metadados de PDFs, imagens e videos.
5. Separar anexos publicos de anexos restritos.

## 7. Localizacao recomendada de evidencias

- Evidencias abertas: `docs/deposito-patente/documentacao-tecnica-vft-studio/evidencias/`
- Evidencias sensiveis: manter fora do repositorio Git, preferencialmente em armazenamento institucional controlado.
