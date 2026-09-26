# CLAUDE.md — Carta Healthcare Case Study

This folder contains the HLD/LLD design for a pipeline that automates extraction and structuring of clinical data from health records while maintaining 99% accuracy (Carta Healthcare case study: 66% faster clinical data processing).

**Scope boundary**: This folder is self-contained. Do not read or reference any other case-study folder under `day5/` when working here — treat this design as independent.

**Tech stack for this case study**: Python 3.11 + FastAPI, Anthropic Claude API for schema-guided extraction, OCR (`unstructured`/`pytesseract`) for scanned documents, `medspaCy`/`spaCy` as an NER cross-check, PostgreSQL + pgvector, `Prefect` for the batch pipeline. See "Tech stack & skills" in `PLAN.md` for rationale.

**Source of truth**: `PLAN.md` in this folder holds the architecture and design decisions. Any implementation work here should follow it.
