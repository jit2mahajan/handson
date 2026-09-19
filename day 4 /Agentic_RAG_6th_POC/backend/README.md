# backend

Owned by the `backend` subagent. Step 11 of the build roadmap implemented the
actual RAG engine described below (heuristic classification and grounding —
no embeddings/vector store yet; see "Deferred for POC scope").

## Actual layout

```
backend/
├── requirements.txt      # fastapi, uvicorn, requests, jsonschema, pydantic
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
