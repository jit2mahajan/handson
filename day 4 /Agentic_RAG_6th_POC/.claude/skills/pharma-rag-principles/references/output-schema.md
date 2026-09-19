# Output schema walkthrough

Canonical schema: `data/schema/response_schema.json` (draft-07, title `AgenticRAGResponse`). Every response the backend emits or logs must validate against it — no free text ever reaches a user or `logs/responses.jsonl`.

## Top level

- `query` (string) — the research question as asked.
- `answer_status` — one of `answered | insufficient_evidence | escalated`. See `escalation-rules.md` for how this is decided.
- `claims` (array) — zero or more grounded findings.
- `overall_confidence` — `high | medium | low`, rolled up from the claims.
- `escalation` — `{ required: bool, reason: string|null }`. `required: true` triggers the `human_gate.py` sign-off gate before the response is logged.
- `audit_ref` (optional) — pointer (line offset(s) or session id) into `.claude/audit/retrieval_log.jsonl` for traceability.

## Each claim

- `statement` (string), `confidence` (`high|medium|low`), `evidence_domain` (one of the four domains — exactly one per claim, even if the overall query spanned multiple domains).
- `citations` — array, **`minItems: 1`**. This is the structural enforcement of "ground every claim": a claim object with an empty citations array fails schema validation outright, so an ungrounded claim cannot be emitted, not just "shouldn't be."
- Each citation requires `source_domain`, `url`, `retrieved_at` (ISO date-time).

## Example: `answered`

```json
{
  "query": "What is the clinical safety record of compound X in Phase II trials?",
  "answer_status": "answered",
  "claims": [
    {
      "statement": "Compound X showed no dose-limiting toxicities in the Phase II cohort (n=120).",
      "confidence": "high",
      "evidence_domain": "clinical_safety_intelligence",
      "citations": [
        { "source_domain": "clinical_safety_intelligence", "url": "https://clinicaltrials.gov/study/NCT00000000", "retrieved_at": "2026-09-19T10:00:00Z" }
      ]
    }
  ],
  "overall_confidence": "high",
  "escalation": { "required": false, "reason": null }
}
```

## Example: `insufficient_evidence`

```json
{
  "query": "What is the long-term (10-year) cardiotoxicity profile of compound X?",
  "answer_status": "insufficient_evidence",
  "claims": [],
  "overall_confidence": "low",
  "escalation": { "required": false, "reason": "No allowlisted source reports 10-year follow-up data for this compound; retrieval returned no citable evidence." }
}
```
