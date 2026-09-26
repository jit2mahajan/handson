# Qualified Health — V1 vs V2 Comparison Report

Candidate Identification & Coordinator Dashboard
Synthetic/demo data only — no real patient information is used anywhere in this system.

## 1. Scope

- **V1** — the complete AIDLC build: every step of `detailed-plan.md`'s 20-step roadmap except Step 18
  (graphify, intentionally excluded — gated behind the `/graphify` skill only). This includes the core
  pipeline (FHIR-shaped ingestion, record linkage, eligibility engine, evidence extraction, candidate API,
  a minimal single-column frontend for candidate list + approve/reject) *and* the full governance/platform
  layer built around it: skills + hooks, backend/frontend/p3-triage subagents with context isolation, a
  delegation table, context trimming, reusable plugin packaging
  (`plugins/qualified-health-governance/`), MCP server registration and a custom read-only MCP server
  (`mcp-servers/qualified-health-mcp/`), OpenTelemetry + SigNoz observability, an Obsidian knowledge
  vault, a prompt-engineering pass, and a first-user demo script (`DEMO.md`). Deployed locally via
  Docker Compose.
- **V2** — everything in V1, plus three additions layered on top: a Groq-backed coordinator chatbot,
  load testing, and a full visual redesign of the dashboard ("good UI"). Runtime (in-memory) Groq-key
  configuration from the UI and a bug fix for ungraceful LLM-error handling ship alongside the chatbot as
  its supporting infrastructure.

## 2. Feature comparison

| Area | V1 | V2 |
|---|---|---|
| LLM provider | Anthropic (env var placeholder only, never live) | Groq `openai/gpt-oss-120b`, live-capable, configurable via `.env` or the UI |
| Evidence extraction | Structured claims (real) + stub placeholder for note-based claims | Structured claims (real) + Groq-verified note statements, or a clearly-marked stub/error message if no key / call fails |
| Chatbot | Not present | `POST /chat` — stateless Q&A grounded only in the current candidate list, every claim cites a `patient_key` |
| Load testing | Not present | External k6 script (`load-test/chat_load_test.js`) + built-in concurrent self-test (`POST /loadtest/chat`), both target `/chat` |
| Runtime key config | Not present (env var + container restart only) | `POST /config/groq-key` — swaps the Groq client in memory, no restart, key never persisted to disk or logged |
| Error handling on LLM calls | N/A — no live LLM calls were ever attempted | Every Groq call wrapped in try/except; failures degrade to a clear stub message instead of a 500 |
| Frontend layout | Single column: header, candidate list, approve/reject buttons | Two-column responsive dashboard: branded top bar, sticky sidebar, card-based candidate list with avatars/status badges, chat panel, collapsible settings panel |
| Frontend styling | Plain borders, flat buttons, minimal color system | CSS custom-property design system (colors/spacing/radius/shadow), hover elevation, consistent button variants |
| API surface | `/health`, `/ingest/{source}`, `/screen/{intervention_id}`, `/candidates`, `/finalize` | Same, plus `/chat`, `/config/groq-key`, `/loadtest/chat` |
| Plugin packaging, MCP server, observability, knowledge vault, prompt-engineering pass, demo | Present — built as part of V1's full-roadmap scope | Unchanged from V1 |
| Governance docs | `backend.md`/`frontend.md` scoped to ingestion/eligibility/candidate-api and dashboard/evidence UI | Ownership extended to `chat-api`, key config, load-test endpoint, chat panel, settings panel |

## 3. New API endpoints in V2

| Endpoint | Method | Purpose | Auth |
|---|---|---|---|
| `/chat` | POST | Coordinator Q&A grounded in candidate data | `X-API-Key` |
| `/config/groq-key` | POST | Runtime, in-memory Groq key/model swap | `X-API-Key` |
| `/loadtest/chat` | POST | Built-in concurrent self-test against `/chat` | `X-API-Key` |

## 4. Load-testing results (V2 only — no baseline exists in V1)

| Run | Tool | Load | Result |
|---|---|---|---|
| 1 | k6 (`chat_load_test.js`) | Ramp 5 -> 20 VUs, ~70s, 927 requests | 0% failure, p(95) = 18.42ms — both thresholds (`p95<5000ms`, `error<1%`) passed |
| 2 | Built-in self-test (`/loadtest/chat`) | 5 concurrent workers x 3 requests = 15 requests | 0% error, avg 20.98ms, p95 40.72ms |
| 3 | Built-in self-test (`/loadtest/chat`, default params) | 50 requests | 0% error rate |

Note: without a live `GROQ_API_KEY`, all runs measured the stub-answer code path's latency, not real
model latency. A live key would show materially higher (network-bound) latency.

## 5. Bug found and fixed during V2 hardening

Setting an invalid/expired Groq key via `/config/groq-key` and then calling `/chat` originally crashed
with an unhandled `groq.AuthenticationError`, surfacing as a bare `500 Internal Server Error`. Fixed by
wrapping every Groq call (`chatbot.answer`, `evidence_extraction._note_based_claim`) in try/except,
returning a clearly-marked degraded message instead — consistent with the graceful-degradation
philosophy already used for the "no key set" case in V1.

## 6. What stayed the same

- Synthetic/dummy FHIR-shaped patient data (2 interventions, ~8 patients) — no real source-system access.
- Docker Compose topology: `postgres` (pgvector) -> `backend` -> `frontend`.
- `X-API-Key` / `hmac.compare_digest` auth on every write endpoint.
- The human-gate finalize flow (`POST /candidates/{patient_key}/finalize`) and its audit log.
- Scope boundary: this case study remains fully independent of other `day5/` folders.

## 7. Known limitations / risks (both versions unless noted)

- All data is synthetic; nothing here has been validated against real clinical records.
- The Groq key set via the UI is runtime-only — lost on backend restart by design; `.env` is the only
  way to set a key that survives a restart (V2).
- Load testing covers `/chat` only, not `/screen`/`/candidates`/`/finalize` — a deliberate scope choice.
- The k6/self-test load-testing results are visible only as raw JSON/console output today; a dedicated
  result dashboard (chart of latency/error-rate over time) is planned but not yet built.

## 8. Planned next (from `detailed-plan.md`, not yet started)

A k6 result dashboard visualization (Step 16, remaining part). Step 18 (graphify knowledge graph) is
intentionally excluded from this project's implementation pass — gated behind the `/graphify` skill
only, per the user's global CLAUDE.md. Every other step of the 20-step roadmap is Done in V1 (see
`detailed-plan.md` and `knowledge-vault/Roadmap.md` for the full step-by-step status and addenda).
