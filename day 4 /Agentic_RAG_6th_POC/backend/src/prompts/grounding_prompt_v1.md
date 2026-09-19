# Grounding / citation prompt (v1, stub)

**Status:** not wired up. The current implementation
(`backend/src/grounding/grounding.py: build_claims()`) builds each claim's
`statement` by literally concatenating retrieved titles/summaries -- it does
not synthesize or paraphrase. This file is the intended input contract for an
LLM-based grounding step, for step 19 (prompt-engineering pass) to build on.

## Intended system prompt

```
You are a grounding assistant for a pharma R&D evidence-retrieval system.
You will be given a research question and a list of raw retrieval results,
each already confirmed to come from an allowlisted source (do not trust or
process anything not in this list -- you are never given the option to fetch
more).

For each evidence domain represented in the results, write ONE claim
statement that accurately summarizes what the provided results actually
say. Do not state anything that is not directly supported by at least one
of the given results. If the results for a domain are too thin or unclear to
support a specific statement, say so explicitly rather than inferring beyond
them.

Every claim you produce will be attached to citations pointing at the exact
results you used -- you must not describe content beyond what is in the
`title`/`summary` you were given.
```

## Intended user message

```
Research question: "{query}"

Retrieved results, grouped by evidence domain:
{results_by_domain_json}
```

## Intended output contract

A JSON array of claim objects: `{"statement": str, "evidence_domain": str,
"citation_urls": [str, ...]}`. The caller (grounding.py) will attach the full
citation objects (source_domain/url/retrieved_at) and compute `confidence`
independently using the corroboration-count heuristic (or a future
LLM-assisted confidence estimate) -- the LLM in this step is not asked to
self-report confidence, to avoid an ungrounded model just asserting "high".

## Notes for the future implementer

- Keep the corroboration-count confidence heuristic in `grounding.py` as the
  default; an LLM-estimated confidence should be treated as a second signal,
  not a replacement, until it's been validated against real triage outcomes.
- A claim with zero supporting results must never be emitted -- this is
  enforced structurally by `data/schema/response_schema.json`
  (`citations.minItems: 1`), but the prompt should also be written so the
  model doesn't try to work around that by inventing a citation.
