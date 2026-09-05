# package.json Updates for Rate Limiting

Add these dependencies and scripts to your `package.json` to support the rate limiting implementation.

## Dependencies to Add

### Production Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "redis": "^4.6.13",
    "ioredis": "^5.3.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1"
  }
}
```

### Development Dependencies

```json
{
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/express-rate-limit": "^6.0.0",
    "vitest": "^1.1.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.7.0"
  }
}
```

## NPM Scripts to Add

Add these scripts to the "scripts" section of `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    
    "backend:dev": "tsx --watch src/backend/app.ts",
    "backend:build": "tsc src/backend/app.ts --target es2020 --module esnext",
    "backend:start": "node dist/backend/app.js",
    
    "redis:start": "redis-server",
    "redis:cli": "redis-cli",
    
    "test": "vitest",
    "test:rate-limit": "vitest src/backend/tests/rateLimit.test.ts",
    "test:coverage": "vitest --coverage",
    
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit",
    
    "docker:build": "docker build -f Dockerfile.backend -t alcoa-backend:latest .",
    "docker:start": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  }
}
```

## Complete Updated package.json

Here's the complete file with all additions:

```json
{
  "name": "alcoa-plus-qa",
  "version": "1.0.0",
  "type": "module",
  "description": "ALCOA+ Pharmaceutical QA Management System with rate limiting",
  "main": "src/backend/app.ts",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    
    "backend:dev": "tsx --watch src/backend/app.ts",
    "backend:build": "tsc src/backend/app.ts --target es2020 --module esnext",
    "backend:start": "node dist/backend/app.js",
    
    "redis:start": "redis-server",
    "redis:cli": "redis-cli",
    
    "test": "vitest",
    "test:rate-limit": "vitest src/backend/tests/rateLimit.test.ts",
    "test:coverage": "vitest --coverage",
    
    "lint": "eslint src/**/*.ts",
    "type-check": "tsc --noEmit",
    
    "docker:build": "docker build -f Dockerfile.backend -t alcoa-backend:latest .",
    "docker:start": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.263.1",
    "date-fns": "^2.30.0",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "redis": "^4.6.13",
    "ioredis": "^5.3.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.6",
    "@types/express-rate-limit": "^6.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.31",
    "autoprefixer": "^10.4.16",
    "vitest": "^1.1.0",
    "ts-node": "^10.9.2",
    "tsx": "^4.7.0"
  }
}
```

## Installation Steps

### 1. Install All Dependencies

```bash
npm install
```

This will install:
- Frontend dependencies (React, Vite, Tailwind)
- Backend dependencies (Express, Redis, rate-limit)
- Development tools (TypeScript, Vitest, tsx)

### 2. Install Only Production Dependencies

```bash
npm install --only=production
```

Use this for Docker builds to reduce image size.

### 3. Install Individual Packages

```bash
# Just the rate limiting package
npm install express-rate-limit

# Just Redis clients
npm install redis ioredis

# Just development tools
npm install --save-dev vitest tsx
```

## Usage Examples

### Development

```bash
# Terminal 1: Start Redis
npm run redis:start

# Terminal 2: Start backend
npm run backend:dev

# Terminal 3: Start frontend
npm run dev

# Your app is now running:
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
```

### Testing

```bash
# Run all tests
npm test

# Run only rate limit tests
npm run test:rate-limit

# Run with coverage
npm run test:coverage
```

### Docker

```bash
# Build backend Docker image
npm run docker:build

# Start all services with docker-compose
npm run docker:start

# View logs
npm run docker:logs

# Stop services
npm run docker:stop
```

## Verification

After installation, verify everything is working:

```bash
# Check TypeScript compilation
npm run type-check

# Check for linting issues (if eslint is configured)
npm run lint

# Run tests
npm test

# Start backend
npm run backend:dev
```

You should see:
- No TypeScript errors
- All tests passing (or can skip until configured)
- Backend server listening on port 5000
- Redis ready to accept connections

## Troubleshooting

### Dependencies won't install

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Port 5000 already in use

```bash
# Use a different port
PORT=5001 npm run backend:dev

# Or kill existing process
lsof -i :5000
kill -9 <PID>
```

### Redis connection refused

```bash
# Make sure Redis is running
redis-cli ping

# Or start with npm
npm run redis:start

# Or with Docker
docker run -p 6379:6379 redis:7-alpine
```

## Next Steps

After installation and verification:

1. Start the backend: `npm run backend:dev`
2. Test rate limiting: See RATE_LIMITING_QUICKSTART.md
3. Run tests: `npm test`
4. Deploy to Docker: `npm run docker:start`
