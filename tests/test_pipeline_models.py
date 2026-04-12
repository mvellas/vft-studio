import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from backend.db.base import Base
from backend.db.models import PipelineRun, PipelineTurn

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
