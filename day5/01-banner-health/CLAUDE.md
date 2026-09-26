# CLAUDE.md — Banner Health Case Study

This folder contains the HLD/LLD design for an AI clinical assistant that drafts documentation and summarizes patient records at the point of care, so physicians spend less time on paperwork (Banner Health case study: reducing physician workload at scale).

**Scope boundary**: This folder is self-contained. Do not read or reference any other case-study folder under `day5/` when working here — treat this design as independent.

**Tech stack for this case study**: Python 3.11 + FastAPI, Anthropic Claude API for summarization/drafting, `fhir.resources` for EHR integration, PostgreSQL for draft/session state. See the "Tech stack & skills" section in `PLAN.md` for rationale.

**Source of truth**: `PLAN.md` in this folder holds the architecture and design decisions. Any implementation work here should follow it.
