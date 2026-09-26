# AIDLC V3 Security Review — 2026-09-26 (DRAFT)

Scope: `backend/src/api/main.py`, `backend/src/utils/allowlist.py`,
`backend/requirements.txt`, `backend/.runtime/` (permissions), `frontend/app.js`,
`frontend/index.html`, `frontend/tests/`, and how `frontend/` is actually served
(per `frontend/README.md`). Read-only review; no code changed. Builds on
`reports/code-review/2026-09-26-v2-improvement-review.md` — findings there are
re-verified against the current code rather than assumed still accurate.

Working directory: `/home/labuser/Downloads/handson/day 4 /Agentic_RAG_6th_POC/`

## Fixed since V2 (verified, not re-flagged as open)

- CORS is no longer a wildcard. `backend/src/api/main.py:88-100` now reads
  `AIDLC_CORS_ORIGINS` and defaults to `["http://localhost:8080"]`, with
  `allow_credentials=False`. This closes the V2 P1 CORS finding.
- The provider-key file is explicitly `chmod`'d to `0o600`
  (`backend/src/api/main.py:187`) and a test (`backend/tests/test_api_auth.py`)
  asserts this. This closes the V2 P1 "not chmod'd" finding.
- `/query` and `/settings/provider-key` are now both gated behind
  `require_api_key` (`backend/src/api/main.py:61-72,118,169`). This closes the
  V2 P1 "no auth at all" finding — see Critical-1 below for why it is only a
  partial fix.

---

## Critical

### C1 — The shared API key can never be a real secret for a browser client, because it is shipped inside the publicly-served frontend bundle
**Files:** `frontend/app.js:14` (`const API_KEY = "dev-local-key";`), `backend/src/api/main.py:54-72`, `backend/README.md:69-96`

`app.js` is served as a static file with zero access control (see P1-4 below)
and contains the literal API key in plaintext. Any visitor can `curl` the
frontend origin, read the key out of `app.js`, and then call
`POST /query` / `POST /settings/provider-key` directly against the backend
origin with unlimited volume — the "auth" layer adds no real barrier for a
browser-facing deployment, independent of whether the operator rotates
`AIDLC_API_KEY` away from the documented default. Rotating the default only
helps until the next `view-source`. This is a structural problem with using a
single static shared secret as the sole auth mechanism for a browser client,
not a configuration mistake that goes away by picking a better key.

**Risk:** Once this app is reachable beyond one developer's own machine (the
stated goal of hardening for V3), the key in `app.js` is the *entire*
authorization boundary for `/query` (cost/DoS exposure to upstream PubMed/
PubChem/ClinicalTrials/openFDA calls) and for `/settings/provider-key`
(overwriting the stored LLM provider key with an attacker-controlled key —
see also C2).

**Fix direction:** A client-side-embedded static key cannot authenticate a
browser end-user. Either (a) put a real authenticating proxy/BFF in front of
the API that performs actual user auth (session/OAuth) and holds the shared
key server-side only, or (b) accept that `X-API-Key` is deployment-operator-to-
operator auth (e.g., frontend and backend are both operated by the same party
behind a network boundary, not exposed to arbitrary end users) and document
that constraint prominently rather than implying it authenticates end users.

### C2 — `POST /settings/provider-key` lets any holder of the shared API key silently overwrite the active LLM provider key
**Files:** `backend/src/api/main.py:167-193`

Given C1, the API key is not meaningfully secret in a browser deployment.
Anyone who obtains it can call this endpoint to overwrite
`backend/.runtime/provider_key` with a provider name/key of their choosing.
Since the app is documented to fall back to this stored key whenever the
default provider is "unreachable," an attacker who can also induce or wait
for that condition (or if the orchestrator ever prefers the stored key when
present) can redirect the app's outbound LLM calls to an attacker-controlled
provider endpoint/account, or simply cause a stored-key mismatch that breaks
the fallback path for legitimate users (DoS on the recovery mechanism itself).
No confirmation step, no rate limit, no audit log entry distinguishing a
legitimate operator's key rotation from an unauthorized one.

