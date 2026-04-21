import pytest
from unittest.mock import AsyncMock, MagicMock, patch


async def aiter(items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_war_room_yields_turns():
    from backend.pipeline.war_room import WarRoomOrchestrator

    mock_session = AsyncMock()
    phase_outputs = {
        "FRAME": "stakeholder analysis",
        "AXIOM": "value hierarchy",
        "NOVA": "alternatives",
    }

    mock_agent = MagicMock()
    mock_agent.stream = lambda msgs: aiter(["response text"])

    with patch("backend.pipeline.war_room.BaseAgent", return_value=mock_agent):
        orch = WarRoomOrchestrator(
            project_id="proj-1",
            project_name="Test",
            phase_outputs=phase_outputs,
            stakeholders=[],
            simulation_context={},
            session=mock_session,
        )
        events = []
        async for event in orch.run():
            events.append(event)

    event_types = [e["event"] for e in events]
    assert "war_room_turn" in event_types
    assert "war_room_turn_complete" in event_types
    assert events[0]["event"] == "war_room_start"
    assert events[-1]["event"] == "war_room_done"


@pytest.mark.asyncio
async def test_war_room_tracks_stakeholder_social_summary():
    from backend.pipeline.war_room import WarRoomOrchestrator

    mock_session = AsyncMock()
    phase_outputs = {
        "FRAME": "stakeholder analysis",
        "AXIOM": "value hierarchy",
    }

    mock_agent = MagicMock()
    mock_agent.stream = lambda msgs: aiter(["Concordo com AXIOM, mas vejo risco de custo e prazo."])

    with patch("backend.pipeline.war_room.BaseAgent", return_value=mock_agent):
        orch = WarRoomOrchestrator(
            project_id="proj-1",
            project_name="Test",
            phase_outputs=phase_outputs,
            stakeholders=[{
                "id": "s1",
                "name": "Diretoria Financeira",
                "role": "owner",
                "profile": "Controla orçamento",
                "interests": "reduzir risco financeiro",
            }],
            simulation_context={
                "participants": [{
                    "name": "Diretoria Financeira",
                    "latest_position": "Aprovo se houver salvaguardas",
                    "coalition_tag": "Diretoria Financeira+Operacoes",
                    "vote": {"choice": "approve_with_conditions"},
                    "alliances": ["Operacoes"],
                    "conflicts": ["Marketing"],
                    "trajectory": [{"round": 1, "position": "Aprovo se houver salvaguardas"}],
                }],
                "coalitions": [{"tag": "Diretoria Financeira+Operacoes", "members": ["Diretoria Financeira", "Operacoes"]}],
                "votes": {"approve_with_conditions": 1},
            },
            session=mock_session,
        )
        async for _event in orch.run():
            pass

    social_summary = orch.get_social_summary()
    assert "Diretoria Financeira" in social_summary
    assert "custo" in social_summary.lower() or "prazo" in social_summary.lower()


@pytest.mark.asyncio
async def test_report_generator_yields_report():
    from backend.pipeline.report import ReportGenerator

    mock_session = AsyncMock()

    inst = MagicMock()
    inst.stream = lambda msgs: aiter(["# Report\nContent"])

    with patch("backend.pipeline.report.FacilitatorAgent") as FA:
        FA.from_project_id = AsyncMock(return_value=inst)

        gen = ReportGenerator(
            project_id="proj-1",
            project_name="Test",
            phase_outputs={"FRAME": "output"},
            war_room_transcript="ARIA: question\nFRAME: answer",
            social_summary="FRAME alinhado com stakeholder financeiro; tensão sobre custo.",
            session=mock_session,
        )
        events = []
        async for event in gen.run():
            events.append(event)

    event_types = [e["event"] for e in events]
    assert "report_start" in event_types
    assert "report_delta" in event_types
    assert "report_done" in event_types
