import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.db.base import Base
from backend.db.models import PipelineRun, PipelineTurn, SocialParticipantMemory, SocialSimulationRun

@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as s:
        yield s

def test_pipeline_run_create(db):
    run = PipelineRun(
        id="run-1",
        project_id="proj-1",
        status="running",
        report_md="",
        created_at="2026-01-01T00:00:00Z",
    )
    db.add(run)
    db.commit()
    fetched = db.get(PipelineRun, "run-1")
    assert fetched.status == "running"
    assert fetched.completed_at is None

def test_pipeline_turn_create(db):
    run = PipelineRun(id="run-2", project_id="p", status="done",
                      report_md="", created_at="2026-01-01T00:00:00Z")
    db.add(run)
    db.commit()
    turn = PipelineTurn(
        id="turn-1",
        run_id="run-2",
        agent_name="FRAME",
        phase_label="Fase 1 — Stakeholders",
        turn_type="analysis",
        content="stakeholder output",
        sequence=0,
    )
    db.add(turn)
    db.commit()
    fetched = db.get(PipelineTurn, "turn-1")
    assert fetched.agent_name == "FRAME"
    assert fetched.sequence == 0

def test_social_simulation_models_create(db):
    run = SocialSimulationRun(
        id="sim-1",
        project_id="proj-1",
        pipeline_run_id=None,
        rounds_count=2,
        summary_json='{"votes":{"approve":1}}',
        created_at="2026-01-01T00:00:00Z",
    )
    db.add(run)
    memory = SocialParticipantMemory(
        id="mem-1",
        project_id="proj-1",
        stakeholder_id=None,
        participant_name="Financeiro",
        participant_kind="stakeholder",
        latest_position="Precisa reduzir risco",
        stance_score=2,
        coalition_tag="Financeiro+Operacoes",
        concerns_json='["custo"]',
        alliances_json='["Operacoes"]',
        conflicts_json='["Marketing"]',
        vote_json='{"choice":"approve_with_conditions"}',
        trajectory_json='[{"round":1}]',
        updated_at="2026-01-01T00:00:00Z",
    )
    db.add(memory)
    db.commit()

    fetched_run = db.get(SocialSimulationRun, "sim-1")
    fetched_memory = db.get(SocialParticipantMemory, "mem-1")
    assert fetched_run.rounds_count == 2
    assert fetched_memory.participant_name == "Financeiro"
    assert fetched_memory.stance_score == 2
