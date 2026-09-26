"""OpenTelemetry SDK bootstrap for the Qualified Health backend (Step 15).

Adapted from the sibling day4 project's own `observability/otel.py`. This
module is the only place that touches the OTel SDK directly — `api/main.py`
imports plain tracer/counter objects from here and uses them unconditionally.
That's safe because of two properties of the OTel Python SDK itself:

1. `trace.get_tracer(...)` / `metrics.get_meter(...)` return no-op proxy
   objects until a real provider is installed, so every span/counter call
   here is safe whether or not `init_observability()` ever ran or succeeded.
2. Once a real provider is installed, export happens on the SDK's own
   background threads (`BatchSpanProcessor`, `PeriodicExportingMetricReader`)
   — an unreachable collector logs a warning there, never on the thread
   serving `/screen`/`/chat`/`/finalize`. Observability failures are
   therefore additive by construction.

Configure the OTLP endpoint via `OTEL_EXPORTER_OTLP_ENDPOINT` — unset (the
default), `init_observability()` still runs but exports to nothing reachable
and only logs export warnings; there is deliberately no separate on/off
switch, since a down/unset collector is already harmless by construction.
"""
from __future__ import annotations

import logging
import os

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import SERVICE_NAME as _SERVICE_NAME_KEY
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

_LOG = logging.getLogger("qh.observability")

SERVICE_NAME = os.environ.get("OTEL_SERVICE_NAME") or "qualified-health-backend"
OTLP_ENDPOINT = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") or ""
METRIC_EXPORT_INTERVAL_MS = int(os.environ.get("OTEL_METRIC_EXPORT_INTERVAL_MS", "15000"))

tracer = trace.get_tracer("qh.backend")
_meter = metrics.get_meter("qh.backend")

screen_requests_counter = _meter.create_counter(
    "qh.screen.requests",
    unit="1",
    description="Total POST /screen requests handled.",
)

screen_duration_histogram = _meter.create_histogram(
    "qh.screen.duration",
    unit="ms",
    description="POST /screen end-to-end latency in milliseconds.",
)

# escalation_rate = sum(qh.screen.escalations) / sum(qh.screen.requests) —
# derived at query time in a SigNoz dashboard rather than tracked as a
# separately-computed rate metric.
screen_escalations_counter = _meter.create_counter(
    "qh.screen.escalations",
    unit="1",
    description="Count of screened candidates whose escalation.required was true.",
)

chat_requests_counter = _meter.create_counter(
    "qh.chat.requests",
    unit="1",
    description="Total POST /chat requests handled.",
)

chat_duration_histogram = _meter.create_histogram(
    "qh.chat.duration",
    unit="ms",
    description="POST /chat end-to-end latency in milliseconds.",
)

finalize_counter = _meter.create_counter(
    "qh.finalize.count",
    unit="1",
    description="Total POST /candidates/{patient_key}/finalize calls, labelled by status "
    "(approved|rejected) — the human-in-the-loop disposition gate.",
)

_initialized = False


def init_observability() -> None:
    """Install real OTel SDK providers exporting to OTLP_ENDPOINT.

    Best-effort and idempotent; never raises — any failure to construct the
    exporters/providers is logged and swallowed so the FastAPI app always
    starts and every route always works, collector or no collector.
    """
    global _initialized
    if _initialized:
        return

    if not OTLP_ENDPOINT:
        _LOG.info("OTEL_EXPORTER_OTLP_ENDPOINT not set; observability disabled (no-op).")
        _initialized = True
        return

    try:
        resource = Resource.create({_SERVICE_NAME_KEY: SERVICE_NAME})
        insecure = not OTLP_ENDPOINT.lower().startswith("https")

        tracer_provider = TracerProvider(resource=resource)
        span_exporter = OTLPSpanExporter(endpoint=OTLP_ENDPOINT, insecure=insecure)
        tracer_provider.add_span_processor(BatchSpanProcessor(span_exporter))
        trace.set_tracer_provider(tracer_provider)

        metric_exporter = OTLPMetricExporter(endpoint=OTLP_ENDPOINT, insecure=insecure)
        metric_reader = PeriodicExportingMetricReader(
            metric_exporter, export_interval_millis=METRIC_EXPORT_INTERVAL_MS
        )
        meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
        metrics.set_meter_provider(meter_provider)

        _initialized = True
        _LOG.info("OpenTelemetry initialized, exporting to %s", OTLP_ENDPOINT)
    except Exception:  # noqa: BLE001 - observability must never break the app
        _LOG.warning(
            "OpenTelemetry initialization failed; continuing without trace/metric "
            "export (the app is unaffected — this only disables observability).",
            exc_info=True,
        )
