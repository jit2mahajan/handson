# Setup Backend API

**Trigger**: User wants to configure/integrate/connect to backend API

## Description
Configures the frontend to connect with backend API server.

## Prerequisites
- Backend server running on localhost:5000
- Database setup (see setup-database skill)
- Environment variables configured

## Configuration Steps

### 1. Set Environment Variables

**For Production (.env.production)**:
```
VITE_API_BASE_URL=http://localhost:5000/api
VITE_DATABASE_HOST=localhost
VITE_DATABASE_PORT=5432
VITE_DATABASE_NAME=alcoa_qa_db
VITE_MOCK_DATA=false
```

**For Development (.env.development)**:
```
VITE_MOCK_DATA=true
```

### 2. Start Backend Server

```bash
# Backend server should run on localhost:5000
# See BACKEND_SECURITY.md for server requirements
node server.js  # or equivalent
```

### 3. Test Connection

```bash
# Start dev server
npm run dev

# In browser console, test:
# Test records endpoint
fetch('http://localhost:5000/api/records', {
  headers: { 'Authorization': 'Bearer your-token' }
})
```

## Required API Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh

GET    /api/records
POST   /api/records
PUT    /api/records/:id
DELETE /api/records/:id
POST   /api/records/:id/approve
POST   /api/records/:id/reject

GET    /api/audit-trail
GET    /api/audit-trail/:recordId

GET    /api/reports/compliance
GET    /api/reports/activity
```

## Security Requirements

- HTTPS only in production
- JWT token authentication
- ALCOA+ compliance enforcement
- Audit trail immutability

## See Also
- BACKEND_SECURITY.md - Security rules
- src/api/services/ - Service implementations
- src/api/hooks/ - React hooks