**Fix direction:** Treat this route as higher-privilege than `/query` — a
second factor, an operator-only credential distinct from the general API key,
or at minimum an audit log entry (provider name + timestamp + caller
identity, never the key) so an unauthorized rotation is detectable.

---

## P1

### P1-1 — No request body size limit anywhere in the stack (DoS)
**Files:** `backend/src/api/main.py:103-109` (`QueryRequest.query: str`,
`ProviderKeyRequest.provider/api_key: str` — no `Field(max_length=...)`
anywhere); no ASGI/Starlette body-size middleware is installed.

Uvicorn/Starlette will buffer the entire request body into memory before
FastAPI/Pydantic gets a chance to validate anything, and nothing here caps
`Content-Length`. A caller who has (or brute-forces/leaks, see C1) the API
key — or, for `/health`, no key at all is needed but that route takes no
body — can POST a multi-hundred-MB or GB-sized JSON body to `/query` or
`/settings/provider-key` repeatedly, exhausting server memory, or write an
arbitrarily large `provider_key` file (`main.py:182-184`) to disk, exhausting
disk space, before any length check runs. This is the V2 P2 finding
("no rate limiting/body size limits") — it is still fully open in V3, and
because auth is realistically bypassable per C1, it should be re-rated up
from P2.

**Fix direction:** Add an explicit max-length `Field` constraint on `query`,
`provider`, and `api_key` (e.g. a few KB is plenty for a research query or a
provider key); add a body-size-limiting ASGI middleware or reverse-proxy
`client_max_body_size` in front of uvicorn so oversized bodies are rejected
before being fully buffered.

### P1-2 — No rate limiting on any route
**Files:** `backend/src/api/main.py` (entire file — no rate-limit middleware,
no per-key/per-IP throttling anywhere)

Combined with C1 (key is effectively public) and the fact that `/query` fans
out to five external upstreams (PubMed, PubChem, ClinicalTrials.gov, openFDA,
UniProt/etc. per the allowlist), an unthrottled caller can drive unbounded
outbound traffic to those third-party APIs under this deployment's identity,
risking IP-based blocking/rate-limit bans from the upstreams themselves, plus
straightforward local resource exhaustion (CPU/threads/open sockets) and
unbounded growth of `logs/responses.jsonl` (one line appended per query,
unbounded, no rotation). Still open since V2 (there rated P2; re-rated here
given C1 makes the "must already have the key" mitigation weaker than
assumed).

**Fix direction:** Add per-key and/or per-IP rate limiting (e.g. `slowapi` or
an API-gateway/reverse-proxy layer) on `/query` and `/settings/provider-key`;
consider log rotation/size caps on `logs/responses.jsonl`.

### P1-3 — Schema-validation failure details are echoed verbatim to the client
**Files:** `backend/src/api/main.py:141-147`, `backend/src/validation/schema_validate.py:37-50`

