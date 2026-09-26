# Detailed Plan — Qualified Health (20-Step AIDLC Build)

Adapted from the proven governance/agent-ops pattern built for `day 4 /Agentic_RAG_6th_POC`, whose `templates/agentic-governance-scaffold/` was explicitly genericized for reuse in new projects. `PLAN.md`/`CLAUDE.md` in this folder are the source-of-truth HLD/LLD; this doc tracks the 20-step build process on top of them.

| Step | What | Status |
|---|---|---|
| 1 | Problem statement | Done — see `PLAN.md` (candidate identification for life-saving interventions across fragmented records) |
| 2 | AIDLC plan (HLD/LLD via Claude chat) | Done — see `PLAN.md` |
| 3 | Skills + hooks: `qualified-health-eligibility-principles` skill, allowlist/human-gate/audit hooks, destructive-bash block, format→test enforcement, lifecycle notifications, patient-finalization human gate | Done — `.claude/skills/`, `.claude/hooks/`, `.claude/settings.json` |
| 4 | Subagents: `backend`, `frontend` | Done — `.claude/agents/backend.md`, `.claude/agents/frontend.md` |
| 5 | `p3-triage` subagent (review and report) | Done — `.claude/agents/p3-triage.md` |
| 6 | Subagent context isolation | Done — `.claude/skills/qualified-health-eligibility-principles/references/agent-context-contract.md` |
| 7 | Delegation table | Done — `README.md` |
| 8 | Context trimming | Done — `.claude/skills/qualified-health-eligibility-principles/references/context-management.md` |
| 9 | Reusable setup/config for scalable AI products | **Done — see "Addendum: plugin packaging" below** |
| 10 | Plugins (internal from Stage B; external from claude.com/plugins) | **Done — see "Addendum: plugin packaging" below** |
| 11 | RAG engine for essential/required features | **Done — see "Stage B implementation detail" below**: FHIR source-connector, record-linkage, eligibility-engine, evidence-extraction-service (now Groq `openai/gpt-oss-120b` + pgvector, swapped from the original Anthropic stub), candidate-api, coordinator chatbot (`POST /chat`), + minimal frontend dashboard with chat panel, deployed locally via Docker Compose and verified end-to-end — see "Stage C (partial)" below |
| 12 | Test, review, report via code-review plugin | **Done** — no `/code-review` plugin installed, reviewed directly: 4 findings (frontend XSS, record-linkage merge gap, load-test param validation, wasted re-extraction on rescreen), all fixed and verified, report at `reports/code-review/2026-09-26-code-review.md` |
| 13 | MCP server registration (`.mcp.json`) | **Done — see "Addendum: MCP server" below** |
| 14 | Custom MCP server for reusable orchestrated app dev | **Done — see "Addendum: MCP server" below** — `mcp-servers/qualified-health-mcp/` |
| 15 | Observability: OpenTelemetry + SigNoz (traces/logs/metrics) | **Done — see "Addendum: observability" below** |
| 16 | Load testing: k6, dashboard visualization | **Partially done — see "Stage C (partial)" below**: k6 script load-tests `POST /chat` only; dashboard visualization of results still Planned |
| 17 | Knowledge vault (Obsidian readme mode) | **Done — see "Addendum: knowledge vault" below** |
| 18 | Graphify knowledge graph | Planned — Stage C |
| 19 | Prompt engineering pass | **Done — see "Addendum: prompt-engineering pass" below** |
| 20 | Demo for first user | **Done — see "Addendum: demo script" below** |

## Notes

- Steps 1–8 are the governance/agent-ops foundation (Stage A) and are complete as of this doc.
- Steps 9–20 are substantial application/infra builds (RAG engine, MCP server, observability stack, load tests, knowledge graph) — each gets its own implementation pass and review before being marked Done, per the staged plan agreed before Stage A began.
- Scope boundary from `CLAUDE.md` still applies: this folder is self-contained, independent of the other `day5/` case studies.

## Stage B implementation detail (Step 11: RAG engine + local deploy)

