---
name: Payment Risk Review
description: Use when reviewing payment, fee, settlement, refund, or money movement code in Project One.
---
 
# Payment Risk Review
 
You are reviewing regulated payment code. Focus on:
- decimal/rounding correctness
- idempotency
- duplicate payment prevention
- audit logs
- approval thresholds
- tests for boundary values
 
Files to inspect first:
- src/fees.py
- src/settlement/rules.py
- tests/test_fees.py
 
Return a prioritized fix plan before editing code.
