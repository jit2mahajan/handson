# Architecture decisions

Key choices made while building AIDLC's governance layer, and why. See [[Home]] to navigate back.

## Hooks ask, they don't silently deny

`check_allowlist_retrieval.py` returns `permissionDecision: "ask"` for an unlisted source, not an auto-deny. A human decides case-by-case whether a one-time exception is warranted, instead of the hook silently blocking retrieval outright. See [[allowlist]].

## Single allowlist and schema file, two enforcement points

`data/allowlist/sources.json` and `data/schema/response_schema.json` are each a single file, read by both the Claude Code hooks (for development-time tool calls) and the running application's own code (for its runtime HTTP requests) — and, as of step 14, also by the `pharma-governance-mcp` server. Defense in depth: the hook doesn't cover a deployed app's own `requests.get()` calls, so the same check has to also live in application code.

## Structural grounding via `citations.minItems: 1`

Every claim in the response schema requires at least one citation. This makes an ungrounded claim a schema-validation failure, not a review-time judgment call. See [[output-schema]].

## Domain routing is agent-driven, not fixed code paths

The four evidence domains are not four hardcoded retrieval modules that all fire on every query. `backend` classifies each question against the domains first and retrieves only from the domain(s) that actually apply — a query can span more than one, but each resulting claim still carries exactly one domain tag. See [[domain-routing]].

## Draft-then-final for triage reports

`p3-triage` always writes `reports/triage/<timestamp>-compliance-report.draft.md` first (ungated). Only a write to the non-draft filename is gated by `human_gate.py` — so drafting is fast and iterative, but publishing a finalized compliance verdict requires human sign-off.

## Provider-key fallback stored in exactly one place

If the default LLM provider is unreachable, the user can supply an alternate provider key via `POST /settings/provider-key`. The key is stored only at `backend/.runtime/provider_key` (gitignored), never logged, and the audit hook explicitly skips anything under `backend/.runtime/` so it can never leak into `.claude/audit/retrieval_log.jsonl`.

## Subagents get a minimum-context contract, not full history

Each `Agent` invocation starts with zero shared history. Rather than leaving callers to guess what to paste in, [[agent-context-contract]] fixes the minimum each subagent needs (e.g. `p3-triage` gets a specific time window, never "review everything").

## Governance packaged twice for reuse: template and plugin

`templates/agentic-governance-scaffold/` is a genericized copy-paste starting point (domain_a..domain_d placeholders). `plugins/pharma-rag-governance/` is the same governance layer packaged as an installable Claude Code plugin. Different reuse mechanisms for different adoption paths — copy-and-rename vs. install-as-dependency.
