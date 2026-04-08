# VFT Studio — Data Model

**Versão:** 0.1.0-spec | **Data:** 2026-04-07

---

## Localização do Banco de Dados

```
~/VFTStudio/
├── db.sqlite           # Banco principal
├── documents/          # Arquivos de proxy documental
│   └── {stakeholder_id}/
│       ├── {doc_uuid}.pdf
│       ├── {doc_uuid}.txt
│       └── {doc_uuid}.png
├── exports/            # Relatórios exportados
│   ├── {project_id}/
│   │   ├── report_YYYYMMDD.md
│   │   └── report_YYYYMMDD.pdf
└── backups/            # Auto-backups (rotação 7 dias)
    └── db_YYYYMMDD.sqlite
```

---

## Schema Completo (SQLAlchemy ORM)

### Tabela: `projects`

```sql
CREATE TABLE projects (
    id                          TEXT PRIMARY KEY,  -- UUID v4
    name                        TEXT NOT NULL,
    description                 TEXT DEFAULT '',
    context_notes               TEXT DEFAULT '',   -- Notas livres sobre contexto
    created_at                  TEXT NOT NULL,     -- ISO 8601
    updated_at                  TEXT NOT NULL,
    phase_status                INTEGER DEFAULT 1, -- 1, 2, 3
    current_step                TEXT DEFAULT '1.1', -- ex: "2.14"
    
    -- Configuração do processo
    qualitative_modeling_tech   TEXT DEFAULT 'platinum', 
                                -- 'platinum'|'gold'|'silver'|'combined'
    stakeholder_config          TEXT DEFAULT 'single_dm_single',
                                -- 'single_dm_single'|'single_dm_multi'|'multi_dm_multi'
    
    -- Initial Decision Frame (Fase 1)
    idf_purpose                 TEXT DEFAULT '',
    idf_perspective             TEXT DEFAULT '',
    idf_scope                   TEXT DEFAULT '',
    idf_documented_at           TEXT,              -- Timestamp do Passo 1.6
    
    -- Decision Statement (Passo 1.7)
    decision_statement          TEXT DEFAULT '',
    decision_statement_validated INTEGER DEFAULT 0, -- Boolean
    
    -- Documentos organizacionais (para Gold/Combined Standard)
    org_documents_text          TEXT DEFAULT '',   -- Conteúdo dos docs inseridos
    
    -- Status de completude
    phase1_completed            INTEGER DEFAULT 0,
    phase2_completed            INTEGER DEFAULT 0,
    phase3_completed            INTEGER DEFAULT 0,
    
    -- Arquivamento
    archived                    INTEGER DEFAULT 0,
    archived_at                 TEXT
);
```

### Tabela: `stakeholders`

```sql
CREATE TABLE stakeholders (
    id                    TEXT PRIMARY KEY,   -- UUID v4
    project_id            TEXT NOT NULL REFERENCES projects(id),
    name                  TEXT NOT NULL,
    role                  TEXT NOT NULL,       
                          -- 'decision_authority'|'customer'|'owner'|'user'|'consumer'
    is_decision_maker     INTEGER DEFAULT 0,  -- Boolean
    profile               TEXT DEFAULT '',    -- Descrição para IA simular
    interests             TEXT DEFAULT '',    -- Interesses na decisão
    
    -- Modo de elicitação (RF-13.1)
    elicitation_mode      TEXT DEFAULT 'interview',
                          -- 'interview'     → entrevista real ou simulada por IA
                          -- 'document_analysis' → proxy por documentos (RF-13)
                          -- 'simulated'     → simulação pura por IA sem entrevista real
    
    interview_status      TEXT DEFAULT 'pending', -- 'pending'|'in_progress'|'completed'
    interview_notes       TEXT DEFAULT '',    -- Notas brutas da entrevista
    
    -- Transcript de entrevista virtual (preenchido pelo ANALYST)
    virtual_transcript_json TEXT DEFAULT '[]', -- Array de { device_id, question, answer, evidence[], confidence }
    virtual_transcript_reviewed INTEGER DEFAULT 0, -- Usuário confirmou a revisão
    
    order_index           INTEGER DEFAULT 0,  -- Ordem de exibição
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
);
```

