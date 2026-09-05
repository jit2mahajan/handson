/**
 * Redis Client Configuration
 * Handles connection pooling, error handling, and graceful fallback to memory store
 * Production: Uses Redis with connection pooling
 * Development: Falls back to in-memory store if Redis unavailable
 */

import Redis from 'ioredis';
import { EventEmitter } from 'events';

interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: number;
  enableReadyCheck: boolean;
  enableOfflineQueue: boolean;
}

interface MemoryStore {
  [key: string]: { value: any; expiry: number };
}

class RedisClientManager extends EventEmitter {
  private redis: Redis | null = null;
  private memoryStore: MemoryStore = {};
  private isUsingMemory = false;
  private connectionRetries = 0;
  private readonly maxRetries = 5;
  private readonly retryDelayMs = 5000;

  async initialize(config: RedisConfig): Promise<void> {
    try {
      console.log(
        `[RedisClient] Attempting to connect to Redis at ${config.host}:${config.port}`
      );

      this.redis = new Redis(config);

      // Handle connection events
      this.redis.on('connect', () => {
        console.log('[RedisClient] Connected to Redis successfully');
        this.connectionRetries = 0;
        this.isUsingMemory = false;
        this.emit('connected');
      });

      this.redis.on('error', (err) => {
        console.error('[RedisClient] Redis error:', err.message);
        this.handleRedisError();
      });

      this.redis.on('close', () => {
        console.warn('[RedisClient] Redis connection closed');
      });

      this.redis.on('reconnecting', () => {
        console.log('[RedisClient] Redis attempting to reconnect...');
      });

      // Test connection
      await this.redis.ping();
      console.log('[RedisClient] Redis connection verified');
    } catch (error) {
      console.warn(
        '[RedisClient] Failed to connect to Redis:',
        error instanceof Error ? error.message : String(error)
      );
      this.handleConnectionFailure();
    }
  }

  private handleRedisError(): void {
    if (this.connectionRetries < this.maxRetries) {
      this.connectionRetries++;
      console.log(
        `[RedisClient] Retrying connection (${this.connectionRetries}/${this.maxRetries})...`
      );
      setTimeout(() => {
        this.redis?.disconnect();
      }, this.retryDelayMs);
    } else {
      this.handleConnectionFailure();
    }
  }

  private handleConnectionFailure(): void {
    console.warn(
      '[RedisClient] Redis connection failed, falling back to memory store'
    );
    this.isUsingMemory = true;
    this.redis = null;
    this.emit('fallback-to-memory');
  }

  /**
   * Get value from Redis or memory store
   */
  async get(key: string): Promise<string | null> {
    try {
      if (this.isUsingMemory) {
        return this.memoryGet(key);
      }

      if (!this.redis) {
        return null;
      }

      return await this.redis.get(key);
    } catch (error) {
      console.error('[RedisClient] Get error:', error);
      return null;
    }
  }

  /**
   * Set value in Redis or memory store with optional expiry
   */
  async set(
    key: string,
    value: string,
    expirySeconds?: number
  ): Promise<boolean> {
    try {
      if (this.isUsingMemory) {
        return this.memorySet(key, value, expirySeconds);
      }

      if (!this.redis) {
        return false;
      }

      if (expirySeconds) {
        await this.redis.setex(key, expirySeconds, value);
      } else {
        await this.redis.set(key, value);
      }

      return true;
    } catch (error) {
      console.error('[RedisClient] Set error:', error);
      return false;
    }
  }

  /**
   * Increment counter in Redis or memory store
   */
  async incr(key: string): Promise<number> {
    try {
      if (this.isUsingMemory) {
        return this.memoryIncr(key);
      }

      if (!this.redis) {
        return 0;
      }

      return await this.redis.incr(key);
    } catch (error) {
      console.error('[RedisClient] Incr error:', error);
      return 0;
    }
  }

  /**
   * Set expiry on existing key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      if (this.isUsingMemory) {
        return this.memoryExpire(key, seconds);
      }

      if (!this.redis) {
        return false;
      }

      const result = await this.redis.expire(key, seconds);
      return result === 1;
    } catch (error) {
      console.error('[RedisClient] Expire error:', error);
      return false;
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (this.isUsingMemory) {
        return this.memoryTtl(key);
      }

      if (!this.redis) {
        return -2;
      }

      return await this.redis.ttl(key);
    } catch (error) {
      console.error('[RedisClient] TTL error:', error);
      return -2;
    }
  }

  /**
   * Delete key from Redis or memory store
   */
  async del(key: string): Promise<boolean> {
    try {
      if (this.isUsingMemory) {
        delete this.memoryStore[key];
        return true;
      }

      if (!this.redis) {
        return false;
      }

      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('[RedisClient] Del error:', error);
      return false;
    }
  }

