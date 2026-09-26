"""Renders v1_vs_v2_comparison.md's content into a formatted PDF.
Content lives in this file as structured data (not parsed from the .md) so
table layout/column widths can be controlled precisely with fpdf2.
Run: python3 generate_report.py
"""
from datetime import date

from fpdf import FPDF

PRIMARY = (79, 70, 229)
TEXT = (19, 22, 41)
MUTED = (102, 112, 133)
BORDER = (224, 229, 236)
ROW_ALT = (248, 249, 252)

FEATURE_ROWS = [
    ("LLM provider", "Anthropic (placeholder only, never live)", "Groq openai/gpt-oss-120b, live-capable"),
    ("Evidence extraction", "Structured claims + stub placeholder for notes",
     "Structured claims + Groq-verified note statements, or a clear stub/error message"),
    ("Chatbot", "Not present", "POST /chat - grounded Q&A, cites patient_key"),
    ("Load testing", "Not present", "k6 script + built-in self-test (POST /loadtest/chat)"),
    ("Runtime key config", "Not present (env var + restart only)",
     "POST /config/groq-key - in-memory swap, no restart, never persisted/logged"),
    ("LLM error handling", "N/A - no live LLM calls attempted",
     "Every Groq call wrapped in try/except, degrades instead of 500"),
    ("Frontend layout", "Single column: header, list, approve/reject",
     "Two-column dashboard: top bar, sticky sidebar, chat + settings panels"),
    ("Frontend styling", "Plain borders, flat buttons",
     "CSS custom-property design system, hover elevation, button variants"),
    ("API surface", "/health /ingest /screen /candidates /finalize",
     "Same, plus /chat /config/groq-key /loadtest/chat"),
    ("Plugin/MCP/observability/vault/demo", "Present - built as part of V1's full-roadmap scope",
     "Unchanged from V1"),
    ("Governance docs", "Scoped to ingestion/eligibility/candidate-api + dashboard",
     "Ownership extended to chat-api, key config, load-test, chat/settings panels"),
]

ENDPOINT_ROWS = [
    ("POST /chat", "Coordinator Q&A grounded in candidate data", "X-API-Key"),
    ("POST /config/groq-key", "Runtime, in-memory Groq key/model swap", "X-API-Key"),
    ("POST /loadtest/chat", "Built-in concurrent self-test against /chat", "X-API-Key"),
]

LOADTEST_ROWS = [
    ("k6 (chat_load_test.js)", "Ramp 5->20 VUs, ~70s, 927 requests",
     "0% failure, p(95)=18.42ms - both thresholds passed"),
    ("Built-in self-test", "5 workers x 3 requests = 15 requests",
     "0% error, avg 20.98ms, p95 40.72ms"),
    ("Built-in self-test (defaults)", "50 requests", "0% error rate"),
]


class ReportPDF(FPDF):
    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, "Qualified Health - V1 vs V2 Comparison Report", align="L")
        self.cell(0, 8, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*TEXT)
        self.ln(2)

    def section(self, title):
        self.ln(4)
        self.set_font("Helvetica", "B", 13)
        self.set_text_color(*PRIMARY)
        self.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(*TEXT)
        self.set_draw_color(*BORDER)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def body(self, text):
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(*TEXT)
        self.multi_cell(0, 5.6, text)
        self.ln(1)

    def bullet(self, text):
        self.set_font("Helvetica", "", 10.5)
        self.set_x(self.l_margin + 4)
        self.multi_cell(self.w - self.l_margin - self.r_margin - 4, 5.6, f"- {text}")

    def table(self, headers, rows, col_widths):
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(*PRIMARY)
        self.set_text_color(255, 255, 255)
        for h, w in zip(headers, col_widths):
            self.cell(w, 8, h, border=0, fill=True)
        self.ln(8)

        self.set_font("Helvetica", "", 9)
        self.set_text_color(*TEXT)
        for i, row in enumerate(rows):
            fill = i % 2 == 1
            self.set_fill_color(*ROW_ALT)
            line_heights = []
            for cell_text, w in zip(row, col_widths):
                lines = self.multi_cell(w, 5, cell_text, border=0, align="L", dry_run=True, output="LINES")
                line_heights.append(len(lines) * 5)
            row_h = max(line_heights) if line_heights else 5
            x0, y0 = self.get_x(), self.get_y()
            for cell_text, w in zip(row, col_widths):
                self.set_xy(x0, y0)
                self.multi_cell(w, 5, cell_text, border=0, align="L", fill=fill)
                x0 += w
            self.set_xy(self.l_margin, y0 + row_h)
        self.ln(2)


