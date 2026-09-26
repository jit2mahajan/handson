"use strict";

/**
 * AIDLC frontend — minimal vanilla JS UI against backend's documented API
 * (backend/README.md, root README.md "LLM provider fallback" section).
 *
 * Single configurable base URL — change this if backend runs elsewhere.
 */
const API_BASE_URL = "http://localhost:8000";

// Matches backend's AIDLC_API_KEY default (unset -> "dev-local-key") for the
// local demo. Hardcoded for now — make this configurable (e.g. a build-time
// or runtime setting) in a future version rather than a literal here.
const API_KEY = "dev-local-key";

// How long we wait for POST /query before giving up and showing a clear
// "request timed out" error instead of leaving the UI stuck on "Asking…".
const QUERY_TIMEOUT_MS = 30000;

/**
 * ---- Provider-unreachable detection convention (ASSUMED — reconcile with backend) ----
 *
 * backend/src/api/main.py did not exist yet when this file was written, so the
 * exact error shape for "default LLM provider unreachable" is not finalized.
 * This file assumes: POST /query responds with HTTP 503 and a JSON body shaped
 * like { "error": "provider_unreachable", ... } (extra fields ignored).
 *
 * As a fallback (in case backend uses a different status code), it also treats
 * any non-2xx JSON body whose "error" field contains both "provider" and
 * "unreachable" (case-insensitive) as the provider-unreachable case. Anything
 * else is shown as a generic error, not silently treated as success.
 */
function isProviderUnreachable(httpStatus, body) {
  if (!body || typeof body !== "object") return false;
  const err = String(body.error || "").toLowerCase();
  if (httpStatus === 503 && err === "provider_unreachable") return true;
  return err.includes("provider") && err.includes("unreachable");
}

const els = {
  queryForm: document.getElementById("query-form"),
  queryInput: document.getElementById("query-input"),
  querySubmit: document.getElementById("query-submit"),
  queryCancel: document.getElementById("query-cancel"),
  results: document.getElementById("results"),
  connectPanel: document.getElementById("connect-panel"),
  connectForm: document.getElementById("connect-form"),
  connectDismiss: document.getElementById("connect-dismiss"),
  connectConfirmation: document.getElementById("connect-confirmation"),
};

// Kept only so "Save & retry" can re-run the same question. This is the query
// text, never the provider key — nothing key-related is retained in memory
// beyond the synchronous submit handler below.
let lastQuery = "";

// The AbortController for the in-flight /query request, if any, so the
// cancel button (and any future caller) can abort it.
let currentQueryController = null;

els.queryForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const query = els.queryInput.value.trim();
  if (!query) return;
  lastQuery = query;
  await runQuery(query);
});

els.connectDismiss.addEventListener("click", () => {
  hideConnectPanel();
});

if (els.queryCancel) {
  els.queryCancel.addEventListener("click", () => {
    if (currentQueryController) {
      currentQueryController.abort(new DOMException("Cancelled by user", "AbortError"));
    }
  });
}

