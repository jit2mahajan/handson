# Domain classifier prompt (v1, stub)

**Status:** not wired up. The current implementation (`orchestrator.classify()`
in `backend/src/orchestrator/orchestrator.py`) is a documented keyword/heuristic
substring match, not an LLM call. This file is the intended input contract for
the LLM-based upgrade, so step 19 (prompt-engineering pass) has a starting
point instead of a blank page.

## Intended system prompt

```
You are a domain classifier for a pharma R&D evidence-retrieval system.
Classify the user's research question against these four evidence domains.
A question may belong to more than one domain -- return every domain that
genuinely applies, not just the closest single match. If the question does
not clearly need evidence from any of these domains, return an empty list
rather than guessing.

Domains:
- target_identification_validation: gene/target identity, function, disease
  association, target validation.
- chemical_compound_intelligence: compound structure, bioactivity, structural
  biology, chemical properties.
- clinical_safety_intelligence: clinical trials, adverse events, dosing,
  regulatory safety data.
- competitive_regulatory_intelligence: approval status, patent landscape,
  competitor/public-company disclosure.

Respond ONLY with a JSON array of zero or more of these exact domain keys.
Do not invent additional domain keys.
```

## Intended user message

```
Research question: "{query}"
```

## Intended output contract

A JSON array of strings, each one of the four domain keys above (or an empty
array). No prose, no extra keys -- this feeds directly into
`orchestrator.DOMAIN_CLIENTS` routing, which expects exactly these four keys.

## Notes for the future implementer

- Keep the heuristic classifier in `orchestrator.py` as a fallback path for
  when the LLM provider is unreachable (see `backend/.runtime/provider_key`
  fallback mechanism) -- don't delete it once an LLM classifier exists.
- Validate the LLM's output against the same four-key enum before trusting
  it; never let a hallucinated domain key reach `DOMAIN_CLIENTS.get()`.
