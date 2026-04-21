import pytest
from unittest.mock import AsyncMock, MagicMock, patch


async def aiter(items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_social_simulation_engine_persists_snapshot():
    from backend.pipeline.social_simulation import SocialSimulationEngine

    mock_session = AsyncMock()
    mock_session.add = MagicMock()
    execute_result = MagicMock()
    scalar_result = MagicMock()
    scalar_result.all.return_value = []
    execute_result.scalars.return_value = scalar_result
    mock_session.execute = AsyncMock(return_value=execute_result)

    mock_agent = MagicMock()
    mock_agent.stream = lambda msgs: aiter([
        "POSITION: Apoio com condições\n"
        "STANCE: 1\n"
        "ALLIES: Operacoes\n"
        "CONFLICTS: Marketing\n"
        "CONCERNS: custo, prazo\n"
        "VOTE: approve_with_conditions\n"
        "RATIONALE: precisa controlar risco"
    ])

    with patch("backend.pipeline.social_simulation.BaseAgent", return_value=mock_agent):
        engine = SocialSimulationEngine(
            project_id="proj-1",
            project_name="Projeto Teste",
            phase_outputs={"FRAME": "stakeholders", "AXIOM": "objetivos"},
            stakeholders=[{
                "id": "s1",
                "name": "Financeiro",
                "role": "owner",
                "profile": "controle",
                "interests": "reduzir custo",
            }],
            session=mock_session,
            pipeline_run_id="run-1",
            rounds=1,
        )

        events = []
        async for event in engine.run():
            events.append(event)

    event_types = [event["event"] for event in events]
    assert "simulation_start" in event_types
    assert "simulation_round_complete" in event_types
    assert "simulation_done" in event_types

    snapshot = events[-1]["data"]
    assert snapshot["participants"][0]["name"] == "Financeiro"
    assert snapshot["votes"]["approve_with_conditions"] == 1
    assert snapshot["coalitions"]
    assert mock_session.add.called
    assert mock_session.commit.await_count == 1