### Tabela: `stakeholder_documents`

```sql
CREATE TABLE stakeholder_documents (
    id                TEXT PRIMARY KEY,   -- UUID v4
    stakeholder_id    TEXT NOT NULL REFERENCES stakeholders(id),
    project_id        TEXT NOT NULL REFERENCES projects(id),
    
    -- Metadados do documento (RF-13.4)
    title             TEXT NOT NULL,
    doc_type          TEXT NOT NULL,
                      -- 'official_speech'|'policy_document'|'report'|'academic_paper'|
                      --  'news_article'|'minutes'|'legal_text'|'other'
    source_date       TEXT,             -- ISO date da publicação/emissão (pode ser NULL)
    source_author     TEXT DEFAULT '',  -- Autor ou organização emissora
    source_url        TEXT DEFAULT '',  -- URL de referência (opcional)
    
    -- Conteúdo
    content_type      TEXT NOT NULL,
                      -- 'file'   → arquivo físico em ~/VFTStudio/documents/{stakeholder_id}/
                      -- 'text'   → texto colado diretamente (sem arquivo)
                      -- 'image'  → imagem enviada à API multimodal
    file_path         TEXT DEFAULT '',  -- Caminho relativo em ~/VFTStudio/documents/
    file_mime         TEXT DEFAULT '',  -- MIME type: application/pdf, image/png, text/plain, etc.
    file_size_bytes   INTEGER DEFAULT 0,
    raw_text          TEXT DEFAULT '',  -- Para content_type='text' ou texto extraído de PDF
    
    -- Estado de análise
    analysis_status   TEXT DEFAULT 'pending',
                      -- 'pending'|'processing'|'completed'|'failed'
    analysis_error    TEXT DEFAULT '',
    
    -- Resultados da análise (preenchidos pelo ANALYST)
    extracted_values_json TEXT DEFAULT '[]',
                      -- Array de { value, source_quote, confidence, is_inference }
    contradictions_json   TEXT DEFAULT '[]',
                      -- Array de { description, doc_a_quote, doc_b_quote } para conflitos inter-documentos
    
    order_index       INTEGER DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
```

### Tabela: `objectives`

```sql
CREATE TABLE objectives (
    id                      TEXT PRIMARY KEY,   -- UUID v4
    project_id              TEXT NOT NULL REFERENCES projects(id),
    statement               TEXT NOT NULL,      -- "Verbo + Objeto"
    source_stakeholder_id   TEXT REFERENCES stakeholders(id),
    raw_value               TEXT DEFAULT '',    -- Valor original antes da conversão
    
    -- Categorização
    type                    TEXT DEFAULT 'uncategorized',
                            -- 'strategic'|'fundamental'|'means'|'other'|'uncategorized'
    
    -- WITI Test (Passo 2.14)
    witi_question           TEXT DEFAULT '',
    witi_answer             TEXT DEFAULT '',
    witi_classification     TEXT DEFAULT '',    -- 'means'|'fundamental_candidate'|'strategic'|'other'
    witi_implies_objective_id TEXT REFERENCES objectives(id), -- Se MEANS
    
    -- Fundamental Objective Candidate
    is_fundamental_candidate INTEGER DEFAULT 0,
    
    -- Control of Consequences (Passo 2.15)
    coc_q1_answer           TEXT DEFAULT '',
    coc_q1_result           TEXT DEFAULT '',    -- 'pass'|'fail'|'pending'
    coc_q2_answer           TEXT DEFAULT '',
    coc_q2_result           TEXT DEFAULT '',
    coc_refinement_needed   INTEGER DEFAULT 0,
    refined_statement       TEXT,               -- Enunciado refinado após CoC
    
    -- Hierarquia
    parent_id               TEXT REFERENCES objectives(id), -- Para hierarquia de fundamentais
    hierarchy_level         INTEGER DEFAULT 0,
    
    order_index             INTEGER DEFAULT 0,
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL,
    
    -- Soft delete para manter histórico
    deleted                 INTEGER DEFAULT 0,
    deleted_at              TEXT
);
```

