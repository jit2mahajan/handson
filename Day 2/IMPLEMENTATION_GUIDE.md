# Complete Rate Limiting Implementation Guide

Production-ready rate limiting for the ALCOA+ QA backend. All code provided—copy & paste ready.

---

## PHASE 1: Setup (10 minutes)

### Step 1.1: Install Dependencies

```bash
npm install express-rate-limit redis ioredis cors helmet morgan dotenv
npm install --save-dev @types/express-rate-limit @types/node
```

### Step 1.2: Start Redis

Choose one:

```bash
# Option A: Homebrew (macOS)
brew install redis
redis-server

# Option B: Docker
docker run -d -p 6379:6379 redis:7-alpine

# Option C: Docker Compose
docker-compose up -d redis
```

Verify:
```bash
redis-cli ping  # Should return PONG
```

### Step 1.3: Configure Environment

Copy to `.env.production`:

```bash
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=redis
GENERAL_REQUESTS_PER_MIN=100
LOGIN_ATTEMPTS_PER_HOUR=10
CREATE_REQUESTS_PER_MIN=50
REPORT_REQUESTS_PER_MIN=5
AUDIT_EXPORT_REQUESTS_PER_MIN=3
ADMIN_REQUESTS_PER_MIN=30

# Backend
PORT=5000
NODE_ENV=production
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000
```

---

## PHASE 2: Integrate Middleware (5 minutes)

### Step 2.1: Create Files

All files are pre-created in your repository:

```
✓ src/backend/utils/redisClient.ts
✓ src/backend/middleware/rateLimitRules.ts
✓ src/backend/middleware/rateLimit.ts
✓ src/backend/api/rateLimitStats.ts
✓ src/backend/app.ts (example)
```

### Step 2.2: Apply to Your Routes

Import in your Express app:

```typescript
import express from 'express';
import { redisClient, defaultRedisConfig } from './backend/utils/redisClient';
import { 
  general, create, report, loginRateLimit 
} from './backend/middleware/rateLimit';
import rateLimitStatsRouter from './backend/api/rateLimitStats';

const app = express();

// Initialize Redis on startup
await redisClient.initialize(defaultRedisConfig);

// Apply rate limiting to routes
app.post('/api/auth/login', loginRateLimit, authController.login);
app.get('/api/records', general, recordsController.list);
app.post('/api/records', create, recordsController.create);
app.get('/api/reports/compliance', report, reportsController.getCompliance);

// Mount admin monitoring endpoints
app.use('/api/rate-limit', authMiddleware, rateLimitStatsRouter);

app.listen(5000);
```

### Step 2.3: Handle Login Success/Failure

```typescript
import { recordSuccessfulLogin, recordFailedLoginAttempt } from './backend/middleware/rateLimit';

// In your login controller
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip;

  // Validate credentials
  const isValid = validateCredentials(email, password);

  if (!isValid) {
    // Record failed attempt
    await recordFailedLoginAttempt(email, ip);
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Record successful login (clears attempts)
  await recordSuccessfulLogin(email, ip);

  // Return token
  res.json({ token: 'jwt-token', user: { email, role: 'qa-manager' } });
});
```

---

## PHASE 3: Test (10 minutes)

### Test 3.1: General Rate Limiting

```bash
TOKEN="your-jwt-token"

# Make 105 requests (limit is 100)
for i in {1..105}; do
  curl -i http://localhost:5000/api/records \
    -H "Authorization: Bearer $TOKEN" 2>/dev/null | grep -E "200|429" | head -1
done

# You should see:
# - First 100: HTTP/1.1 200 OK
# - 101-105: HTTP/1.1 429 Too Many Requests
```

### Test 3.2: Login Rate Limiting

```bash
# Make 11 failed login attempts (limit is 10)
for i in {1..11}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}' \
    -i 2>/dev/null | grep -E "401|429" | head -1
done

# You should see:
# - Attempts 1-10: HTTP/1.1 401 Unauthorized (invalid credentials)
# - Attempt 11: HTTP/1.1 429 Too Many Requests (rate limit)
```

