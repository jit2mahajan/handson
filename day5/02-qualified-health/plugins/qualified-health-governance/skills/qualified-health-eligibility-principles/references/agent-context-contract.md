# Agent context contract

Every subagent invocation starts with zero memory of the calling session — the prompt must be self-contained. This is the minimum each subagent needs from its caller. Don't paste more than this (the subagent re-reads its own source-of-truth files); don't paste less (it can't see anything you didn't say).

**`backend`**: The eligibility question, verbatim, plus the relevant `intervention_id`. If about an existing candidate: the `patient_key` and which pipeline stage (ingestion / record-linkage / eligibility-engine / evidence-extraction) is in question. **Not needed**: allowlist/schema content inline — backend re-reads `data/allowlist/sources.json` and `data/schema/response_schema.json` itself.

**`frontend`**: Which schema field(s)/response shape changed, plus a pointer to backend's `candidate-api` contract (endpoint + example payload). **Not needed**: full dump of `response_schema.json`.

**`p3-triage`**: The UTC time window or line range in `logs/candidate_dispositions.jsonl` / `.claude/audit/lifecycle_log.jsonl` to review. **Never** "review everything" once logs grow large.

If a caller's prompt to any of these three agents doesn't include what this contract requires, the agent should ask rather than guess.
