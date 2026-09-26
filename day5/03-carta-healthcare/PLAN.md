# Carta Healthcare — High-Speed, High-Accuracy Clinical Data Extraction

## Problem Statement

Manual abstraction of clinical data from health records (for registries, quality reporting, research) is slow and labor-intensive. The goal is to automate extraction and structuring of clinical data from health records while maintaining 99% accuracy, achieving 66% faster clinical data processing than manual abstraction.

- **User**: clinical data abstractor / registry/quality team (reviews and validates extracted data)
- **Success metric**: throughput (time to process a chart) and accuracy (99% agreement with human abstraction)

## Goals / Non-Goals

**Goals**
- Extract structured data elements (diagnoses, procedures, dates, measurements) from heterogeneous source documents (scanned PDFs, EHR exports, free-text notes)
- Structure extracted elements into a standardized schema (registry-ready / FHIR-shaped)
- Maintain a validation loop that catches low-confidence extractions for human review, preserving the 99% accuracy bar

**Non-Goals**
- Fully unattended abstraction with zero human review — low-confidence extractions are always routed to a human
- Clinical interpretation beyond what's stated in the source document (extraction, not inference)

## High-Level Design (HLD)

**Actors & external systems**
- Source documents: scanned charts (PDF/image), EHR exports (CCD/CDA, FHIR bundles), free-text notes
- Human abstractor (reviews flagged/low-confidence extractions, spot-checks samples)
- Downstream consumer: registry / quality-reporting system that ingests the structured output

**System boundary**: a batch extraction pipeline that turns unstructured/semi-structured source documents into a standardized, structured record set.

**Data flow**
1. Documents land in an intake queue (per-facility batch or continuous feed)
2. OCR/text extraction normalizes each document to text
3. Extraction pipeline pulls structured data elements per a target schema
4. Confidence scoring routes low-confidence elements to human review queue; high-confidence elements pass through
5. Validated structured records are written to the standardized output store for downstream consumption

## Low-Level Design (LLD)

**Components**
- `intake-service`: receives documents (PDF/image/CCD/FHIR), classifies document type, enqueues for processing
- `ocr-service`: converts scanned/image documents to text (layout-aware, preserves tables where possible)
- `extraction-service`: runs the LLM extraction pass against a target schema (per document type) to pull structured fields
- `confidence-scorer`: scores each extracted field (based on model confidence + cross-field consistency checks) and routes below-threshold fields to review
- `review-queue-api`: serves flagged fields to human abstractors, records corrections
- `output-writer`: persists validated structured records in the standardized schema (FHIR-shaped) for downstream registry/quality systems

**Key data models** (conceptual)
- `SourceDocument { doc_id, facility_id, doc_type, raw_text, received_at }`
- `ExtractedRecord { doc_id, schema_version, fields: {field_name: {value, confidence, source_span}} }`
- `ReviewItem { doc_id, field_name, model_value, confidence, human_value, reviewer_id, resolved_at }`

**API surface**
- `POST /documents` — intake a new document
- `GET /extractions/{doc_id}` — retrieve extraction with confidence scores
- `GET /review-queue` — list items needing human review
- `PATCH /review-queue/{item_id}` — submit human correction
- `GET /records?schema=` — pull validated structured records for downstream consumption

**Core pipeline**
1. `intake-service` classifies doc type (discharge summary, path report, etc.) to select the right extraction schema
2. `ocr-service` (for scanned/image input) → normalized text with source-span tracking (so every extracted field can point back to its origin in the document)
3. `extraction-service` prompts Claude per target schema field set, requesting value + source span + self-reported confidence
4. `confidence-scorer` combines model confidence with rule-based cross-checks (e.g., date plausibility, code-set validity) → routes below-threshold fields to `review-queue-api`
5. Once all fields for a record are resolved (auto or human-reviewed), `output-writer` persists the final structured record

**Tech stack & skills**
- Python 3.11 + FastAPI for services; Pydantic for schemas
- Anthropic Claude API for schema-guided extraction from text
- `unstructured` + a layout-aware OCR backend (e.g., `pytesseract` / cloud OCR) for scanned/image documents
- `medspaCy`/`spaCy` for clinical NER as a cross-check signal feeding the confidence scorer
- PostgreSQL + `pgvector` — relational store for records/review queue; vector index to retrieve similar historical extractions as few-shot context, improving consistency
- `Prefect` for the batch intake → extraction → validation pipeline, since throughput at scale is the stated metric
- Docker Compose (API, OCR worker, extraction worker, Postgres) for demo deployment

**Quality control**
- Every field carries a confidence score and a source span (traceable back to the document) — no unexplained values
- Below-threshold fields always route to human review; the 99% accuracy target is a property of the *combined* human+model system, not the model alone
- Periodic sampling of auto-approved (high-confidence) fields for QA audit to catch threshold drift

**Compliance/security note**
- Source documents and extracted PHI encrypted at rest/in transit; retention policy for raw scans separate from structured output
- Audit log of every extraction, confidence score, and any human correction, with reviewer identity

## Open Questions / Assumptions

- Assumes target schemas per document type are predefined by the registry/quality program, not invented per-document
- Assumes OCR quality is sufficient for source documents; very low-quality scans may need a separate escalation path
