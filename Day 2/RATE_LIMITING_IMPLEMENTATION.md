# Rate Limiting Implementation Guide

Production-ready rate limiting for the ALCOA+ QA Management System backend.

## Quick Start

### 1. Installation

```bash
npm install express-rate-limit redis ioredis
npm install --save-dev @types/express-rate-limit
```

### 2. Add Dependencies to package.json

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "express-rate-limit": "^7.0.0",
    "redis": "^4.6.0",
    "ioredis": "^5.3.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "morgan": "^1.10.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0"
  }
}
```

### 3. Environment Setup

Create `.env.backend` or add to `.env.production`:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORE=redis  # or 'memory' for dev

# Backend Server
NODE_ENV=production
PORT=5000
LOG_LEVEL=info

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limit Configurations (optional overrides)
GENERAL_REQUESTS_PER_MIN=100
LOGIN_ATTEMPTS_PER_HOUR=10
CREATE_REQUESTS_PER_MIN=50
REPORT_REQUESTS_PER_MIN=5
AUDIT_REQUESTS_PER_MIN=3
ADMIN_REQUESTS_PER_MIN=30
```

## Architecture

### File Structure

```
src/backend/
├── utils/
│   └── redisClient.ts          # Redis connection & memory fallback
├── middleware/
│   ├── rateLimit.ts            # Main rate limiting middleware
│   └── rateLimitRules.ts       # Rate limit configurations
├── api/
│   └── rateLimitStats.ts       # Monitoring & admin endpoints
└── app.ts                      # Express app setup example
```

### Components

#### 1. **Redis Client** (`src/backend/utils/redisClient.ts`)

- Connection pooling and retry logic
- Graceful fallback to in-memory store if Redis unavailable
- Health checking and monitoring
- Event emitters for connection status

```typescript
import { redisClient, defaultRedisConfig } from './utils/redisClient';

// Initialize
await redisClient.initialize(defaultRedisConfig);

// Use
await redisClient.set('key', 'value', 3600);
const value = await redisClient.get('key');
await redisClient.incr('counter');

// Health check
const health = await redisClient.health();
console.log(health); // { status: 'connected', message: '...' }
```

#### 2. **Rate Limit Rules** (`src/backend/middleware/rateLimitRules.ts`)

Defines rate limit configurations for each endpoint type:

- **General API**: 100 requests/minute per IP
- **Login**: 10 failed attempts/hour per IP + username
- **Record Creation**: 50 requests/minute per authenticated user
- **Report Generation**: 5 requests/minute per user
- **Audit Trail Export**: 3 requests/minute per user
- **Admin Operations**: 30 requests/minute per user
- **Approvals**: 10 requests/minute per user

```typescript
import { generalRateLimitConfig, loginRateLimitConfig } from './middleware/rateLimitRules';

// Custom configuration
const customLimit = {
  windowMs: 60 * 1000,      // 1 minute
  max: 100,                  // 100 requests
  message: 'Too many requests',
  keyGenerator: (req) => `rl:${req.ip}`,
};
```

#### 3. **Rate Limiting Middleware** (`src/backend/middleware/rateLimit.ts`)

Implements rate limiting with:

- Per-endpoint configurations
- Exponential backoff for login failures
- Retry-After headers (RFC 7231)
- Audit logging for violations
- Per-user and per-IP limiting

```typescript
import { general, create, report, admin, loginRateLimit } from './middleware/rateLimit';

// Apply to routes
app.get('/api/records', general, recordsController.list);
app.post('/api/records', create, recordsController.create);
app.get('/api/reports', report, reportsController.get);
app.post('/api/admin/users', admin, usersController.create);
app.post('/api/auth/login', loginRateLimit, authController.login);
```

#### 4. **Rate Limit Stats** (`src/backend/api/rateLimitStats.ts`)

Admin endpoints for monitoring and management:

```typescript
// Import and mount
import rateLimitStatsRouter from './api/rateLimitStats';
app.use('/api/rate-limit', authMiddleware, adminOnly, rateLimitStatsRouter);
```

### Response Format

#### Success Response (Below limit)

```json
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2026-09-05T04:55:00Z

{
  "data": "..."
}
```

#### Rate Limit Exceeded (429)

```json
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

#### Login Rate Limit with Backoff (429)

```json
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

Note: Backoff increases exponentially: 1s, 2s, 4s, 8s, 16s, 32s, 64s, 128s, 256s, 512s (max 10 minutes)

## Integration Examples

### Complete Express App Setup

