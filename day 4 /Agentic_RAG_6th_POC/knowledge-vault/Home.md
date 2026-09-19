# AIDLC — Knowledge Vault Home

Entry point for browsing this project. Every link below points at the actual source-of-truth doc elsewhere in the repo (or another vault note) — nothing here duplicates their content.

## Project overview

- [[README]] — root project README: four commitments, evidence domains, human-in-the-loop gates, delegation table, provider fallback.
- [[CLAUDE.md]] — pointer instructions for Claude Code sessions working in this repo.

## Governing principles (the skill)

- [[SKILL]] — `Pharma RAG Principles`, the skill encoding the four commitments and how each is mechanically enforced.
- [[allowlist]] — per-domain host rationale and how to propose an allowlist change.
- [[output-schema]] — field-by-field walkthrough of the structured response schema.
- [[escalation-rules]] — decision table mapping evidence conditions to `answer_status`/`escalation`.
- [[domain-routing]] — the agent-driven domain classification rule.
- [[agent-context-contract]] — minimum context each subagent needs from a caller.
- [[context-management]] — the 8-10-turn / 12-15%-summary-cap context-trimming policy.

## Roadmap and decisions

- [[Roadmap]] — the 20-step build plan and current status.
- [[Architecture-Decisions]] — key design decisions and why they were made.

## Subagents

- `backend`, `frontend`, `p3-triage` — defined at `.claude/agents/*.md`. See the [[README]] delegation table for routing.
