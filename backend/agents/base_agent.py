"""
backend/agents/base_agent.py
============================
BaseAgent wraps the Anthropic AsyncAnthropic SDK with invoke() and stream()
methods. Both support 3x exponential backoff retry on failure.

Also defines ToolAwareAgent (extends BaseAgent) with tool-use loop support,
and the ToolUseEvent / ToolResultEvent / StreamChunk types for SSE streaming.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
import random
from typing import Any, AsyncGenerator

from anthropic import AsyncAnthropic


class AIServiceError(Exception):
    """Normalized upstream AI service error with UI-safe messaging."""

    def __init__(
        self,
        user_message: str,
        *,
        status_code: int | None = None,
        request_id: str | None = None,
    ) -> None:
        super().__init__(user_message)
        self.user_message = user_message
        self.status_code = status_code
        self.request_id = request_id


def _extract_status_code(exc: Exception) -> int | None:
    status_code = getattr(exc, "status_code", None)
    if isinstance(status_code, int):
        return status_code

    response = getattr(exc, "response", None)
    response_status = getattr(response, "status_code", None)
    if isinstance(response_status, int):
        return response_status

    return None


def _extract_request_id(exc: Exception) -> str | None:
    request_id = getattr(exc, "request_id", None)
    if isinstance(request_id, str) and request_id:
        return request_id

    response = getattr(exc, "response", None)
    headers = getattr(response, "headers", None)
    if headers:
        header_request_id = headers.get("request-id") or headers.get("x-request-id")
        if isinstance(header_request_id, str) and header_request_id:
            return header_request_id

    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        body_request_id = body.get("request_id")
        if isinstance(body_request_id, str) and body_request_id:
            return body_request_id

    return None


def _extract_error_text(exc: Exception) -> str:
    parts: list[str] = []

    body = getattr(exc, "body", None)
    if isinstance(body, dict):
        error_obj = body.get("error")
        if isinstance(error_obj, dict):
            error_type = error_obj.get("type")
            error_message = error_obj.get("message")
            if isinstance(error_type, str) and error_type:
                parts.append(error_type)
            if isinstance(error_message, str) and error_message:
                parts.append(error_message)

    rendered = " ".join(parts).strip()
    return rendered or str(exc)


def _is_retryable_error(exc: Exception) -> bool:
    status_code = _extract_status_code(exc)
    if status_code in {408, 409, 429, 500, 502, 503, 504, 529}:
        return True

    text = _extract_error_text(exc).lower()
    retry_markers = [
        "overloaded",
        "rate limit",
        "timeout",
        "temporarily unavailable",
        "connection reset",
        "server error",
    ]
    return any(marker in text for marker in retry_markers)


def _retry_delay_seconds(attempt: int, exc: Exception) -> float:
    status_code = _extract_status_code(exc)
    base = 2.0 if status_code == 529 else 1.0
    jitter = random.uniform(0, 0.35)
    return (base * (2 ** attempt)) + jitter


def _to_ai_service_error(exc: Exception) -> AIServiceError:
    status_code = _extract_status_code(exc)
    request_id = _extract_request_id(exc)
    text = _extract_error_text(exc).lower()

    if status_code == 529 or "overloaded" in text:
        message = "A Anthropic API esta sobrecarregada no momento. Tentamos novamente automaticamente, mas a analise nao concluiu. Aguarde alguns segundos e tente novamente."
    elif status_code == 429 or "rate limit" in text:
        message = "A Anthropic API atingiu o limite de requisicoes temporariamente. Aguarde um pouco e tente novamente."
    else:
        message = "Nao foi possivel concluir a analise com IA agora. Verifique sua conexao e tente novamente em instantes."

    if request_id:
        message += f" Request ID: {request_id}"

    return AIServiceError(
        message,
        status_code=status_code,
        request_id=request_id,
    )


class BaseAgent:
    """Base AI agent using the Anthropic SDK."""

    def __init__(self, model: str = "claude-sonnet-4-6", system: str = "") -> None:
        self.client = AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
        self.model = model
        self.system = system

    async def _sleep_before_retry(self, attempt: int, exc: Exception) -> None:
        await asyncio.sleep(_retry_delay_seconds(attempt, exc))

    async def invoke(self, messages: list[dict]) -> str:
        """Send messages and return complete response. Retries on transient upstream failures."""
        for attempt in range(4):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=16000,
                    system=self.system,
                    messages=messages,
                )
                return response.content[0].text
            except Exception as exc:
                if attempt == 3 or not _is_retryable_error(exc):
                    raise _to_ai_service_error(exc) from exc
                await self._sleep_before_retry(attempt, exc)
        return ""  # unreachable but satisfies type checker

    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """Stream response tokens. Retries on transient upstream failures."""
        for attempt in range(4):
            try:
                async with self.client.messages.stream(
                    model=self.model,
                    max_tokens=16000,
                    system=self.system,
                    messages=messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
                return  # success — exit retry loop
            except Exception as exc:
                if attempt == 3 or not _is_retryable_error(exc):
                    raise _to_ai_service_error(exc) from exc
                await self._sleep_before_retry(attempt, exc)


@dataclass
class ToolUseEvent:
    """Emitted when the model requests a tool call."""
    name: str
    input: dict[str, Any]


@dataclass
class ToolResultEvent:
    """Emitted after a tool call completes."""
    name: str
    result: str          # full text sent back to the model
    metadata: dict[str, Any] = field(default_factory=dict)  # UI data (e.g. {"count": 5})


# Union type for what stream_with_tools() yields
StreamChunk = str | ToolUseEvent | ToolResultEvent


class ToolAwareAgent(BaseAgent):
    """BaseAgent extended with Anthropic tool-use loop support.

    Subclasses override execute_tool() to implement specific tools.
    stream_with_tools() drives the full tool_use → tool_result → final_stream cycle,
    yielding ToolUseEvent / ToolResultEvent / str chunks for the SSE layer.
    """

    def __init__(self, model: str = "claude-sonnet-4-6", system: str = "", tools: list[dict] | None = None) -> None:
        super().__init__(model=model, system=system)
        self.tools: list[dict] = tools or []

    async def _create_with_retry(self, **kwargs: Any) -> object:
        """Call client.messages.create with retry for transient upstream failures."""
        for attempt in range(4):
            try:
                return await self.client.messages.create(**kwargs)
            except Exception as exc:
                if attempt == 3 or not _is_retryable_error(exc):
                    raise _to_ai_service_error(exc) from exc
                await self._sleep_before_retry(attempt, exc)
        raise RuntimeError("unreachable")  # satisfies type checker

    async def execute_tool(self, name: str, tool_input: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        """Execute a tool call. Returns (content_for_llm, ui_metadata).

        IMPORTANT: Subclasses MUST override this with `async def execute_tool(...)`.
        The base implementation just returns a not-implemented message.
        """
        return f"Tool '{name}' not implemented.", {}

    async def stream_with_tools(self, messages: list[dict]) -> AsyncGenerator[StreamChunk, None]:
        """Drive the tool-use loop then stream the final text response.

        Yields ToolUseEvent before each tool call, ToolResultEvent after,
        then str chunks for the final streamed response.
        """
        current_messages = list(messages)

        # Non-streaming call to get initial response (may request tool use)
        response = await self._create_with_retry(
            model=self.model,
            max_tokens=16000,
            system=self.system,
            tools=self.tools,
            messages=current_messages,
        )

        # Tool-use loop
        while response.stop_reason == "tool_use":
            tool_blocks = [b for b in response.content if b.type == "tool_use"]
            tool_results = []

            for block in tool_blocks:
                yield ToolUseEvent(name=block.name, input=block.input)
                result_text, metadata = await self.execute_tool(block.name, block.input)
                yield ToolResultEvent(name=block.name, result=result_text, metadata=metadata)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result_text,
                })

            # Rebuild messages with full assistant turn + tool results
            assistant_content = [b.model_dump() for b in response.content]
            current_messages = current_messages + [
                {"role": "assistant", "content": assistant_content},
                {"role": "user", "content": tool_results},
            ]

            response = await self._create_with_retry(
                model=self.model,
                max_tokens=16000,
                system=self.system,
                tools=self.tools,
                messages=current_messages,
            )

        # Stream final text response (no tools needed now)
        for attempt in range(4):
            try:
                async with self.client.messages.stream(
                    model=self.model,
                    max_tokens=16000,
                    system=self.system,
                    messages=current_messages,
                ) as stream:
                    async for text in stream.text_stream:
                        yield text
                return
            except Exception as exc:
                if attempt == 3 or not _is_retryable_error(exc):
                    raise _to_ai_service_error(exc) from exc
                await self._sleep_before_retry(attempt, exc)
