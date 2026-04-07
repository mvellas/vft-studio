"""
backend/agents/base_agent.py
============================
BaseAgent wraps the Anthropic AsyncAnthropic SDK with invoke() and stream()
methods. Both support 3x exponential backoff retry on failure.
"""
from __future__ import annotations

import asyncio
from typing import AsyncGenerator

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
                    max_tokens=4096,
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
                    max_tokens=4096,
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
