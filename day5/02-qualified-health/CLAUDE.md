# CLAUDE.md — Qualified Health Case Study

This folder contains the HLD/LLD design for a system that screens large patient populations against fragmented medical records to surface candidates for evidence-based, life-saving interventions (Qualified Health case study: identifying patients for life-saving treatments).

**Scope boundary**: This folder is self-contained. Do not read or reference any other case-study folder under `day5/` when working here — treat this design as independent.

**Tech stack for this case study**: Python 3.11 + FastAPI, Anthropic Claude API for unstructured-note evidence extraction, PostgreSQL + pgvector for structured records and note retrieval, `fhir.resources`/`hl7`/flat-file connectors for multi-source ingestion, `Prefect` for batch orchestration, probabilistic record linkage for cross-source dedup. See "Tech stack & skills" in `PLAN.md` for rationale.

**Source of truth**: `PLAN.md` in this folder holds the architecture and design decisions. Any implementation work here should follow it.
