# Qualified Health — Knowledge Vault

Obsidian readme-mode entry point. This vault is a map, not a copy — every link below points to the
real source-of-truth doc elsewhere in this repo. Nothing here duplicates their content; open the
linked file for the actual detail.

## Problem & design

- [[PLAN]] — HLD/LLD: the original architecture and design decisions for this case study.
- [[CLAUDE.md]] — scope boundary and tech-stack rationale for this folder.
- [[detailed-plan]] — the 20-step AIDLC build plan and its per-step status, plus every
  implementation-detail/verification addendum written during the build (Stage B/C).

## Governance (Stage A)

- [[agent-context-contract]] — how subagents get isolated, scoped context instead of the full
  conversation.
- [[context-management]] — context-trimming approach for long-running sessions.
- `backend`, `frontend`, `p3-triage` — subagents defined at `.claude/agents/*.md` (ownership:
  API/DB/eligibility engine/evidence extraction/chatbot/load test; dashboard HTML/CSS/JS;
  review-and-report, respectively). See the [[README]] delegation table for routing.

## Runtime & operations

- [[README]] — how to run the stack locally (`docker compose`), API surface, load testing.
- [[Architecture-Decisions]] — vault-native: short rationale-per-decision entries, cross-linking
  back to where each decision is actually implemented.
- [[Roadmap]] — vault-native: a step-status table mirroring [[detailed-plan]], for a
  vault-only view of what's done.

## Reviews & reports

- `reports/code-review/2026-09-26-code-review.md` — Step 12's manual code review (no
  `/code-review` plugin installed for this project): 4 findings, all fixed and verified.
- `reports/v1_vs_v2_comparison.md` / `.pdf` — earlier V1-vs-V2 comparison report.

## Convention note

This vault's structure (Home → Architecture-Decisions → Roadmap, `[[wikilinks]]` instead of copied
text) is adapted from the sibling `day 4 /Agentic_RAG_6th_POC` project's own knowledge vault — see
`detailed-plan.md`'s preamble, which already documents this reuse for the governance scaffold
generally.
