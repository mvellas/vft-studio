"""SQLAlchemy 2.0 ORM models for VFT Studio — all 12 tables from DATA-MODEL.md."""

from sqlalchemy import Index, Integer, Text, UniqueConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from backend.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    context_notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
    phase_status: Mapped[int] = mapped_column(Integer, default=1, server_default="1")
    current_step: Mapped[str] = mapped_column(Text, default="1.1", server_default="1.1")
    qualitative_modeling_tech: Mapped[str] = mapped_column(Text, default="platinum", server_default="platinum")
    stakeholder_config: Mapped[str] = mapped_column(Text, default="single_dm_single", server_default="single_dm_single")
    idf_purpose: Mapped[str] = mapped_column(Text, default="", server_default="")
    idf_perspective: Mapped[str] = mapped_column(Text, default="", server_default="")
    idf_scope: Mapped[str] = mapped_column(Text, default="", server_default="")
    idf_documented_at: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision_statement: Mapped[str] = mapped_column(Text, default="", server_default="")
    decision_statement_validated: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    org_documents_text: Mapped[str] = mapped_column(Text, default="", server_default="")
    phase1_completed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    phase2_completed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    phase3_completed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    archived: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    archived_at: Mapped[str | None] = mapped_column(Text, nullable=True)


class Stakeholder(Base):
    __tablename__ = "stakeholders"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    is_decision_maker: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    profile: Mapped[str] = mapped_column(Text, default="", server_default="")
    interests: Mapped[str] = mapped_column(Text, default="", server_default="")
    elicitation_mode: Mapped[str] = mapped_column(Text, default="interview", server_default="interview")
    interview_status: Mapped[str] = mapped_column(Text, default="pending", server_default="pending")
    interview_notes: Mapped[str] = mapped_column(Text, default="", server_default="")
    virtual_transcript_json: Mapped[str] = mapped_column(Text, default="[]", server_default="[]")
    virtual_transcript_reviewed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    order_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("idx_stakeholders_project", "project_id"),
    )


class StakeholderDocument(Base):
    __tablename__ = "stakeholder_documents"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    stakeholder_id: Mapped[str] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    doc_type: Mapped[str] = mapped_column(Text, nullable=False)
    source_date: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_author: Mapped[str] = mapped_column(Text, default="", server_default="")
    source_url: Mapped[str] = mapped_column(Text, default="", server_default="")
    content_type: Mapped[str] = mapped_column(Text, nullable=False)
    file_path: Mapped[str] = mapped_column(Text, default="", server_default="")
    file_mime: Mapped[str] = mapped_column(Text, default="", server_default="")
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    raw_text: Mapped[str] = mapped_column(Text, default="", server_default="")
    analysis_status: Mapped[str] = mapped_column(Text, default="pending", server_default="pending")
    analysis_error: Mapped[str] = mapped_column(Text, default="", server_default="")
    extracted_values_json: Mapped[str] = mapped_column(Text, default="[]", server_default="[]")
    contradictions_json: Mapped[str] = mapped_column(Text, default="[]", server_default="[]")
    order_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("idx_stakeholder_docs_stakeholder", "stakeholder_id"),
        Index("idx_stakeholder_docs_project", "project_id"),
    )


class Objective(Base):
    __tablename__ = "objectives"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    statement: Mapped[str] = mapped_column(Text, nullable=False)
    source_stakeholder_id: Mapped[str | None] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=True)
    raw_value: Mapped[str] = mapped_column(Text, default="", server_default="")
    type: Mapped[str] = mapped_column(Text, default="uncategorized", server_default="uncategorized")
    witi_question: Mapped[str] = mapped_column(Text, default="", server_default="")
    witi_answer: Mapped[str] = mapped_column(Text, default="", server_default="")
    witi_classification: Mapped[str] = mapped_column(Text, default="", server_default="")
    witi_implies_objective_id: Mapped[str | None] = mapped_column(Text, ForeignKey("objectives.id"), nullable=True)
    is_fundamental_candidate: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    coc_q1_answer: Mapped[str] = mapped_column(Text, default="", server_default="")
    coc_q1_result: Mapped[str] = mapped_column(Text, default="", server_default="")
    coc_q2_answer: Mapped[str] = mapped_column(Text, default="", server_default="")
    coc_q2_result: Mapped[str] = mapped_column(Text, default="", server_default="")
    coc_refinement_needed: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    refined_statement: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(Text, ForeignKey("objectives.id"), nullable=True)
    hierarchy_level: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    order_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
    deleted: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    deleted_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_objectives_project", "project_id"),
        Index("idx_objectives_type", "project_id", "type"),
    )


