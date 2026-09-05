# Environment Configuration Guide

## Overview

This project uses environment variables to configure different deployment scenarios:
- **Development**: Local testing with mock data
- **Production**: Real backend with localhost database

## Environment Files

### `.env.production` (Testing Production)
```bash
VITE_DATABASE_HOST=localhost
VITE_DATABASE_PORT=5432
VITE_DATABASE_NAME=alcoa_qa_db
VITE_API_BASE_URL=http://localhost:5000/api
VITE_MOCK_DATA=false
```
**Use when**: Testing with a real backend server running locally

### `.env.development` (Development)
```bash
VITE_DATABASE_HOST=localhost
VITE_DATABASE_PORT=5432
VITE_DATABASE_NAME=alcoa_qa_db_dev
VITE_MOCK_DATA=true
VITE_DEBUG_MODE=true
```
**Use when**: Daily development (default for `npm run dev`)

### `.env.local` (Local Override - NOT in Git)
```bash
# Add sensitive local values here
# Examples: API keys, database passwords
```
**Use for**: Local-only settings that shouldn't be committed

## Running with Different Environments

### Development Mode (Default)
```bash
npm run dev
# Uses .env.development with mock data
```

### Production Testing Mode
```bash
# Create backend server first:
node backend-server.js  # (in another terminal)

# Then run app in production mode:
NODE_ENV=production npm run build
npm run preview
# Uses .env.production with real API
```

## Database Configuration

### PostgreSQL Setup (for production testing)
```bash
# Install PostgreSQL locally or use Docker:
docker run -e POSTGRES_PASSWORD=password \
  -p 5432:5432 postgres:latest

# Create database:
psql -h localhost -U postgres -c "CREATE DATABASE alcoa_qa_db;"
```

### Connect from App
The app will attempt to connect to:
- **Host**: `localhost` (VITE_DATABASE_HOST)
- **Port**: `5432` (VITE_DATABASE_PORT)
- **Database**: `alcoa_qa_db` (VITE_DATABASE_NAME)

## Compliance Enforcement

All environments have ALCOA+ compliance enabled:
```
VITE_ALCOA_ENFORCEMENT=true
VITE_AUDIT_TRAIL_ENABLED=true
VITE_CFR_PART_11_MODE=true
```

These cannot be disabled.

## Adding New Variables

1. Add to `.env.production`, `.env.development`, and `.env.local`
2. In code, access via `import.meta.env.VITE_YOUR_VARIABLE`
3. Variables must start with `VITE_` to be accessible in browser

Example:
```javascript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const isDebug = import.meta.env.VITE_DEBUG_MODE === 'true';
```

## Security Notes

⚠️ **DO NOT commit `.env.local`** - it's in .gitignore
⚠️ **DO NOT store secrets in `.env.production`** - use `.env.local` for overrides
⚠️ **All VITE_ variables are exposed to browser** - never put API keys in them

For sensitive data:
1. Use `.env.local` (not committed)
2. Or implement server-side proxy
3. Or use environment secrets in CI/CD

## Troubleshooting

### Variables not loading?
- Ensure file name matches: `.env.production` or `.env.development`
- Restart dev server after changing .env files
- Check variable names start with `VITE_`

### Database connection fails?
- Check PostgreSQL is running on localhost:5432
- Verify database name matches config
- Check credentials in `.env.local`

### Mock data not working?
- Confirm `VITE_MOCK_DATA=true` in `.env.development`
- Check localStorage is enabled in browser
- Clear localStorage: DevTools → Application → Clear All

## References

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [PostgreSQL Docker Setup](https://hub.docker.com/_/postgres)
