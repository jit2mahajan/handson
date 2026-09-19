---
name: Pharma RAG Principles
description: Use for/when any retrieval, grounding, output-formatting, domain-routing, or failure-handling work in this repo (backend retrieval clients, response assembly, schema validation, escalation logic, triage review). Enforces the four commitments this project is built on — approved-sources-only, every claim grounded, structured output, graceful failure — and states how each is mechanically enforced, not just documented.
---

# Pharma RAG Principles

This project (AIDLC — Agentic RAG for Literature Review & Drug-Discovery Intelligence) supports discovery and synthesis for a pharma R&D team. It does **not** make the scientific decision. Every piece of retrieval, grounding, or output-formatting code in this repo is governed by four commitments, each backed by a mechanical enforcement point — not a convention anyone has to remember.

| Commitment | Enforcement mechanism |
|---|---|
| Retrieve only from approved sources | `check_allowlist_retrieval.py` (PreToolUse hook) gates every `WebFetch`/`Bash`/`mcp__fetch__fetch` call against `data/allowlist/sources.json`; backend code re-checks the same file as defense in depth |
| Ground every claim | `data/schema/response_schema.json` — `citations` on every claim has `"minItems": 1`; a claim with zero citations cannot validate |
| Return structured output | All responses must validate against `data/schema/response_schema.json` before being logged or shown — never free text |
| Fail gracefully | `references/escalation-rules.md` decision table — weak/conflicting/blocked evidence downgrades to `insufficient_evidence` or `escalated`, never a fabricated answer |

## The live allowlist

!`cat "data/allowlist/sources.json"`

## Reference docs

- `references/allowlist.md` — why each domain's hosts are listed, and how to propose changes
- `references/output-schema.md` — field-by-field walkthrough of the response schema, with worked examples
- `references/escalation-rules.md` — the decision table for `answered` / `insufficient_evidence` / `escalated`
- `references/domain-routing.md` — the rule for classifying a question against the four evidence domains before retrieving
- `references/agent-context-contract.md` — what a caller must pass each subagent (backend/frontend/p3-triage), since none of them see the calling session's history
- `references/context-management.md` — how subagents keep long-running context bounded

## Honesty rules

- Never claim a citation is grounded in an evidence domain it doesn't belong to — the domain tag on a citation must match the host's actual entry in `data/allowlist/sources.json`.
- Never widen the allowlist or relax the schema (e.g. dropping `minItems: 1`) to make a task easier to complete. If a source is genuinely needed and missing, propose the addition as a reviewed edit to `data/allowlist/sources.json` — don't fetch from it first and rationalize it after.
- If a claim in `logs/responses.jsonl` disagrees with what `.claude/audit/retrieval_log.jsonl` actually recorded, trust the audit log — it's the ground truth of what was actually retrieved, not what a response claims was retrieved.
- A blocked or asked-and-rejected retrieval is a reason to return `insufficient_evidence` or `escalated`, never a reason to substitute an unapproved source or invent the content.
