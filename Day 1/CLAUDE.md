# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains two standalone HTML tools for ALCOA (Attributable, Legible, Contemporaneous, Original, Accurate) data compliance assessment in pharmaceutical and general operations.

### Files

- **alcoa.html** - General-purpose ALCOA compliance checklist with operations team features (dropdowns for team, operator, priority, filtering by principle)
- **alcoa-pharma.html** - Pharmaceutical-industry-specific version aligned with 21 CFR Part 11, GxP compliance (GMP, GLP, GDP, GCP, GVP), and FDA regulations

## Running the Project

### Local Development Server
```bash
cd /home/labuser/Downloads/Day\ 1
python3 -m http.server 8000
```

Access tools at:
- http://localhost:8000/alcoa.html
- http://localhost:8000/alcoa-pharma.html

No build process, build tools, or dependencies required. Files are self-contained with inline CSS and JavaScript.

## Architecture & Design

### Self-Contained HTML Pattern
Both files use a single-file architecture with:
- Inline `<style>` blocks (no external CSS)
- Inline `<script>` sections (no external JS libraries)
- No build dependencies or transpilation needed

### Key Features to Preserve

**Pharma Tool (alcoa-pharma.html):**
- **Sample Data Function** - `loadSampleData()` populates form with one of 6 realistic pharma scenarios (Manufacturing, QC, QA-Deviation, Distribution, Regulatory-Validation, R&D-CAPA)
- **Progress Tracking** - Real-time compliance percentage calculation across 26 checklist items organized by principle
- **Export Functionality** - CSV export includes operations metadata (facility, assessor, risk level, audit type)
- **Compliance Badges** - Dynamic status indicators (Fully Compliant / Mostly Compliant / Partially Compliant / Non-Compliant)

**General Tool (alcoa.html):**
- Dropdowns for team selection, operator name, priority level, principle filtering
- Simpler feature set than pharma version but same core compliance checking

### JavaScript Functions to Maintain

**Core Functions:**
- `updateProgress()` - Recalculates compliance percentage whenever checkboxes change
- `updateComplianceBadge(percentage)` - Generates appropriate status badge based on compliance %
- `loadSampleData()` - Pharma only; randomly selects scenario and populates all form fields
- `clearAllData()` - Pharma only; wipes form and checklist
- `exportCSV()` - Generates CSV with metadata and compliance details
- `setDefaultDate()` - Auto-sets assessment date to today

**Data Structure:**
- `sampleDataSets` array in pharma tool contains 6 realistic pharma operation scenarios
- Each scenario includes facility info, GxP type, department, batch/product details, risk level, audit type

## When Modifying These Files

### Design Principles
1. Keep files self-contained (inline CSS/JS only)
2. Maintain accessibility - checkboxes must remain keyboard-accessible, colors should have sufficient contrast
3. Pharma version must align with regulatory terminology (GxP categories, risk levels, 21 CFR Part 11 references)
4. Export data should be complete and audit-ready

### Common Tasks

**Adding new checklist items:**
- Add `<label class="checklist-item">` blocks to the relevant `.principle-group`
- Items auto-update progress tracking (no manual wiring needed)

**Adding new sample data scenarios (pharma only):**
- Add entry to `sampleDataSets` array with realistic field values
- Include all required fields: facility-name, site-code, gxp-type, department, assessor-name, batch-lot, product-name, system-name, risk-level, audit-type, inspector, scope
- Update sample notes array with relevant pharma observation text

**Styling updates:**
- Pharma tool uses CSS variables (--primary, --primary-dark, --success, --danger, etc.) for consistency
- General tool uses similar pattern but different color scheme
- Both use CSS Grid for responsive layouts

### Regulatory Notes (Pharma Tool)

The pharma version references:
- **21 CFR Part 11** - FDA regulation for electronic records/signatures
- **GxP Categories** - GMP (Manufacturing), GLP (Labs), GDP (Distribution), GCP (Clinical), GVP (Vigilance)
- **ALCOA+ Principles** - Five core principles plus "Plus" for additional requirements (security, validation, DR/backup, retention)

Compliance percentage calculation: checked items / total items (26 for pharma, 15 for general)

## No External Dependencies

- No npm packages
- No CSS frameworks
- No JavaScript libraries
- No build tools
- Browsers: Modern browsers with CSS Grid, CSS Variables, and ES6+ support
