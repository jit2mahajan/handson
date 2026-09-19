# frontend

Owned by the `frontend` subagent.

## Layout

```
frontend/
├── index.html   # single page: query form, connect panel, results container
├── app.js       # all fetch/render logic; API_BASE_URL constant at the top
└── style.css    # status-banner colors, confidence badges, layout
```

Plain HTML/CSS/vanilla JS — no build toolchain, no framework. Open `index.html`
via a static file server (e.g. `python3 -m http.server 8080` from this
directory — use a port other than 8000, since backend's `uvicorn` binds to
8000 by default and the two would otherwise collide) and point `API_BASE_URL`
in `app.js` at wherever backend's FastAPI app is running (default assumed:
`http://localhost:8000`).

## Provider-unreachable convention (assumed, pending reconciliation with backend)

`backend/src/api/main.py` did not exist yet when this UI was built. `app.js`
assumes `POST /query` responds with **HTTP 503** and a JSON body shaped like
`{"error": "provider_unreachable"}` when the default LLM provider can't be
reached, and shows the "Connect" panel in that case. As a fallback it also
treats any non-2xx JSON body whose `error` field contains both "provider" and
"unreachable" (case-insensitive) as the same case. If backend ends up using a
different status/shape, update `isProviderUnreachable()` in `app.js` to match.

## Contract

- Calls backend only through its documented API (`backend/README.md`) — never a retrieval source directly.
- Renders every schema-relevant field: claim statement, confidence badge, full citation trail, overall confidence.
- Renders `insufficient_evidence`/`escalated` as visually distinct from `answered`, not just muted.
- Never displays a claim without its citation trail.
- Shows a "Connect" state (masked API-key input) when backend reports the default LLM provider is unreachable, per the provider-fallback flow in the root `README.md`. Never re-displays a saved key in plaintext — trailing 4 characters only.

Full principles: `.claude/skills/pharma-rag-principles/SKILL.md`.
