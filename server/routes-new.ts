import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { pythonMonitorService } from "./services/python-monitor";
import { logAggregator } from "./services/log-aggregator";
import { logger } from "./services/logger.service";
import { apiRouter } from "./routes";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Python monitoring service
  if (config.PYTHON_FRAMEWORK_ENABLED) {
    pythonMonitorService.start().catch(error => {
      logger.warn('python', 'Failed to start Python monitoring service', { error: error.message });
      logger.info('python', 'Python monitoring will be disabled. Install psutil: pip install psutil');
    });
  } else {
    logger.info('python', 'Python framework disabled via PYTHON_FRAMEWORK_ENABLED=false');
  }

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Setup WebSocket functionality
  setupWebSocket(wss);

  // Mount API routes
  app.use('/api', apiRouter);

  return httpServer;
}

function setupWebSocket(wss: WebSocketServer): void {
  // Broadcast to all connected WebSocket clients
  const broadcast = (type: string, data: any) => {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Listen to Python framework events
  pythonMonitorService.on('problems', (problems) => {
    broadcast('problems', problems);
  });

  pythonMonitorService.on('metrics', (metrics) => {
    broadcast('metrics', metrics);
  });

  pythonMonitorService.on('logEntries', (logEntries) => {
    broadcast('logEntries', logEntries);
  });

  pythonMonitorService.on('plugins', (plugins) => {
    broadcast('plugins', plugins);
  });

  pythonMonitorService.on('status', (status) => {
    broadcast('status', status);
  });

  // Listen to log aggregator events
  logAggregator.on('log', (logEntry) => {
    broadcast('logEntries', [logEntry]);
  });

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    logger.info('websocket', `Client connected: ${clientId}`);
    logAggregator.logWebSocket('client_connected', clientId);

    // Send initial data
    import('./storage-init').then(({ storage }) => {
      storage.getDashboardData().then(data => {
        ws.send(JSON.stringify({ type: 'dashboard', data }));
      });
    });

    ws.on('close', () => {
      logger.info('websocket', `Client disconnected: ${clientId}`);
      logAggregator.logWebSocket('client_disconnected', clientId);
    });

    ws.on('error', (error) => {
      logger.error('websocket', 'WebSocket error', { clientId, error: error.message });
      logAggregator.logWebSocket('client_error', clientId, { error: error.message });
    });
  });
}