# Demo script — Qualified Health

A first-user walkthrough of the candidate-identification dashboard. ~10 minutes. Assumes a clean
checkout with nothing running yet.

## 0. Setup

```
cp .env.example .env
sudo docker compose build
sudo docker compose up -d
```

Wait for all three containers to report healthy/started, then confirm the API is up:

```
curl localhost:8000/health
```

Expect `{"status":"ok"}`. Postgres auto-seeds 2 interventions (`ckd_stage4_dialysis_referral`,
`hfref_advanced_therapy_referral`) and 8 synthetic patients on first backend startup — nothing to
load manually.

## 1. Open the dashboard

Go to `http://localhost:8080`. You'll see:
- A top bar with an intervention dropdown, a "Screen" button, and a "Refresh" button.
- An empty candidate list (nothing has been screened yet).
- A sidebar with a chat panel and a collapsible Settings panel.

## 2. Run screening

Pick **CKD Stage 4/5 Dialysis Referral** from the intervention dropdown and click **Screen**.

This calls `POST /screen/ckd_stage4_dialysis_referral`, which runs the eligibility engine over all
seeded patients and writes scored candidates to the DB. The candidate list populates with 3–4
cards, each showing:
- A patient-key avatar and status badge.
- A score.
- An evidence trail — each claim tagged by domain (`diagnosis_date`, `lab_value`, `note_snippet`)
  with its source.

Point out one candidate with `escalation.required: true` — its evidence trail includes an
unverified note-based claim (no live `GROQ_API_KEY` set yet, so it's a clearly-marked stub rather
than a silent guess). This is the "fail gracefully, don't fabricate" pattern that runs through the
whole system.

## 3. Review the evidence trail

Click into a fully-scored candidate (score 1.0, no escalation). Walk through its evidence:
one `structured_ehr_data` claim (diagnosis + date) and one `structured_lab_data` claim (lab value
vs. threshold) — both derived directly from structured data, no LLM call needed. This is the
"real, always grounded" claim path from `evidence_extraction.py`.

## 4. Approve / reject (the human gate)

On the escalated candidate, click **Approve** or **Reject**. This calls
`POST /candidates/{patient_key}/finalize` — the *runtime* human gate (distinct from the dev-time
Claude Code hook that only governs code edits). The disposition is appended to
`logs/candidate_dispositions.jsonl`.

Click **Screen** again to show that re-screening does *not* re-run evidence extraction (and would
not spend a live Groq call) for a patient already approved/rejected — their card stays unchanged.

## 5. Ask the chatbot

In the chat panel, ask something like *"which patients are eligible and why?"*. Without a live
Groq key, the answer is a clearly-marked stub grounded in the real candidate count and patient
keys (`grounded_on` lists real `patient_key`s) — not a fabricated answer. If a real `GROQ_API_KEY`
is set (see step 6), the same question returns a live, cited answer: every claim references an
exact `patient_key`, and the assistant refuses to answer anything outside the current candidate
list.

## 6. (Optional) Set a live Groq key and re-run

Open the Settings panel, paste a real Groq API key into the key field, click **Save Key**. This
calls `POST /config/groq-key` — runtime/in-memory only, never written to disk or logged. Ask the
chatbot the same question again to see a live, cited answer instead of the stub.

## 7. Run a load test

Still in Settings, click **Run Load Test**. This fires concurrent requests at the backend's own
`/chat` endpoint (`POST /loadtest/chat`, built-in `httpx`/`asyncio` self-test — no `k6` install
needed) and displays a latency/error-rate summary in the page. For a more rigorous external run,
`k6 run load-test/chat_load_test.js` targets the same endpoint from outside the container.

## Wrap-up talking points

- Every non-structured claim is either grounded in real retrieved text or clearly marked
  unverified — the system never silently fabricates evidence.
- Finalization (approve/reject) is a genuine human-in-the-loop gate, logged for audit.
- Re-screening is cost-aware: it skips already-decided patients rather than re-spending on LLM
  calls whose result would be discarded anyway.
- See `knowledge-vault/Home.md` for the full architecture map, or `detailed-plan.md` for the
  complete build history and verification record.
