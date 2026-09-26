#!/usr/bin/env python3
"""
Hardened static file server for the frontend/ demo.

Replaces the bare `python3 -m http.server` invocation documented previously
(see reports/spec/2026-09-26-v3-security-review.draft.md, P1-4 + P2-5), which:
  - sends no security headers at all, and
  - falls back to directory listings for any path without an index.html,
    which would expose frontend/tests/ (test source, not meant to be
    browsed) to anyone who requests that path.

This server:
  (a) sends Content-Security-Policy, X-Content-Type-Options, and
      X-Frame-Options headers on every response, and
  (b) returns a plain 404 instead of a directory listing for any directory
      request that doesn't resolve to its own index.html.

Usage (same port convention as before — do not use 8000, that's backend's
uvicorn default):

    python3 serve.py            # serves this directory on port 8080
    python3 serve.py 8081       # or an explicit port
"""

import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DEFAULT_PORT = 8080

# Must match backend's actual documented origin (see root README.md /
# backend/README.md "LLM provider fallback" + API_BASE_URL in app.js).
# Update this if backend's documented port ever changes.
BACKEND_ORIGIN = "http://localhost:8000"

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    f"connect-src 'self' {BACKEND_ORIGIN}; "
    "frame-ancestors 'none'; "
    "object-src 'none'; "
    "base-uri 'none'"
)


class HardenedHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler with security headers and no directory listing."""

    def end_headers(self):
        self.send_header("Content-Security-Policy", CSP)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        super().end_headers()

    def list_directory(self, path):
        # SimpleHTTPRequestHandler's default behavior for a directory
        # request with no index.html is to render an HTML directory
        # listing. Refuse that outright — return a plain 404 instead so
        # e.g. /tests/ never exposes its file listing.
        self.send_error(404, "File not found")
        return None


def main():
    port = DEFAULT_PORT
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port: {sys.argv[1]!r}", file=sys.stderr)
            sys.exit(1)

    server = ThreadingHTTPServer(("", port), HardenedHandler)
    print(f"Serving frontend/ on http://localhost:{port} (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
