# Qualified Health — Candidate Identification

See `PLAN.md` for the HLD/LLD and `detailed-plan.md` for the 20-step build roadmap and status.

## Delegation

| Request shape | Delegate to | Notes |
|---|---|---|
| Ingestion, record-linkage, eligibility rules, evidence extraction, or API logic | `backend` | Owns `data/schema/response_schema.json` |
| Coordinator dashboard UI, candidate/evidence display | `frontend` | Never touches backend or data files |
| "Run triage", "check compliance", "review the audit log" | `p3-triage` | Read-only reviewer |
| A change that touches the schema **and** its UI | `backend` first, then `frontend` | Sequential — frontend depends on the finalized (and human-approved) schema shape |

## Governance

- Retrieval, human-gate, and lifecycle hooks: `.claude/hooks/`, wired in `.claude/settings.json`.
- Domain principles: `.claude/skills/qualified-health-eligibility-principles/`.
- Subagent context contract and context-trimming rules: `.claude/skills/qualified-health-eligibility-principles/references/`.

## Running locally

```
cp .env.example .env   # optionally set ANTHROPIC_API_KEY for live evidence extraction
docker compose build
docker compose up -d
```

- Backend: `http://localhost:8000` (send `X-API-Key: dev-local-key`)
- Frontend: `http://localhost:8080`
- Postgres seeds itself with 2 interventions + 8 synthetic patients on first backend startup.
- The Groq key can also be set live from the dashboard's Settings panel (`POST /config/groq-key`) — takes effect immediately, no restart needed. It's runtime/in-memory only (lost on restart); `.env` is still the way to set a key that persists.

Smoke test:

```
curl localhost:8000/health
curl -X POST localhost:8000/screen/ckd_stage4_dialysis_referral -H "X-API-Key: dev-local-key"
curl "localhost:8000/candidates?intervention_id=ckd_stage4_dialysis_referral" -H "X-API-Key: dev-local-key"
curl -X POST localhost:8000/candidates/<patient_key>/finalize \
  -H "X-API-Key: dev-local-key" -H "Content-Type: application/json" \
  -d '{"intervention_id":"ckd_stage4_dialysis_referral","status":"approved","confirmed_by":"<name>"}'
```

## Load testing

```
k6 run load-test/chat_load_test.js
```

Targets `POST /chat` (`BASE_URL`/`API_KEY`/`INTERVENTION_ID` overridable via `-e`). Without `GROQ_API_KEY` set, this measures the stub-answer path's latency, not real Groq latency.

The dashboard also has a "Run Load Test" button (Settings panel) — a lighter, built-in alternative that fires concurrent requests at `/chat` from inside the backend itself (`POST /loadtest/chat`) and shows a latency/error-rate summary in the page. No `k6` install required; use the script above for a more rigorous external run.

## Reports

`reports/v1_vs_v2_comparison.pdf` — comparison of V1 (the complete AIDLC build: every step of
`detailed-plan.md`'s 20-step roadmap except graphify) vs V2 (V1 plus a Groq chatbot, load testing, and a
dashboard redesign). Source content lives in `v1_vs_v2_comparison.md`; regenerate the PDF with
`python3 reports/generate_report.py` (requires `fpdf2`, `pip install fpdf2`).

## Scope boundary

Per `CLAUDE.md`, this folder is self-contained — independent of the other `day5/` case studies.