Reuse check: the sibling `day 4 /Agentic_RAG_6th_POC` project has **no** Anthropic-client, pgvector, or Docker conventions (it's a heuristic keyword-matching POC — no Docker/Postgres/LLM calls anywhere). What's reused from it anyway: FastAPI layout (`src/api`, `src/<service>`), schema-first `jsonschema` validation against `data/schema/response_schema.json`, `X-API-Key` header auth via `hmac.compare_digest`, and the "fail gracefully → escalate" philosophy. Everything else (DB schema, Docker, Claude calls) is built fresh.

**Decisions (user-confirmed):**
- Seed synthetic FHIR-shaped patient data (mix of clearly eligible / ineligible / borderline-missing-evidence) — no real source-system access exists.
- Build backend **and** a minimal frontend dashboard.
- Evidence-extraction via Claude is stubbed behind an `ANTHROPIC_API_KEY` presence check — absent a key, returns a clearly-marked placeholder claim + `escalation.required: true`; swappable to live calls later with no code changes.

**Documented simplifications:**
- Record linkage: name+DOB normalized-key matching, not `splink` (real dedup logic, not probabilistic-matching-at-scale — out of scope for a local demo population).
- Note embeddings for pgvector retrieval: a small local deterministic hashing-based embedding (pure Python, no external model/API key) — exercises real pgvector plumbing (extension, vector column, similarity query); swapping in a real embedding model later is a one-function change.
- Eligibility rules: a small structured rule schema (`{"all"/"any": [{"field","op","value"}, ...]}`) evaluated by a safe evaluator — no `eval()`.

**Files:**
```
backend/
  Dockerfile
  requirements.txt
  src/
    api/main.py            — FastAPI app: routes below, X-API-Key auth
    models.py              — Pydantic: UnifiedPatientRecord, EligibilityCriteria, Candidate
    db.py                  — asyncpg pool + queries (no ORM)
    record_linkage.py      — name+DOB dedup on ingest
    eligibility_engine.py  — structured rule evaluator
    embeddings.py          — local hashing-based embedding (documented stand-in)
    evidence_extraction.py — Claude call if ANTHROPIC_API_KEY set, else placeholder+escalate
    candidate_service.py   — ties engine+evidence together; writes logs/candidate_dispositions.jsonl
db/init/001_schema.sql     — CREATE EXTENSION vector; patients/notes/candidates/eligibility_criteria tables
db/init/002_seed.sql       — 2 example interventions, ~8 synthetic patients
frontend/
  Dockerfile               — nginx:alpine serving static/
  index.html, app.js, style.css   — candidate list, evidence trail, approve/reject → finalize endpoint
docker-compose.yml         — postgres (pgvector/pgvector:pg16), backend, frontend
.env.example               — ANTHROPIC_API_KEY (optional), AIDLC_API_KEY, DATABASE_URL, ports
```

**API surface (refined from `PLAN.md`):**
- `POST /ingest/{source}` — accepts a synthetic FHIR-shaped bundle; runs record-linkage on write
- `POST /screen/{intervention_id}` — runs eligibility-engine + evidence-extraction over the population, upserts `candidates`
- `GET /candidates?intervention_id=` — ranked list with evidence trail
- `PATCH /candidates/{patient_key}` — non-terminal disposition only (`flagged`/`pending_review`)
- `POST /candidates/{patient_key}/finalize` — **runtime human gate**: requires `{"intervention_id", "status": "approved"|"rejected", "confirmed_by": "<name>"}` (composite PK `patient_key + intervention_id`); the app-level equivalent of the dev-time `human_gate.py` Claude-Code hook (which only governs Claude's own edits during development, not the running app) — both append to the same `logs/candidate_dispositions.jsonl` so `p3-triage`'s audit trail stays meaningful.

**Deployment:** `docker-compose.yml`: `postgres` (pgvector image, mounts `db/init/*.sql` for auto-init+seed) → `backend` (depends_on postgres, reads `.env`) → `frontend` (nginx, depends_on backend, port 8080).

**Verification — completed 2026-09-26, all steps passed:**
1. ✅ `sudo docker compose build && sudo docker compose up -d` — both images built, all 3 containers (`postgres`, `backend`, `frontend`) started, postgres healthcheck passed before backend started (local Docker daemon required `sudo`, no docker group membership on this host)
2. ✅ `curl localhost:8000/health` → `{"status":"ok"}`
3. ✅ `curl -X POST localhost:8000/screen/ckd_stage4_dialysis_referral -H "X-API-Key: dev-local-key"` → 4 candidates scored: 3 clean matches (score 1.0, `escalation.required: false`) + 1 correctly flagged with `escalation.required: true` (missing eGFR lab value, unverified note-based claim)
4. ✅ `curl "localhost:8000/candidates?intervention_id=ckd_stage4_dialysis_referral"` → full evidence trail returned (`structured_ehr_data`/`structured_lab_data`/`clinical_notes` sources), status `flagged`
5. ✅ `curl -X POST localhost:8000/candidates/<patient_key>/finalize -d '{"intervention_id":"ckd_stage4_dialysis_referral","status":"approved","confirmed_by":"test-verification"}'` → accepted, entry appended to `logs/candidate_dispositions.jsonl` (finalize requires `intervention_id` in the body — composite PK; README updated to reflect this)
6. ✅ `curl localhost:8080/` → HTTP 200, dashboard HTML + `app.js` served correctly by nginx
7. ✅ `docker compose logs backend` → clean startup, `[startup] seeded 8 synthetic patients`, no errors

## Stage C (partial): Groq chatbot + load test (Steps 11 extension, 16)

**Context:** Swapped the Anthropic-shaped LLM stub for Groq (`openai/gpt-oss-120b`), and added a coordinator chatbot on top of the existing candidate data, per explicit user request. Also added a k6 load test targeting the new `/chat` endpoint (user chose chat-only scope, not the full API surface).

**Decisions:**
- `GROQ_API_KEY`/`GROQ_MODEL` supplied as blank `.env.example` placeholders only (same graceful-degradation pattern as before) — no live key was set for this pass, so both evidence extraction and chat run their stub paths.
- Chatbot is stateless/single-turn (no conversation memory) — consistent with the "backend + minimal frontend" scope already agreed for this case study.
- Chat answers are grounded only in `candidate-api` data (same evidence-grounding rule as `claims[]`), never free-form LLM knowledge.
- Load test covers `/chat` only, not `/screen`/`/candidates`/`/finalize` — user's explicit choice.

**Files:**
- `backend/src/groq_client.py` (new) — Groq client + `chat_completion()`, `None` if no key.
- `backend/src/chatbot.py` (new) — `answer(message, intervention_id)`, builds context from `db.get_candidates()`.
- `backend/src/evidence_extraction.py` — swapped `anthropic` → `groq_client` in `_note_based_claim`.
- `backend/src/models.py` — added `ChatRequest`.
- `backend/src/api/main.py` — added `POST /chat`.
- `backend/requirements.txt` — `anthropic==0.40.0` → `groq==1.7.0`.
- `.env.example`, `docker-compose.yml` — `ANTHROPIC_API_KEY` → `GROQ_API_KEY`/`GROQ_MODEL`.
- `frontend/index.html`, `app.js`, `style.css` — chat panel (input + answer + citations).
- `.claude/agents/backend.md`, `frontend.md` — ownership extended to `chat-api`/chat panel.
- `load-test/chat_load_test.js` (new) — k6 script, ramps 5→20 VUs, thresholds `p(95)<5000ms` and `<1%` error rate.

**Verification — completed 2026-09-26, all steps passed:**
1. ✅ Rebuilt backend/frontend images (`docker compose build backend frontend`) and restarted the stack — clean startup, `[startup] seeded 0 synthetic patients` (already seeded from Stage B run), no import errors from the `anthropic` → `groq` swap.
2. ✅ `curl -X POST localhost:8000/screen/ckd_stage4_dialysis_referral` — same 4-candidate output shape as before the swap; evidence extraction unaffected.
3. ✅ `curl -X POST localhost:8000/chat -d '{"message":"...","intervention_id":"ckd_stage4_dialysis_referral"}'` → `{"answer": "(unverified — no GROQ_API_KEY set) ...4 candidate(s)...", "grounded_on": ["pk_7a75ab93bf60", "pk_2be032c55a94", "pk_e3d618ba0daa", "pk_3b4b19671e02"]}` — correctly grounded on the real screened candidates, degrades gracefully with no key.
4. ✅ `curl localhost:8080/` → chat panel HTML (`#chat-panel`, `#chat-input`, `#chat-ask-btn`) served correctly.
5. ✅ `k6 run load-test/chat_load_test.js` (ramp 5→20 VUs over ~70s): 927 requests, **0% failure**, `p(95)=18.42ms` (well under the 5000ms threshold — fast because this measured the stub path; a live `GROQ_API_KEY` would show real model latency instead), both thresholds (`http_req_duration p(95)<5000`, `http_req_failed rate<0.01`) passed.
6. ✅ `docker compose logs backend` — no errors.

### Addendum: in-UI Groq key + load test controls

**Context:** Setting the key and running a load test both required shell/file access. Added dashboard controls per explicit user request: a "Save Key" button (runtime-only, in-memory — not persisted to disk, per user's choice) and a "Run Load Test" button (built-in concurrent self-test via `httpx`/`asyncio`, no `k6` install needed in the backend image, per user's choice).

**Files:**
- `backend/src/groq_client.py` — added `set_api_key(api_key, model=None)`, rebuilds the module-level client in place.
- `backend/src/load_test.py` (new) — `run(concurrency, requests_per_worker, intervention_id, api_key)`, fires concurrent self-requests at `/chat`, returns latency/error summary.
- `backend/src/models.py` — added `GroqKeyUpdate`, `LoadTestRequest`.
- `backend/src/api/main.py` — added `POST /config/groq-key`, `POST /loadtest/chat` (both gated by the existing `require_api_key`, clamped to sane max concurrency/requests).
- `backend/src/chatbot.py`, `backend/src/evidence_extraction.py` — wrapped the Groq call in `try/except` so an invalid/expired key degrades gracefully (same pattern as the "no key" stub) instead of a bare 500 — found and fixed during verification below.
- `frontend/index.html`, `app.js`, `style.css` — new `#settings-panel` (key input + Save Key, Run Load Test button + result display).
- `.claude/agents/backend.md`, `frontend.md` — ownership extended.

**Bug found and fixed during verification:** setting a bad/fake key via `/config/groq-key` and then calling `/chat` crashed with an unhandled `groq.AuthenticationError` → bare `500 Internal Server Error`. Fixed by catching the exception in `chatbot.answer` and `evidence_extraction._note_based_claim`, returning a clear degraded message instead (`"(Groq call failed: AuthenticationError — check GROQ_API_KEY) ..."`), consistent with the existing graceful-degradation philosophy for the no-key case.

**Verification — completed 2026-09-26, all steps passed:**
1. ✅ Rebuilt and restarted backend/frontend — clean startup.
2. ✅ `POST /loadtest/chat {"concurrency":5,"requests_per_worker":3}` → `{"total_requests":15,"successful":15,"errors":0,"error_rate":0.0,"avg_ms":20.98,"p95_ms":40.72,"max_ms":40.72}`.
3. ✅ `POST /config/groq-key {"api_key":"test-key-not-real"}` → `{"configured":true}`; subsequent `/chat` call reached Groq for real (confirmed via backend logs: `groq.AuthenticationError: ... 'Invalid API Key'`), proving the runtime client was actually swapped — then, after the fix above, returned a clean degraded answer instead of a 500.
4. ✅ `curl localhost:8080/` → `#settings-panel` HTML served correctly.
5. ✅ `docker compose logs backend` grep for the literal fake key string → not found — confirms the key is never logged.
6. ✅ Restarted backend afterward to clear the fake test key back to the unconfigured/default state (runtime-only, as designed — a real restart would do the same to any live key set only via the UI, which is why `.env` remains the way to set a key that survives a restart).

### Addendum: dashboard visual redesign

**Context:** Purely cosmetic pass on `frontend/` per explicit user request ("give a very nice UI") — no backend or API changes, no element IDs renamed, all existing behavior (screening, chat, key-saving, load-testing) preserved.

**Changes:** Two-column responsive layout (candidate list + sticky sidebar), branded top bar, card-based candidate list with patient-key avatars/status badges/hover elevation, styled chat and collapsible settings panels, consistent button/color system via CSS custom properties. `frontend/index.html`, `style.css` rewritten; `frontend/app.js` updated only to match new class names (avatar initials, candidate count badge, approve/reject button styling) — no functional/API changes.

**Verification — completed 2026-09-26:** rebuilt+restarted the frontend container; `curl localhost:8080/` returns 200 with all JS-dependent element IDs intact (`candidate-list`, `intervention-select`, `screen-btn`, `refresh-btn`, `chat-input`, `chat-ask-btn`, `chat-answer`, `groq-key-input`, `save-key-btn`, `save-key-status`, `loadtest-btn`, `loadtest-result`); `style.css`/`app.js` both 200; re-ran `/screen` and `/candidates` against the backend to confirm no regression. No browser/screenshot tool is available in this environment, so visual appearance was not confirmed by rendering — only markup/CSS correctness and ID integrity.

### Addendum: prompt-engineering pass (Step 19)

**Context:** Reviewed the two live LLM call sites (`chatbot.py`'s `SYSTEM_PROMPT`, `evidence_extraction.py`'s note-based-claim prompt) and tightened both — no code-path/API changes, stub-degradation behavior unchanged.

**Changes:**
- `chatbot.py::SYSTEM_PROMPT` — added explicit scope-limiting ("never answer questions unrelated to these candidates"), an exact-citation-format instruction (cite `patient_key` exactly as it appears, e.g. `pk_abc123def456`), a "no markdown, plain text only" output constraint, and an explicit fallback instruction ("if the data doesn't answer the question, say so rather than guessing") — previously the prompt stated the grounding rule but not the refusal/format/citation specifics.
- `evidence_extraction.py::_note_based_claim` — reworded the per-call task prompt to explicitly forbid inference and outside medical knowledge, forbid repeating the instructions back, and require an explicit one-sentence fallback when the snippet doesn't address the criterion — previously the prompt only asked for "one sentence" without guarding against the model inferring beyond the snippet or echoing instructions.

**Verification — completed 2026-09-26, all steps passed:**
1. ✅ Rebuilt and restarted `backend` — clean startup, no import/startup errors.
2. ✅ `POST /screen/ckd_stage4_dialysis_referral` → `screened: 3`, same shape/behavior as before (stub path, no live `GROQ_API_KEY` set this pass).
3. ✅ `POST /chat` → correctly grounded stub answer, `grounded_on` unchanged.
4. ✅ `docker compose logs backend` — no errors.

No live `GROQ_API_KEY` was set this pass, so both prompts currently only exercise their stub/degraded paths; the wording changes take effect the next time a real key is configured (via `.env` or the in-UI Save Key control).

### Addendum: knowledge vault (Step 17)

**Context:** Added an Obsidian-readme-mode knowledge vault, mirroring the pattern already established
in the sibling `day 4 /Agentic_RAG_6th_POC` project's own `knowledge-vault/`. A map, not a copy — every
entry links (via `[[wikilinks]]`) to this project's real source-of-truth docs rather than duplicating
their content.

**Files (new):**
- `knowledge-vault/Home.md` — entry point, links to `PLAN.md`, `CLAUDE.md`, `detailed-plan.md`,
  `README.md`, the governance skill/hook docs, and the vault-native pages below.
- `knowledge-vault/Architecture-Decisions.md` — short rationale-per-decision entries (Groq swap,
  synthetic FHIR seed data, hashing-based embeddings, name+DOB linkage vs. `splink`, safe rule
  evaluator vs. `eval()`, runtime vs. dev-time human gate, manual code review, built-in load-test
  self-test), each linking back to where the decision is implemented.
- `knowledge-vault/Roadmap.md` — a step-status table mirroring this doc's own 20-step table, for a
  vault-only navigation view.

**Verification — completed 2026-09-26:** confirmed no content was duplicated (every vault page links
out rather than re-explains); confirmed every referenced path (`PLAN.md`, `CLAUDE.md`, `README.md`,
`.claude/agents/*.md`, `.claude/skills/qualified-health-eligibility-principles/references/*.md`,
`reports/code-review/2026-09-26-code-review.md`) actually exists in this repo.

### Addendum: demo script (Step 20)

**Context:** Wrote a first-user demo walkthrough at project root (`DEMO.md`), covering the full
golden path in the order a first-time viewer would actually click through it.

**Content:** setup (`docker compose up`) → screen a population → review the structured/note-based
evidence trail → approve/reject via the runtime human gate → re-screen to show finalized
candidates are skipped (cost-aware) → ask the chatbot (stub vs. live-key answer) → optionally set a
live Groq key via Settings → run the built-in load test → wrap-up talking points pointing at
`knowledge-vault/Home.md` and `detailed-plan.md` for anyone who wants the full architecture/history.

**Verification — completed 2026-09-26:** confirmed every command in the script (`docker compose
build/up`, `curl localhost:8000/health`) matches the already-verified commands in this doc and
`README.md`; confirmed the two seeded intervention IDs referenced (`ckd_stage4_dialysis_referral`,
`hfref_advanced_therapy_referral`) exist in `db/init/002_seed.sql`; confirmed all referenced UI
elements (intervention dropdown, Screen/Refresh buttons, chat panel, Settings panel with Save Key
and Run Load Test) exist in `frontend/index.html`.

### Addendum: plugin packaging (Steps 9/10)

**Context:** Packaged the Stage A governance scaffold (skills, hooks, subagents) as a standalone,
installable plugin, mirroring the sibling `day 4 /Agentic_RAG_6th_POC` project's own
`plugins/pharma-rag-governance/` template. Pure packaging — the live `.claude/` config that this
project actually runs on is untouched; the plugin is a self-contained copy for reuse in other
projects.

**Files (new):** `plugins/qualified-health-governance/plugin.json` (name/version/description,
`skills`/`agents`/`hooks` path lists, `requires.data_files` for the two files
`check_allowlist_retrieval.py` reads: `data/allowlist/sources.json`, `data/schema/response_schema.json`);
`plugins/qualified-health-governance/agents/{backend,frontend,p3-triage}.md`;
`plugins/qualified-health-governance/hooks/*.py` (all 7); `plugins/qualified-health-governance/skills/
qualified-health-eligibility-principles/` (full copy incl. `references/`).

**Verification — completed 2026-09-26:** ran an inline Python check confirming `plugin.json` parses
as valid JSON and every path it references (`skills`, `agents`, hook commands, `requires.data_files`)
exists on disk. Result: all referenced paths exist.

### Addendum: MCP server + registration (Steps 13/14)

**Context:** Built a read-only MCP server exposing this project's candidate/intervention data for
inspection from an MCP client, mirroring the sibling day4 project's `pharma-governance-mcp` template.
Deliberately excludes `/screen` (can trigger real Groq spend) and `/candidates/{patient_key}/finalize`
(the app's human-in-the-loop approve/reject gate) as tools — this server can only read, never trigger
spend or bypass the finalize gate, consistent with the rationale already recorded in
`knowledge-vault/Architecture-Decisions.md`.

**Files (new):**
- `backend/src/db.py` — added `list_interventions()` (thin `SELECT ... FROM eligibility_criteria`),
  so the MCP server has a "list all" query to wrap without duplicating SQL.
- `mcp-servers/qualified-health-mcp/server.py` — `FastMCP("qualified-health")` with 4 tools
  (`list_interventions`, `get_candidates`, `get_candidate_evidence`, `get_disposition_log`), each a
  thin wrapper over the corresponding `backend/src/db.py` function (imported directly via `sys.path`
  insertion — no SQL duplication).
- `mcp-servers/qualified-health-mcp/requirements.txt` (`mcp`, `asyncpg`) and `README.md` (tool list +
  read-only rationale + run/register instructions).
- `.mcp.json` (project root) — registers `qualified-health` as a stdio server
  (`python3 mcp-servers/qualified-health-mcp/server.py`), passing `CLAUDE_PROJECT_DIR` and
  `DATABASE_URL` (defaults to the already-published host port `5432`).

**Verification — completed 2026-09-26:** ran a live smoke test importing `server.py` and calling all
4 tool functions directly against the running Docker Postgres instance: `list_interventions()`
returned both seeded interventions; `get_candidates('ckd_stage4_dialysis_referral')` returned 4 real
candidates; `get_candidate_evidence` returned a full evidence record; `get_disposition_log(5)`
returned 2 real disposition-log entries.

### Addendum: observability (Step 15)

**Context:** Added OpenTelemetry instrumentation to the backend and a standalone, self-hosted SigNoz
stack to receive it, adapted from the sibling `day 4 /Agentic_RAG_6th_POC` project's own
`backend/src/observability/otel.py` + `docker-compose.observability.yml`. Non-invasive by design: the
default `docker compose up -d` flow is completely unaffected unless a user explicitly opts in.

**Design deviation from the day4 template (deliberate, documented here):** day4's backend runs
un-containerized (plain `uvicorn` on the host), so it reaches the collector's host-published port via
plain `localhost:4317`. This project's backend **is** containerized, so instead of day4's approach of
merging compose files onto one shared network, the two stacks stay fully decoupled — separate compose
projects, separate networks, neither can regress the other by starting/stopping. The backend reaches
the standalone SigNoz stack via `extra_hosts: ["host.docker.internal:host-gateway"]` +
`OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4317`, hitting the ingester's host-published
port from inside the container. SigNoz's UI is also remapped to host port `8089` (day4 uses `8080`,
which this project's own frontend already occupies).

**Files (new):**
- `backend/src/observability/otel.py` — manual OTel SDK bootstrap: module-level `tracer`/counter/
  histogram globals backed by no-op proxies until `init_observability()` installs real providers;
  wrapped in try/except so failures are purely additive. Domain metrics: `qh.screen.requests`,
  `qh.screen.duration`, `qh.screen.escalations`, `qh.chat.requests`, `qh.chat.duration`,
  `qh.finalize.count`. Treats a blank/unset `OTEL_EXPORTER_OTLP_ENDPOINT` as "disabled" and skips
  exporter construction entirely (see bug fix below), rather than day4's log-trace-correlation
  feature, which was deliberately left out here as a scope reduction.
- `observability/signoz/` — vendored ingester/ClickHouse/Keeper config, copied from day4's own copy
  of the SigNoz Foundry reference compose.
- `docker-compose.observability.yml` (project root) — standalone SigNoz stack (`qh-observability`
  project name, `qh-signoz-*` container/volume names, UI on `8089`). Run independently:
  `docker compose -f docker-compose.observability.yml up -d`.
- `backend/requirements.txt` — added `opentelemetry-api`, `opentelemetry-sdk`,
  `opentelemetry-exporter-otlp-proto-grpc` (all `1.44.0`).
- `.env.example` — added blank-default `OTEL_EXPORTER_OTLP_ENDPOINT=` and
  `OTEL_SERVICE_NAME=qualified-health-backend`, matching the existing `GROQ_API_KEY` graceful-
  degradation pattern.
- `docker-compose.yml` — `backend` service: added the two blank-default OTel env vars and
  `extra_hosts: ["host.docker.internal:host-gateway"]`.
- `backend/src/api/main.py` — `init_observability()` called once in `lifespan`; `/screen`, `/chat`,
  `/finalize` handlers wrapped in `tracer.start_as_current_span(...)` and instrumented with the
  counters/histograms above (escalation count derived from each screened candidate's
  `escalation.required` flag).

**Bug found and fixed during verification:** Compose passes `OTEL_EXPORTER_OTLP_ENDPOINT:-` through
as an actual empty-string env var, not an unset one — so `os.environ.get(key, default)` in `otel.py`
never fell back to its default and instead tried to build a gRPC exporter with an empty endpoint,
producing noisy `dns:///` errors on every startup. Fixed by treating a blank value as explicitly
disabled (`OTLP_ENDPOINT = os.environ.get(...) or ""`, and `init_observability()` returns immediately,
no-op, when `OTLP_ENDPOINT` is empty) instead of trying to construct exporters against nothing.

**Verification — completed 2026-09-26, all steps passed:**
1. ✅ Rebuilt and started the default stack alone (no observability) — clean startup, zero log noise,
   `/health`, `/candidates`, `/screen`, `/chat` all verified working exactly as before.
2. ✅ Brought up `docker-compose.observability.yml` standalone — all 6 containers reached healthy.
3. ✅ Completed SigNoz's one-time first-run setup via its `/api/v1/register` endpoint (a fresh SigNoz
   install has `setupCompleted: false` and its OpAMP agent-config handshake fails with "cannot create
   agent without orgId" until an org/admin account exists — expected first-run behavior, not a bug).
4. ✅ Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4317` and restarted `backend` —
   confirmed connectivity end-to-end (`host.docker.internal` resolves correctly from inside the
   container via `extra_hosts`, and the collector's OTLP gRPC receiver was reachable once its pipeline
   was actually running post-setup).
5. ✅ Generated real traffic against `/screen`, `/chat`, and `/candidates/{patient_key}/finalize`, then
   queried ClickHouse directly: 20 real `screen`/`chat` spans landed under `serviceName =
   'qualified-health-backend'`; all 14 expected `qh.*` metric series (including
   `qh.screen.escalations` and `qh.finalize.count`) were present in `signoz_metrics`.
6. ✅ Tore the observability stack down (`docker compose -f docker-compose.observability.yml down`)
   and restarted `backend` with `OTEL_EXPORTER_OTLP_ENDPOINT` back to blank — confirmed clean startup
   (no gRPC error noise) and `/health`/`/screen` still work, proving the default stack is fully
   independent of whether the observability stack has ever run.
