/**
 * Rate Limiting Middleware
 * Main middleware for rate limiting different endpoint types
 * Implements exponential backoff for login attempts
 */
import { redisClient } from '../utils/redisClient';
import { generalRateLimitConfig, createRecordRateLimitConfig, reportRateLimitConfig, auditExportRateLimitConfig, adminRateLimitConfig, approvalRateLimitConfig, redisStore, calculateBackoffDelay, formatRetryAfter, shouldSkipRateLimit, } from './rateLimitRules';
/**
 * Generic rate limit middleware factory
 */
function createRateLimitMiddleware(config) {
    return async (req, res, next) => {
        try {
            // Skip if configured to skip
            if (config.skip && config.skip(req)) {
                return next();
            }
            // Skip health checks and internal endpoints
            if (shouldSkipRateLimit(req)) {
                return next();
            }
            const key = config.keyGenerator(req);
            const { current, resetTime } = await redisStore.increment(key);
            // Set rate limit info on response headers
            res.set('X-RateLimit-Limit', String(config.max));
            res.set('X-RateLimit-Remaining', String(Math.max(0, config.max - current)));
            res.set('X-RateLimit-Reset', resetTime.toISOString());
            // Check if limit exceeded
            if (current > config.max) {
                const retryAfter = Math.ceil((resetTime.getTime() - Date.now()) / 1000);
                res.set('Retry-After', formatRetryAfter(retryAfter));
                res.status(config.statusCode).json({
                    error: config.message,
                    code: 'RATE_LIMIT_EXCEEDED',
                    retry_after: retryAfter,
                    reset_at: resetTime.toISOString(),
                    timestamp: new Date().toISOString(),
                });
                // Log rate limit violation
                console.warn(`[RateLimit] ${config.message}`, {
                    key,
                    current,
                    max: config.max,
                    ip: req.ip,
                    path: req.path,
                    timestamp: new Date().toISOString(),
                });
                if (config.onLimitReached) {
                    config.onLimitReached(req, res);
                }
                return;
            }
            next();
        }
        catch (error) {
            console.error('[RateLimit] Middleware error:', error);
            // On error, allow request to proceed (fail open)
            next();
        }
    };
}
/**
 * Login rate limit middleware with exponential backoff
 */
export function loginRateLimit(req, res, next) {
    return (async () => {
        try {
            if (req.method !== 'POST') {
                return next();
            }
            const username = req.body?.email || req.body?.username || 'unknown';
            const ip = req.ip || 'unknown';
            const attemptKey = `login:attempt:${ip}:${username}`;
            const blockKey = `login:block:${ip}:${username}`;
            // Check if currently blocked
            const blockedUntil = await redisClient.get(blockKey);
            if (blockedUntil) {
                const remainingMs = parseInt(blockedUntil, 10) - Date.now();
                const remainingSec = Math.ceil(remainingMs / 1000);
                res.set('Retry-After', String(remainingSec));
                return res.status(429).json({
                    error: 'Too many login attempts, please try again later',
                    code: 'LOGIN_RATE_LIMIT',
                    retry_after: remainingSec,
                    blocked_until: new Date(parseInt(blockedUntil, 10)).toISOString(),
                    timestamp: new Date().toISOString(),
                });
            }
            // Get attempt count
            const attemptData = await redisClient.get(attemptKey);
            const attempts = attemptData ? JSON.parse(attemptData) : { count: 0 };
            // Reset if hour has passed
            if (attempts.firstAttempt &&
                Date.now() - attempts.firstAttempt > 60 * 60 * 1000) {
                attempts.count = 0;
                attempts.firstAttempt = null;
            }
            // Increment attempts
            attempts.count++;
            attempts.lastAttempt = Date.now();
            if (!attempts.firstAttempt) {
                attempts.firstAttempt = Date.now();
            }
            // Save updated attempts
            await redisClient.set(attemptKey, JSON.stringify(attempts), 3600);
            // Check if exceeded limit
            if (attempts.count > 10) {
                // Calculate backoff delay
                const backoffAttempts = attempts.count - 10;
                const delayMs = calculateBackoffDelay(backoffAttempts);
                const blockedUntilTime = Date.now() + delayMs;
                // Block user
                await redisClient.set(blockKey, String(blockedUntilTime), Math.ceil(delayMs / 1000));
                const delaySec = Math.ceil(delayMs / 1000);
                res.set('Retry-After', String(delaySec));
                console.warn(`[RateLimit] Login blocked due to too many failed attempts`, {
                    username,
                    ip,
                    attempts: attempts.count,
                    blockDurationSeconds: delaySec,
                });
                return res.status(429).json({
                    error: 'Too many login attempts, please try again later',
                    code: 'LOGIN_RATE_LIMIT',
                    retry_after: delaySec,
                    blocked_until: new Date(blockedUntilTime).toISOString(),
                    timestamp: new Date().toISOString(),
                });
            }
            // Store attempt count for post-login handler
            req.loginAttempts = attempts.count;
            // Continue to next middleware
            next();
        }
        catch (error) {
            console.error('[RateLimit] Login middleware error:', error);
            next();
        }
    })();
}
/**
 * Handle failed login attempts (call after failed login)
 */
