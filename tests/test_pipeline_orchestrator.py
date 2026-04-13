import pytest
from unittest.mock import AsyncMock, MagicMock, patch


async def async_gen(*items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_orchestrator_yields_agent_start_and_done():
    from backend.pipeline.orchestrator import PipelineOrchestrator

    mock_project = MagicMock()
    mock_project.id = "proj-1"
    mock_project.name = "Test Project"
    mock_project.description = "A test"

    with patch("backend.pipeline.orchestrator.Phase1SpecialistAgent") as P1, \
         patch("backend.pipeline.orchestrator.Phase2SpecialistAgent") as P2, \
         patch("backend.pipeline.orchestrator.Phase3SpecialistAgent") as P3, \
         patch("backend.pipeline.orchestrator.AnalystAgent") as AN:

        for Cls in [P1, P2, P3, AN]:
            inst = MagicMock()
            inst.stream_with_tools = AsyncMock(side_effect=lambda msgs: async_gen("output text"))
            Cls.from_project_id = AsyncMock(return_value=inst)

        orch = PipelineOrchestrator(
            project=mock_project,
            documents=[],
            session=AsyncMock(),
        )
        events = []
        async for event in orch.run():
            events.append(event)

    event_types = [e["event"] for e in events]
    assert "agent_start" in event_types
    assert "agent_delta" in event_types
    assert "agent_done" in event_types
    # No documents → no ANALYST phase
    agent_names = [e["data"].get("agent_name", "") for e in events if e["event"] == "agent_start"]
    assert "ANALYST" not in agent_names


@pytest.mark.asyncio
async def test_orchestrator_includes_analyst_when_docs_present():
    from backend.pipeline.orchestrator import PipelineOrchestrator

    mock_project = MagicMock()
    mock_project.id = "proj-1"
    mock_project.name = "Test"
    mock_project.description = "desc"

    mock_doc = MagicMock()
    mock_doc.title = "Doc 1"
    mock_doc.content_text = "content"

    with patch("backend.pipeline.orchestrator.Phase1SpecialistAgent") as P1, \
         patch("backend.pipeline.orchestrator.Phase2SpecialistAgent") as P2, \
         patch("backend.pipeline.orchestrator.Phase3SpecialistAgent") as P3, \
         patch("backend.pipeline.orchestrator.AnalystAgent") as AN:

        for Cls in [P1, P2, P3, AN]:
            inst = MagicMock()
            inst.stream_with_tools = AsyncMock(side_effect=lambda msgs: async_gen("output"))
            Cls.from_project_id = AsyncMock(return_value=inst)

        orch = PipelineOrchestrator(
            project=mock_project,
            documents=[mock_doc],
            session=AsyncMock(),
        )
        events = []
        async for event in orch.run():
            events.append(event)

    agent_names = [e["data"].get("agent_name", "") for e in events if e["event"] == "agent_start"]
    assert "ANALYST" in agent_names
