# CLAUDE.md — Commure Case Study

This folder contains the HLD/LLD design for a pipeline that automates clinical documentation generation directly from patient encounters, saving clinicians millions of hours at scale (Commure case study: clinical documentation automation at scale).

**Scope boundary**: This folder is self-contained. Do not read or reference any other case-study folder under `day5/` when working here — treat this design as independent.

**Tech stack for this case study**: Python 3.11 + FastAPI (WebSocket streaming), Whisper-based streaming ASR with speaker diarization, Anthropic Claude API for note generation, PostgreSQL + S3-compatible object storage, a per-facility EHR adapter registry for writeback at scale. See "Tech stack & skills" in `PLAN.md` for rationale.

**Source of truth**: `PLAN.md` in this folder holds the architecture and design decisions. Any implementation work here should follow it.
