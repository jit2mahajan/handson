# backend

Owned by the `backend` subagent. Step 11 of the build roadmap implemented the
actual RAG engine described below (heuristic classification and grounding —
no embeddings/vector store yet; see "Deferred for POC scope").

## Actual layout

```
backend/
├── requirements.txt      # fastapi, uvicorn, requests, jsonschema, pydantic, pytest, httpx
├── src/
│   ├── utils/
│   │   └── allowlist.py       # loads data/allowlist/sources.json; is_allowed()/require_allowed() — defense-in-depth, independent of the dev-time PreToolUse hook
│   ├── retrieval/              # one client module per allowlisted source family
│   │   ├── pubmed.py           # NCBI E-utilities esearch/esummary (target_identification_validation)
│   │   ├── clinicaltrials.py   # ClinicalTrials.gov API v2 (clinical_safety_intelligence)
│   │   ├── pubchem.py          # PubChem PUG REST (chemical_compound_intelligence)
│   │   ├── opentargets.py      # Open Targets GraphQL (target_identification_validation) — currently blocked by the live allowlist, see module docstring
│   │   └── openfda.py          # openFDA (clinical_safety_intelligence / competitive_regulatory_intelligence) — currently blocked by the live allowlist, see module docstring
│   ├── orchestrator/
│   │   └── orchestrator.py    # classify -> route -> retrieve -> ground -> assemble -> validate -> escalate
│   ├── grounding/
│   │   └── grounding.py       # raw retrieval results -> claims[] with citations; corroboration-count confidence heuristic
│   ├── validation/
│   │   └── schema_validate.py # jsonschema Draft7 validation against data/schema/response_schema.json
│   ├── prompts/
│   │   ├── domain_classifier_prompt_v1.md  # stub: intended LLM contract for step 19, not yet wired up
│   │   ├── grounding_prompt_v1.md          # stub: intended LLM contract for step 19, not yet wired up
│   │   └── CHANGELOG.md
│   └── api/
│       └── main.py            # FastAPI: GET /health, POST /query, POST /settings/provider-key
├── tests/
│   └── eval_queries.jsonl     # 8 hand-written sample questions across all four domains
└── .runtime/
    └── provider_key      # gitignored — alternate LLM provider API key, if the default provider is unreachable
```

Not built in step 11 (deferred, see "Deferred for POC scope" below): `embeddings/`,
`vectorstore/`. The current pipeline grounds claims directly against retrieval
results without a chunk/embed/vector-search step.

## Known allowlist gap (found while building the retrieval clients)

Two of the five real public APIs named in the step 11 spec live on hostnames
that are **not** on the current `data/allowlist/sources.json`:

- Open Targets GraphQL API is `api.platform.opentargets.org`; the allowlist
  lists `www.opentargets.org` (the docs/marketing site) instead.
- openFDA is `api.fda.gov`; the allowlist lists `www.fda.gov` and
  `www.accessdata.fda.gov` instead.

`retrieval/opentargets.py` and `retrieval/openfda.py` still call
`require_allowed()` before every request like every other client — since
those exact hosts aren't listed, that call raises `AllowlistError`, which the
orchestrator catches and treats as a **blocked source** (see
`escalation-rules.md`), never as a reason to fetch from the unlisted host
anyway. This was left as-is rather than "fixed" in code, per this repo's own
rule: allowlist changes are proposed, human-gated edits to
`data/allowlist/sources.json`, not something backend code should route around.
If a human reviewer wants these two sources live, add `api.platform.opentargets.org`
and `api.fda.gov` to the relevant domain keys in the allowlist — both clients
will start working immediately with no code changes.

By contrast, PubMed/NCBI E-utilities (`www.ncbi.nlm.nih.gov/entrez/eutils/...`,
verified live), ClinicalTrials.gov API v2 (`clinicaltrials.gov`), and PubChem
PUG REST (`pubchem.ncbi.nlm.nih.gov`) all match their allowlisted hosts exactly.

## Auth

