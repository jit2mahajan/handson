# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

### Development (Frontend + Backend Locally)

```bash
# Install dependencies
npm install

# Terminal 1: Start dev server (frontend on :3000)
npm run dev

# Terminal 2: Start Redis (required for backend)
redis-server

# Terminal 3: Start backend (on :5000)
npm run dev:backend

# Backend uses localhost storage by default (no DB needed for initial dev)
# Frontend will connect to http://localhost:5000/api
```

### Production (Docker)

```bash
# Using docker-compose with PostgreSQL + Redis + Backend + Frontend
docker-compose up

# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
# Optional Nginx proxy: http://localhost (requires -p production profile)
docker-compose --profile production up
```

## Build & Deployment

```bash
npm run build        # TypeScript compile + Vite bundle (dist/ folder)
npm run preview      # Preview production build locally
npm run dev:backend  # Start Express backend in development
```

## Environment Configuration

### Frontend (.env.local, .env.development, .env.production)
- `VITE_API_BASE_URL`: Backend API endpoint (default: `http://localhost:5000/api`)
- `VITE_ALCOA_ENFORCEMENT`: Enable ALCOA+ compliance checks
- `VITE_CFR_PART_11_MODE`: Enforce FDA 21 CFR Part 11 requirements

### Backend (.env.backend, copied to .env.production)
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`
- **Database**: `DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` (PostgreSQL)
- **Rate Limiting**: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_STORE` (redis/memory)
  - `GENERAL_REQUESTS_PER_MIN`, `CREATE_REQUESTS_PER_MIN`, `LOGIN_ATTEMPTS_PER_HOUR`, etc.
- **JWT**: `JWT_SECRET` (min 32 chars), `JWT_EXPIRY`, `JWT_REFRESH_EXPIRY`
- **CORS**: `CORS_ORIGIN` (allowed frontend URL)

For development, backend uses in-memory storage. For production, requires PostgreSQL + Redis.

## Architecture

### Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js with rate limiting, JWT auth, CORS, helmet security
- **Database**: PostgreSQL (production; uses localStorage/in-memory in dev)
- **Cache/Rate Limiting**: Redis (for distributed rate limiting in production)
- **Integrations**: Apify API for web scraping, MCP server for tool access

### Data Flow

```
Frontend (React)
├─ Pages (Dashboard, RecordsManagement, AuditTrail, Reports, ApifySearch, LoginPage)
├─ API Layer
│  ├─ Services (recordsService, auditService, authService, reportsService, validationService)
│  └─ Hooks (useRecords, useAuditTrail, useAuth, useReports, useValidation)
└─ Components (RecordModal, Navigation, ViewRecordModal, etc.)
     ↓
Backend (Express on :5000)
├─ Rate Limiting Middleware (per-endpoint rules)
├─ JWT Authentication
├─ Routes
│  ├─ /api/records/* (CRUD, approval)
│  ├─ /api/audit/* (audit trail)
│  ├─ /api/reports/* (analytics)
│  ├─ /api/apify/* (web scraping integration)
│  └─ /api/ratelimit/stats (monitoring)
└─ Storage
   ├─ PostgreSQL (production)
   └─ In-memory/localStorage (development)
```

### Core Model: ALCOA+ Compliance

Every `QARecord` enforces six ALCOA+ principles:
- **Attributable**: User ID, timestamp, role tracked for every change
- **Legible**: Structured formatting with validation
- **Contemporaneous**: Created at event time (enforced by server)
- **Original**: Immutable once created; changes create new audit entries
- **Accurate**: Validated against schema and business rules
- **Auditable & Complete**: Full change history in `AuditTrail` (append-only)

Records are approved only when all six `alcoa` flags are `true`. Audit entries are never deleted—only appended.

### Role-Based Access Control (RBAC)

Four roles with enforcement in UI and API:
- **admin**: Full system access, can reset rate limits
- **qa-manager**: Create, edit, approve records; view reports and audit trail
- **qa-analyst**: Create and edit records only
- **reviewer**: View-only access to records, audit trail, and reports

Check `user.role` in components and apply API authorization in backend middleware.

### API Layer Architecture

**Services** (`src/api/services/`): Pure functions that call backend endpoints. Replace with actual API calls; currently mock `localStorage` in development.
- `recordsService`: CRUD, approval, validation
- `auditService`: Retrieve immutable audit trail
- `authService`: Login, logout, token management
- `reportsService`: Compliance analytics
- `validationService`: ALCOA+ checks

**Hooks** (`src/api/hooks/`): React hooks wrapping services with state management. Use in components to fetch/mutate data with loading/error states.

### Rate Limiting

Backend enforces per-endpoint rate limits via middleware (in `src/backend/middleware/rateLimit.ts`):
- **General**: 100 requests/min per IP
- **Login**: 10 failed attempts/hour (exponential backoff)
- **Create Records**: 50 requests/min per authenticated user
- **Reports**: 5 requests/min per user
- **Admin**: 30 requests/min per user

Redis stores rate limit counters in production. Configure in `.env.backend`.

### Apify Integration

- **MCP Server** (`src/backend/mcp/apify-mcp-server.ts`): Exposes Apify API as Claude tools
- **API Route** (`src/backend/api/apify.ts`): Backend proxy for Apify requests
- **UI Page** (`src/pages/ApifySearch.tsx`): Web scraping search interface

Requires `APIFY_API_TOKEN` in `.env.backend`. See `APIFY_IMPLEMENTATION_SUMMARY.md` for details.

### Styling

Tailwind CSS with three Eli Lilly brand colors in `tailwind.config.js`:
- `eli-blue` (#003366) — primary
- `eli-gold` (#FFB81C) — accent
- `eli-light` (#E8EEF7) — backgrounds

Global component layer styles in `src/index.css`: `.btn-primary`, `.btn-secondary`, `.card`, `.input-field`.

## Key Files & Patterns

**Types** (`src/types/index.ts`): All TypeScript interfaces. Update here for schema changes.

**Storage/Persistence** (`src/utils/storage.ts`): Mock data, localStorage CRUD, audit trail. For production, services make actual API calls to backend.

**Backend Entry** (`src/backend/app.ts`): Express app setup with middleware, routes, error handling.

**Adding a QARecord field**:
1. Update `QARecord` in `src/types/index.ts`
2. Add to mock data in `src/utils/storage.ts`
3. Add form input in `src/components/RecordModal.tsx`
4. Add table column in `src/pages/RecordsManagement.tsx`
5. Update backend record schema if using database

**Adding a new page**:
1. Create component in `src/pages/`
2. Import and add route logic in `src/App.tsx`
3. Add menu item to `src/components/Navigation.tsx` with role-based visibility

**Adding a new API service**:
1. Create service in `src/api/services/` (export pure functions)
2. Create corresponding hook in `src/api/hooks/` if needed
3. Export from `src/api/index.ts`
4. Use in components via hook or direct service call

## Regulatory & Security Notes

This system targets **21 CFR Part 11** (FDA electronic records compliance):
- ✅ Immutable audit trails with timestamps and user attribution
- ✅ ALCOA+ principle verification
- ✅ No data deletion from audit log
- ⚠️ Authentication: Backend uses JWT; upgrade TLS/session handling for production
- ⚠️ Database: Use PostgreSQL with encryption at rest for production

For production deployment, ensure:
- HTTPS/TLS everywhere
- Strong JWT secret (min 32 chars, rotated regularly)
- Database encryption and backup strategy
- Redis persistence enabled
- Rate limiting tuned for expected traffic
- Audit logging to immutable store (not just in-app trail)