### Tabela: `objective_causal_links`

```sql
CREATE TABLE objective_causal_links (
    id          TEXT PRIMARY KEY,
    from_obj    TEXT NOT NULL REFERENCES objectives(id), -- Objetivo de MEIOS
    to_obj      TEXT NOT NULL REFERENCES objectives(id), -- Objetivo mais fundamental
    project_id  TEXT NOT NULL REFERENCES projects(id),
    label       TEXT DEFAULT '',  -- Descrição da relação causal (opcional)
    created_at  TEXT NOT NULL,
    
    UNIQUE(from_obj, to_obj)
);
```

### Tabela: `attributes`

```sql
CREATE TABLE attributes (
    id                      TEXT PRIMARY KEY,   -- UUID v4
    objective_id            TEXT NOT NULL UNIQUE REFERENCES objectives(id),
    project_id              TEXT NOT NULL REFERENCES projects(id),
    
    -- Tipo (Keeney, 1992)
    attr_type               TEXT NOT NULL,
                            -- 'natural'|'constructed'|'proxy'
    
    description             TEXT NOT NULL,      -- Descrição do atributo
    scale_description       TEXT DEFAULT '',    -- Como medir/interpretar a escala
    
    -- Verificação das 5 propriedades (Keeney & Gregory, 2005)
    prop_unambiguous        INTEGER DEFAULT 0,
    prop_comprehensive      INTEGER DEFAULT 0,
    prop_direct             INTEGER DEFAULT 0,
    prop_operational        INTEGER DEFAULT 0,
    prop_understandable     INTEGER DEFAULT 0,
    
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL
);
```

### Tabela: `attribute_levels`

```sql
CREATE TABLE attribute_levels (
    id              TEXT PRIMARY KEY,
    attribute_id    TEXT NOT NULL REFERENCES attributes(id),
    label           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    order_index     INTEGER NOT NULL,
    created_at      TEXT NOT NULL
);
```

### Tabela: `alternatives`

```sql
CREATE TABLE alternatives (
    id                      TEXT PRIMARY KEY,   -- UUID v4
    project_id              TEXT NOT NULL REFERENCES projects(id),
    name                    TEXT NOT NULL,
    description             TEXT DEFAULT '',
    source                  TEXT DEFAULT 'initial', 
                            -- 'initial'|'elicited'|'decision_opportunity'
    source_stakeholder_id   TEXT REFERENCES stakeholders(id),
    is_status_quo           INTEGER DEFAULT 0,  -- Alternativa "não fazer nada"
    order_index             INTEGER DEFAULT 0,
    created_at              TEXT NOT NULL,
    updated_at              TEXT NOT NULL,
    deleted                 INTEGER DEFAULT 0
);
```

### Tabela: `alternative_consequences`

```sql
CREATE TABLE alternative_consequences (
    id              TEXT PRIMARY KEY,
    alternative_id  TEXT NOT NULL REFERENCES alternatives(id),
    objective_id    TEXT NOT NULL REFERENCES objectives(id),
    project_id      TEXT NOT NULL REFERENCES projects(id),
    value_text      TEXT DEFAULT '',    -- Descrição qualitativa da consequência
    attribute_level_id TEXT REFERENCES attribute_levels(id),  -- Nível do atributo
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL,
    
    UNIQUE(alternative_id, objective_id)
);
```

### Tabela: `chat_sessions`

```sql
CREATE TABLE chat_sessions (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id),
    created_at  TEXT NOT NULL,
    is_active   INTEGER DEFAULT 1
);
```

### Tabela: `chat_messages`

