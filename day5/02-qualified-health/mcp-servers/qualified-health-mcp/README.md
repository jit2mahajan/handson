# qualified-health-mcp

A small MCP server (Python, official `mcp` SDK, `FastMCP`) exposing this project's candidate/
intervention data as callable tools, backed directly by `backend/src/db.py`'s existing query
functions — no SQL is duplicated here.

## Tools

- `list_interventions()` — every configured intervention (id, name, rules, required evidence).
- `get_candidates(intervention_id=None)` — scored candidates, optionally filtered, ranked by score.
- `get_candidate_evidence(patient_key, intervention_id)` — one candidate's full evidence trail.
- `get_disposition_log(limit=50)` — tails the human-in-the-loop approve/reject audit log.

## Deliberately read-only

`/screen` (can trigger real Groq spend) and `/candidates/{patient_key}/finalize` (the app's
human-in-the-loop approve/reject gate) are **not** exposed as tools. This server is for inspection
— it can't trigger LLM spend or bypass the finalize gate that decides a real clinical disposition.

## Run

```
pip install -r requirements.txt
DATABASE_URL=postgresql://qh:qh@localhost:5432/qualified_health python3 server.py
```

Requires the Postgres container to be reachable (the default `docker-compose.yml` already
publishes it on host port `5432`).

## Register

See `.mcp.json` at the project root.
