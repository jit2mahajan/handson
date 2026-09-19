# Source allowlist

One file, `data/allowlist/sources.json`, keyed by your project's evidence domains. Both the PreToolUse hook and application code read this file — widening/narrowing approved sources is a single-file change.

Don't fetch from an unlisted source and rationalize it afterward. If a source is genuinely needed and missing, propose the addition as an edit to `data/allowlist/sources.json` — it's gated for human sign-off, not silent.