```typescript
import express from 'express';
import { redisClient, defaultRedisConfig } from './utils/redisClient';
import { 
  general, create, report, loginRateLimit 
} from './middleware/rateLimit';
import rateLimitStatsRouter from './api/rateLimitStats';

const app = express();

// Initialize Redis
await redisClient.initialize(defaultRedisConfig);

// Auth middleware
const authMiddleware = (req, res, next) => {
  // Verify JWT token
  // Set req.user
  next();
};

// Apply rate limiting
app.post('/api/auth/login', loginRateLimit, authController.login);
app.get('/api/records', authMiddleware, general, recordsController.list);
app.post('/api/records', authMiddleware, create, recordsController.create);
app.get('/api/reports', authMiddleware, report, reportsController.get);

// Admin monitoring
app.use('/api/rate-limit', authMiddleware, adminOnly, rateLimitStatsRouter);

app.listen(5000);
```

### Per-Route Rate Limiting

```typescript
import { createRateLimitMiddleware } from './middleware/rateLimitRules';

// Custom limit for sensitive endpoint
const strictLimit = createRateLimitMiddleware({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Sensitive operation rate limited',
  keyGenerator: (req) => `sensitive:${req.user.id}`,
});

app.post('/api/records/:id/delete-permanently', strictLimit, handler);
```

### Using with Express Route Middleware

```typescript
const recordRoutes = express.Router();

recordRoutes.get('/', general, getAllRecords);
recordRoutes.get('/:id', general, getRecord);
recordRoutes.post('/', create, createRecord);
recordRoutes.put('/:id', create, updateRecord);
recordRoutes.post('/:id/approve', approval, approveRecord);

app.use('/api/records', authMiddleware, recordRoutes);
```

## Docker Compose Setup

### Add Redis to docker-compose.yml

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: alcoa-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD:-}
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    command: redis-server --appendonly yes

  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: alcoa-backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_DB=0
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped

volumes:
  redis_data:
```

### Start Services

```bash
# Development with memory store
docker run -p 5000:5000 backend-service

# Production with Redis
docker-compose -f docker-compose.yml up
```

## Monitoring & Admin Endpoints

### Available Endpoints

All admin endpoints require authentication and admin role.

#### Get Rate Limit Status

```bash
GET /api/rate-limit/status

Response:
{
  "redis": {
    "status": "connected",
    "message": "Redis connected and responding"
  },
  "configuration": {
    "general_limit": { "max": 100, "window_minutes": 1 },
    "login_limit": { "max": 10, "window_hours": 1 },
    ...
  }
}
```

#### List All Active Rate Limit Keys

```bash
GET /api/rate-limit/keys

Response:
{
  "count": 45,
  "keys": [
    {
      "key": "rl:rate-limit:general:192.168.1.1",
      "current": 42,
      "ttl": 18,
      "reset_at": "2026-09-05T04:55:00Z"
    },
    ...
  ]
}
```

#### Get Specific Rate Limit Key

```bash
GET /api/rate-limit/key/rate-limit:general:192.168.1.1

Response:
{
  "key": "rate-limit:general:192.168.1.1",
  "current": 42,
  "ttl": 18,
  "reset_at": "2026-09-05T04:55:00Z"
}
```

#### Reset Specific Rate Limit

```bash
POST /api/rate-limit/reset/rate-limit:general:192.168.1.1

Response:
{
  "message": "Rate limit reset successfully",
  "key": "rate-limit:general:192.168.1.1"
}
```

#### Reset All Rate Limits

```bash
POST /api/rate-limit/reset-all

Response:
{
  "message": "All rate limits reset successfully",
  "keys_reset": 45,
  "warning": "All rate limit counters have been cleared"
}
```

#### Check Login Status

```bash
GET /api/rate-limit/login-status/user@example.com?ip=192.168.1.1

Response:
{
  "email": "user@example.com",
  "ip": "192.168.1.1",
  "attempts": 5,
  "first_attempt": "2026-09-05T04:50:00Z",
  "last_attempt": "2026-09-05T04:53:00Z",
  "is_blocked": true,
  "blocked_until": "2026-09-05T04:54:08Z",
  "blocked_duration_seconds": 28
}
```

#### Clear Login Attempts

```bash
POST /api/rate-limit/clear-login/user@example.com?ip=192.168.1.1

Response:
{
  "message": "Login attempts cleared successfully",
  "email": "user@example.com",
  "ip": "192.168.1.1"
}
```

#### Rate Limit Health Check

```bash
GET /api/rate-limit/health

Response (Connected):
{
  "status": "connected",
  "message": "Redis connected and responding",
  "service": "rate-limiting"
}

Response (Fallback):
{
  "status": "memory-fallback",
  "message": "Using in-memory store (Redis unavailable)",
  "service": "rate-limiting"
}
```

## Testing

### Manual Testing with cURL

```bash
# Test general rate limit
for i in {1..105}; do
  curl -X GET http://localhost:5000/api/records \
    -H "Authorization: Bearer $TOKEN"
