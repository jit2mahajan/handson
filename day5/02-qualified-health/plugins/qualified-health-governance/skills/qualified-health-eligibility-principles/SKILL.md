---
name: qualified-health-eligibility-principles
description: Governance principles for the Qualified Health candidate-identification system — grounding, false-negative bias, PHI minimization, and the agent-ops references (context contract, context trimming) that subagents in this project follow.
---

# Qualified Health — Eligibility & Evidence Principles

This project screens large, fragmented patient populations against evidence-based clinical criteria to surface candidates for life-saving interventions (see `../../../PLAN.md`). Missing an eligible patient is the costly failure mode, so these commitments favor over-flagging with a human reviewer as the final filter — not the reverse.

## Commitments

| Commitment | Mechanism |
|---|---|
| Retrieve only from approved sources | `check_allowlist_retrieval.py` gates any fetch against `data/allowlist/sources.json` |
| Every candidate flag is grounded | `data/schema/response_schema.json` requires `claims[]` with `minItems: 1`, each citing `source` + `snippet` |
| False-negative bias, not false-positive bias | Eligibility thresholds are tuned to over-flag; `escalation.required` marks low-confidence/missing-evidence cases for human review rather than silently dropping them |
| Finalizing a patient requires sign-off | `human_gate.py` intercepts any write to `logs/candidate_dispositions.jsonl` that sets a terminal `status` (`approved`/`rejected`) |
| PHI minimization | Retain only the snippet needed for the evidence trail, not full raw notes, beyond what `evidence-extraction-service` needs |

See `references/agent-context-contract.md` for what each subagent needs from its caller, and `references/context-management.md` for how long-running sessions trim history.
