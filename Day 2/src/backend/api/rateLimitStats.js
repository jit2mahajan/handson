/**
 * Rate Limit Statistics & Monitoring Endpoints
 * Provides endpoints to view and manage rate limit status
 * Admin-only access
 */
import { Router } from 'express';
import { getRateLimitStatus, resetRateLimit, getAllRateLimitKeys, recordSuccessfulLogin, recordFailedLoginAttempt, } from '../middleware/rateLimit';
import { redisClient } from '../utils/redisClient';
const router = Router();
/**
 * GET /api/rate-limit/status
 * Get current rate limit status and Redis connection health
 */
router.get('/status', async (_req, res) => {
    try {
        const health = await redisClient.health();
        const memoryInfo = health.status === 'memory-fallback'
            ? redisClient.getMemoryStoreInfo()
            : null;
        res.json({
            redis: {
                status: health.status,
                message: health.message,
            },
            memory_store: memoryInfo && health.status === 'memory-fallback'
                ? {
                    key_count: memoryInfo.keyCount,
                    estimated_memory: memoryInfo.estimatedMemory,
                }
                : null,
            configuration: {
                general_limit: {
                    max: 100,
                    window_minutes: 1,
                    key_type: 'per_ip',
                },
                login_limit: {
                    max: 10,
                    window_hours: 1,
                    with_exponential_backoff: true,
                    key_type: 'per_ip_and_username',
                },
                create_limit: {
                    max: 50,
                    window_minutes: 1,
                    key_type: 'per_authenticated_user',
                },
                report_limit: {
                    max: 5,
                    window_minutes: 1,
                    key_type: 'per_authenticated_user',
                },
                audit_export_limit: {
                    max: 3,
                    window_minutes: 1,
                    key_type: 'per_authenticated_user',
                },
                admin_limit: {
                    max: 30,
                    window_minutes: 1,
                    key_type: 'per_authenticated_user',
                },
                approval_limit: {
                    max: 10,
                    window_minutes: 1,
                    key_type: 'per_authenticated_user',
                },
            },
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error getting status:', error);
        res.status(500).json({
            error: 'Failed to get rate limit status',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * GET /api/rate-limit/keys
 * List all active rate limit keys (admin only)
 */
router.get('/keys', getAllRateLimitKeys);
/**
 * GET /api/rate-limit/key/:key
 * Get status of specific rate limit key (admin only)
 */
router.get('/key/:key', getRateLimitStatus);
/**
 * POST /api/rate-limit/reset/:key
 * Reset a specific rate limit key (admin only)
 */
router.post('/reset/:key', resetRateLimit);
/**
 * POST /api/rate-limit/reset-all
 * Reset all rate limit keys (admin only - use with caution)
 */
router.post('/reset-all', async (_req, res) => {
    try {
        const deleted = await redisClient.deletePattern('rl:*');
        res.json({
            message: 'All rate limits reset successfully',
            keys_reset: deleted,
            timestamp: new Date().toISOString(),
            warning: 'All rate limit counters have been cleared',
        });
        console.warn('[RateLimitStats] All rate limits reset by admin', {
            keys_affected: deleted,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error resetting all rate limits:', error);
        res.status(500).json({
            error: 'Failed to reset all rate limits',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/rate-limit/reset-pattern
 * Reset rate limits matching a pattern (admin only)
 * Body: { pattern: "rate-limit:login:*" }
 */
router.post('/reset-pattern', async (req, res) => {
    try {
        const { pattern } = req.body;
        if (!pattern) {
            return res.status(400).json({
                error: 'Missing pattern parameter',
                code: 'INVALID_REQUEST',
            });
        }
        const fullPattern = `rl:${pattern}`;
        const deleted = await redisClient.deletePattern(fullPattern);
        res.json({
            message: 'Rate limits matching pattern reset successfully',
            pattern,
            keys_reset: deleted,
            timestamp: new Date().toISOString(),
        });
        console.log('[RateLimitStats] Rate limits reset by pattern', {
            pattern,
            keys_affected: deleted,
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error resetting rate limits by pattern:', error);
        res.status(500).json({
            error: 'Failed to reset rate limits',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * GET /api/rate-limit/login-status/:email
 * Get login attempt status for specific email (admin only)
 */
router.get('/login-status/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const ip = req.query.ip;
        if (!email) {
            return res.status(400).json({
                error: 'Missing email parameter',
                code: 'INVALID_REQUEST',
            });
        }
        const attemptKey = `login:attempt:${ip}:${email}`;
        const blockKey = `login:block:${ip}:${email}`;
        const attemptData = await redisClient.get(attemptKey);
        const blockData = await redisClient.get(blockKey);
        const attempts = attemptData ? JSON.parse(attemptData) : null;
        const isBlocked = !!blockData;
        res.json({
            email,
            ip: ip || 'not_specified',
            attempts: attempts ? attempts.count : 0,
            first_attempt: attempts ? new Date(attempts.firstAttempt).toISOString() : null,
            last_attempt: attempts ? new Date(attempts.lastAttempt).toISOString() : null,
            is_blocked: isBlocked,
            blocked_until: isBlocked
                ? new Date(parseInt(blockData, 10)).toISOString()
                : null,
            blocked_duration_seconds: isBlocked
                ? Math.ceil((parseInt(blockData, 10) - Date.now()) / 1000)
                : null,
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error getting login status:', error);
        res.status(500).json({
            error: 'Failed to get login status',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/rate-limit/clear-login/:email
 * Clear login attempts for specific email (admin only)
 */
router.post('/clear-login/:email', async (req, res) => {
    try {
        const { email } = req.params;
        const ip = req.query.ip || '0.0.0.0';
        if (!email) {
            return res.status(400).json({
                error: 'Missing email parameter',
                code: 'INVALID_REQUEST',
            });
        }
        await recordSuccessfulLogin(email, ip);
        res.json({
            message: 'Login attempts cleared successfully',
            email,
            ip,
            timestamp: new Date().toISOString(),
        });
        console.log('[RateLimitStats] Login attempts cleared by admin', {
            email,
            ip,
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error clearing login attempts:', error);
        res.status(500).json({
            error: 'Failed to clear login attempts',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * POST /api/rate-limit/simulate-attempt
 * Simulate a login attempt (for testing)
 * Body: { email: "user@example.com", ip: "192.168.1.1", failed: true }
 */
router.post('/simulate-attempt', async (req, res) => {
    try {
        const { email, ip = '127.0.0.1', failed = true } = req.body;
        if (!email) {
            return res.status(400).json({
                error: 'Missing email parameter',
                code: 'INVALID_REQUEST',
            });
        }
        if (failed) {
            await recordFailedLoginAttempt(email, ip);
        }
        else {
            await recordSuccessfulLogin(email, ip);
        }
        res.json({
            message: `${failed ? 'Failed' : 'Successful'} login attempt recorded`,
            email,
            ip,
            attempt_type: failed ? 'failed' : 'successful',
            timestamp: new Date().toISOString(),
        });
        console.log('[RateLimitStats] Simulated login attempt', {
            email,
            ip,
            failed,
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Error simulating attempt:', error);
        res.status(500).json({
            error: 'Failed to simulate attempt',
            code: 'INTERNAL_ERROR',
            timestamp: new Date().toISOString(),
        });
    }
});
/**
 * GET /api/rate-limit/health
 * Check rate limiting service health
 */
router.get('/health', async (_req, res) => {
    try {
        const health = await redisClient.health();
        const statusCode = health.status === 'disconnected' ? 503 : 200;
        res.status(statusCode).json({
            status: health.status,
            message: health.message,
            service: 'rate-limiting',
            timestamp: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('[RateLimitStats] Health check error:', error);
        res.status(503).json({
            status: 'error',
            message: 'Rate limiting service health check failed',
            service: 'rate-limiting',
            timestamp: new Date().toISOString(),
        });
    }
});
export default router;
