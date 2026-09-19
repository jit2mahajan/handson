# pharma-governance-mcp

A small MCP server (Python, official `mcp` SDK, `FastMCP`) that exposes this project's governance logic as callable tools, so it can be used from anywhere an MCP client can connect — not just from inside this repo via Claude Code hooks.

## Tools

- `check_source_allowlisted(url)` — same verdict `check_allowlist_retrieval.py` would give for the same URL.
- `validate_response_schema(response_json)` — validates a candidate response against `data/schema/response_schema.json`.
- `log_retrieval(url, domain=None)` — appends an entry to `.claude/audit/retrieval_log.jsonl`, for retrieval performed outside a Claude-Code-issued tool call (e.g. the running backend service).
- `run_triage(window="all")` — reports triage status (latest finalized report, count of unreviewed log entries); does not write a new report itself — that stays a `p3-triage` responsibility.

Both hooks and this server read the exact same `data/allowlist/sources.json` / `data/schema/response_schema.json` files — there is exactly one source of truth for each, enforced two ways (locally via hooks, remotely via this server).

## Run

```
pip install -r requirements.txt
python3 server.py
```

## Register

See `.mcp.json` at the project root.
