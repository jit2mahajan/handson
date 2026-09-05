# Backend Security & Architecture Rules

**Status**: Frontend-only application. These are rules for when backend is added.

## Quick Reference Checklist

### ✅ Before Each Route Implementation

- [ ] **Authentication**: JWT token required (except `/auth/login`)
- [ ] **Authorization**: Verify user.role has permission
- [ ] **Input Validation**: Server-side validation for all inputs
- [ ] **ALCOA+ Check**: All 6 flags validated before approval
- [ ] **Audit Trail**: Log created for every change
- [ ] **Error Handling**: No stack traces in production
- [ ] **Rate Limiting**: Implemented for sensitive endpoints
- [ ] **Ownership Check**: User can only modify their own records (unless admin/qa-manager)

### 🚫 Forbidden in Backend Code

```
❌ Skip authentication middleware
❌ Delete audit trail entries
❌ Modify approved records directly
❌ String concatenation in SQL (SQL injection risk)
❌ Trust client-supplied role/permissions
❌ Return raw database errors to client
❌ Log passwords, API keys, or sensitive data
❌ Use HTTP instead of HTTPS
❌ Allow anonymous record creation
❌ Mix user data from different organizations/departments
```

### ✅ Required in Every Route

```
✓ Authentication middleware
✓ Authorization middleware
✓ Input validation middleware
✓ Audit logging
✓ Error handling with generic messages
✓ Response filtering (don't expose internal fields)
```

---

## Role-Based Access Control

| Role | Records | Create | Read | Update | Approve | Delete | Audit | Reports |
|------|---------|--------|------|--------|---------|--------|-------|---------|
| **admin** | All | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qa-manager** | All | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **qa-analyst** | Own only | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **reviewer** | All | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## RESTful Route Design

```
Authentication Routes:
  POST   /api/auth/login           - No auth required
  POST   /api/auth/logout          - Auth required
  POST   /api/auth/refresh         - Auth required

Record Management:
  GET    /api/records              - Auth + filter by role
  GET    /api/records/:id          - Auth + ownership check
  POST   /api/records              - Auth + role check
  PUT    /api/records/:id          - Auth + ownership/role check
  DELETE /api/records/:id          - Auth + role check (admin/manager only)
  POST   /api/records/:id/approve  - Auth + role check (manager/admin only)
  POST   /api/records/:id/reject   - Auth + role check (manager/admin only)

Audit & Reporting:
  GET    /api/audit-trail          - Auth + role check (manager/admin/reviewer)
  GET    /api/reports/compliance   - Auth + role check (manager/admin/reviewer)
  GET    /api/reports/activities   - Auth + role check (manager/admin/reviewer)
```

---

## Middleware Stack (Execution Order)

```typescript
// For protected routes
app.use('/api/protected', [
  authMiddleware,          // 1. Verify JWT token
  authorizationMiddleware, // 2. Check user.role permissions
  inputValidationMiddleware, // 3. Validate request body
  auditLoggingMiddleware,  // 4. Log action
  responseFilterMiddleware // 5. Filter sensitive data
]);
```

---

## ALCOA+ Enforcement

### Every Record Must Have:
- `alcoa_attributable`: true (who & when)
- `alcoa_legible`: true (clear format)
- `alcoa_contemporaneous`: true (created at event time)
- `alcoa_original`: true (preserved)
- `alcoa_accurate`: true (correct data)
- `alcoa_auditable`: true (audit trail exists)

### Cannot Approve If:
- Any ALCOA+ flag is false
- Missing required fields
- Data validation fails

### After Approval:
- Original fields locked (cannot modify)
- Only status can change
- Digital signature required if any modification needed

---

## Audit Trail Rules

### What Gets Logged:
- Every record creation
- Every record modification
- Every status change
- Every login (success & failure)
- Every authorization denial
- Every admin action

### What Never Gets Deleted:
- Audit trail entries
- User login history
- Authorization attempts
- Admin action logs

### What Gets Recorded:
- Who made the change (user ID)
- When it happened (UTC timestamp)
- What changed (old value → new value)
- Why it changed (action type)
- Where it came from (IP address)

---

## Input Validation Examples

### Record Title
```
- Type: String
- Min length: 1
- Max length: 255
- Required: true
- Pattern: No special characters except hyphen/underscore
```

### Record Description
```
- Type: String
- Min length: 10
- Max length: 5000
- Required: true
- Sanitize: Remove script tags, SQL syntax
```

