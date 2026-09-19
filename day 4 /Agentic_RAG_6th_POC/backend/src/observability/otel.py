"""OpenTelemetry SDK bootstrap for the AIDLC backend (step 15).

This module is deliberately the *only* place that touches the OTel SDK
directly. Everything else in the backend (`api/main.py`,
`orchestrator/orchestrator.py`, `utils/allowlist.py`) imports plain
tracer/meter/instrument objects from here and uses them exactly like it
would use any other OTel API object -- it never has to check "is
observability up right now?" because of two properties this module relies
on, both from the OTel Python SDK itself, not anything custom:

1. `trace.get_tracer(...)` / `metrics.get_meter(...)` return proxy objects
   (`ProxyTracer`, `_ProxyMeter`) when called before a real provider has
   been installed. Those proxies -- and the counters/histograms created
   from a proxy meter -- are safe no-ops until `init_observability()`
   installs the real `TracerProvider`/`MeterProvider`, at which point they
   start forwarding automatically. So every span/metric call in this
   backend is safe to make unconditionally, whether or not
   `init_observability()` ever ran or succeeded.
2. Once a real provider *is* installed, span/metric export happens on the
   SDK's own background threads (`BatchSpanProcessor`, sees
   `PeriodicExportingMetricReader`) -- an unreachable OTLP collector (e.g.
   SigNoz not running) makes those background exports fail and log a
   warning, but it never blocks or raises on the request-handling thread
   that called `/query`. Observability failures are therefore additive by
   construction: turning the collector off cannot break the API.

Configure the OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT`
(default `http://localhost:4317`, the SigNoz stack's gRPC ingestion port --
see `docker-compose.observability.yml`). `init_observability()` itself is
wrapped in a top-level try/except so a misconfigured endpoint or an
exporter construction error at startup cannot prevent the FastAPI app from
starting or serving `/health`/`/query`.
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME as _SERVICE_NAME_KEY
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

_LOG = logging.getLogger("aidlc.observability")

SERVICE_NAME = os.environ.get("OTEL_SERVICE_NAME", "aidlc-backend")
OTLP_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317")
METRIC_EXPORT_INTERVAL_MS = int(os.environ.get("OTEL_METRIC_EXPORT_INTERVAL_MS", "15000"))

# --------------------------------------------------------------------------
# Tracer / meter obtained at import time. Safe no-ops until init_observability()
# installs real providers (see module docstring point 1).
# --------------------------------------------------------------------------
tracer = trace.get_tracer("aidlc.backend")
_meter = metrics.get_meter("aidlc.backend")

# --------------------------------------------------------------------------
# Metrics instruments -- created once, module-level, imported by callers.
# --------------------------------------------------------------------------
query_requests_counter = _meter.create_counter(
    "aidlc.query.requests",
    unit="1",
    description="Total POST /query requests handled (labelled by outcome via aidlc.query.answer_status).",
)

query_duration_histogram = _meter.create_histogram(
    "aidlc.query.duration",
    unit="ms",
    description="POST /query end-to-end latency in milliseconds.",
)

# escalation_rate and insufficient_evidence_rate are both derived, at query
# time in the SigNoz dashboard, from this single counter filtered by the
# `answer_status` attribute divided by aidlc.query.requests -- see
# observability/dashboards/README.md. Keeping one labelled counter (rather
# than three separately-named rate metrics) avoids metric proliferation
# while still exposing exactly the two commitments-relevant signals the
# build plan calls out (escalation_rate, insufficient_evidence_rate).
answer_status_counter = _meter.create_counter(
    "aidlc.query.answer_status",
    unit="1",
    description="Count of responses by answer_status (answered | insufficient_evidence | escalated). "
    "escalation_rate = sum(answer_status='escalated') / sum(aidlc.query.requests); "
    "insufficient_evidence_rate is the same pattern with answer_status='insufficient_evidence'.",
)

# allowlist_deny_rate = aidlc.retrieval.allowlist_denied / aidlc.retrieval.attempts.
# This is the server-side measurement of commitment #1 ("retrieve only from
# approved sources") that loadtest/README.md notes an external k6 client
# cannot see -- every retrieval-client call increments `attempts` exactly
# once, and every AllowlistError raised out of
# backend/src/utils/allowlist.py during that call increments `denied`.
retrieval_attempts_counter = _meter.create_counter(
    "aidlc.retrieval.attempts",
    unit="1",
    description="Total retrieval-client calls attempted, one per DOMAIN_CLIENTS callable invocation.",
)

allowlist_denied_counter = _meter.create_counter(
    "aidlc.retrieval.allowlist_denied",
    unit="1",
    description="Retrieval attempts refused because AllowlistError was raised "
    "(backend/src/utils/allowlist.py) -- the numerator of allowlist_deny_rate.",
)

_initialized = False


def init_observability() -> None:
    """Install real OTel SDK providers exporting to OTLP_ENDPOINT.

    Best-effort and idempotent. Safe to call multiple times (e.g. once from
    `main.py` at import time and once from a test fixture) -- only the first
    call takes effect. Never raises: any failure to construct the
    exporters/providers (bad endpoint string, missing optional dependency,
    etc.) is logged and swallowed so the FastAPI app always starts and
    `/query` always works, collector or no collector.
    """
    global _initialized
    if _initialized:
        return

    try:
        resource = Resource.create({_SERVICE_NAME_KEY: SERVICE_NAME})
        insecure = not OTLP_ENDPOINT.lower().startswith("https")

        tracer_provider = TracerProvider(resource=resource)
        span_exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT, insecure=insecure)
        # BatchSpanProcessor exports on its own background thread; a down
        # collector makes that thread log export failures, never the
        # request-handling thread that's actually serving /query.
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
        trace.set_tracer_provider(tracer_provider)

        metric_exporter = OTLPMetricExporter(endpoint=OTLP_ENDPOINT, insecure=insecure)
        metric_reader = PeriodicExportingMetricReader(
            metric_exporter, export_interval_millis=METRIC_EXPORT_INTERVAL_MS
        )
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)

        _install_trace_log_correlation()

        _initialized = True
        _LOG.info("OpenTelemetry initialized, exporting to %s", OTLP_ENDPOINT)
    except Exception:  # noqa: BLE001 - observability must never break the app
        _LOG.warning(
            "OpenTelemetry initialization failed; continuing without trace/metric "
            "export (the app is unaffected -- this only disables observability).",
            exc_info=True,
        )


class _TraceContextFilter(logging.Filter):
    """Attach the active span's trace_id/span_id (hex) to every log record.

    This is the "logs correlated by trace_id" requirement, done without
    pulling in opentelemetry-instrumentation-logging: a logging.Filter is
    enough to stamp every record with the same trace_id the request's spans
    were exported under, so a SigNoz/log backend can join logs to traces.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        ctx = trace.get_current_span().get_span_context()
        if ctx is not None and ctx.is_valid:
            record.trace_id = format(ctx.trace_id, "032x")
            record.span_id = format(ctx.span_id, "016x")
        else:
            record.trace_id = "-"
            record.span_id = "-"
        return True


_log_correlation_installed = False


def _install_trace_log_correlation() -> None:
    global _log_correlation_installed
    if _log_correlation_installed:
        return

    root = logging.getLogger()
    trace_filter = _TraceContextFilter()

    if not root.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s trace_id=%(trace_id)s span_id=%(span_id)s "
                "%(name)s: %(message)s"
            )
        )
        root.addHandler(handler)
        root.setLevel(logging.INFO)

    for handler in root.handlers:
        if not any(isinstance(f, _TraceContextFilter) for f in handler.filters):
            handler.addFilter(trace_filter)

    _log_correlation_installed = True


def get_logger(name: str) -> logging.Logger:
    """Return a logger that will carry trace_id/span_id once observability
    is initialized (and just logs normally, without those fields resolving
    to anything meaningful, if it isn't)."""
    return logging.getLogger(name)
