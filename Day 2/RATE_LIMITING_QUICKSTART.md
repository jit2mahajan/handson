# Rate Limiting Quick Start Guide

Complete production-ready rate limiting setup in 5 minutes.

## Installation & Setup

### 1. Install Dependencies

```bash
npm install express-rate-limit redis ioredis cors helmet morgan

# Development dependencies
npm install --save-dev @types/express-rate-limit @types/node vitest
```

### 2. Start Redis Server

#### Option A: Local Redis

```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Or run directly
redis-server

# Verify connection
redis-cli ping  # Should return PONG
```

#### Option B: Docker Redis

```bash
docker run -d \
  --name alcoa-redis \
  -p 6379:6379 \
  redis:7-alpine

# Verify
docker exec alcoa-redis redis-cli ping
```

#### Option C: Docker Compose

```bash
# Uses docker-compose.yml in project root
docker-compose up -d redis
```

### 3. Configure Environment

Copy and add to `.env.production`:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=redis

# Rates
GENERAL_REQUESTS_PER_MIN=100
LOGIN_ATTEMPTS_PER_HOUR=10
CREATE_REQUESTS_PER_MIN=50
REPORT_REQUESTS_PER_MIN=5
AUDIT_EXPORT_REQUESTS_PER_MIN=3
ADMIN_REQUESTS_PER_MIN=30
```

### 4. Setup Files

The implementation provides these ready-to-use files:

```
✓ src/backend/utils/redisClient.ts       (Redis connection)
✓ src/backend/middleware/rateLimitRules.ts (Configurations)
✓ src/backend/middleware/rateLimit.ts    (Middleware functions)
✓ src/backend/api/rateLimitStats.ts      (Monitoring endpoints)
✓ src/backend/app.ts                     (Express integration example)
```

### 5. Integrate into Express App

```typescript
import express from 'express';
import { redisClient, defaultRedisConfig } from './backend/utils/redisClient';
import { general, create, loginRateLimit } from './backend/middleware/rateLimit';
import rateLimitStatsRouter from './backend/api/rateLimitStats';

const app = express();

// Initialize Redis
await redisClient.initialize(defaultRedisConfig);

// Apply rate limiting
app.post('/api/auth/login', loginRateLimit, authController.login);
app.get('/api/records', general, recordsController.getRecords);
app.post('/api/records', create, recordsController.create);

// Admin monitoring
app.use('/api/rate-limit', authMiddleware, rateLimitStatsRouter);

app.listen(5000);
```

## Quick Test

### Test General Rate Limiting

```bash
# Test endpoint below limit
for i in {1..50}; do
  curl -i http://localhost:5000/api/records \
    -H "Authorization: Bearer $TOKEN" | grep -E "X-RateLimit|429"
done

# Test endpoint at limit (should pass)
curl -i http://localhost:5000/api/records \
  -H "Authorization: Bearer $TOKEN" | grep "X-RateLimit"

# Test endpoint over limit (should fail with 429)
for i in {51..105}; do
  curl -i http://localhost:5000/api/records \
    -H "Authorization: Bearer $TOKEN"
done | grep "429"
```

### Test Login Rate Limiting

```bash
# Trigger 10 failed attempts
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"
done

# 11th attempt (should be blocked with backoff)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"

# Response:
# HTTP/1.1 429 Too Many Requests
# Retry-After: 1
# {"error":"Too many login attempts, please try again later",...}

# Wait and retry (backoff increases)
sleep 2
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"

# 12th attempt: Retry-After: 2 (exponential backoff)
```

### Test Rate Limit Monitoring

```bash
# Get status
curl http://localhost:5000/api/rate-limit/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# List all active limits
curl http://localhost:5000/api/rate-limit/keys \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Get specific key
curl http://localhost:5000/api/rate-limit/key/rate-limit:general:192.168.1.1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reset specific limit
curl -X POST http://localhost:5000/api/rate-limit/reset/rate-limit:general:192.168.1.1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Clear login attempts
curl -X POST http://localhost:5000/api/rate-limit/clear-login/user@example.com?ip=192.168.1.1 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Rate Limits Overview

| Endpoint Type | Limit | Window | Key Type |
|---|---|---|---|
| General API | 100 | 1 minute | Per IP |
| Login Attempts | 10 | 1 hour | Per IP + Username |
| Record Creation | 50 | 1 minute | Per User |
| Reports | 5 | 1 minute | Per User |
| Audit Export | 3 | 1 minute | Per User |
| Admin Operations | 30 | 1 minute | Per User |
| Record Approvals | 10 | 1 minute | Per User |