### ALCOA+ Flags
```
- Type: Boolean
- Required: true
- Default: true
- Cannot be false for approved records
```

### Record Type
```
- Type: Enum
- Values: ['test-result', 'deviation', 'documentation', 'audit']
- Required: true
- Must match database enum constraint
```

---

## Error Response Standards

### Do Return (Generic):
```json
{
  "error": "Invalid request",
  "code": "INVALID_INPUT",
  "timestamp": "2026-09-05T04:50:00Z"
}
```

### Never Return:
```json
{
  "error": "Column 'title' cannot be null at row 1",  ❌
  "stack": "at Database.query (line 123)"              ❌
}
```

---

## Security Headers Required

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Access-Control-Allow-Origin: https://app.example.com (not *)
```

---

## Rate Limiting Rules

### Default Limits:
- **General API**: 100 requests/minute per IP
- **Login**: 10 failed attempts/hour (exponential backoff)
- **Create Record**: 50 requests/minute per user
- **Report Generation**: 5 requests/minute per user

### Exceeded Response:
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

---

## JWT Token Requirements

### Token Claims:
```typescript
{
  sub: "user-id",           // Subject (user ID)
  email: "user@example.com", // Email
  role: "qa-manager",       // Role
  iat: 1234567890,          // Issued at
  exp: 1234571490           // Expires (1 hour)
}
```

### Refresh Token:
- Expires in 7 days
- Can be used only once
- Generates new access token
- New refresh token issued

### Secrets:
- Min 32 characters
- Strong random generation
- Stored in environment variables only
- Never in code or config files

---

## SQL Injection Prevention

### ❌ WRONG:
```sql
query = "SELECT * FROM records WHERE id = '" + userId + "'"
```

### ✅ CORRECT:
```typescript
// Using parameterized query
const query = 'SELECT * FROM records WHERE id = $1';
const result = await db.query(query, [userId]);
```

---

## Testing Requirements

Before merging any backend route:

- [ ] Unit tests for business logic
- [ ] Integration tests with database
- [ ] Security tests (SQL injection, XSS)
- [ ] Authorization tests (wrong role denied)
- [ ] Ownership tests (user cannot modify others' records)
- [ ] ALCOA+ validation tests
- [ ] Audit logging tests
- [ ] Error handling tests
- [ ] Rate limiting tests
- [ ] Load tests

---

## Documentation Template

Every route implementation MUST include:

```
## GET /api/records/:id

**Purpose**: Retrieve a single QA record

**Authentication**: Required (JWT)

**Authorization**: 
- All roles can read their department's records
- qa-analyst can only read own records

**Rate Limit**: 100/minute

**Request Parameters**:
- id (UUID): Record ID

**Response Success (200)**:
```json
{
  "id": "uuid",
  "title": "...",
  "status": "approved",
  "alcoa": { ... },
  "createdAt": "2026-09-05T00:00:00Z"
}
```

**Response Error (403)**:
```json
{
  "error": "Access denied",
  "code": "UNAUTHORIZED"
}
```

**Audit Trail**: Logged as "Record accessed"

**ALCOA+ Impact**: None (read-only)
```

---

## Compliance Checklist

Before going to production:

- [ ] All routes use HTTPS only
- [ ] All routes require authentication (except /auth/login)
- [ ] ALCOA+ enforcement enabled
- [ ] Audit trail immutable (no delete option)
- [ ] Rate limiting implemented
- [ ] SQL injection tests passed
- [ ] XSS protection verified
- [ ] RBAC tests passed
- [ ] Ownership validation tests passed
- [ ] Backup encryption enabled
- [ ] Database encryption at rest enabled
- [ ] 21 CFR Part 11 compliance verified
- [ ] Security review completed
- [ ] Penetration testing completed

---

## Emergency Response Plan

### If Unauthorized Access Detected:
1. Immediately revoke JWT tokens
2. Force re-authentication
3. Audit log all access for past 24 hours
4. Notify affected users
5. Generate compliance report
6. Investigation documentation

### If Data Tampering Detected:
1. Isolate affected records
2. Verify with audit trail hash
3. Restore from backup if needed
4. Generate non-repudiation evidence
5. Document for FDA if required

---

## Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- 21 CFR Part 11: FDA electronic records guidance
- JWT Best Practices: https://tools.ietf.org/html/rfc8725
- ALCOA+ Documentation: Pharma regulatory guidance

