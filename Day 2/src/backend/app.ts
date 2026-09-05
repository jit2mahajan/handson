/**
 * Express Application Setup with Rate Limiting
 * Complete example showing how to integrate rate limiting middleware
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

// Import rate limiting middleware
import {
  general as generalRateLimit,
  create as createRateLimit,
  report as reportRateLimit,
  auditExport as auditExportRateLimit,
  admin as adminRateLimit,
  approval as approvalRateLimit,
  loginRateLimit,
  recordSuccessfulLogin,
  recordFailedLoginAttempt,
} from './middleware/rateLimit';

// Import rate limit stats router
import rateLimitStatsRouter from './api/rateLimitStats';

// Import Redis client
import apifyRouter from './api/apify.js';
import { redisClient, defaultRedisConfig } from './utils/redisClient';

// Create Express app
const app = express();

// Middleware setup
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

/**
 * Authentication middleware (example - implement based on your JWT strategy)
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token && !req.path.startsWith('/auth')) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'NO_AUTH_TOKEN',
      });
    }

    // Decode JWT and set user on request
    if (token) {
      // This is a placeholder - implement real JWT verification
      (req as any).user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'qa-manager',
      };
    }

    next();
  } catch (error) {
    res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_ERROR',
    });
  }
};

/**
 * Health check endpoint (no rate limiting)
 */
app.get('/health', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Authentication Routes
 */
app.post('/api/auth/login', loginRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate credentials (placeholder)
    const validCredentials = email === 'admin@example.com' && password === 'password';

    if (!validCredentials) {
      // Record failed login attempt
      const ip = req.ip || 'unknown';
      await recordFailedLoginAttempt(email, ip);

      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    }

    // Record successful login
    const ip = req.ip || 'unknown';
    await recordSuccessfulLogin(email, ip);

    // Return token (placeholder)
    res.json({
      token: 'jwt-token-here',
      user: {
        id: 'user-123',
        email,
        role: 'admin',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[App] Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      code: 'LOGIN_ERROR',
    });
  }
});

app.post('/api/auth/logout', authMiddleware, (_req: Request, res: Response) => {
  res.json({
    message: 'Logged out successfully',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Record Management Routes (with rate limiting)
 */

app.get('/api/records', authMiddleware, generalRateLimit, (_req: Request, res: Response) => {
  res.json({
    records: [],
    total: 0,
  });
});

app.post('/api/records', authMiddleware, createRateLimit, (_req: Request, res: Response) => {
  res.status(201).json({
    id: 'record-123',
    message: 'Record created successfully',
  });
});

app.put('/api/records/:id', authMiddleware, createRateLimit, (_req: Request, res: Response) => {
  res.json({
    id: 'record-123',
    message: 'Record updated successfully',
  });
});

app.delete('/api/records/:id', authMiddleware, adminRateLimit, (_req: Request, res: Response) => {
  res.json({
    id: 'record-123',
    message: 'Record deleted successfully',
  });
});

app.post(
  '/api/records/:id/approve',
  authMiddleware,
  approvalRateLimit,
  (_req: Request, res: Response) => {
    res.json({
      id: 'record-123',
      message: 'Record approved successfully',
      status: 'approved',
    });
  }
);

/**
 * Reports Routes (with rate limiting)
 */

app.get(
  '/api/reports/compliance',
  authMiddleware,
  reportRateLimit,
  (_req: Request, res: Response) => {
    res.json({
      report: 'compliance-report',
      timestamp: new Date().toISOString(),
    });
  }
);

app.get(
  '/api/reports/activities',
  authMiddleware,
  reportRateLimit,
  (_req: Request, res: Response) => {
    res.json({
      report: 'activities-report',
      timestamp: new Date().toISOString(),
    });
  }
);

/**
 * Audit Trail Routes (with rate limiting)
 */

app.get('/api/audit-trail', authMiddleware, generalRateLimit, (_req: Request, res: Response) => {
  res.json({
    entries: [],
    total: 0,
  });
});

app.post(
  '/api/audit-trail/export',
  authMiddleware,
  auditExportRateLimit,
  (_req: Request, res: Response) => {
    res.json({
      export_id: 'export-123',
      status: 'pending',
    });
  }
);

/**
 * Admin Routes (with rate limiting)
 */

app.get('/api/admin/users', authMiddleware, adminRateLimit, (_req: Request, res: Response) => {
  res.json({
    users: [],
    total: 0,
  });
});

app.post('/api/admin/users', authMiddleware, adminRateLimit, (_req: Request, res: Response) => {
  res.status(201).json({
    id: 'user-123',
    message: 'User created successfully',
  });
});

/**
 * Rate Limit Stats Routes (admin only)
 */
app.use('/api/rate-limit', authMiddleware, rateLimitStatsRouter);
app.use('/api/apify', apifyRouter);

/**
 * Error handling middleware
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[App] Error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 handler
 */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
  });
});

export default app;

/**
 * Start server with rate limit initialization
 */
export async function startServer(port: number = 5000): Promise<void> {
  try {
    // Initialize Redis client
    await redisClient.initialize(defaultRedisConfig);

    // Start server
    app.listen(port, () => {
      console.log(`[Server] Starting on port ${port}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[Server] SIGTERM received, shutting down gracefully...');
      await redisClient.shutdown();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[Server] SIGINT received, shutting down gracefully...');
      await redisClient.shutdown();
      process.exit(0);
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Start if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