class ObjectiveCausalLink(Base):
    __tablename__ = "objective_causal_links"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    from_obj: Mapped[str] = mapped_column(Text, ForeignKey("objectives.id"), nullable=False)
    to_obj: Mapped[str] = mapped_column(Text, ForeignKey("objectives.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    label: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("from_obj", "to_obj", name="uq_causal_link"),
        Index("idx_causal_links_from", "from_obj"),
        Index("idx_causal_links_to", "to_obj"),
    )


class Attribute(Base):
    __tablename__ = "attributes"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    objective_id: Mapped[str] = mapped_column(Text, ForeignKey("objectives.id"), nullable=False, unique=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    attr_type: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    scale_description: Mapped[str] = mapped_column(Text, default="", server_default="")
    prop_unambiguous: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    prop_comprehensive: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    prop_direct: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    prop_operational: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    prop_understandable: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)


class AttributeLevel(Base):
    __tablename__ = "attribute_levels"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    attribute_id: Mapped[str] = mapped_column(Text, ForeignKey("attributes.id"), nullable=False)
    label: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)


class Alternative(Base):
    __tablename__ = "alternatives"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", server_default="")
    source: Mapped[str] = mapped_column(Text, default="initial", server_default="initial")
    source_stakeholder_id: Mapped[str | None] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=True)
    is_status_quo: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    order_index: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)
    deleted: Mapped[int] = mapped_column(Integer, default=0, server_default="0")

    __table_args__ = (
        Index("idx_alternatives_project", "project_id"),
    )


class AlternativeConsequence(Base):
    __tablename__ = "alternative_consequences"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    alternative_id: Mapped[str] = mapped_column(Text, ForeignKey("alternatives.id"), nullable=False)
    objective_id: Mapped[str] = mapped_column(Text, ForeignKey("objectives.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    value_text: Mapped[str] = mapped_column(Text, default="", server_default="")
    attribute_level_id: Mapped[str | None] = mapped_column(Text, ForeignKey("attribute_levels.id"), nullable=True)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("alternative_id", "objective_id", name="uq_alt_consequence"),
        Index("idx_consequences_alternative", "alternative_id"),
    )


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    session_id: Mapped[str] = mapped_column(Text, ForeignKey("chat_sessions.id"), nullable=False)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    timestamp: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    stakeholder_id: Mapped[str | None] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    phase: Mapped[int | None] = mapped_column(Integer, nullable=True)
    step: Mapped[str | None] = mapped_column(Text, nullable=True)
    quick_actions_json: Mapped[str] = mapped_column(Text, default="[]", server_default="[]")

    __table_args__ = (
        Index("idx_chat_messages_project", "project_id", "timestamp"),
    )


class StepCompletion(Base):
    __tablename__ = "step_completions"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    step_id: Mapped[str] = mapped_column(Text, nullable=False)
    completed_at: Mapped[str] = mapped_column(Text, nullable=False)
    data_json: Mapped[str] = mapped_column(Text, default="{}", server_default="{}")
    notes: Mapped[str] = mapped_column(Text, default="", server_default="")

    __table_args__ = (
        UniqueConstraint("project_id", "step_id", name="uq_step_completion"),
        Index("idx_step_completions_project", "project_id"),
    )


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(Text, primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[str] = mapped_column(Text, nullable=False)


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    stakeholder_id: Mapped[str | None] = mapped_column(Text, ForeignKey("stakeholders.id"), nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    doc_type: Mapped[str] = mapped_column(Text, nullable=False)
    date_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(Text, default="", server_default="")
    content_text: Mapped[str] = mapped_column(Text, default="", server_default="")
    file_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("idx_documents_project", "project_id"),
        Index("idx_documents_stakeholder", "stakeholder_id"),
    )


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    project_id: Mapped[str] = mapped_column(Text, ForeignKey("projects.id"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, default="idle", server_default="idle")
    report_md: Mapped[str] = mapped_column(Text, default="", server_default="")
    created_at: Mapped[str] = mapped_column(Text, nullable=False)
    completed_at: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_pipeline_runs_project", "project_id"),
    )


class PipelineTurn(Base):
    __tablename__ = "pipeline_turns"

    id: Mapped[str] = mapped_column(Text, primary_key=True)
    run_id: Mapped[str] = mapped_column(Text, ForeignKey("pipeline_runs.id"), nullable=False)
    agent_name: Mapped[str] = mapped_column(Text, nullable=False)
    phase_label: Mapped[str] = mapped_column(Text, nullable=False)
    turn_type: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, default="", server_default="")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)

    __table_args__ = (
        Index("idx_pipeline_turns_run", "run_id"),
    )
