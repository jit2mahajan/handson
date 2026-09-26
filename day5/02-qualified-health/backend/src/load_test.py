"""Built-in concurrent self-test for /chat, triggered from the dashboard's
"Run Load Test" button. Same intent as load-test/chat_load_test.js (k6) but
requires no extra tooling in the backend image — pure asyncio + httpx.
"""
import asyncio
import time

import httpx

QUESTIONS = [
    "which patients are eligible for this referral and why?",
    "list any escalated candidates and the reason for escalation",
    "what lab values support eligibility for the top-scored patient?",
    "are there any patients with missing evidence?",
]


async def run(concurrency: int, requests_per_worker: int, intervention_id: str | None, api_key: str) -> dict:
    latencies: list[float] = []
    errors = 0

    async def worker(client: httpx.AsyncClient, worker_index: int) -> None:
        nonlocal errors
        for i in range(requests_per_worker):
            question = QUESTIONS[(worker_index + i) % len(QUESTIONS)]
            start = time.perf_counter()
            try:
                response = await client.post(
                    "http://127.0.0.1:8000/chat",
                    json={"message": question, "intervention_id": intervention_id},
                    headers={"X-API-Key": api_key},
                )
                response.raise_for_status()
            except Exception:
                errors += 1
            else:
                latencies.append((time.perf_counter() - start) * 1000)

    async with httpx.AsyncClient(timeout=30) as client:
        await asyncio.gather(*(worker(client, i) for i in range(concurrency)))

    total = concurrency * requests_per_worker
    latencies.sort()

    def percentile(p: float) -> float | None:
        if not latencies:
            return None
        index = min(len(latencies) - 1, int(len(latencies) * p))
        return round(latencies[index], 2)

    return {
        "total_requests": total,
        "successful": len(latencies),
        "errors": errors,
        "error_rate": round(errors / total, 4) if total else 0,
        "avg_ms": round(sum(latencies) / len(latencies), 2) if latencies else None,
        "p95_ms": percentile(0.95),
        "max_ms": round(max(latencies), 2) if latencies else None,
    }
