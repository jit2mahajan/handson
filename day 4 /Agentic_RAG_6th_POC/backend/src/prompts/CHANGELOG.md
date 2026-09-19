# Prompt changelog

## v1 (2026-09-19) -- initial stub

Step 11 (build the RAG engine) shipped the orchestrator and grounding step as
documented heuristics (keyword/substring domain classification; literal
title/summary concatenation for claim statements), not LLM calls -- see
`backend/src/orchestrator/orchestrator.py` and
`backend/src/grounding/grounding.py` for the rationale in each module's
docstring.

`domain_classifier_prompt_v1.md` and `grounding_prompt_v1.md` are added now
as the intended input/output contract for the LLM-based versions of those two
steps, so the prompt-engineering pass planned for step 19 has a documented
starting point instead of reverse-engineering intent from code. Neither
prompt is invoked by any code yet.

## v1.1 (2026-09-19) -- eval reconciliation after step 12 grounding fix

Step 12's code review found `grounding.py`'s corroboration count was counting
distinct citation *URLs* instead of distinct *hostnames*, so 3 citations from
one host (e.g. one clinicaltrials.gov query returning 3 records) wrongly
counted as high-confidence corroboration. That's fixed now.

Re-ran `backend/tests/eval_queries.jsonl` against the fixed pipeline (7/8
passed before this change). The one failure -- "What clinical trials are
currently recruiting for pembrolizumab?", expected `answered`, actual
`escalated` -- was not a regression: with the fix, that query's evidence is
genuinely single-source (only clinicaltrials.gov), and per
`escalation-rules.md` row 4, low-confidence clinical/safety evidence must
escalate. Updated the eval file's expectation to `escalated` rather than
loosening the fix. Both prompt stubs above were checked against the current
heuristic implementations and needed no changes -- they already describe the
corroboration-count approach generically enough to remain accurate.
