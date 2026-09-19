---
name: Governance Principles
description: Use for/when any retrieval, grounding, output-formatting, domain-routing, or failure-handling work in this repo. Enforces four commitments — approved-sources-only, every claim grounded, structured output, graceful failure — each backed by a mechanical enforcement point, not just a convention.
---

# Governance Principles

| Commitment | Enforcement mechanism |
|---|---|
| Retrieve only from approved sources | `check_allowlist_retrieval.py` (PreToolUse hook) gates every `WebFetch`/`Bash`/`mcp__fetch__fetch` call against `data/allowlist/sources.json` |
| Ground every claim | `data/schema/response_schema.json` — `citations.minItems: 1` |
| Return structured output | Every response must validate against the schema above before being logged or shown |
| Fail gracefully | Weak/conflicting/blocked evidence downgrades to `insufficient_evidence`/`escalated`, never a fabricated answer — see `references/escalation-rules.md` |

## The live allowlist

!`cat "data/allowlist/sources.json"`

## Reference docs

- `references/allowlist.md`
- `references/output-schema.md`
- `references/escalation-rules.md`

## Honesty rules

- Never widen the allowlist or relax the schema to make a task easier — propose changes as reviewed edits.
- If a claim disagrees with `.claude/audit/retrieval_log.jsonl`, trust the audit log.
- A blocked/rejected retrieval is a reason to return `insufficient_evidence`/`escalated`, never a reason to substitute an unapproved source.
