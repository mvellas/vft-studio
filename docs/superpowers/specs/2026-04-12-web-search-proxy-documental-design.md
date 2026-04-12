# Design: Web Search + Proxy Documental (ANALYST)

**Data:** 2026-04-12  
**Status:** Aprovado  
**Milestone:** VFT Studio MVP v1.0 — extensão pós-fase 4

---

## Contexto

O VFT Studio possui 4 agentes IA (ARIA, FRAME, AXIOM, NOVA) que operam exclusivamente sobre dados locais do projeto. Dois gaps identificados:

1. Agentes não podem buscar informações externas (legislações, referências, dados públicos)
2. Não há suporte a elicitação de valores via documentos (PDFs, legislações, discursos, imagens)

Este design cobre ambas as features em paralelo, compartilhando a infraestrutura de `ToolAwareAgent`.

---

## Arquitetura Geral

### Estratégia de Desenvolvimento

Duas streams paralelas (subagentes independentes):
- **Stream A:** Web Search — sem novos modelos DB; afeta BaseAgent + settings + frontend chat
- **Stream B:** Proxy Documental — novo modelo DB + API + ANALYST agent + DocumentPanel

Convergência: ANALYST usa web_search como ferramenta opcional.

### Estrutura de Arquivos

```
backend/
  tools/
    __init__.py
    brave_search.py         # cliente Brave Search API (httpx)
  agents/
    base_agent.py           # estendido: tool_use loop + yield ToolEvent
    analyst_agent.py        # ANALYST — novo agente com tools
  api/
    documents.py            # CRUD + /analyze endpoint
  db/
    models.py               # + Document model

frontend/src/
  components/
    documents/
      DocumentPanel.tsx         # painel upload + lista (projeto + stakeholder)
      DocumentAnalystChat.tsx   # integra chat ANALYST + trigger de análise
  layout/
    ChatPanel.tsx               # + render tool_use/tool_result SSE events
  project/
    SettingsView.tsx            # + seção "Busca na Web" + Brave API key
    OnboardingFlow.tsx          # + nova tela Brave API key (screen 3 de 4)
  api/
    documents.ts                # cliente API documentos
  types/
    index.ts                    # + Document, ToolEvent types
```

---

## Stream A: Web Search

### Protocolo SSE Estendido

Novos eventos além dos existentes (`delta`, `done`, `error`):

```
event: tool_use
data: {"name": "web_search", "query": "Lei Federal 12.608/2012 proteção civil"}

event: tool_result
data: {"name": "web_search", "count": 5}
```

O frontend exibe spinner "Pesquisando na web..." durante `tool_use` e "X resultados encontrados" após `tool_result`, antes dos tokens de resposta começarem.

### Backend: `ToolAwareAgent`

`BaseAgent` é estendido com suporte a `tools`. O loop de tool_use é interno ao backend:

```python
# Pseudocódigo do loop
async def stream_with_tools(self, messages):
    response = await client.messages.create(
        model=self.model, tools=self.tools, messages=messages
    )
    while response.stop_reason == "tool_use":
        tool_calls = [b for b in response.content if b.type == "tool_use"]
        tool_results = []
        for call in tool_calls:
            yield ToolEvent(name=call.name, input=call.input)   # SSE tool_use
            result = await self.execute_tool(call.name, call.input)
            yield ToolResult(name=call.name, result=result)     # SSE tool_result
            tool_results.append({"type": "tool_result", "tool_use_id": call.id, "content": result})
        messages = messages + [assistant_turn(response), user_turn(tool_results)]
        response = await client.messages.create(model=..., tools=..., messages=messages)
    # stream final response
    async with client.messages.stream(...) as stream:
        async for text in stream.text_stream:
            yield TextDelta(text)
```

### `backend/tools/brave_search.py`

```python
async def brave_search(query: str, api_key: str, count: int = 5) -> str:
    """Busca no Brave Search e retorna resultados formatados para o LLM."""
    # GET https://api.search.brave.com/res/v1/web/search
    # Header: X-Subscription-Token: {api_key}
    # Retorna: snippets + URLs formatados como texto
```

Falha silenciosa se `api_key` não configurada: retorna mensagem informando que busca não está disponível, sem quebrar o chat.

### Agentes com Web Search

| Agente | Web Search | Justificativa |
|--------|-----------|---------------|
| ARIA | ✅ | Guia todo o processo; pesquisa referências metodológicas e contexto |
| FRAME | ✅ | Fase 1 — stakeholders, legislação, contexto organizacional |
| AXIOM | ❌ | Opera sobre dados já elicitados; busca não agrega valor |
| NOVA | ❌ | Alternatives operacionais; dados locais suficientes |
| ANALYST | ✅ | Complementa documentos com fontes externas |

### Configuração da Brave API Key

**Onboarding (nova tela — screen 3 de 4):**
```
[ícone Globe]
"Busca na Web (opcional)"

Os agentes ARIA, FRAME e ANALYST podem pesquisar na internet
para buscar legislações, referências e dados públicos.

Você precisará de uma Brave Search API key.
Obtenha gratuitamente em brave.com/search/api (2000 buscas/mês).

[campo: sk-ant-... (opcional)]
[botão: Continuar] [link: Pular por agora]
```

**Settings — nova seção "Busca na Web":**
- Campo API key (password)
- Botão "Testar conexão" → query de teste, mostra status
- Status: ✅ Conectado / ❌ Chave inválida / — Não configurada
- Armazenamento: macOS Keychain (`vft-studio / brave-api-key`), mesmo padrão da Anthropic key

---

## Stream B: Proxy Documental (ANALYST)

### DB Model: `Document`

