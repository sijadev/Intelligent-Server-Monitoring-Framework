/**
 * Production-Ready CORS Configuration
 * Provides secure and configurable Cross-Origin Resource Sharing policies
 */

import { Request, Response, NextFunction } from 'express';
import { config, isDevelopment, isProduction } from '../config';
import { logAggregator } from '../services/log-aggregator';

interface CORSOptions {
  origin:
    | string[]
    | string
    | boolean
    | ((
        origin: string | undefined,
        callback: (err: Error | null, allow?: boolean) => void,
      ) => void);
  methods: string[];
  allowedHeaders: string[];
  credentials: boolean;
  maxAge?: number;
  exposedHeaders?: string[];
  preflightContinue?: boolean;
  optionsSuccessStatus?: number;
}

/**
 * Get CORS configuration based on environment
 */
function getCORSConfig(): CORSOptions {
  if (isDevelopment()) {
    return {
      origin: [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8000',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:8000',
        // Allow Vite HMR
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Content-Length',
        'X-Requested-With',
        'Accept',
        'Origin',
        'User-Agent',
        'Cache-Control',
        'X-CSRF-Token',
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
      exposedHeaders: ['X-Total-Count', 'X-Rate-Limit-Remaining'],
      optionsSuccessStatus: 200,
    };
  }

  // Production configuration
  const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS?.split(',') || [
    'https://your-domain.com',
    'https://www.your-domain.com',
  ];

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logAggregator.log('WARN', 'cors', `Blocked CORS request from origin: ${origin}`, {
          origin,
        });
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Content-Length',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-CSRF-Token',
    ],
    credentials: true,
    maxAge: 3600, // 1 hour in production
    exposedHeaders: ['X-Total-Count'],
    optionsSuccessStatus: 204,
  };
}

/**
 * Enhanced CORS middleware with logging and security features
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const corsOptions = getCORSConfig();

  // Log CORS requests in development
  if (isDevelopment() && req.headers.origin) {
    logAggregator.log('DEBUG', 'cors', `CORS request from origin: ${req.headers.origin}`, {
      origin: req.headers.origin,
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
    });
  }

  // Handle origin
  if (typeof corsOptions.origin === 'function') {
    corsOptions.origin(req.headers.origin, (err, allow) => {
      if (err) {
        res.status(403).json({ error: 'CORS policy violation' });
        return;
      }
      if (allow) {
        setCORSHeaders(req, res, corsOptions);
      }
      handleRequest(req, res, next);
    });
  } else if (Array.isArray(corsOptions.origin)) {
    const origin = req.headers.origin;
    const isAllowed =
      !origin ||
      corsOptions.origin.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return allowedOrigin === origin;
        } else if (allowedOrigin instanceof RegExp) {
          return allowedOrigin.test(origin);
        }
        return false;
      });

    if (isAllowed) {
      setCORSHeaders(req, res, corsOptions);
    } else if (isProduction()) {
      logAggregator.log('WARN', 'cors', `Blocked CORS request from origin: ${origin}`, { origin });
      res.status(403).json({ error: 'CORS policy violation' });
      return;
    }
    handleRequest(req, res, next);
  } else {
    setCORSHeaders(req, res, corsOptions);
    handleRequest(req, res, next);
  }
}

/**
 * Set CORS headers on response
 */
function setCORSHeaders(req: Request, res: Response, options: CORSOptions): void {
  const origin = req.headers.origin;

  // Set Access-Control-Allow-Origin
  if (
    origin &&
    (Array.isArray(options.origin) ? options.origin.includes(origin) : options.origin === '*')
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (options.origin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else if (typeof options.origin === 'string') {
    res.setHeader('Access-Control-Allow-Origin', options.origin);
  }

  // Set other CORS headers
  res.setHeader('Access-Control-Allow-Methods', options.methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));

  if (options.credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (options.maxAge) {
    res.setHeader('Access-Control-Max-Age', options.maxAge.toString());
  }

  if (options.exposedHeaders) {
    res.setHeader('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
  }

  // Security headers
  if (isProduction()) {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
}

/**
 * Handle the actual request or preflight
 */
function handleRequest(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS') {
    // Handle preflight request
    const corsOptions = getCORSConfig();
    res.status(corsOptions.optionsSuccessStatus || 204);
    res.end();
  } else {
    next();
  }
}

/**
 * Validate and sanitize CORS origin for logging
 */
export function sanitizeOrigin(origin: string | undefined): string {
  if (!origin) return 'none';

  // Basic URL validation and sanitization
  try {
    const url = new URL(origin);
    return url.origin;
  } catch {
    // If not a valid URL, return sanitized version
    return origin.replace(/[^\w\-.:\/]/g, '').substring(0, 100);
  }
}

/**
 * Check if origin is allowed in current environment
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // Allow requests with no origin

  const corsOptions = getCORSConfig();

  if (Array.isArray(corsOptions.origin)) {
    return corsOptions.origin.some((allowedOrigin) => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
  }

  if (typeof corsOptions.origin === 'string') {
    return corsOptions.origin === origin || corsOptions.origin === '*';
  }

  if (typeof corsOptions.origin === 'boolean') {
    return corsOptions.origin;
  }

  return false;
}