```sql
CREATE TABLE chat_messages (
    id              TEXT PRIMARY KEY,   -- UUID v4
    session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
    project_id      TEXT NOT NULL REFERENCES projects(id),
    timestamp       TEXT NOT NULL,
    
    -- Identificação do remetente
    role            TEXT NOT NULL,
                    -- 'user'|'facilitator'|'phase1_specialist'|'phase2_specialist'|
                    --  'phase3_specialist'|'stakeholder'|'documentation'
    agent_name      TEXT NOT NULL,      -- Ex: "ARIA", "AXIOM", nome do stakeholder
    stakeholder_id  TEXT REFERENCES stakeholders(id),  -- Se role=stakeholder
    
    -- Conteúdo
    content         TEXT NOT NULL,      -- Markdown
    
    -- Contexto de origem
    phase           INTEGER,
    step            TEXT,               -- "2.14"
    
    -- Quick actions extraídas da resposta
    quick_actions_json TEXT DEFAULT '[]' -- JSON array de QuickAction
);
```

### Tabela: `step_completions`

```sql
CREATE TABLE step_completions (
    id          TEXT PRIMARY KEY,
    project_id  TEXT NOT NULL REFERENCES projects(id),
    step_id     TEXT NOT NULL,              -- "1.1", "2.14", etc.
    completed_at TEXT NOT NULL,
    data_json   TEXT DEFAULT '{}',          -- Dados coletados no passo
    notes       TEXT DEFAULT '',
    
    UNIQUE(project_id, step_id)
);
```

### Tabela: `app_settings`

```sql
CREATE TABLE app_settings (
    key     TEXT PRIMARY KEY,
    value   TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
-- Rows padrão:
-- ('language', 'pt-BR')
-- ('default_model_facilitator', 'claude-opus-4-6')
-- ('default_model_specialist', 'claude-sonnet-4-6')
-- ('show_process_hints', '1')
-- ('data_directory', '~/VFTStudio')
```

---

## Repository Pattern

```python
# backend/db/repository.py

from typing import Generic, TypeVar, Type, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import uuid
from datetime import datetime, timezone

T = TypeVar('T')

class BaseRepository(Generic[T]):
    def __init__(self, model: Type[T], session: AsyncSession):
        self._model = model
        self._session = session
    
    async def get(self, id: str) -> Optional[T]:
        result = await self._session.execute(
            select(self._model).where(self._model.id == id)
        )
        return result.scalar_one_or_none()
    
    async def list(self, **filters) -> List[T]:
        stmt = select(self._model)
        for key, val in filters.items():
            stmt = stmt.where(getattr(self._model, key) == val)
        result = await self._session.execute(stmt)
        return result.scalars().all()
    
    async def create(self, **data) -> T:
        obj = self._model(
            id=str(uuid.uuid4()),
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
            **data
        )
        self._session.add(obj)
        await self._session.flush()
        return obj
    
    async def update(self, id: str, **data) -> Optional[T]:
        # NEVER mutate in place — create new state via update statement
        data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await self._session.execute(
            update(self._model)
            .where(self._model.id == id)
            .values(**data)
        )
        return await self.get(id)
    
    async def soft_delete(self, id: str) -> None:
        await self.update(id, deleted=True, deleted_at=datetime.now(timezone.utc).isoformat())
```

---

## Migrations (Alembic)

```python
# alembic/env.py — configuração padrão
# Cada migration em backend/db/migrations/versions/

# Exemplo de migration inicial:
# 001_initial_schema.py
# Cria todas as tabelas acima
```

---

## Índices para Performance

```sql
CREATE INDEX idx_stakeholders_project ON stakeholders(project_id);
CREATE INDEX idx_stakeholder_docs_stakeholder ON stakeholder_documents(stakeholder_id);
CREATE INDEX idx_stakeholder_docs_project ON stakeholder_documents(project_id);
CREATE INDEX idx_objectives_project ON objectives(project_id);
CREATE INDEX idx_objectives_type ON objectives(project_id, type);
CREATE INDEX idx_causal_links_from ON objective_causal_links(from_obj);
CREATE INDEX idx_causal_links_to ON objective_causal_links(to_obj);
CREATE INDEX idx_alternatives_project ON alternatives(project_id);
CREATE INDEX idx_consequences_alternative ON alternative_consequences(alternative_id);
CREATE INDEX idx_chat_messages_project ON chat_messages(project_id, timestamp);
CREATE INDEX idx_step_completions_project ON step_completions(project_id);
```
