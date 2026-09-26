# Context trimming

Rule: **summarize everything older than the last 8-10 turns/prompts, and keep that running summary capped at roughly 12-15% of the context window's token budget. Keep the most recent 8-10 turns verbatim, uncompressed.**

- **`p3-triage`** — each finalized report in `reports/triage/*-compliance-report.md` acts as the "summary of history older than the last N entries." A later run reads the most recent finalized report(s), then walks only raw `.jsonl` entries newer than that report's timestamp.
- **`backend`** — on long multi-source screening runs, summarize earlier ingestion/record-linkage/eligibility steps; keep the last 8-10 turns of reasoning/evidence-extraction uncompressed.
