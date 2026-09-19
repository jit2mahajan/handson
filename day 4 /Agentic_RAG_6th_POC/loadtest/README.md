# Load testing

k6 load test for `POST /query`, exercising three scenarios against a running backend.

## Prerequisites

- [k6](https://k6.io/docs/get-started/installation/) installed.
- Backend running (`backend/src/api/main.py` via `uvicorn`), reachable at `API_BASE_URL` (default `http://localhost:8000`).

## Run

```bash
# steady load: 10 VUs for 5 minutes
k6 run -e K6_SCENARIO=steady loadtest/k6/query_load_test.js

# spike: ramp 5 -> 100 -> 5 VUs over ~2.5 minutes
k6 run -e K6_SCENARIO=spike loadtest/k6/query_load_test.js

# soak: 15 VUs for 30 minutes
k6 run -e K6_SCENARIO=soak loadtest/k6/query_load_test.js

# against a non-default backend
k6 run -e API_BASE_URL=http://localhost:9000 -e K6_SCENARIO=steady loadtest/k6/query_load_test.js
```

## SLO thresholds (enforced by the script, k6 exits non-zero on breach)

| Metric | Threshold | Rationale |
|---|---|---|
| `http_req_duration` p95 | < 3000ms | Query involves multi-source retrieval + grounding; 3s is the POC's user-facing latency budget |
| `http_req_failed` rate | < 1% | Backend errors (5xx, timeouts) should be rare under normal load |
| `escalation_rate` | < 50% | Sanity bound — if most queries escalate under load, that's a functional regression, not expected behavior, given the fixed query mix used here |
| `insufficient_evidence_rate` | < 30% | Same rationale — a spike here under load (vs. baseline) suggests retrieval degrading, not the questions getting harder |

These are POC-level bounds, not production SLOs — tune once real usage patterns and query mixes are known. `escalation_rate` and `insufficient_evidence_rate` are read from the `answer_status` field k6 sees in each response; they are not a substitute for the allowlist-deny-rate panel in the observability dashboard (step 15), which is measured server-side and isn't visible to an external load-test client.

## Query mix

Four fixed queries in `query_load_test.js`, one per evidence domain, chosen at random per iteration — not meant to be a representative eval set (see `backend/tests/eval_queries.jsonl` for that), just enough domain spread to exercise all four retrieval paths under load.
