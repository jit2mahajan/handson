# Backend Code Review & Debug

**Trigger**: User wants to review backend code, validate security, check ALCOA+ compliance, or debug API issues

## Description
Comprehensive backend code review agent that audits implementation against ALCOA+ principles, 21 CFR Part 11 requirements, security standards, and architecture guidelines.

## Review Dimensions

### Security Audit
- ✅ Authentication/Authorization implementation
- ✅ JWT token validation and refresh logic
- ✅ Role-based access control (RBAC) enforcement
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (parameterized queries)
- ✅ HTTPS/TLS enforcement
- ✅ Error handling (no stack traces in responses)
- ✅ Rate limiting and DDoS protection
- ✅ Sensitive data logging prevention

### ALCOA+ Compliance
- ✅ Attributable: User creation/modification tracking
- ✅ Legible: Data format validation
- ✅ Contemporaneous: Timestamp generation
- ✅ Original: Immutable record preservation
- ✅ Accurate: Data integrity checks
- ✅ Auditable: Audit trail append-only design
- ✅ Complete: Full change history tracking

### Database Schema
- ✅ Records table structure
- ✅ 6 ALCOA+ boolean flags on records
- ✅ Immutable audit trail table
- ✅ Foreign key relationships
- ✅ Index performance optimization
- ✅ Timestamp data types

### API Endpoints
- ✅ RESTful route design
- ✅ Request/response schemas
- ✅ Error response consistency
- ✅ HTTP status codes
- ✅ Middleware chain order
- ✅ Endpoint documentation

### Middleware Stack
- ✅ Authentication (JWT validation)
- ✅ Authorization (role checking)
- ✅ Validation (schema, data types)
- ✅ Audit logging (immutable entries)
- ✅ Error handling (generic responses)
- ✅ Response filtering (field masking)

## How to Use

### Invoke the Backend Review Agent
```bash
# Review backend code (requires backend files in src/backend/ or api/)
claude code --agent backend-review --files "src/backend/**/*.ts"

# Review database schema
claude code --agent backend-review --focus database

# Security audit
claude code --agent backend-review --focus security

# ALCOA+ compliance check
claude code --agent backend-review --focus compliance
```

### Review Against Documentation
- `BACKEND_SECURITY.md` - 10 NEVER rules, 10 ALWAYS rules
- `ENV_SETUP.md` - Environment configuration
- `settings.json` - Role/permission definitions
- `.env.production` - Production secrets/config

## Report Output

The agent provides:
1. **Findings Summary** - Critical, High, Medium severity issues
2. **Security Verdict** - Pass/Fail on 10 mandatory security checks
3. **ALCOA+ Checklist** - Compliance status per principle
4. **Recommendations** - Priority fixes and architectural improvements
5. **Code Examples** - Vulnerable patterns and secure alternatives
6. **Test Plan** - Scenarios to verify fixes

## Common Issues to Check

### Authentication Issues
- [ ] Missing JWT validation on protected routes
- [ ] Token expiry not enforced
- [ ] Refresh token endpoint not secured
- [ ] User role not verified from token

### Data Integrity
- [ ] Records deleted instead of flagged inactive
- [ ] Audit trail entries modified after creation
- [ ] ALCOA+ flags not updated atomically
- [ ] Timestamps not set server-side

### API Security
- [ ] User input not validated before DB query
- [ ] Error messages expose database/system info
- [ ] Rate limiting not enforced
- [ ] CORS headers allow all origins

## Notes
- Review happens BEFORE code merges to main
- All findings documented with line numbers and fixes
- No approval without security sign-off
- ALCOA+ compliance is non-negotiable for QA records
- See BACKEND_SECURITY.md for mandatory requirements