### Test 3.3: Response Headers

```bash
curl -i http://localhost:5000/api/records \
  -H "Authorization: Bearer $TOKEN" 2>/dev/null | grep -E "X-RateLimit|Retry-After"

# You should see:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 95
# X-RateLimit-Reset: 2026-09-05T04:55:00Z
```

### Test 3.4: Admin Endpoints

```bash
# Get status
curl http://localhost:5000/api/rate-limit/status \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# List all active limits
curl http://localhost:5000/api/rate-limit/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.count'

# Reset all limits
curl -X POST http://localhost:5000/api/rate-limit/reset-all \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
```

---

## PHASE 4: Verify (5 minutes)

### Checklist 4.1: Deployment

- [ ] Redis running: `redis-cli ping` returns PONG
- [ ] Environment variables set: `env | grep REDIS_HOST`
- [ ] Backend starting without errors: `npm run backend:dev`
- [ ] Health check working: `curl http://localhost:5000/health`
- [ ] Rate limit status working: `curl http://localhost:5000/api/rate-limit/status`

### Checklist 4.2: Functionality

- [ ] General API limits at 100/minute
- [ ] Login limits at 10 attempts/hour
- [ ] Create record limits at 50/minute
- [ ] Report limits at 5/minute
- [ ] 429 response has proper format
- [ ] Retry-After header present
- [ ] Admin endpoints accessible

### Checklist 4.3: Integration

- [ ] Middleware applied to all endpoints
- [ ] Login success clears attempts
- [ ] Login failure increments counter
- [ ] Per-user limits working
- [ ] Per-IP limits working
- [ ] Rate limits reset after window

---

## PHASE 5: Production Deployment (15 minutes)

### Step 5.1: Docker Setup

```bash
# Build backend image
docker build -f Dockerfile.backend -t alcoa-backend:latest .

# Start all services
docker-compose up -d

# Verify
docker-compose ps
```

### Step 5.2: Configure Environment

Update `.env.production` for production:

```env
# Production Redis (managed service or cluster)
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>
REDIS_DB=0

# Security
JWT_SECRET=<min-32-character-random-key>
CORS_ORIGIN=https://app.example.com

# Logging
LOG_LEVEL=error
NODE_ENV=production

# Rate limits (adjust based on usage)
GENERAL_REQUESTS_PER_MIN=100
LOGIN_ATTEMPTS_PER_HOUR=10
CREATE_REQUESTS_PER_MIN=50
```

### Step 5.3: Nginx Reverse Proxy

```nginx
upstream backend {
    server backend:5000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location /api {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

### Step 5.4: Monitoring

```bash
# Check service health
curl https://api.example.com/api/rate-limit/health

# Monitor active limits
curl https://api.example.com/api/rate-limit/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.count'

# View logs
docker-compose logs -f backend
```

---

## Rate Limit Configuration Reference

| Type | Limit | Window | Purpose |
|---|---|---|---|
| General API | 100 | 1 min | Per-IP general requests |
| Login | 10 | 1 hour | Per-IP brute force prevention |
| Create | 50 | 1 min | Per-user bulk create prevention |
| Reports | 5 | 1 min | Per-user expensive operations |
| Audit Export | 3 | 1 min | Per-user data export limiting |
| Admin | 30 | 1 min | Per-admin privileged operations |
| Approvals | 10 | 1 min | Per-user record approvals |

## Response Examples

### Success (Below Limit)
```
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-09-05T04:55:00Z

{ "data": "..." }
```

### Rate Limited (429)
```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-09-05T04:55:00Z

{
  "error": "Too many requests, please try again later",
  "code": "RATE_LIMIT_EXCEEDED",
  "retry_after": 42,
  "reset_at": "2026-09-05T04:55:00Z",
  "timestamp": "2026-09-05T04:53:38Z"
}
```

### Login Blocked (429 with Backoff)
```
HTTP/1.1 429 Too Many Requests
Retry-After: 128

