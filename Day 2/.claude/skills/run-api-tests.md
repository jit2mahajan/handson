# Run API Tests

**Trigger**: User wants to test/validate/verify API functionality

## Description
Runs validation tests for API service layer, hooks, and integrations.

## Available Test Scenarios

### Mock Data Tests
```bash
# Verify mock data loads
npm run dev
# Visit http://localhost:3000
# Check browser console for errors
```

### Service Tests
```bash
# Test Records Service
npx jest recordsService.test.ts

# Test Auth Service
npx jest authService.test.ts

# Test Validation Service
npx jest validationService.test.ts
```

### Hook Tests
```bash
# Test useRecords hook
npx jest useRecords.test.ts

# Test useAuth hook
npx jest useAuth.test.ts
```

## Manual Testing

1. **Records CRUD**
   - Create new record
   - Update record
   - Delete record
   - Approve/reject record

2. **Audit Trail**
   - View audit entries
   - Export audit trail
   - Verify immutability

3. **Authentication**
   - Login as different roles
   - Check role-based access
   - Verify token refresh

## Notes
- Tests use mock data by default
- Production API integration requires backend
- See ENV_SETUP.md for backend configuration