`POST /query` and `POST /settings/provider-key` both require an API key on
every request. This is the exact contract the frontend (or any other caller)
must implement:

- **Header name:** `X-API-Key`
- **Env var read by the backend:** `AIDLC_API_KEY`
- **Default value if the env var is unset:** `dev-local-key`

Send the header on every request to either route, e.g.:

```
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: dev-local-key" \
  -d '{"query": "..."}'
```

A missing or incorrect `X-API-Key` header gets a `401` with a JSON body
(`{"detail": "..."}`) naming the header/env var, never a silent pass-through.
`GET /health` is intentionally left unauthenticated (liveness probe).

The `dev-local-key` default exists so this POC stays demoable with zero
setup. Any deployment beyond a single developer's own machine **must**
override it by setting `AIDLC_API_KEY` to a real secret in the process
environment before starting the server — the default is public (it's
committed in this file and in `backend/src/api/main.py`).

### Known limitation: this is operator auth, not end-user auth

`X-API-Key` is a **single shared static secret**. It is suitable only for an
operator-to-operator trust boundary — e.g. a frontend and this backend run
by the same party, on the same private deployment, separated from the
public internet by a network boundary (reverse proxy, VPC, etc.).

It does **not** authenticate individual browser end-users. Any secret baked
into or fetched by the publicly-served frontend JS is necessarily visible to
every user of that frontend (and to anyone who opens browser devtools) — so
this key cannot distinguish one end-user from another, cannot be revoked for
a single misbehaving user without breaking everyone, and must not be treated
as a substitute for real per-user authentication (e.g. OAuth/OIDC sessions)
if this app is ever exposed to untrusted end-users directly.

This is a **known, accepted POC limitation**, not an oversight: it is
documented here explicitly so that promoting this app past a single-operator
demo deployment requires deliberately replacing this auth model, not
discovering the gap in production.

### Rate limiting is also a POC limitation

`POST /query` and `POST /settings/provider-key` are protected by a minimal
in-memory, per-process rate limiter (see `enforce_rate_limit` in
`backend/src/api/main.py`). It is **not safe for a multi-worker or
multi-instance deployment** — each process keeps its own independent
counters, so the effective limit multiplies with the number of
workers/instances, and counters reset on restart. A real deployment behind
more than one process needs a shared store (e.g. Redis) instead.

## CORS

Allowed browser origins are read from the comma-separated `AIDLC_CORS_ORIGINS`
env var (e.g. `AIDLC_CORS_ORIGINS=http://localhost:8080,https://app.example.com`).
If unset, it defaults to `["http://localhost:8080"]` — scoped to the local
frontend dev origin, not a wildcard.

## Contract

- Every retrieval call targets a host in `data/allowlist/sources.json`, checked
  independently by application code (`utils/allowlist.py`) before the request —
  not just by the Claude-Code-only PreToolUse hook.
- Every emitted response validates against `data/schema/response_schema.json`.
- Every claim carries ≥1 citation or the response downgrades per `escalation-rules.md`.
- Every response is appended to `logs/responses.jsonl` for `p3-triage` to review.
- Domain routing is classified per question, not hardcoded per endpoint — see `domain-routing.md`.
- If the default LLM provider is unreachable, `POST /settings/provider-key` accepts an alternate provider key and the app continues using it for the session.

## Deferred for POC scope

- **Domain classification and grounding are heuristic, not LLM-based** — a
  documented keyword/substring classifier and literal title/summary
  concatenation, respectively. Prompt stubs for the LLM upgrade already live
  in `src/prompts/` for step 19 to build on.
- **No embeddings/vector store** — claims are grounded directly against the
  small retrieval result sets returned per query; a POC-scale RAG pipeline
  doesn't need a vector index on top of ~3-9 API results per domain.
- **No semantic "conflicting evidence" detection** — the escalation rule for
  "low-confidence or conflicting" safety evidence is approximated by the
  corroboration-count confidence heuristic (single-source claim treated as
  low-confidence), documented in `grounding.py`.

Full principles: `.claude/skills/pharma-rag-principles/SKILL.md`.
