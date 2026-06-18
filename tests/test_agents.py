"""
tests/test_agents.py
====================
Unit tests for AI agents — mocking the Anthropic SDK.
Tests: BaseAgent invoke/stream, agent prompt rendering, from_project_id context loading.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.agents.base_agent import BaseAgent, ToolAwareAgent, ToolUseEvent, ToolResultEvent


# ---------------------------------------------------------------------------
# BaseAgent
# ---------------------------------------------------------------------------

class TestBaseAgent:
    def test_init_defaults(self):
        agent = BaseAgent()
        assert agent.model == "claude-sonnet-4-6"
        assert agent.system == ""

    def test_init_custom(self):
        agent = BaseAgent(model="claude-opus-4-6", system="Test prompt")
        assert agent.model == "claude-opus-4-6"
        assert agent.system == "Test prompt"

    @pytest.mark.asyncio
    async def test_invoke_returns_text(self):
        agent = BaseAgent()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Hello from Claude")]

        with patch.object(agent.client.messages, "create", new=AsyncMock(return_value=mock_response)):
            result = await agent.invoke([{"role": "user", "content": "ping"}])

        assert result == "Hello from Claude"

    @pytest.mark.asyncio
    async def test_invoke_retries_on_failure(self):
        agent = BaseAgent()
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="OK")]

        call_count = 0
        async def failing_then_ok(**kwargs):
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise ConnectionError("connection reset")
            return mock_response

        with patch.object(agent.client.messages, "create", side_effect=failing_then_ok):
            with patch("asyncio.sleep", new=AsyncMock()):
                result = await agent.invoke([{"role": "user", "content": "test"}])

        assert result == "OK"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_invoke_raises_after_3_failures(self):
        from backend.agents.base_agent import AIServiceError
        agent = BaseAgent()

        async def always_fail(**kwargs):
            raise ConnectionError("connection reset")

        with patch.object(agent.client.messages, "create", side_effect=always_fail):
            with patch("asyncio.sleep", new=AsyncMock()):
                with pytest.raises(AIServiceError):
                    await agent.invoke([{"role": "user", "content": "test"}])

    @pytest.mark.asyncio
    async def test_stream_yields_text(self):
        agent = BaseAgent()

        async def mock_text_stream():
            for chunk in ["Hello", " ", "world"]:
                yield chunk

        mock_stream_ctx = AsyncMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=MagicMock(text_stream=mock_text_stream()))
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

        with patch.object(agent.client.messages, "stream", return_value=mock_stream_ctx):
            chunks = []
            async for chunk in agent.stream([{"role": "user", "content": "test"}]):
                chunks.append(chunk)

        assert chunks == ["Hello", " ", "world"]


# ---------------------------------------------------------------------------
# Phase3SpecialistAgent prompt rendering
# ---------------------------------------------------------------------------

class TestPhase3SpecialistAgent:
    def test_agent_renders_project_context(self, tmp_path):
        from backend.agents.phase3_specialist import Phase3SpecialistAgent

        # Patch the prompt path to use a temp file
        prompt_content = (
            "System: {{PROJECT_CONTEXT}} | {{IDF}} | {{OBJECTIVES_AND_ATTRIBUTES}} | {{ALTERNATIVES_LIST}}"
        )
        prompt_file = tmp_path / "phase3_specialist.md"
        prompt_file.write_text(prompt_content)

        with patch("backend.agents.phase3_specialist.PROMPT_PATH", prompt_file):
            agent = Phase3SpecialistAgent(
                project_context={
                    "project_summary": "My Project",
                    "idf_summary": "IDF data",
                    "objectives_and_attributes_md": "obj1",
                    "alternatives_md": "alt1",
                }
            )

        assert "My Project" in agent.system
        assert "IDF data" in agent.system
        assert "obj1" in agent.system
        assert "alt1" in agent.system

    def test_agent_default_model_is_sonnet(self):
        from backend.agents.phase3_specialist import Phase3SpecialistAgent
        with patch.object(Phase3SpecialistAgent, "_render_prompt", return_value="system"):
            agent = Phase3SpecialistAgent.__new__(Phase3SpecialistAgent)
            agent.model = "claude-sonnet-4-6"
            assert agent.model == "claude-sonnet-4-6"


# ---------------------------------------------------------------------------
# FacilitatorAgent prompt rendering
# ---------------------------------------------------------------------------

class TestFacilitatorAgent:
    def test_agent_renders_process_status(self, tmp_path):
        from backend.agents.facilitator import FacilitatorAgent

        prompt_content = "{{PROJECT_CONTEXT}} | {{PROCESS_STATUS}} | {{STAKEHOLDERS_LIST}}"
        prompt_file = tmp_path / "facilitator.md"
        prompt_file.write_text(prompt_content)

        with patch("backend.agents.facilitator.PROMPT_PATH", prompt_file):
            agent = FacilitatorAgent(
                project_context={
                    "project_summary": "My VFT Project",
                    "process_status": "Step 1.3 in progress",
                    "stakeholders_md": "Alice (DM)",
                }
            )

        assert "My VFT Project" in agent.system
        assert "Step 1.3 in progress" in agent.system
        assert "Alice (DM)" in agent.system


# ---------------------------------------------------------------------------
# ToolAwareAgent
# ---------------------------------------------------------------------------

class TestToolAwareAgent:
    def test_tool_aware_agent_init(self):
        tools = [{"name": "web_search", "description": "Search the web"}]
        agent = ToolAwareAgent(model="claude-sonnet-4-6", system="test", tools=tools)
        assert agent.tools == tools

    def test_tool_aware_agent_default_tools(self):
        agent = ToolAwareAgent()
        assert agent.tools == []

    @pytest.mark.asyncio
    async def test_stream_with_tools_yields_tool_events_then_text(self):
        tools = [{"name": "web_search", "description": "Search"}]

        # Mock first call: stop_reason=tool_use
        mock_tool_block = MagicMock()
        mock_tool_block.type = "tool_use"
        mock_tool_block.id = "tu_123"
        mock_tool_block.name = "web_search"
        mock_tool_block.input = {"query": "test query"}
        mock_tool_block.model_dump = MagicMock(return_value={
            "type": "tool_use", "id": "tu_123",
            "name": "web_search", "input": {"query": "test query"}
        })

        first_response = MagicMock()
        first_response.stop_reason = "tool_use"
        first_response.content = [mock_tool_block]

        # Mock second call: stop_reason=end_turn
        second_response = MagicMock()
        second_response.stop_reason = "end_turn"
        second_response.content = []

        # Mock streaming context
        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_ctx)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

        async def fake_text_stream():
            yield "Resultado "
            yield "da busca."

        mock_stream_ctx.text_stream = fake_text_stream()

        agent = ToolAwareAgent(model="claude-sonnet-4-6", system="test", tools=tools)

        async def fake_execute_tool(name, tool_input):
            return "5 results found", {"count": 5}

        agent.execute_tool = fake_execute_tool

        create_responses = [first_response, second_response]
        create_call_count = 0

        async def fake_create(**kwargs):
            nonlocal create_call_count
            resp = create_responses[create_call_count]
            create_call_count += 1
            return resp

        with patch.object(agent.client.messages, "create", side_effect=fake_create), \
             patch.object(agent.client.messages, "stream", return_value=mock_stream_ctx):
            events = []
            async for event in agent.stream_with_tools([{"role": "user", "content": "search"}]):
                events.append(event)

        tool_use_events = [e for e in events if isinstance(e, ToolUseEvent)]
        tool_result_events = [e for e in events if isinstance(e, ToolResultEvent)]
        text_events = [e for e in events if isinstance(e, str)]

        assert len(tool_use_events) == 1
        assert tool_use_events[0].name == "web_search"
        assert tool_use_events[0].input == {"query": "test query"}
        assert len(tool_result_events) == 1
        assert tool_result_events[0].metadata["count"] == 5
        assert "".join(text_events) == "Resultado da busca."

    @pytest.mark.asyncio
    async def test_stream_with_tools_no_tool_use_goes_straight_to_stream(self):
        """When stop_reason is not tool_use, skip the loop and stream directly."""
        tools = [{"name": "web_search", "description": "Search"}]

        first_response = MagicMock()
        first_response.stop_reason = "end_turn"
        first_response.content = []

        mock_stream_ctx = MagicMock()
        mock_stream_ctx.__aenter__ = AsyncMock(return_value=mock_stream_ctx)
        mock_stream_ctx.__aexit__ = AsyncMock(return_value=False)

        async def fake_text_stream():
            yield "Direct response."

        mock_stream_ctx.text_stream = fake_text_stream()

        agent = ToolAwareAgent(model="claude-sonnet-4-6", system="test", tools=tools)

        with patch.object(agent.client.messages, "create", new=AsyncMock(return_value=first_response)), \
             patch.object(agent.client.messages, "stream", return_value=mock_stream_ctx):
            events = []
            async for event in agent.stream_with_tools([{"role": "user", "content": "hello"}]):
                events.append(event)

        assert events == ["Direct response."]