{
  "error": "Too many login attempts, please try again later",
  "code": "LOGIN_RATE_LIMIT",
  "retry_after": 128,
  "blocked_until": "2026-09-05T04:55:00Z",
  "timestamp": "2026-09-05T04:53:52Z"
}
```

Note: Exponential backoff (1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s max)

---

## Admin Operations

### View Rate Limit Status

```bash
curl http://localhost:5000/api/rate-limit/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### List All Active Rate Limits

```bash
curl http://localhost:5000/api/rate-limit/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Reset Specific Rate Limit

```bash
curl -X POST http://localhost:5000/api/rate-limit/reset/RATE_LIMIT_KEY \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Clear User's Login Attempts

```bash
curl -X POST "http://localhost:5000/api/rate-limit/clear-login/user@example.com?ip=192.168.1.1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Check Rate Limit Health

```bash
curl http://localhost:5000/api/rate-limit/health \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## Troubleshooting

### Issue: Redis Connection Failed

```bash
# Verify Redis is running
redis-cli ping

# Or start with Docker
docker run -d -p 6379:6379 redis:7-alpine

# Check logs
docker logs alcoa-redis
```

### Issue: Rate Limiting Not Working

```bash
# Check if Redis is connected
curl http://localhost:5000/api/rate-limit/health

# Output: { "status": "connected", ... }
# If "memory-fallback", Redis is not connected
```

### Issue: Port 5000 Already in Use

```bash
# Find and kill process
lsof -i :5000
kill -9 <PID>

# Or use different port
PORT=5001 npm run backend:dev
```

### Issue: Getting Rate Limited Too Quickly

```bash
# Reset all limits
curl -X POST http://localhost:5000/api/rate-limit/reset-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Check configuration
curl http://localhost:5000/api/rate-limit/status
```

### Issue: Login Permanently Blocked

```bash
# Clear login attempts
curl -X POST "http://localhost:5000/api/rate-limit/clear-login/user@example.com?ip=192.168.1.1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

---

## File Structure

```
/home/labuser/Downloads/Day 2/
├── src/backend/
│   ├── utils/
│   │   └── redisClient.ts              # Redis connection management
│   ├── middleware/
│   │   ├── rateLimit.ts                # Rate limit middleware
│   │   └── rateLimitRules.ts           # Configurations
│   ├── api/
│   │   └── rateLimitStats.ts           # Admin endpoints
│   ├── tests/
│   │   └── rateLimit.test.ts           # Test suite
│   └── app.ts                          # Express integration example
├── .env.backend                        # Environment template
├── Dockerfile.backend                  # Backend Docker image
├── docker-compose.yml                  # Docker services
├── IMPLEMENTATION_GUIDE.md             # This file
├── RATE_LIMITING_IMPLEMENTATION.md     # Technical reference
├── RATE_LIMITING_QUICKSTART.md         # Quick setup
├── RATE_LIMITING_PACKAGE_JSON.md       # Dependencies
└── RATE_LIMITING_SUMMARY.md            # Complete overview
```

---

## Key Files to Review

1. **`RATE_LIMITING_QUICKSTART.md`** - 5-minute setup
2. **`RATE_LIMITING_IMPLEMENTATION.md`** - Complete technical guide
3. **`src/backend/app.ts`** - Integration example
4. **`src/backend/middleware/rateLimit.ts`** - Main middleware code

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Start Redis
3. ✅ Configure environment
4. ✅ Copy files to your project
5. ✅ Apply middleware to routes
6. ✅ Test rate limiting
7. ✅ Deploy to production

**All code is production-ready. Copy, integrate, deploy!**

For questions or issues, see the troubleshooting section or review the technical documentation in `RATE_LIMITING_IMPLEMENTATION.md`.
