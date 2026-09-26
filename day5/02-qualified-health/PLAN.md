# Qualified Health — Life-Saving Treatment Candidate Identification

## Problem Statement

Care teams need to identify patients for life-saving treatments, but eligible candidates are scattered across large, fragmented patient populations and inconsistent medical record sources. The goal is a system that screens large patient populations against fragmented medical records to surface candidates for evidence-based interventions.

- **User**: care coordinator / population health team / specialist referral team
- **Success metric**: number of true-eligible candidates surfaced, with low false-negative rate (missing an eligible patient is the costly failure mode)

## Goals / Non-Goals

**Goals**
- Ingest and reconcile patient data from multiple, inconsistent source systems (EHR, labs, claims, referral notes)
- Apply evidence-based eligibility criteria (clinical guidelines) to rank/flag candidates for a given intervention
- Surface flagged candidates with the supporting evidence trail to a human reviewer

**Non-Goals**
- Automatically enrolling or contacting patients without human review
- Replacing clinical guideline authorship — criteria are configured/curated, not invented by the model
- Real-time point-of-care use (this is a population-level, batch/continuous screening system)

## High-Level Design (HLD)

**Actors & external systems**
- Multiple source EHRs / claims systems / lab systems (heterogeneous formats, some HL7v2, some FHIR, some flat files)
- Care coordinator (reviews and acts on flagged candidates)
- Clinical guideline source (defines eligibility criteria per intervention)

**System boundary**: a population-level screening pipeline that sits over multiple data sources, independent of any single EHR.

**Data flow**
1. Multi-source ingestion & normalization into a unified patient record
2. Record linkage/deduplication across sources (same patient, different IDs)
3. Eligibility rules engine evaluates each unified record against intervention criteria
4. Candidates ranked and surfaced with evidence trail to care coordinator dashboard
5. Coordinator disposition (approved / rejected / needs more info) fed back for QA

## Low-Level Design (LLD)

**Components**
- `source-connectors`: per-source adapters (FHIR, HL7v2, flat-file/CSV) that normalize into a common schema
- `record-linkage-service`: probabilistic patient matching across sources (name/DOB/MRN fuzzy matching) to build a unified record
- `eligibility-engine`: evaluates unified records against configurable, evidence-based criteria sets (structured rules + LLM-assisted evidence extraction from unstructured notes)
- `evidence-extraction-service`: uses the LLM to pull supporting facts (diagnosis dates, lab values, prior treatments) out of unstructured clinical notes when structured data is incomplete
- `candidate-api`: serves ranked candidates + evidence trail to the coordinator dashboard, records disposition

**Key data models** (conceptual)
- `UnifiedPatientRecord { patient_key, source_ids[], demographics, conditions[], meds[], labs[], notes[] }`
- `EligibilityCriteria { intervention_id, rules[], required_evidence[] }`
- `Candidate { patient_key, intervention_id, score, evidence[], status: flagged|approved|rejected }`

**API surface**
- `POST /ingest/{source}` — source-connector intake
- `POST /screen/{intervention_id}` — run eligibility engine over the current unified population
- `GET /candidates?intervention_id=` — ranked candidate list with evidence
- `PATCH /candidates/{patient_key}` — coordinator disposition

**Core pipeline**
1. Ingest from each source connector on a schedule (batch) or streaming feed
2. Normalize + record-link into `UnifiedPatientRecord`s (dedupe across sources)
3. For each active `EligibilityCriteria`, run structured rule checks first; where evidence is missing/unstructured, invoke `evidence-extraction-service` (Claude) against notes to fill gaps
4. Score and rank candidates; write to `candidate-api` store
5. Coordinator reviews; disposition logged for periodic criteria/model QA

**Tech stack & skills**
- Python 3.11 + FastAPI for services; Pydantic for schemas
- Anthropic Claude API for evidence extraction from unstructured clinical notes
- PostgreSQL + `pgvector` — relational store for structured records, vector index over note embeddings to retrieve relevant note passages for a given criterion (RAG-style evidence lookup)
- `fhir.resources` + `hl7` (HL7v2 parsing) + CSV/flat-file adapters for the heterogeneous source connectors
- `Prefect` for scheduled/batch ingestion and screening runs across a large population
- Record linkage: `splink` or equivalent probabilistic matching (Python) for cross-source dedup
- Docker Compose (API, worker, Postgres) for demo deployment

**Quality control**
- False-negative bias explicitly favored: eligibility thresholds tuned to over-flag, human reviewer is the final filter
- Every flagged candidate must carry a traceable evidence list (source + snippet), no "black box" score alone

**Compliance/security note**
- Cross-source patient matching handles PHI at scale — encrypt at rest/in transit, minimize retained raw notes beyond what's needed for the evidence trail
- Audit log of every screening run, criteria version used, and coordinator disposition

## Open Questions / Assumptions

- Assumes access to multiple source systems is negotiated/available (data-sharing agreements out of scope for this design)
- Assumes eligibility criteria are maintained by clinical stakeholders, not derived by the model
