import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

// sip-calculator has no native token concept, so token cost is estimated from
// request+response payload size using the standard ~4 chars/token heuristic.
const tokensConsumed = new Counter('tokens_consumed');

function trackTokens(res, reqPayload) {
  const reqChars = reqPayload ? reqPayload.length : 0;
  const resChars = res.body ? res.body.length : 0;
  const tokens = Math.ceil((reqChars + resChars) / 4);
  tokensConsumed.add(tokens, { user: `user_${__VU}` });
}

export const options = {
  stages: [
    { duration: '10s', target: 10 }, // ramp-up
    { duration: '40s', target: 10 }, // sustained load
    { duration: '10s', target: 0 },  // ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export default function () {
  const rateRes = http.get(`${BASE_URL}/api/default-rate`, {
    tags: { name: 'default-rate' },
  });
  check(rateRes, {
    'default-rate status is 200': (r) => r.status === 200,
  });
  trackTokens(rateRes, null);

  const payload = JSON.stringify({
    monthlyInvestment: 5000,
    annualReturnRate: 12,
    years: 10,
  });
  const calcRes = http.post(`${BASE_URL}/api/calculate`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'calculate' },
  });
  check(calcRes, {
    'calculate status is 200': (r) => r.status === 200,
  });
  trackTokens(calcRes, payload);

  sleep(1);
}