els.connectForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  const provider = document.getElementById("provider-name").value.trim();
  const apiKey = document.getElementById("provider-key").value;
  if (!provider || !apiKey) return;

  const submitBtn = els.connectForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    const res = await fetch(`${API_BASE_URL}/settings/provider-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ provider, api_key: apiKey }),
    });
    if (!res.ok) {
      throw new Error(`Backend rejected the key (HTTP ${res.status}).`);
    }
    const trailing4 = apiKey.slice(-4).padStart(4, "*");
    showConnectConfirmation(`Key saved: ****${trailing4}`);
    // Clear the field immediately — the key is never redisplayed or retained.
    document.getElementById("provider-key").value = "";
    hideConnectPanel({ keepConfirmation: true });
    if (lastQuery) {
      await runQuery(lastQuery);
    }
  } catch (err) {
    showConnectConfirmation(`Failed to save key: ${err.message}`, true);
  } finally {
    submitBtn.disabled = false;
  }
});

async function runQuery(query) {
  setLoading(true);
  hideConnectPanel();
  els.results.innerHTML = "";

  // Guard against a hung backend leaving the UI stuck on "Asking…" forever:
  // abort the request after QUERY_TIMEOUT_MS. `timedOut` disambiguates a
  // timeout abort from a user-initiated cancel (both surface as AbortError).
  const controller = new AbortController();
  currentQueryController = controller;
  let timedOut = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException("Request timed out", "AbortError"));
  }, QUERY_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": API_KEY },
      body: JSON.stringify({ query }),
      signal: controller.signal,
    });
  } catch (networkErr) {
    clearTimeout(timeoutId);
    setLoading(false);
    currentQueryController = null;
    if (networkErr.name === "AbortError") {
      if (timedOut) {
        renderTimeoutError();
      } else {
        renderCancelledNotice();
      }
    } else {
      // Backend itself unreachable (not running, wrong port, CORS, etc.) —
      // distinct from the "LLM provider unreachable" case, which requires a
      // response FROM backend.
      renderConnectionError(networkErr);
    }
    return;
  }
  clearTimeout(timeoutId);
  currentQueryController = null;

  let body = null;
  try {
    body = await res.json();
  } catch (_parseErr) {
    body = null;
  }

  setLoading(false);

  if (!res.ok) {
    if (isProviderUnreachable(res.status, body)) {
      showConnectPanel();
      renderProviderUnreachableNotice();
      return;
    }
    renderGenericError(res.status, body);
    return;
  }

  renderResponse(body);
}

function setLoading(isLoading) {
  els.querySubmit.disabled = isLoading;
  els.querySubmit.textContent = isLoading ? "Asking…" : "Ask";
  if (els.queryCancel) {
    els.queryCancel.classList.toggle("hidden", !isLoading);
  }
}

/* ---------------- Rendering ---------------- */

function renderConnectionError(err) {
  els.results.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `<strong>Could not reach backend</strong>${escapeHtml(
    `Is it running at ${API_BASE_URL}? (${err.message})`
  )}`;
  els.results.appendChild(box);
}

function renderTimeoutError() {
  els.results.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `<strong>Request timed out</strong>${escapeHtml(
    `Backend did not respond within ${QUERY_TIMEOUT_MS / 1000}s. It may be overloaded or hung — try again.`
  )}`;
  els.results.appendChild(box);
}

function renderCancelledNotice() {
  els.results.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `<strong>Request cancelled</strong>The query was cancelled before backend responded.`;
  els.results.appendChild(box);
}

function renderProviderUnreachableNotice() {
  const box = document.createElement("div");
  box.className = "error-box";
  box.innerHTML = `<strong>Default LLM provider unreachable</strong>Use the panel above to connect an alternate provider, then your question will be retried automatically.`;
  els.results.appendChild(box);
}

// FastAPI's default validation-error shape (HTTP 422) is
// { "detail": [ { "loc": [...], "msg": "...", "type": "..." }, ... ] } —
// distinct from this app's own { "error": "..." } convention. Handle both,
// plus a plain string "detail", before falling back to a generic message.
function extractErrorDetail(body) {
  if (!body || typeof body !== "object") return null;
  if (body.error) return String(body.error);
  if (Array.isArray(body.detail)) {
    const msgs = body.detail
      .map((item) => {
        if (item && typeof item === "object" && item.msg) {
          const loc = Array.isArray(item.loc) ? item.loc.join(".") : null;
          return loc ? `${loc}: ${item.msg}` : String(item.msg);
        }
        return typeof item === "string" ? item : JSON.stringify(item);
      })
      .filter(Boolean);
    if (msgs.length > 0) return msgs.join("; ");
  } else if (typeof body.detail === "string" && body.detail) {
    return body.detail;
  }
  return null;
}

function renderGenericError(status, body) {
  els.results.innerHTML = "";
  const box = document.createElement("div");
  box.className = "error-box";
  const detail = extractErrorDetail(body) || "No further detail provided.";
  box.innerHTML = `<strong>Request failed (HTTP ${escapeHtml(String(status))})</strong>${escapeHtml(detail)}`;
  els.results.appendChild(box);
}

function renderResponse(data) {
  els.results.innerHTML = "";

  if (!data || typeof data !== "object") {
    const box = document.createElement("div");
    box.className = "error-box";
    box.innerHTML = `<strong>Malformed response</strong>Backend returned a body that isn't a JSON object.`;
    els.results.appendChild(box);
    return;
  }

  // Echo the question the answer is actually for — schema field `query`.
  if (data.query) {
    const queryEcho = document.createElement("div");
    queryEcho.className = "query-echo";
    queryEcho.textContent = `Question: ${data.query}`;
    els.results.appendChild(queryEcho);
  }

  els.results.appendChild(renderStatusBanner(data.answer_status));

  if (data.escalation && data.escalation.required) {
    const reasonBox = document.createElement("div");
    reasonBox.className = "escalation-reason";
    reasonBox.innerHTML = `<strong>Escalation required:</strong> ${escapeHtml(
      data.escalation.reason || "No reason provided."
    )}`;
    els.results.appendChild(reasonBox);
  }

  const overall = document.createElement("div");
  overall.className = "overall-confidence";
  overall.innerHTML = `Overall confidence: ${confidenceBadgeHtml(data.overall_confidence)}`;
  els.results.appendChild(overall);

  const heading = document.createElement("div");
  heading.className = "claims-heading";
  heading.textContent = `Claims (${(data.claims || []).length})`;
  els.results.appendChild(heading);

  const claims = Array.isArray(data.claims) ? data.claims : [];
  if (claims.length === 0) {
    const empty = document.createElement("div");
    empty.className = "error-box";
    empty.innerHTML = `<strong>No claims in response</strong>This is expected for insufficient_evidence/escalated responses with no groundable claims.`;
    els.results.appendChild(empty);
  }

  claims.forEach((claim) => {
    els.results.appendChild(renderClaim(claim));
  });

  // Optional schema field `audit_ref` — pointer into the retrieval audit log
  // for traceability. Render it as a small footer when present.
  if (data.audit_ref) {
    const auditFooter = document.createElement("div");
    auditFooter.className = "audit-ref-footer";
    auditFooter.textContent = `Audit ref: ${data.audit_ref}`;
    els.results.appendChild(auditFooter);
  }
}

