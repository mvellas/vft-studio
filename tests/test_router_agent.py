import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_router_returns_facilitator_by_default():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"agent_type": "facilitator"}')]
    with patch.object(agent.client.messages, "create", return_value=mock_response):
        result = await agent.invoke(
            phase=1,
            recent_turns=[],
            user_message="Olá, como você está?",
        )
    assert result == "facilitator"

@pytest.mark.asyncio
async def test_router_respects_at_mention():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    # @FRAME mention — no API call needed
    result = await agent.invoke(
        phase=1,
        recent_turns=[],
        user_message="@FRAME quais são os stakeholders?",
    )
    assert result == "phase1_specialist"

@pytest.mark.asyncio
async def test_router_returns_facilitator_on_parse_error():
    from backend.agents.router_agent import RouterAgent
    agent = RouterAgent()
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text="invalid json")]
    with patch.object(agent.client.messages, "create", return_value=mock_response):
        result = await agent.invoke(
            phase=2,
            recent_turns=[],
            user_message="alguma coisa",
        )
    assert result == "facilitator"
