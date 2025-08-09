import express, { type Request, Response, NextFunction } from 'express';
import { config, isDevelopment, isTest } from './config';
import { registerRoutes } from './routes';
import helmet from 'helmet';
import { setupVite, serveStatic, log } from './vite';
import { logAggregator } from './services/log-aggregator';
import { errorMiddleware } from './utils/error-handler';
import { corsMiddleware } from './middleware/cors.middleware';
import { generalRateLimit } from './middleware/rate-limit.middleware';
import { healthCheckService } from './services/health-check.service';
import './migrate-config'; // Initialize default configuration

const app = express();

// Apply security middleware (relax in development for Vite dev client)
app.use(
  helmet(
    isDevelopment() || isTest()
      ? {
          contentSecurityPolicy: false,
          crossOriginEmbedderPolicy: false,
        }
      : undefined,
  ),
);

// In development, ensure no CSP header remains (some environments may still inject defaults)
if (isDevelopment() || isTest()) {
  app.use((req, res, next) => {
    res.removeHeader('Content-Security-Policy');
    next();
  });
}
app.use(corsMiddleware);

// Apply rate limiting (before other routes)
app.use('/api', generalRateLimit);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    // Redact common sensitive keys before logging
    const redact = (obj: any): any => {
      const SENSITIVE_KEYS = [
        'password',
        'token',
        'authorization',
        'auth',
        'secret',
        'session',
        'apiKey',
      ];
      if (!obj || typeof obj !== 'object') return obj;
      const clone: any = Array.isArray(obj) ? [] : {};
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.includes(k.toLowerCase())) {
          clone[k] = '[REDACTED]';
        } else if (v && typeof v === 'object') {
          clone[k] = redact(v);
        } else {
          clone[k] = v;
        }
      }
      return clone;
    };
    capturedJsonResponse = redact(bodyJson);
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);

      // Also log to our aggregator
      logAggregator.logRequest(req.method, path, res.statusCode, duration, req.get('User-Agent'));
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Use standardized error handling middleware
  app.use(errorMiddleware);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // In test environment we don't have a pre-built client bundle; treat like dev (Vite middleware)
  if (isDevelopment() || isTest()) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start health monitoring
  const healthMonitorInterval = healthCheckService.startPeriodicHealthCheck(30000); // Every 30 seconds

  // Graceful shutdown handling
  const gracefulShutdown = (signal: string) => {
    log(`Received ${signal}. Graceful shutdown...`);

    // Stop health monitoring
    clearInterval(healthMonitorInterval);

    // Close server
    server.close(() => {
      log('Server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      log('Force closing server');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Always use HTTP in development mode per request; HTTPS disabled
  server.listen(config.PORT, '0.0.0.0', () => {
    log(`serving on port ${config.PORT}`);
    log('Health monitoring started');
  });
})();