function renderStatusBanner(status) {
  const banner = document.createElement("div");
  const known = ["answered", "insufficient_evidence", "escalated"];
  const safeStatus = known.includes(status) ? status : "unknown";
  banner.className = `status-banner status-${safeStatus}`;

  const meta = {
    answered: { icon: "✓", label: "Answered", detail: "Grounded answer with citations below." },
    insufficient_evidence: {
      icon: "⚠",
      label: "Insufficient evidence",
      detail: "Allowlisted sources didn't fully support this query. No fabricated claims are shown.",
    },
    escalated: {
      icon: "🚩",
      label: "Escalated — human review required",
      detail: "Evidence bears on safety/clinical risk or is conflicting. A human must weigh in.",
    },
    unknown: {
      icon: "?",
      label: `Unrecognized status: ${escapeHtml(String(status))}`,
      detail: "This value is not one of answered / insufficient_evidence / escalated.",
    },
  }[safeStatus];

  banner.innerHTML = `
    <div class="status-icon">${meta.icon}</div>
    <div class="status-body">
      <div class="status-label">${escapeHtml(meta.label)}</div>
      <div class="status-detail">${escapeHtml(meta.detail)}</div>
    </div>
  `;
  return banner;
}

function renderClaim(claim) {
  const card = document.createElement("div");
  card.className = "claim-card";

  if (!claim || typeof claim !== "object") {
    card.classList.add("error-box");
    card.innerHTML = `<strong>Malformed claim</strong>Skipped rendering — not an object.`;
    return card;
  }

  const citations = Array.isArray(claim.citations) ? claim.citations : [];

  // Hard requirement: never render a claim without its citation list. The
  // schema's minItems:1 should make this impossible, but treat a violation
  // as a visible display error rather than silently rendering an empty list.
  if (citations.length === 0) {
    card.classList.add("error-box");
    card.innerHTML = `
      <strong>Display error: claim has no citations</strong>
      This claim was withheld from normal rendering because it arrived with zero citations,
      which violates the response schema's citations.minItems:1 guarantee.
      <div style="margin-top:8px;"><em>Statement (unverified):</em> ${escapeHtml(
        claim.statement || "(missing statement)"
      )}</div>
    `;
    return card;
  }

  const meta = document.createElement("div");
  meta.className = "claim-meta";
  meta.innerHTML = `
    ${confidenceBadgeHtml(claim.confidence)}
    <span class="domain-tag">${escapeHtml(formatDomain(claim.evidence_domain))}</span>
  `;
  card.appendChild(meta);

  const statement = document.createElement("p");
  statement.className = "claim-statement";
  statement.textContent = claim.statement || "(missing statement)";
  card.appendChild(statement);

  const citHeading = document.createElement("div");
  citHeading.className = "citations-heading";
  citHeading.textContent = `Citations (${citations.length})`;
  card.appendChild(citHeading);

  const list = document.createElement("ul");
  list.className = "citation-list";
  citations.forEach((c) => {
    const li = document.createElement("li");
    if (!c || typeof c !== "object") {
      li.textContent = "(malformed citation)";
      list.appendChild(li);
      return;
    }
    const domain = escapeHtml(c.source_domain || "(unknown source)");
    const url = c.url || "";
    const retrievedAt = escapeHtml(c.retrieved_at || "(unknown retrieval time)");
    if (!url) {
      li.innerHTML = `<strong>${domain}</strong> — (no URL) — retrieved ${retrievedAt}`;
    } else if (isHttpUrl(url)) {
      const safeUrl = escapeAttr(url);
      li.innerHTML = `<strong>${domain}</strong> — <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(
        url
      )}</a> — retrieved ${retrievedAt}`;
    } else {
      // Non-http(s) scheme: never emit it as a real href (blocks javascript:,
      // data:, etc.). Show the citation's text but make it visibly non-navigable.
      li.innerHTML = `<strong>${domain}</strong> — <a href="#" class="non-navigable" aria-disabled="true" title="Non-http(s) citation URL — not rendered as a link for safety" onclick="return false;">${escapeHtml(
        url
      )} (non-navigable)</a> — retrieved ${retrievedAt}`;
    }
    list.appendChild(li);
  });
  card.appendChild(list);

  return card;
}

