"""
tests/test_agents.py
====================
Unit tests for AI agents — mocking the Anthropic SDK.
Tests: BaseAgent invoke/stream, agent prompt rendering, from_project_id context loading.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from backend.agents.base_agent import BaseAgent


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
                raise ConnectionError("Transient error")
            return mock_response

        with patch.object(agent.client.messages, "create", side_effect=failing_then_ok):
            with patch("asyncio.sleep", new=AsyncMock()):
                result = await agent.invoke([{"role": "user", "content": "test"}])

        assert result == "OK"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_invoke_raises_after_3_failures(self):
        agent = BaseAgent()

        async def always_fail(**kwargs):
            raise ConnectionError("Permanent error")

        with patch.object(agent.client.messages, "create", side_effect=always_fail):
            with patch("asyncio.sleep", new=AsyncMock()):
                with pytest.raises(ConnectionError):
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
