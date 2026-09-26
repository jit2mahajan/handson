# CLAUDE.md — Elation Health Case Study

This folder contains the HLD/LLD design for a primary care EHR platform feature that reduces chart review and documentation burden for clinicians (Elation Health case study: 61% less time on chart review).

**Scope boundary**: This folder is self-contained. Do not read or reference any other case-study folder under `day5/` when working here — treat this design as independent.

**Tech stack for this case study**: Python 3.11 + FastAPI, Anthropic Claude API for chart synthesis and note prefill, direct access to the platform's own PostgreSQL-backed chart data (no external integration layer, since this is a native EHR feature). See "Tech stack & skills" in `PLAN.md` for rationale.

**Source of truth**: `PLAN.md` in this folder holds the architecture and design decisions. Any implementation work here should follow it.