function confidenceBadgeHtml(confidence) {
  const known = ["high", "medium", "low"];
  const safe = known.includes(confidence) ? confidence : null;
  if (!safe) {
    return `<span class="badge" style="background:#475569;color:#fff;">unknown (${escapeHtml(
      String(confidence)
    )})</span>`;
  }
  return `<span class="badge confidence-${safe}">${safe}</span>`;
}

function formatDomain(domain) {
  if (!domain) return "(no evidence domain)";
  return String(domain).replace(/_/g, " ");
}

/* ---------------- Connect panel helpers ---------------- */

function showConnectPanel() {
  els.connectPanel.classList.remove("hidden");
  els.connectConfirmation.classList.add("hidden");
}

function hideConnectPanel(opts = {}) {
  if (!opts.keepConfirmation) {
    els.connectConfirmation.classList.add("hidden");
    els.connectConfirmation.textContent = "";
  }
  if (!opts.keepConfirmation) {
    els.connectPanel.classList.add("hidden");
  }
}

function showConnectConfirmation(message, isError = false) {
  els.connectConfirmation.textContent = message;
  els.connectConfirmation.classList.remove("hidden");
  els.connectConfirmation.style.color = isError ? "#fca5a5" : "";
}

/* ---------------- Escaping ----------------
 *
 * escapeHtml/escapeAttr/isHttpUrl now live in frontend/escape.js — a small
 * dependency-free module loaded via <script src="escape.js"> in index.html
 * *before* this file, so it can also be `require()`d as-is by the Node test
 * suite (frontend/tests/) without duplicating the logic. See escape.js for
 * the implementations; they're used here as plain globals, consistent with
 * how the rest of this file is a non-module <script>.
 */