## Login Exponential Backoff

```
Attempt 1-10:  Success (counted)
Attempt 11:    Blocked for 1 second
Attempt 12:    Blocked for 2 seconds
Attempt 13:    Blocked for 4 seconds
Attempt 14:    Blocked for 8 seconds
...
Max:           10 minutes
```

## Response Headers

```
X-RateLimit-Limit: 100          # Total limit
X-RateLimit-Remaining: 95       # Requests remaining
X-RateLimit-Reset: 2026-09-05T04:55:00Z  # When limit resets
Retry-After: 42                 # Seconds to wait (on 429)
```

## Common Issues & Fixes

### Redis Connection Failed

**Problem**: Getting "connection refused" errors

**Solution**:
```bash
# Check if Redis is running
redis-cli ping

# Or start with Docker
docker run -p 6379:6379 redis:7-alpine
```

### Rate Limit Not Working

**Problem**: All requests succeed, no limits enforced

**Solution**:
```typescript
// Check Redis connection
const health = await redisClient.health();
console.log(health);

// Should show: { status: 'connected', ... }
// If "memory-fallback", Redis is not connected
```

### Getting Rate Limited Too Quickly

**Problem**: Hitting limit at 50 requests/minute instead of 100

**Solution**: Check environment variables

```bash
# Verify in .env.production
cat .env.production | grep REQUESTS_PER_MIN

# Reset all limits
curl -X POST http://localhost:5000/api/rate-limit/reset-all \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Login Permanently Blocked

**Problem**: User can't login after failed attempts

**Solution**: Clear login attempts

```bash
curl -X POST "http://localhost:5000/api/rate-limit/clear-login/user@example.com?ip=192.168.1.1" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Production Deployment

### Docker Setup

```bash
# Build and run with docker-compose
docker-compose up -d

# Verify all services
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f redis
```

### Environment Variables

```env
# Production
NODE_ENV=production
REDIS_HOST=redis  # Docker hostname
RATE_LIMIT_STORE=redis
LOG_LEVEL=error

# Security
JWT_SECRET=<min-32-character-random-string>
CORS_ORIGIN=https://app.example.com
```

### Nginx Reverse Proxy

```nginx
upstream backend {
    server localhost:5000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    location /api {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

## Performance Tuning

### Redis Memory

```bash
# Check current memory usage
redis-cli INFO memory | grep used_memory_human

# Set memory limit (512MB)
redis-cli CONFIG SET maxmemory 512mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Connection Pool

```typescript
const config = {
  maxRetriesPerRequest: 5,  // Increase if getting queue errors
  enableOfflineQueue: true,  // Queue commands while reconnecting
  enableReadyCheck: true,    // Check connection before commands
};
```

## Monitoring

### Check Rate Limit Status

```bash
# Get overall status
curl http://localhost:5000/api/rate-limit/status \
  -H "Authorization: Bearer $TOKEN"

# Get Redis health
curl http://localhost:5000/api/rate-limit/health \
  -H "Authorization: Bearer $TOKEN"

# Get all active limits
curl http://localhost:5000/api/rate-limit/keys \
  -H "Authorization: Bearer $TOKEN" | jq '.count'
```

### Prometheus Metrics (Optional)

```typescript
// Add to app.ts
app.get('/metrics', async (req, res) => {
  const keys = await redisClient.getKeys('rl:*');
  const health = await redisClient.health();

  res.set('Content-Type', 'text/plain');
  res.send(`
    # HELP rate_limit_active_keys Number of active rate limit keys
    # TYPE rate_limit_active_keys gauge
    rate_limit_active_keys ${keys.length}

    # HELP redis_connection_status Redis connection status (1=ok, 0=down)
    # TYPE redis_connection_status gauge
    redis_connection_status ${health.status === 'connected' ? 1 : 0}
  `);
});
```

## Next Steps

1. **Test thoroughly** - Run test suite before deployment
2. **Monitor rates** - Check `/api/rate-limit/keys` regularly
3. **Adjust limits** - Fine-tune based on actual usage patterns
4. **Add logging** - Implement audit trail for rate limit violations
5. **Setup alerts** - Alert on repeated violations or Redis issues

## Full Documentation

See `RATE_LIMITING_IMPLEMENTATION.md` for:
- Detailed architecture
- All endpoint documentation
- Security considerations
- Troubleshooting guide
- Performance tuning
- Testing procedures
