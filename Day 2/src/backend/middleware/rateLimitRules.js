/**
 * Rate Limit Configuration Rules
 * Defines rate limits for different endpoint types and user roles
 * Compatible with express-rate-limit
 */
import { redisClient } from '../utils/redisClient';
/**
 * Extract IP address from request (handles proxies)
 */
function getClientIp(req) {
    // Check for IP from forwarded header (proxy)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
        return ips[0].trim();
    }
    // Check other common proxy headers
    const ip = req.headers['x-real-ip'] ||
        req.headers['cf-connecting-ip'] ||
        req.socket.remoteAddress ||
        'unknown';
    return ip;
}
/**
 * Extract user ID from request (from JWT token in req.user)
 */
function getUserId(req) {
    return req.user?.id || null;
}
/**
 * General API endpoints rate limit (100 requests/minute per IP)
 */
export const generalRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many requests, please try again later',
    statusCode: 429,
    keyGenerator: (req) => {
        return `rate-limit:general:${getClientIp(req)}`;
    },
    skip: (req) => {
        // Skip health check endpoints
        return req.path === '/health' || req.path === '/health/ready';
    },
};
/**
 * Login endpoint rate limit (10 failed attempts/hour with exponential backoff)
 */
export const loginRateLimitConfig = {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Too many login attempts, please try again later',
    statusCode: 429,
    keyGenerator: (req) => {
        // Rate limit by IP and username to prevent user enumeration
        const username = req.body?.email || req.body?.username || 'unknown';
        const ip = getClientIp(req);
        return `rate-limit:login:${ip}:${username}`;
    },
    skip: (req) => {
        // Only rate limit POST requests (login attempts)
        return req.method !== 'POST';
    },
};
/**
 * Record creation rate limit (50 requests/minute per authenticated user)
 */
export const createRecordRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many records created, please slow down',
    statusCode: 429,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        // If authenticated, use user ID; otherwise use IP
        if (userId) {
            return `rate-limit:create:user:${userId}`;
        }
        return `rate-limit:create:ip:${getClientIp(req)}`;
    },
};
/**
 * Report generation rate limit (5 requests/minute per user)
 */
export const reportRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    message: 'Too many report requests, please try again later',
    statusCode: 429,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        if (userId) {
            return `rate-limit:reports:user:${userId}`;
        }
        return `rate-limit:reports:ip:${getClientIp(req)}`;
    },
};
/**
 * Audit trail export rate limit (3 requests/minute per user)
 */
export const auditExportRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 3,
    message: 'Too many export requests, please try again later',
    statusCode: 429,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        if (userId) {
            return `rate-limit:audit-export:user:${userId}`;
        }
        return `rate-limit:audit-export:ip:${getClientIp(req)}`;
    },
};
/**
 * Admin operations rate limit (30 requests/minute per user)
 */
export const adminRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many admin operations, please slow down',
    statusCode: 429,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        if (userId) {
            return `rate-limit:admin:user:${userId}`;
        }
        return `rate-limit:admin:ip:${getClientIp(req)}`;
    },
};
/**
 * Strict rate limit for sensitive operations (approving records)
 * 10 requests/minute per user
 */
export const approvalRateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: 'Too many approval requests, please slow down',
    statusCode: 429,
    keyGenerator: (req) => {
        const userId = getUserId(req);
        if (userId) {
            return `rate-limit:approvals:user:${userId}`;
        }
        return `rate-limit:approvals:ip:${getClientIp(req)}`;
    },
};
/**
 * Custom storage for express-rate-limit
 * Uses Redis or memory fallback
 */
export class RedisStore {
    constructor() {
        Object.defineProperty(this, "prefix", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 'rl:'
        });
    }
    async increment(key) {
        const redisKey = `${this.prefix}${key}`;
        const current = await redisClient.incr(redisKey);
        // Set expiry on first increment
        if (current === 1) {
            const expirySeconds = 3600; // 1 hour default
            await redisClient.expire(redisKey, expirySeconds);
        }
        const ttl = await redisClient.ttl(redisKey);
        const resetTime = new Date(Date.now() + ttl * 1000);
        return { current, resetTime };
    }
    async decrement(key) {
        const redisKey = `${this.prefix}${key}`;
        // Get current value
        const current = await redisClient.get(redisKey);
        if (current && parseInt(current, 10) > 0) {
            const value = parseInt(current, 10) - 1;
            await redisClient.set(redisKey, String(value));
        }
    }
    async reset(key) {
        const redisKey = `${this.prefix}${key}`;
        await redisClient.del(redisKey);
    }
    async resetPattern(pattern) {
        const redisPattern = `${this.prefix}${pattern}`;
        return await redisClient.deletePattern(redisPattern);
    }
}
export const redisStore = new RedisStore();
/**
 * Exponential backoff calculator for login failures
 * Returns delay in milliseconds
 */
export function calculateBackoffDelay(attempts) {
    // Start with 1 second, double each attempt
    // Max out at 10 minutes
    const delay = Math.min(Math.pow(2, Math.max(0, attempts - 1)) * 1000, 10 * 60 * 1000);
    return delay;
}
/**
 * Format retry-after header
 */
export function formatRetryAfter(seconds) {
    return String(seconds);
}
/**
 * Check if request should bypass rate limiting
 */
export function shouldSkipRateLimit(req) {
    // Skip health checks
    if (req.path === '/health' || req.path === '/health/ready') {
        return true;
    }
    // Skip monitoring/internal endpoints
    if (req.path.startsWith('/internal/')) {
        return true;
    }
    // Skip if marked as internal
    return req.internal === true;
}
