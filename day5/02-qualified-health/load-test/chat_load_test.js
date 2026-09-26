import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:8000";
const API_KEY = __ENV.API_KEY || "dev-local-key";
const INTERVENTION_ID = __ENV.INTERVENTION_ID || "ckd_stage4_dialysis_referral";

const QUESTIONS = [
  "which patients are eligible for this referral and why?",
  "list any escalated candidates and the reason for escalation",
  "what lab values support eligibility for the top-scored patient?",
  "are there any patients with missing evidence?",
];

export const options = {
  stages: [
    { duration: "15s", target: 5 },
    { duration: "15s", target: 20 },
    { duration: "30s", target: 20 },
    { duration: "10s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
  const res = http.post(
    `${BASE_URL}/chat`,
    JSON.stringify({ message: question, intervention_id: INTERVENTION_ID }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
    }
  );
  check(res, {
    "status is 200": (r) => r.status === 200,
    "has answer field": (r) => JSON.parse(r.body).answer !== undefined,
  });
  sleep(1);
}