export async function recordFailedLoginAttempt(email, ip) {
    // This is already handled by loginRateLimit middleware
    // But we can use this to explicitly record failed attempts
    try {
        const attemptKey = `login:attempt:${ip}:${email}`;
        const attemptData = await redisClient.get(attemptKey);
        const attempts = attemptData ? JSON.parse(attemptData) : { count: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        if (!attempts.firstAttempt) {
            attempts.firstAttempt = Date.now();
        }
        await redisClient.set(attemptKey, JSON.stringify(attempts), 3600);
        console.log('[RateLimit] Recorded failed login attempt', {
            email,
            ip,
            totalAttempts: attempts.count,
        });
    }
    catch (error) {
        console.error('[RateLimit] Error recording failed login:', error);
    }
}
/**
 * Handle successful login (reset attempt counter)
 */
export async function recordSuccessfulLogin(email, ip) {
    try {
        const attemptKey = `login:attempt:${ip}:${email}`;
        const blockKey = `login:block:${ip}:${email}`;
        // Clear attempt counter
        await redisClient.del(attemptKey);
        // Clear any active blocks
        await redisClient.del(blockKey);
        console.log('[RateLimit] Cleared login attempts after successful login', {
            email,
            ip,
        });
    }
    catch (error) {
        console.error('[RateLimit] Error clearing login attempts:', error);
    }
}
/**
 * Export rate limit middleware for different endpoints
 */
export const general = createRateLimitMiddleware(generalRateLimitConfig);
export const create = createRateLimitMiddleware(createRecordRateLimitConfig);
export const report = createRateLimitMiddleware(reportRateLimitConfig);
export const auditExport = createRateLimitMiddleware(auditExportRateLimitConfig);
export const admin = createRateLimitMiddleware(adminRateLimitConfig);
export const approval = createRateLimitMiddleware(approvalRateLimitConfig);
/**
 * Middleware to reset rate limit for a specific key (admin only)
 */
export async function resetRateLimit(req, res) {
    try {
        // This should only be called by admin endpoints
        const { key } = req.params;
        if (!key) {
            res.status(400).json({
                error: 'Missing rate limit key parameter',
                code: 'INVALID_REQUEST',
            });
            return;
        }
        await redisStore.reset(key);
        res.json({
            message: 'Rate limit reset successfully',
            key,
            timestamp: new Date().toISOString(),
        });
        console.log('[RateLimit] Rate limit reset by admin', {
            key,
            admin: req.user?.id,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimit] Error resetting rate limit:', error);
        res.status(500).json({
            error: 'Failed to reset rate limit',
            code: 'INTERNAL_ERROR',
        });
    }
}
/**
 * Middleware to get rate limit status for a specific key
 */
export async function getRateLimitStatus(req, res) {
    try {
        const { key } = req.params;
        if (!key) {
            res.status(400).json({
                error: 'Missing rate limit key parameter',
                code: 'INVALID_REQUEST',
            });
            return;
        }
        const redisKey = `rl:${key}`;
        const current = await redisClient.get(redisKey);
        const ttl = await redisClient.ttl(redisKey);
        res.json({
            key,
            current: current ? parseInt(current, 10) : 0,
            ttl: ttl > 0 ? ttl : 0,
            reset_at: ttl > 0
                ? new Date(Date.now() + ttl * 1000).toISOString()
                : undefined,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimit] Error getting rate limit status:', error);
        res.status(500).json({
            error: 'Failed to get rate limit status',
            code: 'INTERNAL_ERROR',
        });
    }
}
/**
 * Get all rate limit keys (for monitoring)
 */
export async function getAllRateLimitKeys(_req, res) {
    try {
        const keys = await redisClient.getKeys('rl:*');
        const keyDetails = await Promise.all(keys.map(async (key) => {
            const current = await redisClient.get(key);
            const ttl = await redisClient.ttl(key);
            return {
                key,
                current: current ? parseInt(current, 10) : 0,
                ttl: ttl > 0 ? ttl : 0,
                reset_at: ttl > 0
                    ? new Date(Date.now() + ttl * 1000).toISOString()
                    : undefined,
            };
        }));
        res.json({
            count: keyDetails.length,
            keys: keyDetails,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimit] Error getting all rate limit keys:', error);
        res.status(500).json({
            error: 'Failed to get rate limit keys',
            code: 'INTERNAL_ERROR',
        });
    }
}
