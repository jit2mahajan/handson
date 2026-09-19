# AIDLC backend dashboard (SigNoz) — manual setup

SigNoz's dashboard-JSON export/import format is versioned internally to the
product and changes across releases (queries are keyed by internal builder
IDs, not just metric names) — hand-authoring a JSON file for it risks
producing something that silently fails to import or imports with broken
panel queries, which is worse than not shipping a dashboard at all. So per
the build plan's own fallback, this is a from-the-UI recipe instead: four
panels, each naming the exact metric, aggregation, and what it means, so
anyone can recreate it in a couple of minutes and know it's actually correct.

All four metrics below are emitted by `backend/src/observability/otel.py`
and exported via OTLP to the collector in `docker-compose.observability.yml`
(default `http://localhost:4317`). Once that stack is running and the
backend has served a few `/query` requests, the metrics will show up in
SigNoz under **Dashboards -> New Dashboard -> New Panel -> Metrics**.

## 1. `/query` latency (p50 / p95)

- **Metric**: `aidlc.query.duration` (histogram, unit `ms`)
- **Panel type**: Time series
- **Query A**: aggregation `p50`, on `aidlc.query.duration`, group by nothing
  (or by `outcome` if you want latency split by answer_status)
- **Query B**: aggregation `p95`, same metric
- **What it means**: end-to-end latency of `POST /query`, measured in
  `backend/src/api/main.py` from the moment the handler starts to the
  moment it returns (covers classification, retrieval, grounding, schema
  validation, and the log write). This is the same latency the k6 load
  test's `http_req_duration` threshold (p95 < 3000ms, see
  `loadtest/README.md`) is checking from the outside — this panel is the
  server-side view of the same number.

## 2. Escalation rate over time

- **Metric**: `aidlc.query.answer_status` (counter) and `aidlc.query.requests` (counter)
- **Panel type**: Time series
- **Formula**:
  `A / B` where
  `A` = `sum(aidlc.query.answer_status{answer_status="escalated"})`
  `B` = `sum(aidlc.query.requests)`
  (both as rate-over-the-selected-window; SigNoz's query builder supports a
  "Formula" tab across two queries — set Query A's filter to
  `answer_status = escalated`, Query B with no filter, then Formula `A/B`)
- **What it means**: fraction of `/query` responses in the window whose
  `answer_status` was `escalated` per `escalation-rules.md` — i.e. the rate
  at which a human had to be pulled in because a clinical/safety claim was
  low-confidence/conflicting or a needed safety source was blocked with no
  allowlisted alternative. Compare against the k6 load test's sanity bound
  (`escalation_rate < 50%`, `loadtest/README.md`) — this panel is the
  authoritative, server-measured version of that same signal, not an
  approximation read off client responses.

## 3. Insufficient-evidence rate over time

- **Metric**: same two counters as above (`aidlc.query.answer_status`,
  `aidlc.query.requests`)
- **Panel type**: Time series
- **Formula**: same pattern, with Query A's filter set to
  `answer_status = insufficient_evidence`
- **What it means**: fraction of responses that were a routine evidence gap
  (no allowlisted source could ground at least one claim) rather than a
  safety-relevant escalation. Compare against the k6 threshold
  (`insufficient_evidence_rate < 30%`).

## 4. Allowlist-deny rate over time

- **Metric**: `aidlc.retrieval.allowlist_denied` (counter) and
  `aidlc.retrieval.attempts` (counter)
- **Panel type**: Time series
- **Formula**: `A / B` where
  `A` = `sum(aidlc.retrieval.allowlist_denied)`
  `B` = `sum(aidlc.retrieval.attempts)`
  (optionally group by the `client` or `domain` attribute to see e.g. that
  `opentargets.search` and `openfda.search_safety` / `openfda.search_approvals`
  currently account for all denials — see the module docstrings in
  `backend/src/retrieval/opentargets.py` and `openfda.py` for the known,
  documented allowlist gaps this reflects today)
- **What it means**: this is the direct, server-side measurement of
  commitment #1 ("retrieve only from approved sources") — every time a
  retrieval client's `require_allowed()` call
  (`backend/src/utils/allowlist.py`) raises `AllowlistError`, that's counted
  here against the total number of retrieval-client calls attempted.
  `loadtest/README.md` explicitly notes this is *not* visible to an
  external k6 client (a blocked source just shows up as a worse
  `answer_status`, with no way to tell from outside whether that was an
  allowlist block or a source genuinely returning nothing) — this panel is
  where it's actually measured.

## Trace / log correlation

Every span (`POST /query`, `domain_classification`,
`retrieval.<module>.<function>`, `grounding`,
`response_assembly_validation`) and every log line the backend emits during
a request carries the same `trace_id` (see the `_TraceContextFilter` in
`backend/src/observability/otel.py`). In SigNoz, open a trace for a given
`/query` call under **Traces**, and cross-reference `trace_id` in
`backend/`'s stdout/uvicorn log for that request — or, once logs are also
shipped to SigNoz (out of scope for this POC pass; see the module docstring
in `otel.py` for why this ships trace-log correlation without the separate
`opentelemetry-instrumentation-logging` package), use SigNoz's own
trace-to-logs link.

## Bringing the stack up

```bash
docker compose -f docker-compose.observability.yml up -d
# UI:        http://localhost:8080
# OTLP gRPC: localhost:4317  (backend's default OTEL_EXPORTER_OTLP_ENDPOINT)
```

Then start the backend as usual (`uvicorn "backend.src.api.main:app"` from
the repo root) — no extra flags needed, it exports to `localhost:4317` by
default. Point it at a different collector with:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://some-other-host:4317 uvicorn "backend.src.api.main:app"
```
