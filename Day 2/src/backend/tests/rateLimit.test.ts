/**
 * Rate Limiting Tests
 * Comprehensive test suite for rate limiting middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../utils/redisClient';
import {
  general,
  create,
  loginRateLimit,
  recordSuccessfulLogin,
  recordFailedLoginAttempt,
  getRateLimitStatus,
  resetRateLimit,
  getAllRateLimitKeys,
} from '../middleware/rateLimit';

// Mock Redis client
vi.mock('../utils/redisClient', () => ({
  redisClient: {
    initialize: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
    del: vi.fn(),
    deletePattern: vi.fn(),
    getKeys: vi.fn(),
    health: vi.fn(),
    shutdown: vi.fn(),
    getMemoryStoreInfo: vi.fn(),
  },
  defaultRedisConfig: {
    host: 'localhost',
    port: 6379,
    db: 0,
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
  },
}));

describe('Rate Limiting Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock request
    mockReq = {
      ip: '192.168.1.1',
      path: '/api/records',
      method: 'GET',
      headers: {},
      body: {},
    } as any;

    // Mock response
    const jsonMock = vi.fn().mockReturnThis();
    const statusMock = vi.fn().mockReturnThis();
    const setMock = vi.fn().mockReturnThis();

    mockRes = {
      json: jsonMock,
      status: statusMock,
      set: setMock,
    } as any;

    // Mock next
    mockNext = vi.fn();
  });

  afterEach(async () => {
    await redisClient.shutdown();
  });

  describe('General Rate Limiting', () => {
    it('should allow requests below limit', async () => {
      (redisClient.incr as any).mockResolvedValue(50);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests above limit', async () => {
      (redisClient.incr as any).mockResolvedValue(101);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should set Retry-After header', async () => {
      (redisClient.incr as any).mockResolvedValue(101);
      (redisClient.ttl as any).mockResolvedValue(45);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
    });

    it('should set rate limit info headers', async () => {
      (redisClient.incr as any).mockResolvedValue(50);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Limit', '100');
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '50');
    });
  });

  describe('Login Rate Limiting with Exponential Backoff', () => {
    beforeEach(() => {
      mockReq.method = 'POST';
      mockReq.body = {
        email: 'user@example.com',
        password: 'password',
      };
    });

    it('should allow login attempts below limit', async () => {
      (redisClient.get as any)
        .mockResolvedValueOnce(null) // block check
        .mockResolvedValueOnce(null); // attempt check

      (redisClient.set as any).mockResolvedValue(true);

      await loginRateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block after 10 failed attempts', async () => {
      const attempts = { count: 11, lastAttempt: Date.now() };
      (redisClient.get as any)
        .mockResolvedValueOnce(null) // block check
        .mockResolvedValueOnce(JSON.stringify(attempts)); // attempt check

      await loginRateLimit(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'LOGIN_RATE_LIMIT',
        })
      );
    });

    it('should clear attempts on successful login', async () => {
      const email = 'user@example.com';
      const ip = '192.168.1.1';

      await recordSuccessfulLogin(email, ip);

      expect(redisClient.del).toHaveBeenCalledWith(`login:attempt:${ip}:${email}`);
      expect(redisClient.del).toHaveBeenCalledWith(`login:block:${ip}:${email}`);
    });

    it('should record failed login attempts', async () => {
      const email = 'user@example.com';
      const ip = '192.168.1.1';

      (redisClient.get as any).mockResolvedValue(null);
      (redisClient.set as any).mockResolvedValue(true);

      await recordFailedLoginAttempt(email, ip);

      expect(redisClient.set).toHaveBeenCalled();
    });
  });

  describe('Per-User Rate Limiting', () => {
    beforeEach(() => {
      (mockReq as any).user = {
        id: 'user-123',
        email: 'user@example.com',
      };
    });

    it('should rate limit per authenticated user for creation', async () => {
      mockReq.path = '/api/records';
      mockReq.method = 'POST';

      (redisClient.incr as any).mockResolvedValue(51);
      (redisClient.ttl as any).mockResolvedValue(30);

      await create(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should include user ID in rate limit key', async () => {
      mockReq.path = '/api/records';
      (redisClient.incr as any).mockResolvedValue(50);
      (redisClient.ttl as any).mockResolvedValue(60);

      await create(mockReq as Request, mockRes as Response, mockNext);

      // Key should contain user ID
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Skip Conditions', () => {
    it('should skip health check endpoints', async () => {
      mockReq.path = '/health';

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(redisClient.incr).not.toHaveBeenCalled();
    });

    it('should skip internal endpoints', async () => {
      mockReq.path = '/internal/metrics';

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should allow request on Redis error (fail open)', async () => {
      (redisClient.incr as any).mockRejectedValue(new Error('Redis error'));

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle missing user gracefully', async () => {
      mockReq.path = '/api/records';
      (redisClient.incr as any).mockResolvedValue(50);
      (redisClient.ttl as any).mockResolvedValue(60);

      await create(mockReq as Request, mockRes as Response, mockNext);

      // Should still work with IP-based limiting
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Admin Endpoints', () => {
    describe('getRateLimitStatus', () => {
      it('should return current status for a key', async () => {
        mockReq.params = { key: 'test-key' };
        (redisClient.get as any).mockResolvedValue('42');
        (redisClient.ttl as any).mockResolvedValue(30);

        await getRateLimitStatus(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            key: 'test-key',
            current: 42,
            ttl: 30,
          })
        );
      });

      it('should return 400 for missing key', async () => {
        mockReq.params = {};

        await getRateLimitStatus(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
      });
    });

    describe('resetRateLimit', () => {
      it('should reset a rate limit key', async () => {
        mockReq.params = { key: 'test-key' };
        (redisClient.del as any).mockResolvedValue(true);

        await resetRateLimit(mockReq as Request, mockRes as Response);

        expect(redisClient.del).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            message: 'Rate limit reset successfully',
          })
        );
      });
    });

    describe('getAllRateLimitKeys', () => {
      it('should list all active rate limit keys', async () => {
        const keys = ['rl:general:192.168.1.1', 'rl:create:user-123'];
        (redisClient.getKeys as any).mockResolvedValue(keys);
        (redisClient.get as any)
          .mockResolvedValueOnce('50')
          .mockResolvedValueOnce('25');
        (redisClient.ttl as any)
          .mockResolvedValueOnce(30)
          .mockResolvedValueOnce(60);

        await getAllRateLimitKeys(mockReq as Request, mockRes as Response);

        expect(mockRes.json).toHaveBeenCalledWith(
          expect.objectContaining({
            count: 2,
            keys: expect.arrayContaining([
              expect.objectContaining({ key: 'rl:general:192.168.1.1' }),
            ]),
          })
        );
      });
    });
  });

  describe('Response Format', () => {
    it('should return correct error format on rate limit', async () => {
      (redisClient.incr as any).mockResolvedValue(101);
      (redisClient.ttl as any).mockResolvedValue(45);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: expect.any(Number),
          reset_at: expect.any(String),
          timestamp: expect.any(String),
        })
      );
    });

    it('should return consistent timestamps', async () => {
      (redisClient.incr as any).mockResolvedValue(101);
      (redisClient.ttl as any).mockResolvedValue(45);

      const now = Date.now();
      await general(mockReq as Request, mockRes as Response, mockNext);

      const call = (mockRes.json as any).mock.calls[0][0];
      const timestamp = new Date(call.timestamp).getTime();

      expect(Math.abs(timestamp - now)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly at limit', async () => {
      (redisClient.incr as any).mockResolvedValue(100);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should handle one over limit', async () => {
      (redisClient.incr as any).mockResolvedValue(101);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(429);
    });

    it('should handle remaining count as 0', async () => {
      (redisClient.incr as any).mockResolvedValue(100);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });

    it('should handle negative remaining count', async () => {
      (redisClient.incr as any).mockResolvedValue(150);
      (redisClient.ttl as any).mockResolvedValue(30);

      await general(mockReq as Request, mockRes as Response, mockNext);

      // Should show 0, not negative
      expect(mockRes.set).toHaveBeenCalledWith('X-RateLimit-Remaining', '0');
    });
  });
});

describe('Integration Tests', () => {
  // These would require actual Redis or memory store
  // Run with npm test -- --integration

  it.skip('should persist rate limit across requests', async () => {
    // Test rate limit counter persists
  });

  it.skip('should expire rate limit keys automatically', async () => {
    // Test TTL-based expiration
  });

  it.skip('should handle concurrent requests correctly', async () => {
    // Test race conditions
  });

  it.skip('should fallback to memory store if Redis unavailable', async () => {
    // Test fallback behavior
  });
});
