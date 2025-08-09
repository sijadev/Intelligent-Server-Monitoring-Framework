import { Request, Response, NextFunction } from 'express';
import { serverState } from '../state/server-state';
import { eventBus } from '../events/event-bus';
import { config } from '../config';

// Middleware Interface
export interface IMiddleware {
  name: string;
  execute(req: Request, res: Response, next: NextFunction): void | Promise<void>;
}

// Request Context Interface
export interface RequestContext {
  requestId: string;
  startTime: number;
  user?: any;
  metadata: Record<string, any>;
}

// Middleware Stack
export class MiddlewareStack {
  private middlewares: IMiddleware[] = [];

  use(middleware: IMiddleware): void {
    this.middlewares.push(middleware);
  }

  async execute(req: Request, res: Response, next: NextFunction): Promise<void> {
    let index = 0;

    const runNext = async (): Promise<void> => {
      if (index >= this.middlewares.length) {
        return next();
      }

      const middleware = this.middlewares[index++];
      try {
        await middleware.execute(req, res, runNext);
      } catch (error) {
        next(error);
      }
    };

    await runNext();
  }
}

// Built-in Middleware Implementations

// Request ID Middleware
export class RequestIdMiddleware implements IMiddleware {
  name = 'RequestId';

  execute(req: Request, res: Response, next: NextFunction): void {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Add to request context
    (req as any).context = {
      requestId,
      startTime: Date.now(),
      metadata: {},
    } as RequestContext;

    // Add to response header
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}

// Request Logging Middleware
export class RequestLoggingMiddleware implements IMiddleware {
  name = 'RequestLogging';

  execute(req: Request, res: Response, next: NextFunction): void {
    const context: RequestContext = (req as any).context;
    const startTime = Date.now();

    // Log request start
    console.log(`📨 [${context.requestId}] ${req.method} ${req.path}`);

    // Capture response
    const originalJson = res.json;
    let responseData: any = undefined;

    res.json = function (body: any) {
      responseData = body;
      return originalJson.call(this, body);
    };

    // Log on response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logLine = `📤 [${context.requestId}] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`;

      console.log(logLine);

      // Emit event
      eventBus.emit('ws:message:sent', {
        clientId: context.requestId,
        message: { method: req.method, path: req.path, status: res.statusCode, duration },
        timestamp: new Date(),
      });

      // Update server metrics
      serverState.incrementRequestCount();
      if (res.statusCode >= 400) {
        serverState.incrementErrorCount();
      }
    });

    next();
  }
}

// Rate Limiting Middleware
export class RateLimitMiddleware implements IMiddleware {
  name = 'RateLimit';
  private requests: Map<string, number[]> = new Map();
  private limit: number;
  private windowMs: number;

  constructor(limit = 100, windowMs = 60000) {
    // 100 requests per minute
    this.limit = limit;
    this.windowMs = windowMs;

    // Cleanup old entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  execute(req: Request, res: Response, next: NextFunction): void {
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    // Get client request history
    const clientRequests = this.requests.get(clientIp) || [];

    // Remove old requests outside the window
    const validRequests = clientRequests.filter((time) => now - time < this.windowMs);

    // Check rate limit
    if (validRequests.length >= this.limit) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${this.limit} requests per ${this.windowMs / 1000} seconds.`,
        retryAfter: Math.ceil(this.windowMs / 1000),
      });
      return;
    }

    // Add current request
    validRequests.push(now);
    this.requests.set(clientIp, validRequests);

    next();
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.requests.entries());
    for (const [ip, requests] of entries) {
      const validRequests = requests.filter((time: number) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(ip);
      } else {
        this.requests.set(ip, validRequests);
      }
    }
  }
}

// Health Check Middleware
export class HealthCheckMiddleware implements IMiddleware {
  name = 'HealthCheck';

  execute(req: Request, res: Response, next: NextFunction): void {
    // Skip health check for non-API routes
    if (!req.path.startsWith('/api/')) {
      return next();
    }

    // Check if system is healthy
    if (!serverState.isHealthy()) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'System is not healthy',
        status: serverState.getState(),
      });
      return;
    }

    next();
  }
}

// CORS Middleware
export class CorsMiddleware implements IMiddleware {
  name = 'CORS';

  execute(req: Request, res: Response, next: NextFunction): void {
    const allowedOrigins =
      config.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:5173'] : []; // Add production origins

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin!)) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    next();
  }
}

// Error Handling Middleware (Note: This should be used differently than other middleware)
export class ErrorHandlingMiddleware {
  name = 'ErrorHandling';

  execute(error: any, req: Request, res: Response, next: NextFunction): void {
    const context: RequestContext = (req as any).context;

    console.error(`❌ [${context?.requestId || 'unknown'}] Error:`, error);

    // Emit error event
    eventBus.emit('server:error', {
      error,
      timestamp: new Date(),
    });

    // Determine error response
    const status = error.status || error.statusCode || 500;
    const message = config.NODE_ENV === 'development' ? error.message : 'Internal Server Error';

    res.status(status).json({
      error: error.name || 'Error',
      message,
      requestId: context?.requestId,
      ...(config.NODE_ENV === 'development' && { stack: error.stack }),
    });
  }
}

// Default Middleware Stack
export function createDefaultMiddlewareStack(): MiddlewareStack {
  const stack = new MiddlewareStack();

  stack.use(new RequestIdMiddleware());
  stack.use(new CorsMiddleware());
  stack.use(new RateLimitMiddleware());
  stack.use(new HealthCheckMiddleware());
  stack.use(new RequestLoggingMiddleware());

  return stack;
}
