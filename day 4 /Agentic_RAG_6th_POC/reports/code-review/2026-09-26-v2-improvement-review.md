# AIDLC v2 Improvement Review — 2026-09-26

Produced by two independent, isolated review agents (no shared context, no file edits) — one against `backend/`, one against `frontend/`. Findings below are unmodified from each agent's own report.

## Backend (`backend/`)

### Security
- **P1** — `POST /settings/provider-key` (`backend/src/api/main.py:123-144`): no auth on the route; stored key file `backend/.runtime/provider_key` is not `chmod`'d to `0o600` (still world-readable at process umask default). This is the code-review finding from 2026-09-19 that was never fixed.
- **P1** — No auth on `/query` or `/settings/provider-key` at all — any network-reachable caller can run unlimited queries or rotate the provider key.
- **P1** — CORS wildcard (`main.py:50-56`, `allow_origins=["*"]`) — flagged in-code as POC-only, needs scoping to real frontend origin(s).
- **P2** — No rate limiting / request body size limits on `/query` or `/settings/provider-key`.
- **P2** — Provider key accepted with no format validation, no rotation/expiry tracking.

### Correctness/Robustness
- **P2** — Retrieval is fully sequential (`orchestrator.py:150-190,306-311`) — a multi-domain query can serialize past 60s if upstreams are slow. Needs `asyncio`/concurrent fan-out.
- **P2** — No retry/backoff in any of the 5 retrieval clients — a transient 503/timeout silently degrades to `insufficient_evidence` instead of retrying.
- **P3** — `_retrieve_domain`'s broad `except Exception` (`orchestrator.py:187-189`) records to the trace span but not to the logger — hard to spot outside a trace backend.

### Architecture/Scalability
- **P1 (next step)** — Wire up the already-stubbed LLM domain classifier (`backend/src/prompts/domain_classifier_prompt_v1.md`) in place of/alongside the keyword classifier.
- **P2** — No embeddings/vector store; grounding is literal title/summary concatenation, not synthesis — fine for POC, will read as disjointed snippets at scale.
- **P2** — No caching of upstream retrieval results — identical queries re-hit PubMed/PubChem/ClinicalTrials/openFDA every time.

### Testing
- **P1** — Zero pytest-style unit tests anywhere under `backend/` — only 8 hand-written eval queries. Nothing exercises `require_allowed`, `build_claims`/`rollup_confidence`, the escalation decision table, or schema-validation failure paths in isolation.
- **P2** — No tests for the provider-key endpoint, file permissions, or adversarial inputs (unlisted-host injection, empty query, non-UTF8).

### Observability
- **P2** — OTel metrics/dashboards have never been validated against a live collector or real traffic.
- **P3** — No alerting thresholds defined; no error counter distinguishing genuine client failures from zero-result cases.

### Maintainability/DX
- **P2** — Heavy duplication across all 5 retrieval clients (`_now_iso()`, the `except (RequestException, ValueError): return []` pattern, result-dict shape) — extract a shared `retrieval/_base.py` helper.
- **P3** — Duplicated generic-word stoplist logic between `pubchem.py` and `clinicaltrials.py`.

## Frontend (`frontend/`)

### P1 — Should block production-readiness
1. **No request timeout/abort control** (`app.js` `runQuery`, ~91-132) — a hung backend leaves the UI stuck on "Asking…" forever. Add `AbortController` + timeout + cancel affordance.
2. **Two schema fields silently dropped** — `query` (echoed) and `audit_ref` are never rendered in `renderResponse` (~167-210), despite the README's "renders every schema-relevant field" contract.
3. **No regression test for the 2026-09-19 XSS fix** — `isHttpUrl()`/`escapeAttr()` (~373-382) are the only thing blocking `javascript:`/`data:` citation links, with zero automated coverage; a future refactor could silently reopen it.
4. **FastAPI's standard 422 error shape (`{"detail":[...]}`) isn't handled** — only `body.error` is checked, so validation errors show a generic "No further detail provided."

### P2 — Important, not blocking
5. `escapeAttr()` only escapes `"` — safe today only because it's pre-gated by `isHttpUrl()`; rename/scope it so future reuse doesn't assume more than it does.
6. No CSP meta tag in `index.html`, despite building HTML via `innerHTML` string interpolation in several places.
7. No focus management when the provider-key "Connect" panel appears — keyboard/screen-reader users won't discover it.
8. No `aria-live` region on `#results` — screen readers get no notification when an answer/error arrives.
9. Inconsistent `innerHTML` vs `textContent` usage across render functions — standardize to reduce future escaping mistakes.
10. Non-navigable citation links are still real `<a href="#">` tags (announced as links by assistive tech) — use a `<span>` instead.

### P3 — Polish
11. Dead CSS (`.raw-response-toggle`) with no corresponding markup/JS — wire it up or delete it.
12. `API_BASE_URL` hardcoded — make runtime-configurable before v2.
13. `app.js` (~380 lines) still fine as one file, but v2 would benefit from splitting into `api.js`/`render.js`/`escape.js` ES modules.
14. Loading state is text-only; no retry button on generic/network errors.
15. Long citation URLs and raw ISO timestamps shown unformatted.
