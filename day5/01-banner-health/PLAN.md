# Banner Health — AI Clinical Documentation Assistant

## Problem Statement

Physicians at Banner Health spend a disproportionate share of their day on documentation: writing encounter notes, summarizing prior records before a visit, and completing paperwork after. The goal is an AI clinical assistant that drafts documentation and summarizes patient records so physicians spend less time on paperwork and more time with patients, reducing physician workload at scale.

- **User**: attending physician / care team member
- **Success metric**: measurable reduction in documentation/paperwork time per encounter

## Goals / Non-Goals

**Goals**
- Draft encounter notes (SOAP-style) from structured visit inputs and clinician dictation/shorthand
- Summarize a patient's prior chart (recent visits, meds, labs, problem list) before an encounter
- Keep a physician-in-the-loop review/edit/sign-off step before anything is saved to the record

**Non-Goals**
- Replacing physician clinical judgment or auto-signing notes without review
- Real-time diagnosis or treatment recommendation
- Full EHR replacement — this integrates with the existing EHR, it doesn't replace it

## High-Level Design (HLD)

**Actors & external systems**
- Physician (primary user, via EHR-embedded UI or companion app)
- EHR (source of patient record, destination for signed notes)
- Scheduling system (visit context: patient, appointment type, time)

**System boundary**: the AI assistant sits alongside the EHR — it reads patient record data and visit context, and writes back only after physician approval.

**Data flow**
1. Pre-visit: assistant pulls recent chart data from EHR → generates a pre-visit summary → physician reviews before the encounter
2. During/post-visit: physician provides input (dictation, shorthand notes, structured fields) → assistant drafts the encounter note
3. Physician reviews, edits, and signs the draft in the UI
4. Signed note is written back to the EHR via integration API

## Low-Level Design (LLD)

**Components**
- `ingestion-service`: pulls patient record data (FHIR resources) from the EHR for a given patient/encounter
- `summarization-service`: calls the LLM to produce the pre-visit chart summary (structured sections: problems, meds, recent labs, last visit notes)
- `drafting-service`: calls the LLM to turn clinician input (dictation transcript + structured fields) into a SOAP-format draft note
- `review-api`: serves drafts to the physician-facing UI, accepts edits, and records final sign-off
- `writeback-service`: pushes the signed note back to the EHR as a FHIR `DocumentReference`/`Composition` resource

**Key data models** (conceptual)
- `PatientSummary { patient_id, problem_list[], active_meds[], recent_labs[], last_visit_note, generated_at }`
- `EncounterDraft { encounter_id, physician_id, sections: {subjective, objective, assessment, plan}, status: draft|edited|signed, source_transcript }`

**API surface**
- `POST /summaries/{patient_id}` — generate pre-visit summary
- `POST /drafts/{encounter_id}` — generate note draft from input
- `PATCH /drafts/{encounter_id}` — physician edits
- `POST /drafts/{encounter_id}/sign` — finalize and trigger writeback

**Core pipeline**
1. Fetch FHIR resources (Patient, Condition, MedicationRequest, Observation, DocumentReference) via `fhir.resources`
2. Normalize into a compact context window (most-recent-first, deduplicated)
3. Prompt Claude with structured context → summary or SOAP draft
4. Persist draft with status `draft`; UI polls/reviews via `review-api`
5. On sign-off, convert final text to a FHIR `Composition`, write back to EHR

**Tech stack & skills**
- Python 3.11 + FastAPI for all services; Pydantic for the data models above
- Anthropic Claude API for summarization and drafting (structured prompts, not fine-tuning)
- `fhir.resources` for typed FHIR parsing/construction against the EHR
- PostgreSQL for draft/session state; no vector DB needed (context is a single patient's recent record, not a corpus to search)
- Docker Compose for local/demo deployment (API + Postgres)

**Quality control**
- Every draft is explicitly a *draft* until a physician signs it — no auto-write to the chart
- Diff view between AI draft and physician-edited final text, logged for QA sampling

**Compliance/security note**
- PHI stays within the service boundary; encrypted in transit (TLS) and at rest (Postgres encryption)
- Audit log of who generated, edited, and signed each note, with timestamps

## Open Questions / Assumptions

- Assumes EHR exposes a FHIR API for read and DocumentReference/Composition writeback
- Dictation-to-text (ASR) is assumed to happen upstream of `drafting-service` (input is already text)
