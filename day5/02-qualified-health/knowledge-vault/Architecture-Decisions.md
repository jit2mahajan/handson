# Architecture Decisions

Short rationale-per-decision entries. Each links back to where the decision actually lives —
see [[Home]] for the full map, [[detailed-plan]] for full build history.

## Groq (`openai/gpt-oss-120b`) instead of Anthropic Claude for evidence extraction/chat

`CLAUDE.md`/[[PLAN]] originally specified Anthropic Claude for unstructured-note evidence
extraction. Swapped to Groq mid-build per explicit user request, for both note-based claim
extraction (`evidence_extraction.py`) and the new coordinator chatbot (`chatbot.py`). Both call
sites degrade to a clearly-marked stub answer (not a crash) when no key is configured — see
[[detailed-plan]] Stage C. Runtime key entry (Save Key button) is in-memory only, never persisted
or logged.

## Synthetic FHIR-shaped seed data, not a real source system

No real EHR/FHIR source-system access exists in this environment. `seed_patients.py` generates 8
synthetic patients (clearly eligible / ineligible / borderline-missing-evidence mix) so the
eligibility engine and evidence trail have something real to run against. See [[detailed-plan]]
Stage B decisions.

## Deterministic hashing-based embeddings, not a real embedding model

`embeddings.py` is a small local, pure-Python, deterministic hashing function — no external
model or API key required for the pgvector similarity search over clinical notes. This exercises
real pgvector plumbing (extension, vector column, similarity query) while keeping the demo
runnable with zero external dependencies; swapping in a real embedding model is a one-function
change. Documented simplification, see [[detailed-plan]] Stage B.

## Name+DOB key matching, not `splink` probabilistic record linkage

`CLAUDE.md`/[[PLAN]] mention probabilistic record linkage for cross-source dedup at scale.
`record_linkage.py` instead uses a normalized name+DOB canonical key (SHA1-hashed) — real dedup
logic, but not probabilistic matching, since a local demo population doesn't need
matching-at-scale. Documented simplification, see [[detailed-plan]] Stage B.

## Structured rule schema evaluated by a safe evaluator, not `eval()`

`eligibility_engine.py` evaluates a small `{"all"/"any": [{"field","op","value"}, ...]}` rule
schema with a hand-written three-valued (True/False/None) evaluator — deliberately not a generic
expression evaluator or `eval()`, to keep the rule surface auditable and injection-safe.

## Runtime human gate on finalize, distinct from the dev-time Claude Code hook

`POST /candidates/{patient_key}/finalize` is the **app-level** human gate (a coordinator approving
or rejecting a real candidate at runtime) — separate from `.claude/hooks/human_gate.py`, which only
governs Claude's own file edits during *development* of this codebase. Both append to the same
`logs/candidate_dispositions.jsonl` so the `p3-triage` subagent's audit trail covers both dev-time
and runtime decisions. See [[detailed-plan]] Stage B, API surface section.

## Manual code review instead of a `/code-review` plugin

No `/code-review` plugin was installed in this project when Step 12 came up. Rather than install
one mid-build, the review was performed directly against the diff since Stage B. Four findings
(XSS, record-linkage merge gap, load-test param validation, wasted re-extraction cost), all fixed
and verified — see `reports/code-review/2026-09-26-code-review.md` and [[Roadmap]].

## Built-in async self-test instead of requiring `k6` in the backend image

The dashboard's "Run Load Test" button (`load_test.py`) fires concurrent requests at the backend's
own `/chat` handler using `httpx`/`asyncio` (already a dependency) rather than shelling out to
`k6` — avoids adding `k6` to the backend image just to support a UI button. The standalone
`load-test/chat_load_test.js` k6 script remains for a more rigorous external run. See
[[detailed-plan]] Stage C addenda.
