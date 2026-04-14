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
from typing import Any, AsyncGenerator

from anthropic import AsyncAnthropic


class BaseAgent:
    """Base AI agent using the Anthropic SDK."""

    def __init__(self, model: str = "claude-sonnet-4-6", system: str = "") -> None:
        self.client = AsyncAnthropic()  # reads ANTHROPIC_API_KEY from env
        self.model = model
        self.system = system

    async def invoke(self, messages: list[dict]) -> str:
        """Send messages and return complete response. Retries 3x with exponential backoff."""
        for attempt in range(3):
            try:
                response = await self.client.messages.create(
                    model=self.model,
                    max_tokens=16000,
                    system=self.system,
                    messages=messages,
                )
                return response.content[0].text
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
        return ""  # unreachable but satisfies type checker

    async def stream(self, messages: list[dict]) -> AsyncGenerator[str, None]:
        """Stream response tokens. Retries 3x with exponential backoff on connection failure."""
        for attempt in range(3):
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
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)


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
        """Call client.messages.create with 3x exponential backoff retry."""
        for attempt in range(3):
            try:
                return await self.client.messages.create(**kwargs)
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
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
        for attempt in range(3):
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
            except Exception:
                if attempt == 2:
                    raise
                await asyncio.sleep(2 ** attempt)
