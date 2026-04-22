"""Materialize VFT artifacts from pipeline outputs into persistent DB entities."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.agents.base_agent import BaseAgent
from backend.db.models import (
    Alternative,
    AlternativeConsequence,
    Objective,
    ObjectiveCausalLink,
    Project,
    Stakeholder,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _normalize(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def _extract_json(raw: str) -> dict:
    raw = (raw or "").strip()
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        pass
    match = re.search(r"\{.*\}", raw, flags=re.DOTALL)
    if not match:
        return {}
    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _map_role(raw_role: str, *, is_decision_maker: bool) -> str:
    role = _normalize(raw_role)
    if is_decision_maker or "decision" in role or "diretor" in role or "executiv" in role:
        return "decision_authority"
    if "cliente" in role or "customer" in role or "consumer" in role:
        return "customer"
    if "owner" in role or "patrocin" in role or "sponsor" in role:
        return "owner"
    if "consum" in role:
        return "consumer"
    return "user"


class PipelineMaterializer:
    def __init__(
        self,
        project: Project,
        phase_outputs: dict[str, str],
        war_room_transcript: str,
        session: AsyncSession,
    ) -> None:
        self.project = project
        self.phase_outputs = phase_outputs
        self.war_room_transcript = war_room_transcript
        self.session = session

    async def run(self) -> dict:
        structured = await self._extract_structure()
        if not structured:
            return {
                "stakeholders_count": 0,
                "objectives_count": 0,
                "links_count": 0,
            }

        stakeholder_map = await self._upsert_stakeholders(structured.get("stakeholders", []))
        await self._apply_project_updates(structured.get("project_updates", {}))
        objective_map = await self._upsert_objectives(structured.get("objectives", []), stakeholder_map)
        links_count = await self._upsert_links(structured.get("causal_links", []), objective_map)
        alternative_map = await self._upsert_alternatives(structured.get("alternatives", []), stakeholder_map)
        consequences_count = await self._upsert_consequences(
            structured.get("consequences", []),
            alternative_map,
            objective_map,
        )
        await self.session.commit()
        return {
            "stakeholders_count": len(stakeholder_map),
            "objectives_count": len(objective_map),
            "links_count": links_count,
            "alternatives_count": len(alternative_map),
            "consequences_count": consequences_count,
        }

    async def _extract_structure(self) -> dict:
        prompt = f"""
Você é um normalizador de saídas VFT. Extraia da análise abaixo uma estrutura JSON válida.

Projeto: {self.project.name}
Descrição: {self.project.description or "(sem descrição)"}

FRAME:
{self.phase_outputs.get("FRAME", "")[:12000]}

AXIOM:
{self.phase_outputs.get("AXIOM", "")[:12000]}

NOVA:
{self.phase_outputs.get("NOVA", "")[:8000]}

ANALYST:
{self.phase_outputs.get("ANALYST", "")[:8000]}

WAR ROOM:
{self.war_room_transcript[:12000]}

Retorne APENAS JSON com este formato:
{{
  "project_updates": {{
    "decision_statement": "string",
    "idf_purpose": "string",
    "idf_perspective": "string",
    "idf_scope": "string"
  }},
  "stakeholders": [
    {{
      "name": "string",
      "role": "string",
      "is_decision_maker": true,
      "profile": "string",
      "interests": "string"
    }}
  ],
  "objectives": [
    {{
      "statement": "string",
      "source_stakeholder_name": "string ou vazio",
      "raw_value": "string",
      "type": "means|fundamental|strategic|other",
      "witi_classification": "fundamental|means|",
      "parent_statement": "string ou vazio",
      "implies_statement": "string ou vazio",
      "hierarchy_level": 0
    }}
  ],
  "causal_links": [
    {{
      "from_statement": "string",
      "to_statement": "string",
      "label": "string"
    }}
  ],
  "alternatives": [
    {{
      "name": "string",
      "description": "string",
      "source_stakeholder_name": "string ou vazio",
      "is_status_quo": true
    }}
  ],
  "consequences": [
    {{
      "alternative_name": "string",
      "objective_statement": "string",
      "value_text": "string"
    }}
  ]
}}

