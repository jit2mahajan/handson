# Elation Health — Chart Review Time Reduction in a Primary Care EHR

## Problem Statement

Primary care clinicians spend significant time reviewing charts before and during visits — reading through prior notes, labs, and meds to reconstruct patient context. The goal is a primary care EHR platform feature that reduces chart review and documentation burden for clinicians, targeting a 61% reduction in chart review time.

- **User**: primary care physician / clinician using the EHR day-to-day
- **Success metric**: time spent reviewing a chart before/during a visit

## Goals / Non-Goals

**Goals**
- Surface a prioritized, synthesized view of a patient's chart inline in the EHR (not a separate tool), highlighting what's clinically relevant for the upcoming visit
- Reduce documentation burden by pre-populating note sections from chart context and visit reason
- Integrate tightly with the existing EHR data model (this is a native EHR feature, not a bolt-on)

**Non-Goals**
- Building a new EHR from scratch — this is a feature within Elation's existing EHR platform
- Replacing the clinician's chart review entirely — the goal is prioritization/synthesis, not omission

## High-Level Design (HLD)

**Actors & external systems**
- Clinician (views synthesized chart panel and documentation aids inline in the EHR)
- Elation's own EHR data store (source of truth for chart data — this feature reads/writes within the platform, not across external systems)
- Scheduling module (provides visit context: reason for visit, appointment type)

**System boundary**: a chart-intelligence feature embedded within the existing EHR platform, operating on data already inside the platform.

**Data flow**
1. On chart open (or ahead of a scheduled visit), the feature pulls the patient's chart history and visit context
2. Chart-summarization pipeline ranks/synthesizes relevant history (active problems, recent changes, items relevant to visit reason)
3. Synthesized panel renders inline in the EHR chart view
4. During the visit, documentation aid pre-populates note sections from chart context + visit reason; clinician edits/completes as normal

## Low-Level Design (LLD)

**Components**
- `chart-context-service`: assembles the relevant slice of a patient's chart (problems, meds, labs, recent notes) scoped to what's useful for the current visit reason
- `synthesis-service`: calls the LLM to produce a prioritized, concise chart summary (what changed since last visit, what's relevant to today's visit reason)
- `chart-panel-api`: serves the synthesized panel to the EHR UI, tracks clinician interaction (expanded/dismissed sections) for relevance tuning
- `note-prefill-service`: pre-populates draft note sections from chart context + visit reason, handed to the clinician's existing note-writing flow

**Key data models** (conceptual)
- `ChartContext { patient_id, visit_id, problems[], meds[], recent_labs[], notes_since_last_visit[], visit_reason }`
- `ChartSynthesis { patient_id, visit_id, highlights[], changed_since_last_visit[], relevant_to_visit[] }`
- `NotePrefill { visit_id, sections: {subjective, objective, assessment, plan}, source: chart_context }`

**API surface**
- `GET /chart-context/{patient_id}?visit_id=` — assembled context for a visit
- `GET /chart-synthesis/{visit_id}` — synthesized, prioritized panel content
- `GET /note-prefill/{visit_id}` — pre-populated note sections
- `POST /chart-panel/{visit_id}/feedback` — clinician interaction signal for relevance tuning

**Core pipeline**
1. On visit context available, `chart-context-service` pulls the relevant chart slice directly from the platform's own data store (no external integration needed)
2. `synthesis-service` prompts Claude with the chart slice + visit reason, asking for: what changed since last visit, and what's relevant to today's visit reason — output structured, not free text
3. `chart-panel-api` renders this inline; clinician feedback (dismissed/expanded) is logged and used to periodically tune what counts as "relevant"
4. `note-prefill-service` reuses the same chart context + visit reason to draft note sections, handed into the clinician's existing documentation flow (clinician edits and signs as normal — no bypass of existing sign-off)

**Tech stack & skills**
- Python 3.11 + FastAPI for the backend services; Pydantic for schemas
- Anthropic Claude API for chart synthesis and note-section prefill
- Direct access to the platform's own PostgreSQL-backed chart data (no external FHIR integration needed since this lives inside the EHR)
- No vector DB required for MVP — chart context per visit is a bounded, structured slice rather than a corpus needing semantic search
- Docker Compose for local/demo deployment of these services alongside a mock EHR data store

**Quality control**
- Synthesis output is additive (a panel alongside the full chart), never a replacement for accessing full chart data
- Note prefill is always editable/re-orderable before sign-off; clinician dismiss/edit signals feed a lightweight relevance-tuning loop

**Compliance/security note**
- Since this operates entirely within the existing EHR's data boundary, it inherits the platform's existing PHI access controls and audit logging — this design adds an audit entry for synthesis generation and note prefill acceptance specifically

## Open Questions / Assumptions

- Assumes this is built as a feature within an existing EHR platform (data access, auth, and audit infrastructure already exist) rather than a standalone system
- Assumes visit reason is reliably available from scheduling ahead of the visit; falls back to problem-list-only synthesis if not
