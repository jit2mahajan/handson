# Commure — Clinical Documentation Automation at Scale

## Problem Statement

Clinicians spend enormous cumulative time writing up patient encounters after the fact. The goal is to automate clinical documentation generation directly from patient encounters (ambient listening during the visit), saving clinicians millions of hours in aggregate, at scale across many facilities and encounter types.

- **User**: clinician (any care setting — primary care, specialty, urgent care)
- **Success metric**: aggregate clinician hours saved; note quality/acceptance rate at scale across many encounters

## Goals / Non-Goals

**Goals**
- Capture patient encounter audio (with consent) and generate a structured clinical note in near real time
- Scale across a high volume of concurrent encounters across many facilities
- Preserve clinician review/edit/sign-off before any note is finalized in the record

**Non-Goals**
- Clinical decision-making or diagnosis from the audio — output is documentation, not a diagnostic tool
- Recording/processing without explicit patient and clinician consent
- Guaranteeing verbatim transcription accuracy as the end product — the end product is a clinically structured note, not a transcript

## High-Level Design (HLD)

**Actors & external systems**
- Clinician + patient (encounter participants, audio source, with consent capture)
- Target EHR (destination for the finalized note — potentially multiple different EHRs across facilities, since this runs "at scale")
- Facility/session management (which encounter, which clinician, which patient, consent status)

**System boundary**: an ambient documentation pipeline that ingests encounter audio and produces a structured note, integrating with (potentially many different) downstream EHRs.

**Data flow**
1. Encounter starts; consent captured; audio streaming begins
2. Streaming ASR transcribes audio in near real time
3. Note-generation pipeline structures the transcript into a clinical note (SOAP or facility-specific format) as the encounter proceeds or immediately after
4. Clinician reviews/edits/signs the generated note
5. Signed note is pushed to the destination EHR via a per-facility integration adapter

## Low-Level Design (LLD)

**Components**
- `consent-session-service`: tracks encounter session state (started, consented, audio active, ended)
- `streaming-asr-service`: real-time speech-to-text on the encounter audio stream, speaker-diarized (clinician vs. patient)
- `note-generation-service`: calls the LLM on the (diarized) transcript to produce a structured clinical note
- `review-api`: serves the generated note to the clinician for edit/sign-off
- `ehr-adapter-registry`: per-facility/per-EHR adapters that translate a signed note into that EHR's writeback format (since this operates "at scale" across many EHRs)

**Key data models** (conceptual)
- `EncounterSession { session_id, facility_id, clinician_id, patient_id, consent_status, started_at, ended_at }`
- `Transcript { session_id, segments: [{speaker, text, start_ts, end_ts}] }`
- `GeneratedNote { session_id, sections: {subjective, objective, assessment, plan}, status: draft|edited|signed }`

**API surface**
- `POST /sessions` — start an encounter session (records consent)
- `WS /sessions/{session_id}/audio` — streaming audio ingest
- `GET /sessions/{session_id}/transcript` — live/near-real-time transcript
- `GET /notes/{session_id}` — generated note draft
- `POST /notes/{session_id}/sign` — finalize, triggers EHR writeback via `ehr-adapter-registry`

**Core pipeline**
1. `consent-session-service` gates audio ingestion on recorded consent — no audio processing begins without it
2. `streaming-asr-service` (Whisper-based streaming ASR) transcribes with speaker diarization
3. `note-generation-service` prompts Claude with the diarized transcript to produce a structured note, mapping clinical statements to the correct SOAP section
4. Clinician reviews via `review-api`; edits/signs
5. On sign, `ehr-adapter-registry` selects the correct facility's EHR adapter and pushes the note (FHIR `Composition` where the target EHR supports FHIR, facility-specific format otherwise)

**Tech stack & skills**
- Python 3.11 + FastAPI (with WebSocket support) for streaming audio ingestion and services
- Whisper-based streaming ASR for transcription with diarization
- Anthropic Claude API for transcript-to-structured-note generation
- PostgreSQL for session/transcript/note state; object storage (S3-compatible) for raw audio retention per facility policy
- `fhir.resources` for the FHIR-capable EHR adapters; adapter pattern (plugin-style) to onboard new facility EHR formats without touching the core pipeline — necessary given the "at scale, many encounters/facilities" framing
- Docker Compose for local/demo deployment (API, ASR worker, note-generation worker, Postgres); horizontal scaling of ASR/note-generation workers is the actual scale lever in production (noted, not built out here)

**Quality control**
- Notes are always clinician-reviewed and signed before EHR writeback — no autonomous finalization
- Diarization errors (misattributed speaker) are a known failure mode — note-generation prompts are structured to flag low-confidence attributions for clinician attention rather than silently guessing

**Compliance/security note**
- Explicit, recorded consent gates all audio capture; audio retention policy configurable per facility/regulation
- PHI (audio, transcript, note) encrypted at rest/in transit; audit log of consent, generation, edits, and sign-off per session

## Open Questions / Assumptions

- Assumes consent capture and recording-eligibility rules are handled at the session layer, before this design's pipeline is invoked
- Assumes "at scale across many facilities" implies multiple target EHR formats, hence the adapter-registry pattern rather than a single hardcoded integration
