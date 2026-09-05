# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev      # Start dev server on http://localhost:3000

# Production
npm run build    # Build optimized bundle to dist/
npm run preview  # Preview production build locally

# Dependencies
npm install      # Install packages (run after package.json changes)
```

No linting, testing, or type-checking scripts currently configured. TypeScript compilation happens during build.

## Architecture

### Stack
- **React 18** (with TypeScript)
- **Vite** (build tool, dev server)
- **Tailwind CSS** (styling)
- **localStorage** (client-side state persistence for demo)

### Core Model: ALCOA+ Compliance

This is a pharmaceutical QA platform where every `QARecord` must satisfy six ALCOA+ principles:
- **Attributable**: Who created/modified it, when
- **Legible**: Readable formatting
- **Contemporaneous**: Created at time of event
- **Original**: Records preserved unchanged
- **Accurate**: Data is correct
- **Auditable & Complete**: Full change history

Records are approved only when all six flags are `true`. The audit trail is immutable—entries are never deleted or modified, only appended.

### Role-Based Access Control

Four roles with different capabilities:
- **admin**: Full system access
- **qa-manager**: Create records, approve, view reports
- **qa-analyst**: Create and edit records only
- **reviewer**: View-only (audit trail, reports)

Check `user.role` before rendering features. Navigation filters menu items by role automatically.

### Data Flow

```
LoginPage
  ↓ (authenticate user in localStorage)
App (routes pages based on state)
  ├─ Dashboard (metrics overview)
  ├─ RecordsManagement (CRUD, modal-based editing)
  ├─ AuditTrail (immutable timeline)
  └─ Reports (analytics, compliance reports)
      ↓
  All persist via storage.ts utility
```

### Key Files

**Types** (`src/types/index.ts`): `User`, `QARecord`, `AuditTrail` interfaces. Update here when schema changes.

**Storage** (`src/utils/storage.ts`): Mock data initialization, localStorage CRUD, audit trail management. Replace with API calls for production. Note: Dates are stringified; convert back with `new Date(record.createdAt)` after retrieval.

**Pages**: Each page is a full screen. `App.tsx` routes between them. No sub-routing.

**Modal pattern**: `RecordModal.tsx` handles all create/edit flows for records. Always opened from `RecordsManagement.tsx`.

### Styling

Tailwind + three custom Eli Lilly brand colors defined in `tailwind.config.js`:
- `eli-blue` (#003366) — primary
- `eli-gold` (#FFB81C) — accent
- `eli-light` (#E8EEF7) — backgrounds

Global component styles in `src/index.css` (@layer components): `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`.

### State & Session

`localStorage` stores current user, all records, and audit log. No global state manager (Context, Redux) currently used—each page reads from storage directly. For production, replace `storage.ts` implementation with API calls; keep the interface the same.

## Development Notes

**Adding a new QARecord field**: Update `QARecord` interface → mock data in `storage.ts` → form input in `RecordModal.tsx` → table column in `RecordsManagement.tsx` → display in relevant pages.

**Adding a new page**: Create in `src/pages/`, import to `App.tsx`, add route logic, add menu item to `Navigation.tsx` with role check.

**ALCOA+ compliance is strict**: Records cannot be approved unless all six `alcoa` flags are `true`. UI enforces this in modals and badges.

**Audit entries are immutable**: `addAuditTrail()` only appends. Never call `deleteRecord()` on audit entries—the entire audit log is tamper-proof by design.

**Browser localStorage limits**: Current demo stores everything in localStorage (~5MB limit). For production with many records, migrate to a backend database.

## Regulatory Context

This system is designed to meet **21 CFR Part 11** (FDA electronic records compliance). Key requirements:
- Immutable audit trails with timestamps and user attribution ✓
- ALCOA+ principle verification ✓
- No data deletion from audit log ✓
- Secure user sessions (currently via localStorage; upgrade for production) ⚠️

For production deployment, add authentication, HTTPS, and backend persistence.