def build() -> ReportPDF:
    pdf = ReportPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    # Title page
    pdf.ln(50)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 12, "Qualified Health", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(*TEXT)
    pdf.cell(0, 10, "V1 vs V2 Comparison Report", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 8, "Candidate Identification & Coordinator Dashboard", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(6)
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 6, f"Generated {date.today().isoformat()}", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(20)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(180, 60, 20)
    pdf.multi_cell(0, 6, "Synthetic / demo data only - no real patient information is used anywhere in this system.", align="C")

    pdf.add_page()

    pdf.section("1. Scope")
    pdf.body(
        "V1 is the complete AIDLC build: every step of detailed-plan.md's 20-step roadmap except Step "
        "18 (graphify, intentionally excluded - gated behind the /graphify skill only). This includes "
        "the core pipeline (FHIR-shaped ingestion, record linkage, eligibility engine, evidence "
        "extraction, candidate API, a minimal single-column frontend for candidate list + "
        "approve/reject) and the full governance/platform layer: skills + hooks, subagents with "
        "context isolation, a delegation table, context trimming, reusable plugin packaging, MCP "
        "server registration and a custom read-only MCP server, OpenTelemetry + SigNoz observability, "
        "an Obsidian knowledge vault, a prompt-engineering pass, and a first-user demo script. "
        "Deployed locally via Docker Compose."
    )
    pdf.body(
        "V2 is everything in V1, plus three additions layered on top: a Groq-backed coordinator "
        "chatbot, load testing, and a full visual redesign of the dashboard (\"good UI\"). Runtime "
        "(in-memory) Groq-key configuration and a bug fix for ungraceful LLM-error handling ship "
        "alongside the chatbot as its supporting infrastructure."
    )

    pdf.section("2. Feature comparison")
    pdf.table(
        ["Area", "V1", "V2"],
        FEATURE_ROWS,
        [38, 68, 76],
    )

    pdf.section("3. New API endpoints in V2")
    pdf.table(
        ["Endpoint", "Purpose", "Auth"],
        ENDPOINT_ROWS,
        [45, 105, 32],
    )

    pdf.section("4. Load-testing results (V2 only)")
    pdf.table(
        ["Run", "Load", "Result"],
        LOADTEST_ROWS,
        [50, 55, 77],
    )
    pdf.body(
        "Note: without a live GROQ_API_KEY, all runs measured the stub-answer code path's latency, not "
        "real model latency. A live key would show materially higher (network-bound) latency."
    )

    pdf.section("5. Bug found and fixed during V2 hardening")
    pdf.body(
        "Setting an invalid/expired Groq key via /config/groq-key and then calling /chat originally "
        "crashed with an unhandled groq.AuthenticationError, surfacing as a bare 500 Internal Server "
        "Error. Fixed by wrapping every Groq call (chatbot.answer, "
        "evidence_extraction._note_based_claim) in try/except, returning a clearly-marked degraded "
        "message instead - consistent with the graceful-degradation philosophy already used for the "
        "\"no key set\" case in V1."
    )

    pdf.section("6. What stayed the same")
    for item in [
        "Synthetic/dummy FHIR-shaped patient data (2 interventions, ~8 patients) - no real source-system access.",
        "Docker Compose topology: postgres (pgvector) -> backend -> frontend.",
        "X-API-Key / hmac.compare_digest auth on every write endpoint.",
        "The human-gate finalize flow (POST /candidates/{patient_key}/finalize) and its audit log.",
        "Scope boundary: this case study remains fully independent of other day5/ folders.",
    ]:
        pdf.bullet(item)
    pdf.ln(1)

    pdf.section("7. Known limitations / risks")
    for item in [
        "All data is synthetic; nothing here has been validated against real clinical records.",
        "The Groq key set via the UI is runtime-only - lost on backend restart by design; .env is the "
        "only way to set a key that survives a restart.",
        "Load testing covers /chat only, not /screen /candidates /finalize - a deliberate scope choice.",
        "k6/self-test results are visible only as raw JSON/console output today; a dedicated result "
        "dashboard is planned but not yet built.",
    ]:
        pdf.bullet(item)
    pdf.ln(1)

    pdf.section("8. Planned next (from detailed-plan.md)")
    pdf.body(
        "A k6 result dashboard visualization (Step 16, remaining part). Step 18 (graphify knowledge "
        "graph) is intentionally excluded - gated behind the /graphify skill only, per the user's "
        "global CLAUDE.md. Every other step of the 20-step roadmap is Done in V1."
    )

    return pdf


if __name__ == "__main__":
    build().output("v1_vs_v2_comparison.pdf")
    print("wrote v1_vs_v2_comparison.pdf")
