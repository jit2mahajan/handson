# Observability Verification

## 1. Start the backend stack

    docker compose up -d
    docker compose ps   # all 4 containers should be "running"

## 2. Start the app on a non-3000 port (Grafana owns 3000)

    export PORT=4000
    npm run start:otel

Confirm the console prints both:
- `SIP calculator running at http://localhost:4000`
- `[otel-setup] OpenTelemetry SDK started, exporting to localhost:4317`
- `[otel-setup] Host metrics collection started`

## 3. Generate traffic

    curl http://localhost:4000/api/default-rate
    curl -X POST http://localhost:4000/api/calculate \
      -H "Content-Type: application/json" \
      -d '{"monthlyInvestment":5000,"annualReturnRate":12,"years":10}'

Repeat the POST 4-5 times so a trace search has multiple results to show.

## 4. Log into Grafana

Open http://localhost:3000 — login `admin` / `admin`, then set a new
password when prompted (or skip). Prometheus and Tempo datasources are
already provisioned — no manual "Add data source" step needed.

## 5. Confirm traces (Tempo)

Left nav -> **Explore** -> datasource dropdown -> **Tempo** -> Search tab ->
Service Name = `sip-calculator` -> Run query.

**Success looks like:** a list of spans/traces named `GET /api/default-rate`
and `POST /api/calculate`, each with a duration in the low milliseconds and
HTTP status 200 (or 400 if you sent bad input). Clicking a trace shows a
waterfall with at least an `http` span and (thanks to auto-instrumentation)
nested `express` middleware/route-handler spans.

## 6. Confirm metrics (Prometheus)

Same Explore view -> switch datasource to **Prometheus**. Try:

    up{job="otel-collector"}

**Success:** returns `1` — the collector's `/metrics` endpoint (port 8889)
is being scraped.

    system_cpu_utilization{service_name="sip-calculator"}

**Success:** a time series with values between 0 and 1, updating roughly
every 10s (host-metrics export interval) — this is the Node process' host
CPU utilization reported through the SDK's MeterProvider.

    http_server_duration_milliseconds_count{service_name="sip-calculator"}

**Success:** a counter that increases each time you hit `/api/default-rate`
or `/api/calculate` — confirms HTTP auto-instrumentation metrics are
flowing end to end (app -> collector -> Prometheus -> Grafana).

## 7. If nothing shows up

    docker compose logs otel-collector   # check for "failed to export" / connection errors from tempo
    docker compose logs tempo
    docker compose logs prometheus

Also check the `npm run start:otel` terminal for `ECONNREFUSED` on
`localhost:4317` (means the collector container isn't up yet or PORT 4317
isn't published) and re-check `docker compose ps`.

## Cleanup

    docker compose down        # keep volumes
    docker compose down -v     # also wipe Tempo/Prometheus data