  /**
   * Clear all keys matching pattern (careful with large datasets)
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      if (this.isUsingMemory) {
        return this.memoryClearPattern(pattern);
      }

      if (!this.redis) {
        return 0;
      }

      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      return keys.length;
    } catch (error) {
      console.error('[RedisClient] DeletePattern error:', error);
      return 0;
    }
  }

  /**
   * Get all keys matching pattern
   */
  async getKeys(pattern: string): Promise<string[]> {
    try {
      if (this.isUsingMemory) {
        return Object.keys(this.memoryStore).filter((key) => {
          const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
          return regex.test(key);
        });
      }

      if (!this.redis) {
        return [];
      }

      return await this.redis.keys(pattern);
    } catch (error) {
      console.error('[RedisClient] GetKeys error:', error);
      return [];
    }
  }

  /**
   * Check health status
   */
  async health(): Promise<{
    status: 'connected' | 'memory-fallback' | 'disconnected';
    message: string;
  }> {
    try {
      if (this.isUsingMemory) {
        return {
          status: 'memory-fallback',
          message: 'Using in-memory store (Redis unavailable)',
        };
      }

      if (!this.redis) {
        return {
          status: 'disconnected',
          message: 'Redis client not initialized',
        };
      }

      await this.redis.ping();
      return {
        status: 'connected',
        message: 'Redis connected and responding',
      };
    } catch (error) {
      return {
        status: 'disconnected',
        message: `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Close connection gracefully
   */
  async shutdown(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.quit();
        console.log('[RedisClient] Redis connection closed gracefully');
      }

      this.memoryStore = {};
      this.redis = null;
    } catch (error) {
      console.error('[RedisClient] Shutdown error:', error);
      if (this.redis) {
        this.redis.disconnect();
      }
    }
  }

  // ===== Memory Store Methods (Fallback) =====

  private memoryGet(key: string): string | null {
    const entry = this.memoryStore[key];
    if (!entry) return null;

    // Check if expired
    if (entry.expiry && entry.expiry < Date.now()) {
      delete this.memoryStore[key];
      return null;
    }

    return entry.value;
  }

  private memorySet(
    key: string,
    value: string,
    expirySeconds?: number
  ): boolean {
    const expiry = expirySeconds
      ? Date.now() + expirySeconds * 1000
      : undefined;
    this.memoryStore[key] = { value, expiry: expiry || 0 };
    return true;
  }

  private memoryIncr(key: string): number {
    const entry = this.memoryStore[key];

    // Check expiry
    if (entry && entry.expiry && entry.expiry < Date.now()) {
      delete this.memoryStore[key];
      this.memoryStore[key] = { value: '1', expiry: 0 };
      return 1;
    }

    const current = entry ? parseInt(entry.value, 10) : 0;
    const next = current + 1;
    this.memoryStore[key] = { value: String(next), expiry: entry?.expiry || 0 };
    return next;
  }

  private memoryExpire(key: string, seconds: number): boolean {
    const entry = this.memoryStore[key];
    if (!entry) return false;

    entry.expiry = Date.now() + seconds * 1000;
    return true;
  }

  private memoryTtl(key: string): number {
    const entry = this.memoryStore[key];
    if (!entry) return -2;

    if (!entry.expiry) return -1;

    const ttl = Math.ceil((entry.expiry - Date.now()) / 1000);
    return ttl > 0 ? ttl : -2;
  }

  private memoryClearPattern(pattern: string): number {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const keysToDelete = Object.keys(this.memoryStore).filter((key) =>
      regex.test(key)
    );

    keysToDelete.forEach((key) => {
      delete this.memoryStore[key];
    });

    return keysToDelete.length;
  }

  /**
   * Get info about stored keys (for debugging)
   */
  getMemoryStoreInfo(): {
    keyCount: number;
    estimatedMemory: string;
    keys: string[];
  } {
    const keyCount = Object.keys(this.memoryStore).length;
    const estimatedMemory = `${(
      (JSON.stringify(this.memoryStore).length / 1024).toFixed(2)
    )} KB`;

    return {
      keyCount,
      estimatedMemory,
      keys: Object.keys(this.memoryStore),
    };
  }
}

// Create singleton instance
export const redisClient = new RedisClientManager();

// Default Redis configuration
export const defaultRedisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
};
