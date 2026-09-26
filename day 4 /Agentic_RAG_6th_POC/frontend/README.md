# frontend

Owned by the `frontend` subagent.

## Layout

```
frontend/
├── index.html   # single page: query form, connect panel, results container
├── app.js       # all fetch/render logic; API_BASE_URL constant at the top
├── escape.js    # dependency-free escapeHtml/escapeAttr/isHttpUrl, shared
│                # by app.js (via <script>) and the Node test suite (via require())
├── serve.py     # hardened static file server — security headers, no directory listing
├── style.css    # status-banner colors, confidence badges, layout
└── tests/
    ├── index.html           # placeholder — defense-in-depth against directory listing
    └── isHttpUrl.test.js    # regression tests for escape.js (isHttpUrl/escapeHtml/escapeAttr)
```

Plain HTML/CSS/vanilla JS — no build toolchain, no framework. Open `index.html`
via the bundled hardened static file server:

```
python3 serve.py            # serves this directory on port 8080
python3 serve.py 8081       # or an explicit port
```

Use a port other than 8000, since backend's `uvicorn` binds to 8000 by
default and the two would otherwise collide. Point `API_BASE_URL` in `app.js`
at wherever backend's FastAPI app is running (default assumed:
`http://localhost:8000`).

Do not fall back to the bare `python3 -m http.server` — it sends no security
headers and serves directory listings (e.g. exposing `frontend/tests/`'s file
names) for any directory without its own `index.html`. `serve.py` sends
`Content-Security-Policy`, `X-Content-Type-Options`, and `X-Frame-Options` on
every response and returns a plain 404 instead of a directory listing. See
`reports/spec/2026-09-26-v3-security-review.draft.md` (P1-4 + P2-5).

## Provider-unreachable convention (assumed, pending reconciliation with backend)

`backend/src/api/main.py` did not exist yet when this UI was built. `app.js`
assumes `POST /query` responds with **HTTP 503** and a JSON body shaped like
`{"error": "provider_unreachable"}` when the default LLM provider can't be
reached, and shows the "Connect" panel in that case. As a fallback it also
treats any non-2xx JSON body whose `error` field contains both "provider" and
"unreachable" (case-insensitive) as the same case. If backend ends up using a
different status/shape, update `isProviderUnreachable()` in `app.js` to match.

## Tests

No bundler, no framework, no new dependencies — tests run on plain Node's
built-in test runner (`node --test`, Node 18+).

```
node --test frontend/tests/*.test.js
```

(Passing the bare directory, `node --test frontend/tests/`, does not
recurse into it on all Node versions — the glob above, or `cd frontend &&
node --test` with no args, reliably picks up every `*.test.js` file.)

`isHttpUrl.test.js` `require()`s the real implementations directly from
`escape.js` (no duplicated logic to drift out of sync — see P3-2 in
`reports/spec/2026-09-26-v3-security-review.draft.md`), and covers:

- `isHttpUrl()`: the XSS-prevention gate that keeps citation links from ever
  being rendered as a live `href` for a non-http(s) scheme (`javascript:`,
  `data:`, `vbscript:`, protocol-relative `//...`, and whitespace-padded
  variants of the same).
- `escapeHtml()` / `escapeAttr()`: bypass attempts such as the classic
  `" onmouseover=alert(1) x="` attribute-breakout payload, bare `'`/`` ` ``/`&`,
  and a raw `<script>` tag.

`app.js` itself never redefines these — it loads `escape.js` as a plain
`<script>` (see `index.html`) and uses `escapeHtml`/`escapeAttr`/`isHttpUrl`
as globals, the same non-module pattern the rest of the file follows.

## Contract

- Calls backend only through its documented API (`backend/README.md`) — never a retrieval source directly.
- Renders every schema-relevant field: claim statement, confidence badge, full citation trail, overall confidence.
- Renders `insufficient_evidence`/`escalated` as visually distinct from `answered`, not just muted.
- Never displays a claim without its citation trail.
- Shows a "Connect" state (masked API-key input) when backend reports the default LLM provider is unreachable, per the provider-fallback flow in the root `README.md`. Never re-displays a saved key in plaintext — trailing 4 characters only.

Full principles: `.claude/skills/pharma-rag-principles/SKILL.md`.
