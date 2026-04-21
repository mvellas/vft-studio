# VFT Completo com IA — Social Agents + Background-First Report

**Data:** 2026-04-21  
**Status:** Aprovado para implementação incremental

---

## Objetivo

Evoluir o fluxo `VFT com IA` para uma experiência de análise mais próxima de uma facilitação real:

1. O processamento acontece em background.
2. O usuário acompanha uma narrativa de progresso fluida, e não texto parcial truncado.
3. Além dos especialistas (`FRAME`, `AXIOM`, `NOVA`, `ANALYST`), stakeholders simulados participam da War Room.
4. O relatório completo só é exibido ao final, junto com artefatos interativos em HTML.

---

## Problemas do fluxo atual

- O pipeline expõe deltas de texto enquanto fases e relatório ainda estão sendo gerados.
- O usuário vê blocos incompletos de análise, o que transmite sensação de truncamento.
- A War Room atual debate apenas entre especialistas; ela sintetiza, mas não incorpora conflito social explícito.
- Os diagramas interativos ficam apartados do artefato final, em vez de integrarem a experiência de entrega.

---

## Decisão de Produto

### 1. Modo de execução

O fluxo `VFT com IA` passa a operar em modo **status-first**:

- durante a execução, a interface mostra apenas:
  - status sequenciais
  - marcos narrativos
  - progresso por etapa
- durante a execução, **não** mostra:
  - cards parciais de análise
  - transcrição parcial da war room
  - relatório parcial

### 2. Stakeholder agents

Os stakeholders cadastrados no projeto entram como participantes simulados da War Room:

- especialistas continuam gerando as análises-base
- stakeholders entram na etapa de confronto, validação e tensão
- ARIA continua mediando a interação

### 3. Entrega final

Ao concluir:

- o relatório final é exibido integralmente
- análises por fase e transcrição da War Room permanecem incorporadas ao artefato final
- artefatos interativos em HTML são exibidos inline:
  - nuvem de objetivos
  - hierarquia de objetivos
  - rede meios-fins
  - mapa causal

---

## Arquitetura

### Backend

O pipeline continua usando:

- `PipelineOrchestrator`
- `WarRoomOrchestrator`
- `ReportGenerator`

Mas agora também emite eventos narrativos de alto nível:

- `pipeline_status`
- `war_room_turn_complete`

Os eventos `agent_delta`, `war_room_turn` e `report_delta` podem continuar existindo internamente para compatibilidade, mas o novo frontend principal não os usa para renderização ao vivo.

### Frontend

`PipelinePanel` passa a ter dois modos visuais:

- `running`
  - feed sequencial de status
  - indicador de etapa atual
  - animações suaves
- `done`
  - relatório final
  - artefatos interativos
  - acesso ao histórico consolidado

---

## Eventos de execução

### `pipeline_status`

Payload:

```json
{
  "id": "unique-id",
  "title": "War Room ativado",
  "detail": "ARIA está convocando especialistas e stakeholders para a rodada de síntese.",
  "actor": "ARIA",
  "stage": "war-room",
  "state": "running"
}
```

### `war_room_turn_complete`

Payload:

```json
{
  "speaker": "AXIOM",
  "agent_name": "AXIOM",
  "text": "texto completo do turno",
  "act": 2
}
```

---

## Ordem do fluxo

1. ARIA alinha contexto do projeto
2. Stakeholders são mapeados e anunciados
3. FRAME gera análise de stakeholders
4. AXIOM estrutura valores e objetivos
5. NOVA avalia alternativas
6. ANALYST cruza evidências documentais, se houver
7. ARIA ativa a War Room
8. Especialistas e stakeholders participam das rodadas
9. ARIA sintetiza o relatório final
10. Interface revela relatório e artefatos interativos

---

## Escopo desta implementação

### Incluído agora

- status sequenciais no pipeline
- relatório somente ao final
- stakeholders simulados na war room
- artefatos interativos inline no relatório final

### Fica para uma próxima iteração

- memória persistente por stakeholder agent
- rounds multi-etapas com votação/coalizões
- nuvem semântica avançada com clustering por embeddings
- exportação HTML completa do relatório interativo