```python
class Document(Base):
    __tablename__ = "documents"

    id: str                     # UUID
    project_id: str             # FK → projects.id
    stakeholder_id: str | None  # FK → stakeholders.id (null = nível projeto)
    title: str
    doc_type: str               # official_speech | policy_document | report |
                                # academic_paper | news_article | minutes |
                                # legal_text | other
    date_reference: str | None  # data do documento (não do upload)
    source: str | None          # autoria/origem
    content_text: str           # texto extraído ou colado
    file_name: str | None       # nome original do arquivo
    created_at: str
```

Sem armazenamento de binários. PDF/TXT extraídos para texto no upload. Imagens enviadas como base64 diretamente à Anthropic (suporte multimodal).

### API: `backend/api/documents.py`

```
POST   /projects/{id}/documents
       body: multipart/form-data (file opcional) ou JSON (text_content direto)
       → extrai texto → salva Document → retorna DocumentResponse

GET    /projects/{id}/documents?stakeholder_id=...
       → lista documentos (project-level se sem stakeholder_id)

DELETE /projects/{id}/documents/{doc_id}

POST   /projects/{id}/documents/analyze
       body: { stakeholder_id?: str, question?: str }
       → SSE stream — ANALYST processa documentos e responde
```

### Extração de Texto

| Formato | Método |
|---------|--------|
| PDF | `pypdf` (novo dep) — extrai texto página por página |
| TXT / MD | leitura direta UTF-8 |
| PNG / JPG / WEBP | sem extração local — enviado como base64 à Anthropic |
| Texto colado | salvo diretamente em `content_text` |

Limite: 20 MB por arquivo (validado no endpoint).

### ANALYST Agent (`backend/agents/analyst_agent.py`)

- Herda de `ToolAwareAgent` (tem acesso a `web_search`)
- `from_project_id(project_id, stakeholder_id, session)` carrega todos os documentos relevantes
- Documentos injetados no system prompt como contexto estruturado
- Imagens incluídas como `image` blocks na mensagem do usuário (multimodal)
- System prompt instrui ANALYST a:
  - Extrair valores e objetivos com citações diretas do texto
  - Marcar inferências sem evidência como `[inferência]`
  - Sinalizar contradições entre documentos
  - Usar `web_search` para complementar quando necessário

### Frontend: DocumentPanel

**Localização:** Nova aba "Documentos" na sidebar do projeto (entre "Fases" e "Configurações") — ou como seção expansível no projeto ativo.

**Layout:**
```
[Documentos do Projeto]          [+ Adicionar]
  📄 Lei 12.608/2012 — legal_text — 2012
  📄 Relatório Defesa Civil JF — report — 2026-02

[Por Stakeholder]
  [dropdown: Prefeitura de JF ▼]
  📝 Discurso do Prefeito — official_speech — 2026-03

[Analisar com ANALYST ▶]
```

**Upload modal:**
- Drag & drop ou seletor de arquivo
- Campos: título (obrigatório), tipo, data, fonte
- OU: textarea "Colar texto diretamente"
- Preview do texto extraído antes de salvar

**Trigger de análise:**
- Botão "Analisar com ANALYST" → abre ChatPanel com ANALYST selecionado
- Envia mensagem inicial automática: `"Analise os documentos disponíveis e extraia os valores, objetivos e posições relevantes para o projeto VFT. Cite as fontes diretamente."`

---

## Integração com Chat Existente

### ChatPanel — novos estados visuais

```tsx
// Durante tool_use
<div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
  <Globe size={12} />
  Pesquisando: "{query}"
</div>

// Após tool_result
<div className="flex items-center gap-2 text-xs text-emerald-600">
  <CheckCircle size={12} />
  {count} resultados encontrados
</div>
```

### AgentSelector — ANALYST como 5º agente

```tsx
{ name: 'ANALYST', type: 'analyst', label: 'Documentos', description: 'Análise documental e proxy de stakeholder' }
```

---

## Dependências Novas

```toml
# pyproject.toml
"pypdf>=4.0",          # extração de texto de PDFs
"httpx>=0.27",         # já presente via fastapi[standard] — verificar
```

```json
// package.json — sem novas dependências frontend
// react-markdown + remark-gfm já instalados na sessão anterior
```

---

## Fluxo Completo: Caso de Uso Principal

```
Usuário no projeto "Desastre JF":

1. Acessa aba "Documentos"
2. Upload "Lei 12.608/2012.pdf" → tipo: legal_text → salva
3. Cola texto do discurso do Prefeito → vincula ao stakeholder "Prefeitura JF"
4. Clica "Analisar com ANALYST"
5. ChatPanel abre com ANALYST
6. ANALYST lê documentos + busca web se necessário
   → SSE: tool_use {query: "Lei 12.608 proteção civil municípios"}
   → SSE: tool_result {count: 5}
   → SSE: deltas com análise estruturada
7. ANALYST responde: valores extraídos com citações
8. Usuário copia valores relevantes para os objetivos da Fase 2
```

---

## Critérios de Sucesso

- [ ] ARIA e FRAME buscam na web automaticamente quando relevante (tool_use loop funciona)
- [ ] Brave API key configurável no onboarding e settings, armazenada no Keychain
- [ ] Upload de PDF extrai texto corretamente
- [ ] Upload de imagem enviada como base64 ao Claude (multimodal)
- [ ] ANALYST lê documentos do projeto e por stakeholder
- [ ] ChatPanel exibe estado "Pesquisando..." durante tool_use
- [ ] ANALYST disponível como 5º agente no AgentSelector
- [ ] App funciona normalmente se Brave key não configurada (graceful degradation)