Regras:
- Preencha project_updates com a melhor versão consolidada da declaração de decisão e dos campos centrais do IDF.
- Inclua stakeholders inferidos a partir da análise, mesmo que não existam no banco.
- Inclua objetivos suficientes para formar nuvem, hierarquia e rede meios-fins.
- Para objetivos fundamentais, witi_classification deve ser "fundamental".
- Para objetivos-meios, witi_classification deve ser "means" e "implies_statement" deve apontar para o objetivo superior.
- "parent_statement" deve formar a hierarquia top-down quando possível.
- Inclua alternativas concretas e consequências resumidas sempre que a análise trouxer esse material.
- Não explique nada fora do JSON.
"""
        agent = BaseAgent(model="claude-sonnet-4-6", system="Responda apenas JSON válido.")
        raw = await agent.invoke([{"role": "user", "content": prompt}])
        return _extract_json(raw)

    async def _apply_project_updates(self, updates: dict) -> None:
        decision_statement = (updates.get("decision_statement") or "").strip()
        idf_purpose = (updates.get("idf_purpose") or "").strip()
        idf_perspective = (updates.get("idf_perspective") or "").strip()
        idf_scope = (updates.get("idf_scope") or "").strip()

        if decision_statement and not self.project.decision_statement:
            self.project.decision_statement = decision_statement[:2000]
            self.project.decision_statement_validated = 1
        if idf_purpose and not self.project.idf_purpose:
            self.project.idf_purpose = idf_purpose[:2000]
        if idf_perspective and not self.project.idf_perspective:
            self.project.idf_perspective = idf_perspective[:2000]
        if idf_scope and not self.project.idf_scope:
            self.project.idf_scope = idf_scope[:2000]

    async def _upsert_stakeholders(self, items: list[dict]) -> dict[str, Stakeholder]:
        result = await self.session.execute(
            select(Stakeholder)
            .where(Stakeholder.project_id == self.project.id)
            .order_by(Stakeholder.order_index)
        )
        existing = list(result.scalars().all())
        by_name = {_normalize(item.name): item for item in existing}
        ordered: list[Stakeholder] = []

        for index, item in enumerate(items):
            name = (item.get("name") or "").strip()
            if not name:
                continue
            is_decision_maker = bool(item.get("is_decision_maker"))
            role = _map_role(str(item.get("role") or ""), is_decision_maker=is_decision_maker)
            row = by_name.get(_normalize(name))
            if row is None:
                row = Stakeholder(
                    id=str(uuid.uuid4()),
                    project_id=self.project.id,
                    name=name,
                    role=role,
                    is_decision_maker=1 if is_decision_maker else 0,
                    profile=(item.get("profile") or "")[:1000],
                    interests=(item.get("interests") or "")[:1000],
                    elicitation_mode="simulated",
                    interview_status="pending",
                    interview_notes="",
                    order_index=index,
                    created_at=_now_iso(),
                    updated_at=_now_iso(),
                )
                self.session.add(row)
                by_name[_normalize(name)] = row
            else:
                if not row.profile and item.get("profile"):
                    row.profile = (item.get("profile") or "")[:1000]
                if not row.interests and item.get("interests"):
                    row.interests = (item.get("interests") or "")[:1000]
                if is_decision_maker:
                    row.is_decision_maker = 1
                    row.role = "decision_authority"
                row.updated_at = _now_iso()
            ordered.append(row)

        if ordered:
            self.project.stakeholder_config = "single_dm_multi" if sum(1 for s in ordered if s.is_decision_maker) == 1 else "multi_dm_multi"
        return {_normalize(stakeholder.name): stakeholder for stakeholder in by_name.values()}

    async def _upsert_objectives(self, items: list[dict], stakeholder_map: dict[str, Stakeholder]) -> dict[str, Objective]:
        result = await self.session.execute(
            select(Objective)
            .where(Objective.project_id == self.project.id, Objective.deleted == 0)
            .order_by(Objective.order_index)
        )
        existing = list(result.scalars().all())
        by_statement = {_normalize(item.statement): item for item in existing}

        for index, item in enumerate(items):
            statement = (item.get("statement") or "").strip()
            if not statement:
                continue
            normalized = _normalize(statement)
            row = by_statement.get(normalized)
            source_name = _normalize(str(item.get("source_stakeholder_name") or ""))
            source_stakeholder = stakeholder_map.get(source_name)
            obj_type = str(item.get("type") or "other").strip().lower()
            if obj_type == "other":
                obj_type = "uncategorized"
            witi = str(item.get("witi_classification") or "").strip().lower()
            hierarchy_level = int(item.get("hierarchy_level") or 0)
            if row is None:
                row = Objective(
                    id=str(uuid.uuid4()),
                    project_id=self.project.id,
                    statement=statement,
                    source_stakeholder_id=source_stakeholder.id if source_stakeholder else None,
                    raw_value=(item.get("raw_value") or statement)[:1000],
                    type=obj_type,
                    witi_question="Por que isso é importante?",
                    witi_answer="Materializado automaticamente pela análise completa com IA.",
                    witi_classification=witi,
                    is_fundamental_candidate=1 if witi == "fundamental" else 0,
                    hierarchy_level=hierarchy_level,
                    order_index=index,
                    created_at=_now_iso(),
                    updated_at=_now_iso(),
                )
                self.session.add(row)
                by_statement[normalized] = row
            else:
                if not row.source_stakeholder_id and source_stakeholder:
                    row.source_stakeholder_id = source_stakeholder.id
                if not row.raw_value:
                    row.raw_value = (item.get("raw_value") or statement)[:1000]
                if row.type in ("", "uncategorized") and obj_type:
                    row.type = obj_type
                if not row.witi_classification and witi:
                    row.witi_classification = witi
                if row.hierarchy_level == 0 and hierarchy_level:
                    row.hierarchy_level = hierarchy_level
                if witi == "fundamental":
                    row.is_fundamental_candidate = 1
                row.updated_at = _now_iso()

        await self.session.flush()

        for item in items:
            statement = _normalize(str(item.get("statement") or ""))
            row = by_statement.get(statement)
            if row is None:
                continue
            parent_statement = _normalize(str(item.get("parent_statement") or ""))
            implies_statement = _normalize(str(item.get("implies_statement") or ""))
            parent = by_statement.get(parent_statement) if parent_statement else None
            implies = by_statement.get(implies_statement) if implies_statement else None
            if parent is not None and parent.id != row.id and row.parent_id is None:
                row.parent_id = parent.id
            if implies is not None and implies.id != row.id and row.witi_implies_objective_id is None:
                row.witi_implies_objective_id = implies.id

        return by_statement

    async def _upsert_links(self, items: list[dict], objective_map: dict[str, Objective]) -> int:
        result = await self.session.execute(
            select(ObjectiveCausalLink).where(ObjectiveCausalLink.project_id == self.project.id)
        )
        existing_links = result.scalars().all()
        existing_pairs = {(link.from_obj, link.to_obj) for link in existing_links}
        created = 0

        implied_pairs: set[tuple[str, str]] = set()
        for objective in objective_map.values():
            if objective.witi_implies_objective_id:
                implied_pairs.add((objective.id, objective.witi_implies_objective_id))
            if objective.parent_id:
                implied_pairs.add((objective.id, objective.parent_id))

        for from_id, to_id in implied_pairs:
            if from_id == to_id or (from_id, to_id) in existing_pairs:
                continue
            self.session.add(ObjectiveCausalLink(
                id=str(uuid.uuid4()),
                from_obj=from_id,
                to_obj=to_id,
                project_id=self.project.id,
                label="supports",
                created_at=_now_iso(),
            ))
            existing_pairs.add((from_id, to_id))
            created += 1

        for item in items:
            from_obj = objective_map.get(_normalize(str(item.get("from_statement") or "")))
            to_obj = objective_map.get(_normalize(str(item.get("to_statement") or "")))
            if from_obj is None or to_obj is None or from_obj.id == to_obj.id:
                continue
            if (from_obj.id, to_obj.id) in existing_pairs:
                continue
            self.session.add(ObjectiveCausalLink(
                id=str(uuid.uuid4()),
                from_obj=from_obj.id,
                to_obj=to_obj.id,
                project_id=self.project.id,
                label=(item.get("label") or "influences")[:200],
                created_at=_now_iso(),
            ))
            existing_pairs.add((from_obj.id, to_obj.id))
            created += 1

        return created

    async def _upsert_alternatives(
        self,
        items: list[dict],
        stakeholder_map: dict[str, Stakeholder],
    ) -> dict[str, Alternative]:
        result = await self.session.execute(
            select(Alternative)
            .where(Alternative.project_id == self.project.id, Alternative.deleted == 0)
            .order_by(Alternative.order_index)
        )
        existing = list(result.scalars().all())
        by_name = {_normalize(item.name): item for item in existing}

        for index, item in enumerate(items):
            name = (item.get("name") or "").strip()
            if not name:
                continue
            normalized = _normalize(name)
            row = by_name.get(normalized)
            source_name = _normalize(str(item.get("source_stakeholder_name") or ""))
            source_stakeholder = stakeholder_map.get(source_name)
            description = (item.get("description") or "")[:2000]
            is_status_quo = 1 if bool(item.get("is_status_quo")) else 0

            if row is None:
                row = Alternative(
                    id=str(uuid.uuid4()),
                    project_id=self.project.id,
                    name=name,
                    description=description,
                    source="ai_complete_analysis",
                    source_stakeholder_id=source_stakeholder.id if source_stakeholder else None,
                    is_status_quo=is_status_quo,
                    order_index=index,
                    created_at=_now_iso(),
                    updated_at=_now_iso(),
                    deleted=0,
                )
                self.session.add(row)
                by_name[normalized] = row
            else:
                if not row.description and description:
                    row.description = description
                if not row.source_stakeholder_id and source_stakeholder:
                    row.source_stakeholder_id = source_stakeholder.id
                if is_status_quo:
                    row.is_status_quo = 1
                row.updated_at = _now_iso()

        return by_name

    async def _upsert_consequences(
        self,
        items: list[dict],
        alternative_map: dict[str, Alternative],
        objective_map: dict[str, Objective],
    ) -> int:
        created = 0
        updated = 0

        for item in items:
            alternative = alternative_map.get(_normalize(str(item.get("alternative_name") or "")))
            objective = objective_map.get(_normalize(str(item.get("objective_statement") or "")))
            value_text = (item.get("value_text") or "").strip()
            if alternative is None or objective is None or not value_text:
                continue

            result = await self.session.execute(
                select(AlternativeConsequence).where(
                    AlternativeConsequence.alternative_id == alternative.id,
                    AlternativeConsequence.objective_id == objective.id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing is None:
                self.session.add(
                    AlternativeConsequence(
                        id=str(uuid.uuid4()),
                        alternative_id=alternative.id,
                        objective_id=objective.id,
                        project_id=self.project.id,
                        value_text=value_text[:3000],
                        attribute_level_id=None,
                        created_at=_now_iso(),
                        updated_at=_now_iso(),
                    )
                )
                created += 1
            elif not existing.value_text:
                existing.value_text = value_text[:3000]
                existing.updated_at = _now_iso()
                updated += 1

        return created + updated
