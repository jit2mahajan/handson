# Code review — 2026-09-26

Scope: full diff since Stage B (backend/src/**, frontend/**) — the Groq/chatbot refactor, load-testing
endpoints, runtime key config, and dashboard redesign covered in `detailed-plan.md`'s Stage C sections.
Step 12 of the 20-step build plan. No `/code-review` plugin is installed in this project, so the review
was performed directly; findings below were all fixed and re-verified against the running stack.

## Findings

### 1. [Security] Stored/reflected XSS via unescaped dynamic content in the dashboard

`frontend/app.js` interpolated `patient_key`, `status`, `score`, evidence `statement`/`snippet`,
`escalation.reason`, and chat `answer`/`grounded_on` directly into `innerHTML`. Clinical note text
(`notes` on `/ingest`) flows into `evidence[].snippet`/`statement`, and chat `answer` is LLM-generated
once a live `GROQ_API_KEY` is set — either path lets attacker- or model-supplied HTML/script execute in
the coordinator's browser (e.g. a note containing `<img src=x onerror=...>`).

**Fix:** added `escapeHtml()` in `app.js`, applied to every dynamic value interpolated into `innerHTML`
in `renderCandidates()` and `askChat()`.

### 2. [Correctness] Record-linkage conditions merge silently drops later, more complete data

`db.py::_merge_conditions` deduped by `code` only — if an earlier source ingested a condition with
`diagnosed_on` missing, a later source ingesting the same code *with* a real diagnosis date was
discarded outright (first-seen wins). Since evidence statements read `matched['diagnosed_on']`, this
could permanently omit a diagnosis date that later became available from a different source — a real
gap for a system whose whole purpose is surfacing complete evidence across fragmented records.

**Fix:** merge by code into a dict and backfill `diagnosed_on` from a later record when the existing
entry lacks it, instead of skipping the incoming record whenever the code already exists.

### 3. [Robustness] No lower-bound validation on load-test parameters

`LoadTestRequest.concurrency`/`requests_per_worker` accepted any `int`, including `0` or negative,
which silently produced a degenerate/empty result (`total_requests: 0` or negative) instead of a clear
client error.

**Fix:** added `Field(ge=1)` to both fields in `models.py`; `/loadtest/chat` now returns `422` for
invalid values (verified: `{"concurrency":0}` → `422`).

### 4. [Efficiency / cost] `/screen` re-runs evidence extraction for already-finalized candidates

`candidate_service.screen_intervention` iterated every eligible patient and called
`evidence_extraction.extract` (a live Groq call once a key is set) unconditionally. The DB write
(`upsert_candidate`'s `WHERE candidates.status NOT IN ('approved','rejected')`) already protects a
finalized disposition from being overwritten, but the extraction work — and any Groq spend — happened
anyway on every rescreen, for every already-decided patient.

**Fix:** look up the existing candidate before extracting; skip entirely if its status is already
`approved`/`rejected`.

## Verification — completed 2026-09-26, all steps passed

1. Rebuilt and restarted `backend`/`frontend` — clean startup, no errors.
2. `POST /screen/ckd_stage4_dialysis_referral` → `screened: 3` (down from 4), correctly excluding the
   patient already `approved` during Stage B verification; that patient's record and status are
   untouched in `GET /candidates` (still `approved`).
3. `POST /loadtest/chat {"concurrency":0}` → `422 Unprocessable Entity` (previously would have silently
   returned an empty/degenerate summary).
4. `curl localhost:8080/app.js | grep -c escapeHtml` → non-zero; escaping is present in the shipped JS.
5. `curl localhost:8080/` → `200`; `POST /chat` still returns a correctly-grounded (stub) answer —
   escaping didn't change functional behavior for normal (non-malicious) content.
6. `docker compose logs backend` — no errors from any of the four fixes.

No findings were skipped; all four were fixed. No regressions found in existing screen/candidates/chat
flows.
