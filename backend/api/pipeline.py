"""backend/api/pipeline.py — POST /api/pipeline/run (SSE) + GET /api/pipeline/{project_id}"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import Document, PipelineRun, PipelineTurn, Project
from backend.schemas.pipeline import PipelineRunRequest, PipelineRunResponse
from backend.pipeline.orchestrator import PipelineOrchestrator
from backend.pipeline.war_room import WarRoomOrchestrator
from backend.pipeline.report import ReportGenerator

router = APIRouter(tags=["pipeline"])


async def run_full_pipeline(
    project: Project,
    documents: list[Document],
    run_id: str,
    session: AsyncSession,
) -> AsyncIterator[dict]:
    """Full pipeline: phases → war room → report. Yields SSE-ready dicts."""
    yield {"event": "pipeline_start", "data": {"run_id": run_id, "project_id": project.id}}

    # Sequential phases
    orchestrator = PipelineOrchestrator(
        project=project, documents=documents, session=session
    )
    sequence = 0
    async for event in orchestrator.run():
        yield event
        if event["event"] == "agent_done":
            data = event["data"]
            turn = PipelineTurn(
                id=str(uuid.uuid4()),
                run_id=run_id,
                agent_name=data.get("agent_name", data.get("agent", "")),
                phase_label=data.get("phase_label", ""),
                turn_type="analysis",
                content=data.get("content", ""),
                sequence=sequence,
            )
            session.add(turn)
            sequence += 1

    # War Room
    war_room = WarRoomOrchestrator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        session=session,
    )
    async for event in war_room.run():
        yield event

    war_room_transcript = war_room.get_transcript()

    # Report
    report_gen = ReportGenerator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        war_room_transcript=war_room_transcript,
        session=session,
    )
    full_report = ""
    async for event in report_gen.run():
        yield event
        if event["event"] == "report_delta":
            full_report += event["data"].get("text", "")

    # Persist report
    result = await session.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run:
        run.report_md = full_report
        run.status = "done"
        run.completed_at = datetime.now(timezone.utc).isoformat()
    await session.commit()

    yield {"event": "pipeline_done", "data": {}}


@router.post("/pipeline/run", response_class=EventSourceResponse)
async def start_pipeline(
    body: PipelineRunRequest,
    session: AsyncSession = Depends(get_session),
) -> EventSourceResponse:
    result = await session.execute(
        select(Project).where(Project.id == body.project_id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if body.problem_description:
        project.description = body.problem_description

    docs_result = await session.execute(
        select(Document).where(Document.project_id == body.project_id)
    )
    documents = list(docs_result.scalars().all())

    run_id = str(uuid.uuid4())
    run = PipelineRun(
        id=run_id,
        project_id=body.project_id,
        status="running",
        report_md="",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    session.add(run)
    await session.flush()

    async def generate():
        try:
            async for event_dict in run_full_pipeline(project, documents, run_id, session):
                event_name = event_dict["event"]
                data = json.dumps(event_dict["data"])
                yield ServerSentEvent(data=data, event=event_name)
        except Exception as exc:
            yield ServerSentEvent(data=json.dumps({"message": str(exc)}), event="error")

    return EventSourceResponse(generate())


@router.get("/pipeline/export/{run_id}")
async def export_report(
    run_id: str,
    session: AsyncSession = Depends(get_session),
) -> Response:
    result = await session.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    filename = f"vft-analise-{run.project_id[:8]}.md"
    return Response(
        content=run.report_md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pipeline/{project_id}/runs", response_model=list[PipelineRunResponse])
async def list_runs(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[PipelineRunResponse]:
    result = await session.execute(
        select(PipelineRun)
        .where(PipelineRun.project_id == project_id)
        .where(PipelineRun.status == "done")
        .order_by(PipelineRun.created_at.desc())
    )
    runs = result.scalars().all()
    return [PipelineRunResponse.model_validate(r) for r in runs]


@router.get("/pipeline/{project_id}", response_model=PipelineRunResponse)
async def get_latest_run(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> PipelineRunResponse:
    result = await session.execute(
        select(PipelineRun)
        .where(PipelineRun.project_id == project_id)
        .order_by(PipelineRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="No pipeline run found")
    return PipelineRunResponse.model_validate(run)
