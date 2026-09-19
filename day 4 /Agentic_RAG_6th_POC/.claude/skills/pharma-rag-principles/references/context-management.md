# Context management for long-running subagents

Rule: **summarize everything older than the last 8-10 turns/prompts, and keep that running summary capped at roughly 12-15% of the context window's token budget. Keep the most recent 8-10 turns verbatim, uncompressed.**

This applies most directly to:

- **`p3-triage`** — re-reads growing `.jsonl` logs across repeated invocations. It should not re-read the full raw log verbatim every run. Practical mechanism: each finalized report in `reports/triage/*-compliance-report.md` acts as the "summary of history older than the last N entries." A later triage run reads the most recent finalized report(s) for prior findings, then walks only the raw `.jsonl` entries newer than that report's timestamp — not the whole file from the start.
- **`backend`** — on long multi-turn retrieval sessions, summarize earlier retrieval/grounding steps rather than carrying every intermediate tool result forward verbatim; keep the last 8-10 turns of actual reasoning/retrieval steps uncompressed.

This keeps subagent context bounded as logs grow, without losing the ability to reference prior findings.
