"""
backend/agents/analyst_agent.py
================================
ANALYST -- Document proxy agent.
Reads all documents for a project (optionally filtered by stakeholder) and
answers questions by extracting values, objectives, and positions with citations.
Optionally uses web_search to complement document analysis.
"""
from __future__ import annotations

import base64
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import ToolAwareAgent
from backend.agents.facilitator import WEB_SEARCH_TOOL
from backend.api.settings import get_brave_api_key
from backend.db.models import Document, Project, Stakeholder
from backend.tools.brave_search import brave_search

_MAX_DOC_CHARS = 8000

ANALYST_SYSTEM = """Você é ANALYST, um agente especializado em análise documental para o processo VFT (Value-Focused Thinking).

Seu papel:
1. Analisar os documentos fornecidos no contexto
2. Extrair valores, objetivos e posições relevantes COM CITAÇÕES DIRETAS do texto
3. Marcar inferências sem evidência textual direta como [inferência]
4. Sinalizar contradições entre documentos com [contradição: Doc A vs Doc B]
5. Usar busca na web (quando disponível) para complementar com contexto externo
6. Responder sempre em PT-BR

Formato de resposta preferido:
- Use headers para organizar (## Valores Identificados, ## Objetivos, etc.)
- Cite sempre a fonte: "Segundo [título do documento]: '...trecho...'"
- Para imagens: descreva o que é visualmente relevante para a análise VFT

Contexto do projeto:
{PROJECT_CONTEXT}

Documentos disponíveis:
{DOCUMENTS_CONTEXT}
"""


def _build_doc_context(documents: list[Document]) -> str:
    if not documents:
        return "(nenhum documento disponível)"
    parts = []
    for doc in documents:
        header = f"--- [{doc.doc_type.upper()}] {doc.title}"
        if doc.date_reference:
            header += f" ({doc.date_reference})"
        if doc.source:
            header += f" — Fonte: {doc.source}"
        header += " ---"

        if doc.content_text.startswith("__IMAGE_BASE64__"):
            body = "[Imagem — enviada como conteúdo visual à API]"
        else:
            body = doc.content_text[:_MAX_DOC_CHARS]
            if len(doc.content_text) > _MAX_DOC_CHARS:
                body += "\n...[truncado]"

        parts.append(f"{header}\n{body}")
    return "\n\n".join(parts)


def _build_image_blocks(documents: list[Document]) -> list[dict]:
    """Build Anthropic image content blocks for image documents."""
    blocks = []
    for doc in documents:
        if not doc.content_text.startswith("__IMAGE_BASE64__"):
            continue
        try:
            _, rest = doc.content_text.split("__IMAGE_BASE64__", 1)
            mime_type, b64_data = rest.split("::", 1)
            blocks.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": mime_type,
                    "data": b64_data,
                },
            })
            blocks.append({
                "type": "text",
                "text": f"[Imagem acima: {doc.title}]",
            })
        except Exception:
            continue
    return blocks


class AnalystAgent(ToolAwareAgent):
    """ANALYST -- Document proxy agent with optional web search."""

    def __init__(self, system: str, image_blocks: list[dict], model: str = "claude-sonnet-4-6") -> None:
        super().__init__(model=model, system=system, tools=[WEB_SEARCH_TOOL])
        self.image_blocks = image_blocks

    async def execute_tool(self, name: str, tool_input: dict) -> tuple[str, dict]:
        if name == "web_search":
            query = tool_input.get("query", "")
            api_key = get_brave_api_key()
            result_text, count = await brave_search(query, api_key=api_key)
            return result_text, {"count": count, "query": query}
        return f"Tool '{name}' not implemented.", {}

    def build_messages(self, user_message: str) -> list[dict]:
        """Build messages list, embedding image blocks for multimodal support."""
        if self.image_blocks:
            content = [*self.image_blocks, {"type": "text", "text": user_message}]
            return [{"role": "user", "content": content}]
        return [{"role": "user", "content": user_message}]

    @classmethod
    async def from_project_id(
        cls,
        project_id: str,
        stakeholder_id: str | None,
        session: AsyncSession,
        model: str = "claude-sonnet-4-6",
    ) -> "AnalystAgent":
        """Build ANALYST agent loaded with all relevant documents."""
        project = await session.get(Project, project_id)
        if project is None:
            raise ValueError(f"Project {project_id!r} not found.")

        stmt = select(Document).where(Document.project_id == project_id)
        if stakeholder_id:
            stmt = stmt.where(Document.stakeholder_id == stakeholder_id)
        result = await session.execute(stmt.order_by(Document.created_at))
        documents = list(result.scalars().all())

        project_context = f"Nome: {project.name}\nFase atual: {project.phase_status}"
        doc_context = _build_doc_context(documents)
        image_blocks = _build_image_blocks(documents)

        system = (
            ANALYST_SYSTEM
            .replace("{PROJECT_CONTEXT}", project_context)
            .replace("{DOCUMENTS_CONTEXT}", doc_context)
        )

        return cls(system=system, image_blocks=image_blocks, model=model)
