from backend.schemas.pipeline import PipelineRunRequest, PipelineRunResponse, PipelineTurnResponse


def test_pipeline_run_request_defaults():
    req = PipelineRunRequest(project_id="proj-1")
    assert req.project_id == "proj-1"
    assert req.problem_description is None


def test_pipeline_run_response_validation():
    resp = PipelineRunResponse(
        id="run-1",
        project_id="proj-1",
        status="running",
        report_md="",
        created_at="2026-01-01T00:00:00Z",
        completed_at=None,
    )
    assert resp.status == "running"


def test_pipeline_turn_response_validation():
    turn = PipelineTurnResponse(
        id="turn-1",
        run_id="run-1",
        agent_name="FRAME",
        phase_label="Fase 1",
        turn_type="analysis",
        content="output",
        sequence=0,
    )
    assert turn.agent_name == "FRAME"
