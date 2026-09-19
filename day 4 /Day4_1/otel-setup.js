'use strict';

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-grpc');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require('@opentelemetry/semantic-conventions');
const { metrics } = require('@opentelemetry/api');
const { HostMetrics } = require('@opentelemetry/host-metrics');

// Points at the OTel Collector's OTLP/gRPC receiver from docker-compose.yaml.
const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'localhost:4317';

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: 'sip-calculator',
  [ATTR_SERVICE_VERSION]: '1.0.0',
});

const sdk = new NodeSDK({
  resource,
  traceExporter: new OTLPTraceExporter({ url: OTLP_ENDPOINT }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: OTLP_ENDPOINT }),
    exportIntervalMillis: 10000,
  }),
  // Auto-instruments http/express now; picks up any DB client added later
  // (pg, mysql2, mongodb, etc.) with zero extra config.
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
console.log(`[otel-setup] OpenTelemetry SDK started, exporting to ${OTLP_ENDPOINT}`);

// Basic system metrics (CPU, memory, event loop lag) via the SDK's own
// global MeterProvider, grabbed after sdk.start() registers it.
const meterProvider = metrics.getMeterProvider();
const hostMetrics = new HostMetrics({ name: 'sip-calculator-host-metrics', meterProvider });
hostMetrics.start();
console.log('[otel-setup] Host metrics collection started');

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[otel-setup] SDK shut down'))
    .catch((err) => console.error('[otel-setup] Error shutting down SDK', err))
    .finally(() => process.exit(0));
});
