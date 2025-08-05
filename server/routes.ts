import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { storage } from "./storage-init";
import { pythonMonitorService } from "./services/python-monitor";
import { logAggregator } from "./services/log-aggregator";
import { createTestManagerService } from "./services/test-manager.service";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Test Manager Service
  if (config.TEST_MANAGER_ENABLED) {
    const testManagerService = createTestManagerService({
      testManagerPath: config.TEST_MANAGER_PATH,
      workspacePath: config.TEST_MANAGER_WORKSPACE,
      defaultTimeout: config.TEST_MANAGER_TIMEOUT,
      maxConcurrentGeneration: config.TEST_MANAGER_MAX_CONCURRENT
    });
    
    try {
      await testManagerService.initialize();
      console.log('✅ Test Manager Service initialized');
    } catch (error) {
      console.warn('Failed to initialize Test Manager Service:', error.message);
      console.log('Test Manager functionality will be limited');
    }
  } else {
    console.log('Test Manager disabled via TEST_MANAGER_ENABLED=false');
  }

  // Initialize Python monitoring service
  if (config.PYTHON_FRAMEWORK_ENABLED) {
    pythonMonitorService.start().catch(error => {
      console.warn('Failed to start Python monitoring service:', error.message);
      console.log('Python monitoring will be disabled. Install psutil: pip install psutil');
    });
  } else {
    console.log('Python framework disabled via PYTHON_FRAMEWORK_ENABLED=false');
  }

  // Setup WebSocket server with connection limits
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    maxConnections: 50,
    perMessageDeflate: false
  });

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

  // WebSocket connection handling with limits
  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    const clientIP = req.socket.remoteAddress;
    
    console.log(`👋 WebSocket client connected (${clientId}) from ${clientIP}. Total: ${wss.clients.size}`);
    logAggregator.logWebSocket('client_connected', clientId);

    const connectionTimeout = setTimeout(() => {
      if (ws.readyState === ws.OPEN) {
        console.log(`⏱️ Closing idle connection (${clientId})`);
        ws.close(1000, 'Connection timeout');
      }
    }, 300000); // 5 minutes timeout

    // Send initial data
    storage.getDashboardData().then(data => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'dashboard', data }));
      }
    }).catch(error => {
      console.error('Error sending initial data:', error);
    });

    ws.on('close', () => {
      clearTimeout(connectionTimeout);
      console.log(`✋ WebSocket client disconnected (${clientId}). Remaining: ${wss.clients.size}`);
      logAggregator.logWebSocket('client_disconnected', clientId);
    });

    ws.on('error', (error) => {
      clearTimeout(connectionTimeout);
      console.error(`WebSocket error (${clientId}):`, error);
      logAggregator.logWebSocket('client_error', clientId, { error: error.message });
    });

    ws.on('pong', () => {
      clearTimeout(connectionTimeout);
    });
  });

  // Mount modular API routes
  const { apiRouter } = await import('./routes/index');
  app.use('/api', apiRouter);

  return httpServer;
}