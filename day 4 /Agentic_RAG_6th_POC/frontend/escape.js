"use strict";

/**
 * Dependency-free escaping/URL-scheme helpers shared between `app.js`
 * (loaded as a plain non-module `<script>` in the browser) and the Node
 * test suite under `frontend/tests/`.
 *
 * Deliberately touches neither `document` nor any other DOM/browser global,
 * so it can be `require()`d directly under plain Node (no jsdom, no shim)
 * as well as loaded as a plain `<script>` before `app.js` in `index.html`.
 * This is the single source of truth for these functions — do not
 * re-implement or copy them elsewhere (see reports/spec/2026-09-26-v3-security-review.draft.md, P3-2).
 */

// Escapes text for safe insertion into HTML *text content* (e.g. inside
// `innerHTML = "<strong>" + escapeHtml(x) + "</strong>"`). Order matters:
// `&` must be escaped first, before introducing any other `&...;` entity,
// or a second pass would double-escape those entities' own `&`.
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Escapes text for safe insertion into an HTML *attribute value*
// (e.g. `href="${escapeAttr(url)}"`). `&` is escaped first for the same
// reason as above. `"` and `'` prevent breaking out of a double- or
// single-quoted attribute respectively; `` ` `` is escaped defensively for
// legacy/IE-quirks attribute parsing and to avoid any confusion with
// template-literal delimiters in code that builds these strings.
function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/`/g, "&#96;");
}

// Only http(s) URLs are ever safe to emit as a real href. Any other scheme
// (javascript:, data:, vbscript:, etc.) must never reach the DOM as a live
// link — see reports/code-review/2026-09-19-code-review.md.
function isHttpUrl(str) {
  return /^https?:\/\//i.test(String(str).trim());
}

// CommonJS export for Node (frontend/tests/*.test.js).
if (typeof module !== "undefined" && module.exports) {
  module.exports = { escapeHtml, escapeAttr, isHttpUrl };
}

// Plain-global export for the browser, where this file is loaded via a
// non-module `<script>` tag before `app.js` (no bundler, no module system).
if (typeof window !== "undefined") {
  window.escapeHtml = escapeHtml;
  window.escapeAttr = escapeAttr;
  window.isHttpUrl = isHttpUrl;
}
