// Local demo dashboard. The API key is entered by the operator and kept
// only in localStorage — never hardcoded into shipped JS. For a real
// deployment this would be a proper session/auth token, not a shared key.
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : `${window.location.protocol}//${window.location.hostname}:8000`;

function getApiKey() {
  let key = localStorage.getItem("qh_api_key");
  if (!key) {
    key = prompt("Enter API key (default: dev-local-key)", "dev-local-key") || "dev-local-key";
    localStorage.setItem("qh_api_key", key);
  }
  return key;
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": getApiKey(),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status}: ${body}`);
  }
  return res.json();
}

function initials(patientKey) {
  const stripped = patientKey.replace(/^pk_/, "");
  return stripped.slice(0, 2).toUpperCase();
}

// Clinical note text (ingested via /ingest) and chat answers (LLM-generated,
// once a live GROQ_API_KEY is set) both flow into these templates — escape
// before interpolating into innerHTML so neither can inject markup/script.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function renderCandidates(candidates) {
  const list = document.getElementById("candidate-list");
  const count = document.getElementById("candidate-count");
  if (count) count.textContent = candidates.length;
  list.innerHTML = "";
  if (candidates.length === 0) {
    list.innerHTML = "<p class='empty'>No candidates for this intervention yet — run screening.</p>";
    return;
  }
  for (const c of candidates) {
    const card = document.createElement("div");
    card.className = "candidate-card" + (c.escalation?.required ? " escalated" : "");

    const evidenceHtml = (c.evidence || [])
      .map((claim) => `<li><strong>${escapeHtml(claim.evidence_domain)}</strong>: ${escapeHtml(claim.statement)}<br/><span class="snippet">${escapeHtml(claim.snippet)}</span></li>`)
      .join("");

    card.innerHTML = `
      <div class="candidate-header">
        <span class="avatar">${escapeHtml(initials(c.patient_key))}</span>
        <span class="patient-key">${escapeHtml(c.patient_key)}</span>
        <span class="status status-${escapeHtml(c.status)}">${escapeHtml(c.status)}</span>
        <span class="score">score: ${escapeHtml(c.score)}</span>
      </div>
      ${c.escalation?.required ? `<div class="escalation-banner">⚠ Escalated: ${escapeHtml(c.escalation.reason)}</div>` : ""}
      <ul class="evidence-list">${evidenceHtml}</ul>
      <div class="actions">
        <button class="btn approve" data-action="approved" data-patient="${escapeHtml(c.patient_key)}">Approve</button>
        <button class="btn reject" data-action="rejected" data-patient="${escapeHtml(c.patient_key)}">Reject</button>
      </div>
    `;
    list.appendChild(card);
  }

  list.querySelectorAll("button[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => finalizeCandidate(btn.dataset.patient, btn.dataset.action));
  });
}

async function refreshList() {
  const interventionId = document.getElementById("intervention-select").value;
  const candidates = await apiFetch(`/candidates?intervention_id=${interventionId}`);
  renderCandidates(candidates);
}

async function runScreening() {
  const interventionId = document.getElementById("intervention-select").value;
  await apiFetch(`/screen/${interventionId}`, { method: "POST" });
  await refreshList();
}

async function finalizeCandidate(patientKey, status) {
  const interventionId = document.getElementById("intervention-select").value;
  const confirmedBy = prompt("Your name (for the audit trail):");
  if (!confirmedBy) return;
  if (!confirm(`Confirm: mark ${patientKey} as ${status}?`)) return;
  await apiFetch(`/candidates/${patientKey}/finalize`, {
    method: "POST",
    body: JSON.stringify({ intervention_id: interventionId, status, confirmed_by: confirmedBy }),
  });
  await refreshList();
}

async function askChat() {
  const message = document.getElementById("chat-input").value.trim();
  if (!message) return;
  const interventionId = document.getElementById("intervention-select").value;
  const answerBox = document.getElementById("chat-answer");
  answerBox.className = "answer-box thinking";
  answerBox.textContent = "Thinking...";
  const result = await apiFetch("/chat", {
    method: "POST",
    body: JSON.stringify({ message, intervention_id: interventionId }),
  });
  answerBox.className = "answer-box";
  answerBox.innerHTML = `
    <div>${escapeHtml(result.answer)}</div>
    ${result.grounded_on?.length ? `<div class="citations">Grounded on: ${escapeHtml(result.grounded_on.join(", "))}</div>` : ""}
  `;
}

async function saveGroqKey() {
  const input = document.getElementById("groq-key-input");
  const apiKey = input.value.trim();
  if (!apiKey) return;
  const status = document.getElementById("save-key-status");
  await apiFetch("/config/groq-key", { method: "POST", body: JSON.stringify({ api_key: apiKey }) });
  input.value = "";
  status.textContent = "Key updated for this session.";
}

async function runLoadTest() {
  const btn = document.getElementById("loadtest-btn");
  const result = document.getElementById("loadtest-result");
  btn.disabled = true;
  btn.textContent = "Running...";
  result.textContent = "";
  try {
    const summary = await apiFetch("/loadtest/chat", { method: "POST", body: JSON.stringify({}) });
    result.innerHTML = `
      <div>total: ${summary.total_requests}, successful: ${summary.successful}, errors: ${summary.errors} (${(summary.error_rate * 100).toFixed(1)}%)</div>
      <div>avg: ${summary.avg_ms}ms, p95: ${summary.p95_ms}ms, max: ${summary.max_ms}ms</div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = "Run Load Test";
  }
}

document.getElementById("screen-btn").addEventListener("click", () => runScreening().catch((e) => alert(e.message)));
document.getElementById("refresh-btn").addEventListener("click", () => refreshList().catch((e) => alert(e.message)));
document.getElementById("chat-ask-btn").addEventListener("click", () => askChat().catch((e) => alert(e.message)));
document.getElementById("save-key-btn").addEventListener("click", () => saveGroqKey().catch((e) => alert(e.message)));
document.getElementById("loadtest-btn").addEventListener("click", () => runLoadTest().catch((e) => alert(e.message)));

refreshList().catch((e) => console.error(e));
