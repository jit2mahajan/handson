# Domain routing

Domain routing is **agent-driven, not hardcoded.** The four evidence domains (`target_identification_validation`, `chemical_compound_intelligence`, `clinical_safety_intelligence`, `competitive_regulatory_intelligence`) are not fixed code paths that all fire on every query — they're a classification the backend performs per question.

## The rule

1. Classify the incoming question against the four domains **before** retrieving anything.
2. Retrieve only from the domain(s) that actually apply — a question about a target's binding affinity has no reason to touch `competitive_regulatory_intelligence`.
3. A single question may legitimately span multiple domains (e.g. "what's the safety record and chemical structure of compound X" spans `clinical_safety_intelligence` and `chemical_compound_intelligence`). Route to all domains that apply, not just the first match.
4. Each resulting **claim** still carries exactly one `evidence_domain` tag per the schema, even when the overall query touched several — the domain lives on the claim, not the query.

## Why this matters for the commitments

Routing to only the relevant domain(s) keeps retrieval scoped to what the question actually needs, which keeps the allowlist check meaningful (a domain's host list is a statement about what that domain's evidence should come from) and avoids irrelevant citations diluting a claim's grounding.
