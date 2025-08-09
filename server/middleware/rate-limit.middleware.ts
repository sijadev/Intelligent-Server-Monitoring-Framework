/**
 * Advanced Rate Limiting Middleware
 * Protects API endpoints from abuse and overload
 */

import { Request, Response, NextFunction } from 'express';
import { config, isDevelopment, isProduction } from '../config';
import { logAggregator } from '../services/log-aggregator';
import { createValidationError, ErrorHandler } from '../utils/error-handler';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  message?: string; // Custom error message
  statusCode?: number; // HTTP status code for rate limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyGenerator?: (req: Request) => string; // Custom key generation
  skip?: (req: Request) => boolean; // Skip rate limiting for certain requests
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, entry: RateLimitEntry): void;
  delete(key: string): void;
  clear(): void;
  size(): number;
}

/**
 * In-Memory Rate Limit Store
 * For production, consider using Redis for distributed rate limiting
 */
class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logAggregator.log('DEBUG', 'rate-limit', `Cleaned up ${cleaned} expired rate limit entries`);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

/**
 * Rate Limiting Class
 */
export class RateLimit {
  private config: Required<RateLimitConfig>;
  private store: RateLimitStore;

  constructor(config: RateLimitConfig, store?: RateLimitStore) {
    this.config = {
      windowMs: config.windowMs,
      maxRequests: config.maxRequests,
      message: config.message || 'Too many requests, please try again later',
      statusCode: config.statusCode || 429,
      skipSuccessfulRequests: config.skipSuccessfulRequests || false,
      skipFailedRequests: config.skipFailedRequests || false,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator,
      skip: config.skip || (() => false),
    };

    this.store = store || new MemoryStore();
  }

  private defaultKeyGenerator(req: Request): string {
    // Use IP address as default key
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `rate_limit:${ip}`;
  }

  middleware = (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting if configured
    if (this.config.skip(req)) {
      return next();
    }

    // Skip in development if configured
    if (isDevelopment() && process.env.DISABLE_RATE_LIMITING === 'true') {
      return next();
    }

    const key = this.config.keyGenerator(req);
    const now = Date.now();

    let entry = this.store.get(key);

    if (!entry) {
      // First request in window
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
      this.setHeaders(res, entry, this.config.maxRequests);
      return next();
    }

    // Check if window has expired
    if (now > entry.resetTime) {
      // Reset window
      entry = {
        count: 1,
        resetTime: now + this.config.windowMs,
        firstRequest: now,
      };
      this.store.set(key, entry);
      this.setHeaders(res, entry, this.config.maxRequests);
      return next();
    }

    // Increment counter
    entry.count++;
    this.store.set(key, entry);

    // Set rate limit headers
    this.setHeaders(res, entry, this.config.maxRequests);

    // Check if limit exceeded
    if (entry.count > this.config.maxRequests) {
      // Log rate limit exceeded
      logAggregator.log('WARN', 'rate-limit', `Rate limit exceeded for key: ${key}`, {
        key: key.replace(/\d+\.\d+\.\d+\.\d+/, '[IP]'), // Anonymize IP in logs
        count: entry.count,
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs,
        userAgent: req.headers['user-agent'],
        path: req.path,
        method: req.method,
      });

      const error = createValidationError(this.config.message, {
        type: 'RATE_LIMIT_EXCEEDED',
        limit: this.config.maxRequests,
        windowMs: this.config.windowMs,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });

      res.status(this.config.statusCode);
      res.set('Retry-After', Math.ceil((entry.resetTime - now) / 1000).toString());

      return ErrorHandler.handle(error, 'rate-limit', res);
    }

    next();
  };

  private setHeaders(res: Response, entry: RateLimitEntry, limit: number): void {
    res.set({
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': Math.max(0, limit - entry.count).toString(),
      'X-RateLimit-Reset': Math.ceil(entry.resetTime / 1000).toString(),
      'X-RateLimit-Window': this.config.windowMs.toString(),
    });
  }

  // Get current stats for a key
  getStats(key: string): { count: number; remaining: number; resetTime: number } | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    return {
      count: entry.count,
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      resetTime: entry.resetTime,
    };
  }

  // Reset rate limit for a key
  reset(key: string): void {
    this.store.delete(key);
  }

  // Get store size (for monitoring)
  getStoreSize(): number {
    return this.store.size();
  }
}

/**
 * Predefined Rate Limiting Configurations
 */
export const rateLimitConfigs = {
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later',
  },

  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    message: 'Too many authentication attempts, please try again later',
    keyGenerator: (req: Request) => `auth:${req.ip}:${req.path}`,
  },

  // File upload endpoints
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    message: 'Too many file uploads, please wait before uploading again',
  },

  // Search endpoints
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 searches per minute
    message: 'Too many search requests, please slow down',
  },

  // Admin endpoints (very strict)
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    message: 'Admin endpoint rate limit exceeded',
  },

  // WebSocket connections
  websocket: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 connection attempts per 5 minutes
    message: 'Too many WebSocket connection attempts',
  },

  // Development (lenient)
  development: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 1000, // Very high limit for development
    message: 'Development rate limit exceeded',
  },
};

/**
 * Factory function to create rate limiter middleware
 */
export function createRateLimit(
  configName: keyof typeof rateLimitConfigs | RateLimitConfig,
): (req: Request, res: Response, next: NextFunction) => void {
  let config: RateLimitConfig;

  if (typeof configName === 'string') {
    config = rateLimitConfigs[configName];
    if (!config) {
      throw new Error(`Unknown rate limit configuration: ${configName}`);
    }
  } else {
    config = configName;
  }

  // Use more lenient settings in development
  if (isDevelopment() && typeof configName === 'string' && configName !== 'development') {
    config = {
      ...config,
      maxRequests: Math.max(config.maxRequests * 10, 1000), // 10x limit in dev
      windowMs: config.windowMs, // Keep same window
    };
  }

  const rateLimiter = new RateLimit(config);
  return rateLimiter.middleware;
}

/**
 * IP-based key generator with anonymization for logging
 */
export function ipKeyGenerator(prefix = 'ip'): (req: Request) => string {
  return (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `${prefix}:${ip}`;
  };
}

/**
 * User-based key generator (requires authentication middleware)
 */
export function userKeyGenerator(prefix = 'user'): (req: Request) => string {
  return (req: Request) => {
    // Assumes user ID is available on request object after authentication
    const userId = (req as any).user?.id || (req as any).userId || req.ip || 'anonymous';
    return `${prefix}:${userId}`;
  };
}

/**
 * API key based rate limiting
 */
export function apiKeyGenerator(prefix = 'api'): (req: Request) => string {
  return (req: Request) => {
    const apiKey = (req.headers['x-api-key'] as string) || (req.query.apikey as string) || 'no-key';
    return `${prefix}:${apiKey}`;
  };
}

/**
 * Combined rate limiting (IP + endpoint)
 */
export function endpointKeyGenerator(req: Request): string {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const endpoint = req.route?.path || req.path;
  return `endpoint:${ip}:${endpoint}`;
}

// Export singleton memory store for reuse across rate limiters
export const globalRateLimitStore = new MemoryStore();

// Export rate limiting middleware for common use cases
export const generalRateLimit = createRateLimit('general');
export const authRateLimit = createRateLimit('auth');
export const uploadRateLimit = createRateLimit('upload');
export const searchRateLimit = createRateLimit('search');
export const adminRateLimit = createRateLimit('admin');
export const websocketRateLimit = createRateLimit('websocket');
