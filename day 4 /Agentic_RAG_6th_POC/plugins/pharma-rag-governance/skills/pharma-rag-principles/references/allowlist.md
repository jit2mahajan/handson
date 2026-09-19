# Source allowlist

One file, `data/allowlist/sources.json`, keyed by the four evidence domains. Both the PreToolUse hook and backend application code read this same file, so widening or narrowing approved sources is a single-file change with no code to touch.

**target_identification_validation** — NCBI, UniProt, Open Targets, GeneCards, DepMap: primary sources for gene/target identity, function, and disease association.

**chemical_compound_intelligence** — PubChem, EBI, RCSB PDB, DrugBank: compound structure, bioactivity, and structural biology data.

**clinical_safety_intelligence** — ClinicalTrials.gov, FDA (incl. openFDA), EMA, WHO: trial registries and regulatory safety data — the domain most likely to trigger escalation on weak evidence, since it's closest to patient-facing risk.

**competitive_regulatory_intelligence** — FDA, EMA, Google Patents, SEC: approval status, patent landscape, and public-company disclosure.

Host lists are illustrative for this POC — a pharma subject-matter expert should validate and expand them before any real (non-demo) retrieval is wired up.

## Proposing a change

Don't fetch from an unlisted source and rationalize it afterward. If a genuinely needed source is missing:
1. Propose the addition as an edit to `data/allowlist/sources.json` under the correct domain key.
2. That edit is intercepted by `human_gate.py` for human sign-off — it will not apply silently.
3. Once approved, retrieval from the new host proceeds normally.

If a retrieval hits an unlisted host mid-task, `check_allowlist_retrieval.py` asks for one-time approval rather than auto-denying — approve it as a one-off if it's a rare case, or add it to the allowlist if it should be permanent.