`validate_response()` builds its error string as
`"; ".join(f"{list(e.path)}: {e.message}" for e in errors)` — `jsonschema`'s
`e.message` routinely embeds the actual offending value (e.g. a full claim
statement, a URL, an enum value) inline in the message
(`"'<value>' is not one of [...]"`, `"<value> is too long"`, etc.), not just
a generic description. `main.py:145-147` then puts that whole string,
unmodified, into the HTTP 500 `detail` field returned to the caller:
```python
raise HTTPException(status_code=500, detail=f"Assembled response failed schema validation: {exc}")
```
Any time the orchestrator assembles a response that happens to fail schema
validation (a real possibility — it's presented as "the one real validation
gate" in the surrounding comment), the client gets back a dump of internal
response-shape details and potentially retrieved-content fragments that were
never meant to be client-visible in that form. This is a different, more
specific instance of the class of bug V2 didn't call out.

**Fix direction:** Log the full `jsonschema` detail server-side (it's fine
there) and return a generic, fixed message to the client
(`"Assembled response failed validation; see server logs."`), optionally with
a correlation/request ID the operator can grep for in the server-side log.

### P1-4 — No access control at all on how `frontend/` is served; directory listing exposes `frontend/tests/` and any other file dropped into the directory
**Files:** `frontend/README.md:16-21` (documented run command:
`python3 -m http.server 8080` from the `frontend/` directory), on-disk
`frontend/tests/isHttpUrl.test.js` (confirmed present, `ls -la frontend/`)

`python3 -m http.server` serves the entire directory tree with automatic
directory-index pages for any path lacking its own `index.html`. Visiting
`http://localhost:8080/tests/` returns a directory listing exposing
`isHttpUrl.test.js` (which documents the exact XSS-gate logic and its known
bypass classes — not itself a secret, but a roadmap for anyone probing the
escaping logic) to any anonymous requester. There is no `.htaccess`/server
config disabling indexing, and this exposure pattern means **any future file
dropped into `frontend/`** (a stray `.env`, a backup, notes, a `.bak` of
`app.js`) becomes automatically web-reachable with zero warning, including
files that are `?? ` untracked in git and so wouldn't be caught by a
"check what's committed" review step. This directly matches the "server
exposure: directory listing, reachable-but-unlinked files" category this
review was asked to check.

**Fix direction:** Serve with directory indexing disabled (e.g.
`python3 -m http.server` has no such flag — switch to a minimal server that
supports disabling autoindex, or front it with nginx/Caddy configured to
serve only `index.html`, `app.js`, `style.css` explicitly and 404 everything
else) before this pattern is used anywhere beyond a developer's own
localhost.

---

## P2

### P2-1 — API key comparison is not constant-time
**Files:** `backend/src/api/main.py:61-63`
```python
expected = os.environ.get(AIDLC_API_KEY_ENV_VAR, AIDLC_API_KEY_DEFAULT)
if not api_key or api_key != expected:
```
Python's `str.__ne__` short-circuits on the first differing byte, giving a
(small, network-noise-obscured, but non-zero) timing side channel on key
comparison. Low practical severity over a real network given jitter, but it
is the textbook wrong primitive for secret comparison and costs nothing to
fix.

**Fix direction:** `hmac.compare_digest(api_key.encode(), expected.encode())`
(guard the `not api_key` case first since `compare_digest` requires
equal-length-safe inputs of the same type).

### P2-2 — `allowlist.py`'s `require_allowed`/`is_allowed` validate hostname but never URL scheme
**Files:** `backend/src/utils/allowlist.py:100-150`

Verified experimentally (see below) that `urlparse(...).hostname` correctly
resolves the real target host for userinfo tricks
(`http://alloweddomain.com@evil.com/` → `evil.com`, correctly rejected;
`http://evil.com@alloweddomain.com/` → `alloweddomain.com`, correctly
accepted — Python's `urlparse` is not fooled by the classic `user@host`
confusion), is case-normalized (`WWW.NCBI.NLM.NIH.GOV` → lowercase, matching
the all-lowercase entries in `data/allowlist/sources.json`), and fails closed
on unparseable/schemeless input (`hostname_of()` returns `None` →
`AllowlistError`). Exact-match-against-a-fixed-set (not `endswith`/`in`
substring matching) also closes the standard `evil-alloweddomain.com` /
`alloweddomain.com.evil.com` suffix/prefix bypass class — confirmed
`www.ncbi.nlm.nih.gov.evil.com` parses to a hostname that is *not* in the
allow-set and is correctly rejected.

What is **not** checked is scheme: `require_allowed("ftp://www.ncbi.nlm.nih.gov/…")`
returns success (the host is allowlisted) even though the module's own
docstring frames this as the SSRF safety net for "every retrieval client."
Today this is not exploitable — every current caller
(`backend/src/retrieval/*.py`) builds the checked URL from a hardcoded
`https://` constant, never from user input, so there's no live path to
supply a non-https scheme. But the module is documented as a general,
reusable defense-in-depth gate for future clients, and a future client that
constructs its request URL more dynamically (e.g. from a partially
templated source) could pass an allowlisted host with `file://`,
`gopher://`, or a scheme `requests` handles differently than intended, and
`require_allowed` would wave it through.

**Fix direction:** Add an explicit scheme allowlist (`{"http", "https"}`) to
`is_allowed`/`require_allowed`, rejecting anything else regardless of host
match, so the guarantee ("this host+scheme combination is approved to fetch
from") matches what the docstring already implies.

### P2-3 — All backend dependencies are unpinned
**Files:** `backend/requirements.txt:1-17`

Every package (`fastapi`, `uvicorn`, `requests`, `jsonschema`, `pydantic`,
`opentelemetry-api`/`sdk`/`exporter-otlp-proto-grpc`, `pytest`, `httpx`) has
no version specifier at all — not even a floor (`>=`). A bare `pip install
-r requirements.txt` today and the same command run six months from now can
resolve to entirely different dependency trees, including a newly published
version with a supply-chain compromise, a breaking API change, or a
reintroduced CVE that an earlier pin would have avoided. This is the same
finding V2 made ("unpinned or known-vulnerable package versions") and it is
still fully open — no pins, no lockfile, no hashes anywhere in the repo.

**Fix direction:** Pin exact versions (`fastapi==<x.y.z>`) or adopt a
lockfile workflow (`pip-tools`/`pip-compile`, `poetry.lock`, or `uv.lock`)
committed to the repo, ideally with `pip install --require-hashes` in
deployment.

### P2-4 — `backend/.runtime/` directory itself is group/other-readable (mode 0775), only the key file is locked down
**Files:** `backend/src/api/main.py:181` (`RUNTIME_DIR.mkdir(parents=True, exist_ok=True)`
— no explicit mode), confirmed on disk: `drwxrwxr-x` for `backend/.runtime/`
vs. `-rw-------` for `backend/.runtime/provider_key`

The file itself is correctly locked to `0o600` (V2's finding here is fixed —
see "Fixed since V2"). The containing directory is not: it inherits whatever
mode `mkdir()`'s default (`0o777`) minus the process umask produces, which on
this system is `0o775`. Any other local account on a shared host can `ls
backend/.runtime/` and confirm a provider key is currently stored (existence/
timing metadata — file size, mtime) even though they cannot read its
contents. Low severity in isolation, but it's a free hardening step directly
adjacent to a secret file.

**Fix direction:** `RUNTIME_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)`
followed by an explicit `os.chmod(RUNTIME_DIR, 0o700)` (mode= on `mkdir` is
also subject to umask, so the explicit chmod is the part that actually
guarantees it, mirroring what's already done for the file itself).

### P2-5 — No CSP, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, or HSTS anywhere in the served frontend
**Files:** `frontend/index.html:1-9` (only `charset` and `viewport` meta
tags — no `<meta http-equiv="Content-Security-Policy">` or any other
security meta tag), and confirmed the dev server documented in
`frontend/README.md` (`python3 -m http.server`) adds no security response
headers of its own.

This is the same gap V2 flagged (P2 #6, "No CSP meta tag") and it remains
fully open. Given `app.js` builds substantial HTML via `innerHTML` string
interpolation throughout `renderResponse`/`renderClaim`/`renderStatusBanner`
(escaping is currently correct everywhere checked — see P3 note below — but
CSP is exactly the defense-in-depth layer that matters if any future edit
introduces a gap), and there is also no clickjacking defense
(`X-Frame-Options: DENY` / `frame-ancestors 'none'`) — the page can currently
be iframed by any other origin, which combined with the "Connect" panel's
API-key-entry form is a realistic clickjacking target (trick a user into
"connecting" a provider key through an invisible overlaid iframe).

**Fix direction:** Add a restrictive CSP meta tag (`default-src 'self';
script-src 'self'; connect-src 'self' <backend origin>; frame-ancestors
'none'; object-src 'none'; base-uri 'none'`) plus, once this moves behind a
real HTTP server (not `python3 -m http.server`, which can't set response
headers), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and
`Strict-Transport-Security` once served over TLS.

### P2-6 — `/query` and `/settings/provider-key` have no length caps and no character-set validation beyond "non-empty after strip"
**Files:** `backend/src/api/main.py:128-129,171-174`

Beyond the general body-size DoS in P1-1, there's no upper bound on an
individual field even at reasonable request sizes — e.g. nothing stops a
100,000-character `query` from being forwarded byte-for-byte into every
retrieval client's query parameters (`term=term` in `pubmed.py`, etc.),
which several upstream APIs will simply reject with a 4xx that then reads to
the end user as an opaque `insufficient_evidence`/generic error, with no
clear "your query is too long" feedback. Low severity (self-inflicted
degraded UX more than a security hole per se), but cheap to fix alongside
P1-1.

**Fix direction:** `Field(min_length=1, max_length=2000)` (or similar) on
`query`, `provider`, and `api_key`, returning FastAPI's standard 422 with a
clear message — which the frontend's `extractErrorDetail()` already knows
how to render.

---

## P3

### P3-1 — `escapeAttr()` escapes only `"` — currently safe only because every call site is pre-gated by `isHttpUrl()`
**Files:** `frontend/app.js:415-419,481-482`

Re-verified this V2 P2-#5 finding against realistic payloads
(`" onmouseover=alert(1) x="`, embedded `&quot;` literal text, raw
`&`/`<`/`>` inside a URL): the double-quote-only escape is sufficient for the
one place it's used today, because (a) the value is always placed inside a
double-quoted `href="..."` attribute, where `"` is the only character that
can terminate the attribute value, and (b) `isHttpUrl()` gates the input to
strings that must literally start with `http://`/`https://` after `trim()`,
which rules out `javascript:`/`data:`/`vbscript:` scheme confusion regardless
of what follows. No live bypass found. This remains a latent-risk / naming
issue, not an active vulnerability: the function's name suggests
general-purpose attribute escaping, and a future call site that reuses it
for an attribute value that isn't scheme-gated (or that sits in an
unquoted or single-quoted attribute) would be unsafe. Re-flagging at the
same severity V2 gave it since it is still unaddressed.

**Fix direction:** Rename to something scoped (`escapeHrefAfterHttpCheck` or
similar) with a docstring stating the precondition, or extend it to escape
`&`, `<`, `>`, and `'` too so it's safe as a general-purpose attribute
escaper regardless of future call sites.

### P3-2 — `isHttpUrl()`/escaping helpers still have no automated regression coverage wired into a CI-equivalent gate
**Files:** `frontend/tests/isHttpUrl.test.js`, `frontend/README.md:33-49`

The test file exists and, per its own documentation, deliberately duplicates
`isHttpUrl()`'s logic rather than importing `app.js` (since `app.js` touches
`document` at module scope and isn't an ES module). That means a future edit
to the real `isHttpUrl()` in `app.js` can silently drift from the tested
copy and the test suite would keep passing while the shipped gate regressed
— the test asserts the *duplicated* logic is correct, not that `app.js`'s
actual function still matches it. This is a narrower, more precise version
of V2's frontend P1-#3 ("no regression test... a future refactor could
silently reopen it") — a test now exists, but its structural limitation
means it doesn't fully close that gap.

**Fix direction:** Either convert `app.js` to an ES module (guarding the
top-level `document.getElementById(...)` calls behind a
`DOMContentLoaded`/init function) so the test can `import` the real function,
or add a lightweight build/lint step that fails if the two copies of the
logic diverge (e.g. a checksum comment, or extracting `isHttpUrl` to its own
tiny same-syntax file both `app.js` and the test `require()`).

### P3-3 — CORS `allow_methods=["*"]` / `allow_headers=["*"]` are broader than the two routes need
**Files:** `backend/src/api/main.py:94-100`

Now that `allow_origins` is properly scoped (fixed since V2), this is a minor
hygiene point rather than a real hole: `allow_credentials=False` means the
wildcard methods/headers don't grant cross-origin credentialed access to
anything. Still, the app only ever needs `GET`, `POST`, and `OPTIONS`
(preflight), and only the `Content-Type`/`X-API-Key` request headers — being
explicit costs nothing and avoids the wildcard silently covering a future
route added without reconsidering CORS.

**Fix direction:** `allow_methods=["GET", "POST"]`,
`allow_headers=["Content-Type", "X-API-Key"]`.

### P3-4 — No `X-Content-Type-Options: nosniff` on API responses
**Files:** `backend/src/api/main.py` (no middleware/response headers set
anywhere)

FastAPI returns `application/json` correctly for all three routes, so
MIME-sniffing risk is low today, but this costs one line to close off
entirely and is a standard baseline header.

**Fix direction:** Add a small middleware (or `Response` header set) applying
`X-Content-Type-Options: nosniff` (and, if this API is ever fronted by
anything that could render its output, `X-Frame-Options: DENY`) to every
response.

---

## Verified — checked, not a finding

- **Allowlist userinfo/suffix/case bypass tricks** (`backend/src/utils/allowlist.py`):
  tested `http://alloweddomain@evil.com/`, `http://evil.com@alloweddomain/`,
  `http://alloweddomain.com.evil.com/`, `http://ALLOWEDDOMAIN.COM/`,
  tab/whitespace-padded hosts, and a punycode host (`xn--80ak6aa92e.com`) —
  all resolved to the correct real target host via `urlparse(...).hostname`
  and were correctly accepted/rejected by the exact-match-against-a-fixed-set
  design. No bypass found. Punycode specifically: since matching is exact
  ASCII-string equality against the allowlist (not IDNA-decoded display-name
  comparison), a punycode host can only match if the *exact* `xn--...` string
  is itself listed — it can't impersonate a different listed Unicode label.
- **IP-literal SSRF** (`backend/src/utils/allowlist.py`): `127.0.0.1`,
  `169.254.169.254` (cloud metadata), `0x7f.0.0.1`, `0177.0.0.1`, and IPv6
  `::ffff:127.0.0.1` are all correctly rejected — none are in
  `data/allowlist/sources.json`, and the check is default-deny or exact
  match, not a blocklist that could miss an encoding.
- **`escapeHtml()`** (`frontend/app.js:475-479`): the `textContent` →
  `innerHTML` round-trip is the standard safe idiom for text-context escaping
  and was not found to have a bypass in any of its current call sites (all
  text-node contexts, never attribute contexts).
- **No secret leakage in logs**: grepped `.runlogs/*.log` and
  `logs/responses.jsonl` for `api_key`/`X-API-Key`/`provider_key` — no hits.
  `POST /settings/provider-key` never writes the raw key to `LOG_PATH`,
  stdout, or the HTTP response body (`main.py:189-193` returns only
  `key_suffix`).
- **CORS wildcard, provider-key file permissions, `/query` auth presence**:
  see "Fixed since V2" above.

---

## Summary table

| ID | Severity | One-line |
|---|---|---|
| C1 | Critical | Shared API key lives in public `app.js` — no real auth boundary for a browser client |
| C2 | Critical | `/settings/provider-key` lets anyone with the (effectively public) key hijack the LLM provider fallback |
| P1-1 | P1 | No request body size limit anywhere — memory/disk DoS |
| P1-2 | P1 | No rate limiting on any route |
| P1-3 | P1 | Raw `jsonschema` validation detail echoed to client on 500 |
| P1-4 | P1 | `frontend/` served with directory listing on — exposes `tests/` and any stray file |
| P2-1 | P2 | Non-constant-time API key comparison |
| P2-2 | P2 | Allowlist checks host but never scheme |
| P2-3 | P2 | All backend deps unpinned |
| P2-4 | P2 | `.runtime/` directory mode 0775, not locked to owner-only |
| P2-5 | P2 | No CSP/frame-ancestors/nosniff/HSTS anywhere in frontend |
| P2-6 | P2 | No length caps on query/provider/api_key fields |
| P3-1 | P3 | `escapeAttr()` name/scope wider than its actual (currently-safe) guarantee |
| P3-2 | P3 | XSS-gate test duplicates logic instead of importing it — drift risk |
| P3-3 | P3 | CORS methods/headers wildcarded beyond what's needed |
| P3-4 | P3 | No `X-Content-Type-Options: nosniff` on API responses |
