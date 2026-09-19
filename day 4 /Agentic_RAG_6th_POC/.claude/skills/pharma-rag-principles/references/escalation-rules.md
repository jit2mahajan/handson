# Escalation decision table

Applied when assembling a response, before it's validated against the schema and logged.

| Condition | `answer_status` | `escalation.required` |
|---|---|---|
| All claims have ≥1 allowlisted citation; confidence high/medium | `answered` | `false` |
| Retrieval found some relevant material but at least one claim can't be cited from an allowlisted source | `insufficient_evidence` | `false` |
| No relevant material found at all from allowlisted sources | `insufficient_evidence` | `false` |
| A claim touches `clinical_safety_intelligence` (patient-facing risk) and evidence is low-confidence or conflicting across sources | `escalated` | `true` |
| A needed source was blocked (hook `ask` was rejected) and no allowlisted alternative exists for a safety/clinical claim | `escalated` | `true` |
| A needed source was blocked and no allowlisted alternative exists for a non-safety claim | `insufficient_evidence` | `false` |

Rule of thumb: **weak or missing evidence never becomes a fabricated answer.** It becomes `insufficient_evidence` (routine gap) or `escalated` (a human needs to weigh in because the evidence bears on safety/clinical risk or is genuinely conflicting). `escalation.required: true` is caught by `human_gate.py` before the response is logged — a human signs off before it reaches the team.

`escalation.reason` should name the actual gap (e.g. "no allowlisted source reports X" or "conflicting Phase III results between source A and source B"), not restate the status.
