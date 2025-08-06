import express, { type Request, Response, NextFunction } from "express";
import { config, isDevelopment } from "./config";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logAggregator } from "./services/log-aggregator";
import { errorMiddleware } from "./utils/error-handler";
import "./migrate-config"; // Initialize default configuration

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Also log to our aggregator
      logAggregator.logRequest(
        req.method,
        path,
        res.statusCode,
        duration,
        req.get('User-Agent')
      );
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
  if (isDevelopment()) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use centralized configuration for port
  server.listen(config.PORT, '0.0.0.0', () => {
    log(`serving on port ${config.PORT}`);
  });
})();
