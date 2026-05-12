"""backend/api/pipeline.py — POST /api/pipeline/run (SSE) + GET /api/pipeline/{project_id}"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sse_starlette.sse import EventSourceResponse, ServerSentEvent
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.base import get_session
from backend.db.models import (
    Document,
    PipelineRun,
    PipelineTurn,
    Project,
    SocialSimulationRun,
    Stakeholder,
    StepCompletion,
)
from backend.agents.base_agent import AIServiceError
from backend.schemas.pipeline import (
    PipelineRunRequest,
    PipelineRunResponse,
    SocialSimulationResponse,
)
from backend.pipeline.orchestrator import PipelineOrchestrator
from backend.pipeline.social_simulation import SocialSimulationEngine
from backend.pipeline.materializer import PipelineMaterializer
from backend.pipeline.war_room import WarRoomOrchestrator
from backend.pipeline.report import ReportGenerator
from backend.engine.process_manager import ProcessManager

router = APIRouter(tags=["pipeline"])

_process_manager = ProcessManager()


def _status_event(
    title: str,
    detail: str,
    *,
    actor: str = "ARIA",
    stage: str = "pipeline",
    state: str = "running",
    meta: dict | None = None,
) -> dict:
    return {
        "event": "pipeline_status",
        "data": {
            "id": str(uuid.uuid4()),
            "title": title,
            "detail": detail,
            "actor": actor,
            "stage": stage,
            "state": state,
            "meta": meta or {},
        },
    }


def _summarize_text(text: str, limit: int = 160) -> str:
    compact = " ".join((text or "").split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3] + "..."


def _parse_summary_json(raw: str) -> dict[str, Any]:
    try:
        data = json.loads(raw or "{}")
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


async def _auto_complete_all_steps(project: Project, session: AsyncSession) -> None:
    """Mark all applicable steps as completed after a full pipeline run."""
    applicable = _process_manager.get_steps_for_config(
        project.stakeholder_config, project.qualitative_modeling_tech
    )
    if not applicable:
        return

    result = await session.execute(
        select(StepCompletion).where(StepCompletion.project_id == project.id)
    )
    completed_ids = {sc.step_id for sc in result.scalars().all()}

    now = datetime.now(timezone.utc).isoformat()
    for step in applicable:
        if step.id not in completed_ids:
            session.add(StepCompletion(
                id=str(uuid.uuid4()),
                project_id=project.id,
                step_id=step.id,
                completed_at=now,
                data_json="{}",
                notes="Auto-completed by full AI analysis pipeline.",
            ))

    last_step = applicable[-1]
    project.current_step = last_step.id
    await session.commit()


def _build_full_document(
    project_name: str,
    phase_outputs: dict[str, str],
    war_room_transcript: str,
    final_report: str,
) -> str:
    """Assemble complete export document: phase analyses + war room + final report."""
    sections: list[str] = [f"# Análise VFT Completa — {project_name}\n"]

    agent_labels = {
        "FRAME": "Fase 1 — Stakeholders (FRAME)",
        "AXIOM": "Fase 2 — Valores e Objetivos (AXIOM)",
        "NOVA": "Fase 3 — Alternativas (NOVA)",
        "ANALYST": "Documentos Analisados (ANALYST)",
    }
    for agent, label in agent_labels.items():
        if agent in phase_outputs and phase_outputs[agent].strip():
            sections.append(f"## {label}\n\n{phase_outputs[agent]}")

    if war_room_transcript.strip():
        sections.append(f"## War Room — Transcrição do Debate\n\n{war_room_transcript}")

    if final_report.strip():
        sections.append(f"---\n\n{final_report}")

    return "\n\n---\n\n".join(sections)


async def run_full_pipeline(
    project: Project,
    documents: list[Document],
    run_id: str,
    session: AsyncSession,
) -> AsyncIterator[dict]:
    """Full pipeline: phases → war room → report. Yields SSE-ready dicts."""
    yield {"event": "pipeline_start", "data": {"run_id": run_id, "project_id": project.id}}
    yield _status_event(
        "ARIA está alinhando o contexto do problema",
        "A facilitadora está reunindo descrição, documentos e estado atual do projeto para preparar a análise.",
        stage="setup",
        meta={
            "documents_count": len(documents),
            "has_description": bool(project.description),
        },
    )

    stakeholders_result = await session.execute(
        select(Stakeholder)
        .where(Stakeholder.project_id == project.id)
        .order_by(Stakeholder.order_index)
    )
    stakeholders = list(stakeholders_result.scalars().all())
    stakeholder_context = [
        {
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "profile": s.profile or "(perfil não informado)",
            "interests": s.interests or "(interesses não informados)",
            "is_decision_maker": bool(s.is_decision_maker),
        }
        for s in stakeholders
    ]
    if stakeholder_context:
        names = ", ".join(s["name"] for s in stakeholder_context[:6])
        suffix = "..." if len(stakeholder_context) > 6 else ""
        yield _status_event(
            "Agora vamos mapear os stakeholders",
            f"Os stakeholders definidos para esta análise são: {names}{suffix}",
            stage="stakeholders",
            meta={
                "stakeholders_count": len(stakeholder_context),
                "decision_makers_count": sum(1 for s in stakeholder_context if s["is_decision_maker"]),
            },
        )
    else:
        yield _status_event(
            "Nenhum stakeholder formal foi cadastrado",
            "ARIA vai seguir com base no contexto atual do projeto e nas evidências disponíveis.",
            stage="stakeholders",
            meta={"stakeholders_count": 0, "decision_makers_count": 0},
        )

    # Sequential phases
    orchestrator = PipelineOrchestrator(
        project=project, documents=documents, session=session
    )
    sequence = 0
    async for event in orchestrator.run():
        if event["event"] == "agent_start":
            data = event["data"]
            yield _status_event(
                f"{data.get('agent_name', 'Agente')} iniciou uma nova etapa",
                f"{data.get('phase_label', 'Etapa')} em andamento.",
                actor=data.get("agent_name", "ARIA"),
                stage="phase",
                meta={
                    "active_agent": data.get("agent_name", "ARIA"),
                    "documents_count": len(documents),
                },
            )
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
            yield _status_event(
                f"{data.get('agent_name', 'Agente')} concluiu sua análise",
                _summarize_text(data.get("content", "")) or "Etapa finalizada com sucesso.",
                actor=data.get("agent_name", "ARIA"),
                stage="phase",
                state="done",
                meta={
                    "completed_agent": data.get("agent_name", "ARIA"),
                    "content_length": len(data.get("content", "")),
                },
            )

    yield _status_event(
        "Materializando artefatos VFT",
        "ARIA está convertendo a análise em stakeholders, objetivos e relações persistidas para os diagramas finais.",
        stage="phase",
        actor="ARIA",
        meta={"active_agent": "ARIA", "materialization": "running"},
    )
    materializer = PipelineMaterializer(
        project=project,
        phase_outputs=orchestrator.phase_outputs,
        war_room_transcript="",
        session=session,
    )
    materialized = await materializer.run()
    yield _status_event(
        "Artefatos VFT preenchidos",
        "Stakeholders, objetivos e conexões já estão prontos para alimentar nuvem, hierarquia e redes no relatório.",
        stage="phase",
        actor="ARIA",
        state="done",
        meta={
            "completed_agent": "ARIA",
            "materialized_stakeholders": materialized.get("stakeholders_count", 0),
            "materialized_objectives": materialized.get("objectives_count", 0),
            "materialized_links": materialized.get("links_count", 0),
        },
    )

    stakeholders_result = await session.execute(
        select(Stakeholder)
        .where(Stakeholder.project_id == project.id)
        .order_by(Stakeholder.order_index)
    )
    stakeholders = list(stakeholders_result.scalars().all())
    stakeholder_context = [
        {
            "id": s.id,
            "name": s.name,
            "role": s.role,
            "profile": s.profile or "(perfil não informado)",
            "interests": s.interests or "(interesses não informados)",
            "is_decision_maker": bool(s.is_decision_maker),
        }
        for s in stakeholders
    ]

    # War Room
    yield _status_event(
        "Simulação social iniciada",
        "Antes da War Room, ARIA está rodando rodadas de posicionamento, coalizão e votação entre stakeholders.",
        stage="war-room",
        meta={
            "simulation_phase": "starting",
            "stakeholders_count": len(stakeholder_context),
        },
    )
    simulation_engine = SocialSimulationEngine(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        stakeholders=stakeholder_context,
        session=session,
        pipeline_run_id=run_id,
        rounds=2,
    )
    simulation_snapshot: dict = {}
    async for event in simulation_engine.run():
        yield event
        if event["event"] == "simulation_round_complete":
            data = event["data"]
            yield _status_event(
                f"Rodada social {data.get('round', '?')} concluída",
                "Stakeholders ajustaram posição, coalizões e voto para a próxima etapa.",
                actor="ARIA",
                stage="war-room",
                state="done",
                meta={
                    "simulation_phase": "round_complete",
                    "round": data.get("round", 1),
                    "participants_count": data.get("participants_count", 0),
                    "coalitions_count": len(data.get("coalitions", [])),
                    "conflicts_count": len(data.get("top_conflicts", [])),
                },
            )
        elif event["event"] == "simulation_done":
            simulation_snapshot = event["data"]
            yield _status_event(
                "Simulação social consolidada",
                "A War Room vai começar com memória persistente, coalizões e tendências de voto já estabelecidas.",
                actor="ARIA",
                stage="war-room",
                state="done",
                meta={
                    "simulation_phase": "done",
                    "participants_count": len(simulation_snapshot.get("participants", [])),
                    "coalitions_count": len(simulation_snapshot.get("coalitions", [])),
                },
            )

    yield _status_event(
        "Contatando os stakeholders",
        "ARIA está convocando especialistas e stakeholders para a etapa de confronto e síntese.",
        stage="war-room",
        meta={
            "stakeholders_count": len(stakeholder_context),
            "participants_count": len(stakeholder_context) + len([n for n in orchestrator.phase_outputs if orchestrator.phase_outputs[n].strip()]),
        },
    )
    war_room = WarRoomOrchestrator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        stakeholders=stakeholder_context,
        simulation_context=simulation_snapshot,
        session=session,
    )
    yield _status_event(
        "War Room ativado",
        "A facilitadora abriu a mesa de síntese. As rodadas serão conduzidas no background.",
        stage="war-room",
        meta={
            "rounds_planned": 3,
            "stakeholders_count": len(stakeholder_context),
        },
    )
    async for event in war_room.run():
        yield event
        if event["event"] == "war_room_turn_complete":
            data = event["data"]
            speaker = data.get("speaker", "Participante")
            act = data.get("act", 1)
            if speaker == "ARIA":
                detail = _summarize_text(data.get("text", ""))
                title = f"ARIA conduziu a rodada {act}"
            else:
                detail = _summarize_text(data.get("text", ""))
                title = f"{speaker} respondeu na War Room"
            yield _status_event(
                title,
                detail or "Novo posicionamento registrado na rodada.",
                actor=speaker,
                stage="war-room",
                state="done",
                meta={
                    "speaker": speaker,
                    "act": act,
                    "turn_length": len(data.get("text", "")),
                },
            )

    war_room_transcript = war_room.get_transcript()
    social_summary = war_room.get_social_summary()

    # Report
    yield _status_event(
        "ARIA está consolidando o relatório final",
        "As análises de fase, a War Room e as evidências documentais estão sendo sintetizadas em um único artefato.",
        stage="report",
        meta={
            "phase_outputs_count": len([v for v in orchestrator.phase_outputs.values() if v.strip()]),
            "war_room_turns": len([t for t in war_room_transcript.split("\n\n") if t.strip()]),
        },
    )
    report_gen = ReportGenerator(
        project_id=project.id,
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        war_room_transcript=war_room_transcript,
        social_summary=social_summary,
        session=session,
    )
    full_report = ""
    async for event in report_gen.run():
        # Suppress the partial report_done from ReportGenerator — we'll emit
        # a final report_done below with the fully assembled document.
        if event["event"] != "report_done":
            yield event
        if event["event"] == "report_delta":
            full_report += event["data"].get("text", "")

    # Assemble full export document: phase analyses + war room + final report
    full_document = _build_full_document(
        project_name=project.name,
        phase_outputs=orchestrator.phase_outputs,
        war_room_transcript=war_room_transcript,
        final_report=full_report,
    )

    # Persist full document
    result = await session.execute(
        select(PipelineRun).where(PipelineRun.id == run_id)
    )
    run = result.scalar_one_or_none()
    if run:
        run.report_md = full_document
        run.status = "done"
        run.completed_at = datetime.now(timezone.utc).isoformat()
    await session.commit()

    # Also send full document via SSE so frontend store has it
    yield {"event": "report_done", "data": {"report_md": full_document}}
    yield _status_event(
        "Relatório completo finalizado",
        "A análise VFT completa já pode ser explorada com seus artefatos interativos.",
        stage="report",
        state="done",
        meta={"report_length": len(full_document)},
    )

    # Auto-complete all applicable steps now that the full analysis is done
    await _auto_complete_all_steps(project, session)

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
        except AIServiceError as exc:
            failed_run = await session.get(PipelineRun, run_id)
            if failed_run:
                failed_run.status = "error"
                failed_run.completed_at = datetime.now(timezone.utc).isoformat()
                await session.commit()

            payload = {
                "message": exc.user_message,
                "status_code": exc.status_code,
                "request_id": exc.request_id,
            }
            yield ServerSentEvent(data=json.dumps(payload), event="error")
        except Exception as exc:
            failed_run = await session.get(PipelineRun, run_id)
            if failed_run:
                failed_run.status = "error"
                failed_run.completed_at = datetime.now(timezone.utc).isoformat()
                await session.commit()

            yield ServerSentEvent(
                data=json.dumps({
                    "message": "Falha inesperada ao executar a analise com IA. Tente novamente.",
                }),
                event="error",
            )

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


@router.get("/pipeline/{project_id}/social-simulation", response_model=SocialSimulationResponse)
async def get_latest_social_simulation(
    project_id: str,
    session: AsyncSession = Depends(get_session),
) -> SocialSimulationResponse:
    result = await session.execute(
        select(SocialSimulationRun)
        .where(SocialSimulationRun.project_id == project_id)
        .order_by(SocialSimulationRun.created_at.desc())
        .limit(1)
    )
    run = result.scalar_one_or_none()
    if not run:
        raise HTTPException(status_code=404, detail="No social simulation found")

    return SocialSimulationResponse(
        id=run.id,
        project_id=run.project_id,
        pipeline_run_id=run.pipeline_run_id,
        rounds_count=run.rounds_count,
        created_at=run.created_at,
        summary=_parse_summary_json(run.summary_json),
    )
