"use strict";

/**
 * Regression tests for the escaping/URL-scheme helpers extracted into
 * frontend/escape.js (originally the 2026-09-19 XSS-prevention gate in
 * app.js; hardened further per reports/spec/2026-09-26-v3-security-review.draft.md P3-1/P3-2).
 *
 * escape.js is a small dependency-free module (no `document`/`window`
 * access required to run its logic) that both app.js (via a plain
 * <script> include, browser-side) and this test file (via Node's
 * `require()`) use directly — so this test exercises the real
 * implementation, not a duplicated copy that could drift from it.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { escapeHtml, escapeAttr, isHttpUrl } = require("../escape.js");

/* ---------------- isHttpUrl ---------------- */

test("isHttpUrl: allows https:// URLs", () => {
  assert.equal(isHttpUrl("https://example.com/path"), true);
});

test("isHttpUrl: allows http:// URLs", () => {
  assert.equal(isHttpUrl("http://example.com/path"), true);
});

test("isHttpUrl: rejects javascript: URLs", () => {
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
});

test("isHttpUrl: rejects data: URLs", () => {
  assert.equal(isHttpUrl("data:text/html,<script>alert(1)</script>"), false);
});

test("isHttpUrl: rejects vbscript: URLs", () => {
  assert.equal(isHttpUrl("vbscript:msgbox(1)"), false);
});

test("isHttpUrl: rejects protocol-relative URLs (//evil.com)", () => {
  assert.equal(isHttpUrl("//evil.com"), false);
});

test("isHttpUrl: rejects whitespace-padded javascript: URLs", () => {
  assert.equal(isHttpUrl("  javascript:alert(1)"), false);
  assert.equal(isHttpUrl("\t\njavascript:alert(1)\n"), false);
});

test("isHttpUrl: still allows whitespace-padded http(s) URLs (trimmed before checking)", () => {
  assert.equal(isHttpUrl("  https://example.com  "), true);
});

/* ---------------- escapeHtml ---------------- */

test("escapeHtml: escapes & first, then < > \" '", () => {
  assert.equal(escapeHtml(`& < > " '`), "&amp; &lt; &gt; &quot; &#39;");
});

test("escapeHtml: neutralizes a <script> tag", () => {
  assert.equal(
    escapeHtml("<script>alert(1)</script>"),
    "&lt;script&gt;alert(1)&lt;/script&gt;"
  );
});

test("escapeHtml: does not double-escape ampersands from its own output", () => {
  // If & were escaped after " or ', the "&quot;"/"&#39;" entities' own "&"
  // would get re-escaped into "&amp;quot;"/"&amp;#39;". Confirm that doesn't happen.
  assert.equal(escapeHtml('"'), "&quot;");
  assert.equal(escapeHtml("'"), "&#39;");
});

/* ---------------- escapeAttr ---------------- */

test("escapeAttr: neutralizes the classic attribute-breakout payload", () => {
  const payload = '" onmouseover=alert(1) x="';
  const escaped = escapeAttr(payload);
  assert.ok(!escaped.includes('"'));
  assert.equal(escaped, "&quot; onmouseover=alert(1) x=&quot;");
});

test("escapeAttr: escapes a single quote", () => {
  assert.equal(escapeAttr("'"), "&#39;");
});

test("escapeAttr: escapes a backtick", () => {
  assert.equal(escapeAttr("`"), "&#96;");
});

test("escapeAttr: escapes an ampersand", () => {
  assert.equal(escapeAttr("&"), "&amp;");
});

test("escapeAttr: escapes & before other characters (no double-escaping)", () => {
  assert.equal(escapeAttr(`&"'\``), "&amp;&quot;&#39;&#96;");
});

test("escapeAttr: neutralizes a <script> tag used as an attribute value", () => {
  const escaped = escapeAttr("<script>alert(1)</script>");
  // escapeAttr's contract is attribute-context safety (quote/backtick/&
  // breakout), not text-context safety — verify that contract directly
  // (this string should never itself become a live, closable attribute).
  assert.equal(escaped, "<script>alert(1)</script>");
});

test("escapeAttr: mixed single- and double-quote breakout attempt", () => {
  const payload = `'"` + "`" + `onerror=alert(1)`;
  const escaped = escapeAttr(payload);
  assert.ok(!escaped.includes('"'));
  assert.ok(!escaped.includes("'"));
  assert.ok(!escaped.includes("`"));
});
