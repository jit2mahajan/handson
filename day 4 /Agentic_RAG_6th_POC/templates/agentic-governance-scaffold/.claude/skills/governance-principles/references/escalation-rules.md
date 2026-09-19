# Escalation decision table

| Condition | `answer_status` | `escalation.required` |
|---|---|---|
| All claims cited, confidence high/medium | `answered` | `false` |
| Some claim can't be cited from an allowlisted source | `insufficient_evidence` | `false` |
| No relevant material found at all | `insufficient_evidence` | `false` |
| A high-stakes claim (define this for your domain) has low-confidence or conflicting evidence | `escalated` | `true` |
| A needed source was blocked and no allowlisted alternative exists for a high-stakes claim | `escalated` | `true` |

Rule of thumb: weak or missing evidence never becomes a fabricated answer. Replace "high-stakes" above with whatever your domain's risk-bearing category is (in the pharma instance this repo is based on: clinical/safety claims).
