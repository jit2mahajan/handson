import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// Exercises POST /query with steady, spike, and soak scenarios.
// Run one scenario at a time via the K6_SCENARIO env var, e.g.:
//   k6 run -e K6_SCENARIO=steady loadtest/k6/query_load_test.js
//   k6 run -e K6_SCENARIO=spike loadtest/k6/query_load_test.js
//   k6 run -e K6_SCENARIO=soak loadtest/k6/query_load_test.js
// Defaults to "steady" if unset. Point at a different backend with API_BASE_URL.

const BASE_URL = __ENV.API_BASE_URL || "http://localhost:8000";
const SCENARIO = __ENV.K6_SCENARIO || "steady";

const escalationRate = new Rate("escalation_rate");
const insufficientEvidenceRate = new Rate("insufficient_evidence_rate");
const queryDuration = new Trend("query_duration");

const QUERIES = [
  "What is the safety profile of compound X in Phase II trials?",
  "Which targets are validated for indication Y?",
  "What is the chemical structure and solubility of compound Z?",
  "What is the current regulatory status of drug candidate W in the EU?",
];

const SCENARIOS = {
  steady: {
    executor: "constant-vus",
    vus: 10,
    duration: "5m",
  },
  spike: {
    executor: "ramping-vus",
    startVUs: 5,
    stages: [
      { duration: "30s", target: 5 },
      { duration: "30s", target: 100 },
      { duration: "1m", target: 100 },
      { duration: "30s", target: 5 },
    ],
  },
  soak: {
    executor: "constant-vus",
    vus: 15,
    duration: "30m",
  },
};

export const options = {
  scenarios: {
    [SCENARIO]: SCENARIOS[SCENARIO],
  },
  thresholds: {
    http_req_duration: ["p(95)<3000"],
    http_req_failed: ["rate<0.01"],
    escalation_rate: ["rate<0.5"],
    insufficient_evidence_rate: ["rate<0.3"],
  },
};

export default function () {
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];
  const res = http.post(
    `${BASE_URL}/query`,
    JSON.stringify({ query }),
    { headers: { "Content-Type": "application/json" } }
  );

  queryDuration.add(res.timings.duration);

  const ok = check(res, {
    "status is 200": (r) => r.status === 200,
    "response has answer_status": (r) => {
      try {
        return JSON.parse(r.body).answer_status !== undefined;
      } catch {
        return false;
      }
    },
  });

  if (ok) {
    try {
      const body = JSON.parse(res.body);
      escalationRate.add(body.answer_status === "escalated");
      insufficientEvidenceRate.add(body.answer_status === "insufficient_evidence");
    } catch {
      // non-JSON or unexpected shape; already flagged by the check above
    }
  }

  sleep(1);
}
