# Plano de Implementação — VFT com IA Background-First

## Objetivo

Entregar uma primeira versão funcional do novo fluxo `VFT com IA` com:

- execução narrativa em background
- stakeholders simulados na War Room
- relatório final revelado apenas na conclusão
- artefatos interativos inline

## Etapas

- [ ] Adicionar SPEC e plano desta mudança
- [ ] Emitir eventos narrativos de progresso no backend
- [ ] Incorporar stakeholders como participantes simulados da War Room
- [ ] Trocar o frontend do pipeline para `status-first`
- [ ] Exibir o relatório final apenas após `report_done`
- [ ] Incorporar artefatos interativos no relatório final
- [ ] Atualizar testes do pipeline e da war room

## Critérios de aceite

- [ ] Durante a execução do `VFT com IA`, o usuário não vê relatório parcial
- [ ] Durante a execução, o usuário vê uma sequência clara de status
- [ ] A War Room inclui ao menos especialistas + stakeholders cadastrados
- [ ] Ao final, o relatório completo aparece com artefatos HTML interativos
- [ ] Os testes automatizados do pipeline continuam passando