done

# Check headers
curl -I http://localhost:5000/api/records \
  -H "Authorization: Bearer $TOKEN"

# Response headers:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# Retry-After: 35
```

### Test Login Exponential Backoff

```bash
# First 10 attempts succeed (counted), 11th fails
for i in {1..11}; do
  curl -X POST http://localhost:5000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test@example.com\",\"password\":\"wrong\"}"
done

# Response on 11th attempt:
# HTTP/1.1 429 Too Many Requests
# Retry-After: 1
# blocked_until: 2026-09-05T04:53:11Z

# 12th attempt (with backoff):
# blocked_until: 2026-09-05T04:53:13Z (2 second backoff)

# 13th attempt:
# blocked_until: 2026-09-05T04:53:17Z (4 second backoff)
```

### Test Per-User Limits

```bash
# Create as user1 (50 requests/minute)
TOKEN1="jwt-for-user1"
for i in {1..55}; do
  curl -X POST http://localhost:5000/api/records \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Test $i\"}"
done

# 55th request returns 429
```

### Test Report Limits

```bash
# Reports: 5 requests/minute
for i in {1..6}; do
  curl -X GET http://localhost:5000/api/reports/compliance \
    -H "Authorization: Bearer $TOKEN"
done

# 6th request: 429 Too Many Requests
```

## Production Deployment

### Prerequisites

1. Redis server running and accessible
2. Backend Node.js environment
3. Environment variables configured
4. SSL/TLS certificates for HTTPS
5. Load balancer or reverse proxy (nginx)

### Nginx Configuration Example

```nginx
upstream backend {
    server localhost:5000;
    server localhost:5001;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;

    location / {
        proxy_pass http://backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Rate limit at reverse proxy level (optional second layer)
        limit_req zone=api_limit burst=10 nodelay;
    }
}

limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;
```

### Monitoring

Enable logging and metrics:

```typescript
// Custom logging
app.use(morgan('combined'));

// Metrics endpoint for Prometheus
app.get('/metrics', (req, res) => {
  const rateLimitKeys = await redisClient.getKeys('rl:*');
  const health = await redisClient.health();
  
  res.set('Content-Type', 'text/plain');
  res.send(`
    # HELP rate_limit_keys_total Total active rate limit keys
    # TYPE rate_limit_keys_total gauge
    rate_limit_keys_total ${rateLimitKeys.length}
    
    # HELP redis_status Redis connection status
    # TYPE redis_status gauge
    redis_status ${health.status === 'connected' ? 1 : 0}
  `);
});
```

## Troubleshooting

### Issue: Rate limiting not working

**Solution**: Check Redis connection

```typescript
const health = await redisClient.health();
console.log(health);
// If status is 'memory-fallback', Redis is not connected
```

### Issue: Getting 429 too quickly

**Solution**: Check rate limit configuration

```typescript
// View current limits
GET /api/rate-limit/status

// Reset limits if needed
POST /api/rate-limit/reset-all
```

### Issue: Login blocked indefinitely

**Solution**: Clear login attempts

```bash
POST /api/rate-limit/clear-login/user@example.com?ip=192.168.1.1
```

### Issue: Redis connection pool exhausted

**Solution**: Increase pool size or check for connection leaks

```typescript
const config = {
  ...defaultRedisConfig,
  maxRetriesPerRequest: 5,  // Increase retry attempts
  enableOfflineQueue: true, // Queue commands while reconnecting
};
```

## Security Considerations

1. **IP Forwarding**: Configure X-Forwarded-For header if behind proxy
2. **User Authentication**: Ensure JWT tokens are validated before user ID extracted
3. **Admin Access**: Protect rate limit reset endpoints with strict authentication
4. **Secrets**: Store Redis password in environment variables, never in code
5. **HTTPS Only**: Use HTTPS in production to prevent token interception
6. **Monitoring**: Log all rate limit violations for audit trail
7. **DDoS Protection**: Consider additional DDoS mitigation at infrastructure level

## Performance Tuning

### Redis Memory

```bash
# Check memory usage
redis-cli INFO memory

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

### Connection Pooling

```typescript
const config = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
};
```

### TTL Cleanup

```typescript
// Automatic cleanup handled by Redis TTL
// Configure Redis to periodically clean expired keys
redis-cli CONFIG SET maxmemory-policy volatile-lru
```

## References

- [express-rate-limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [Redis Documentation](https://redis.io/documentation)
- [ioredis Documentation](https://github.com/luin/ioredis)
- [RFC 7231 - HTTP Retry-After](https://tools.ietf.org/html/rfc7231#section-7.1.3)
- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Prevention_Cheat_Sheet.html)
