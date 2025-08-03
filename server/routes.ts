import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { pythonMonitorService } from "./services/python-monitor";
import { 
  insertProblemSchema, 
  insertMetricsSchema, 
  insertLogEntrySchema,
  insertPluginSchema,
  insertFrameworkConfigSchema,
  type LogFilterOptions 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Python monitoring service
  pythonMonitorService.start().catch(console.error);

  // Setup WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

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

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send initial data
    storage.getDashboardData().then(data => {
      ws.send(JSON.stringify({ type: 'dashboard', data }));
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Dashboard data endpoint
  app.get("/api/dashboard", async (req, res) => {
    try {
      const data = await storage.getDashboardData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard data" });
    }
  });

  // Problems endpoints
  app.get("/api/problems", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const problems = await storage.getProblems(limit);
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get problems" });
    }
  });

  app.get("/api/problems/active", async (req, res) => {
    try {
      const problems = await storage.getActiveProblem();
      res.json(problems);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active problems" });
    }
  });

  app.post("/api/problems", async (req, res) => {
    try {
      const problem = insertProblemSchema.parse(req.body);
      const created = await storage.createProblem(problem);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid problem data" });
    }
  });

  app.patch("/api/problems/:id/resolve", async (req, res) => {
    try {
      const problem = await storage.resolveProblem(req.params.id);
      if (!problem) {
        return res.status(404).json({ message: "Problem not found" });
      }
      res.json(problem);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve problem" });
    }
  });

  // Metrics endpoints
  app.get("/api/metrics", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const metrics = await storage.getMetricsHistory(limit);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get metrics" });
    }
  });

  app.get("/api/metrics/latest", async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get latest metrics" });
    }
  });

  app.post("/api/metrics", async (req, res) => {
    try {
      const metrics = insertMetricsSchema.parse(req.body);
      const created = await storage.createMetrics(metrics);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid metrics data" });
    }
  });

  // Log entries endpoints
  app.get("/api/logs", async (req, res) => {
    try {
      const options: LogFilterOptions = {};
      
      if (req.query.level) options.level = req.query.level as string;
      if (req.query.source) options.source = req.query.source as string;
      if (req.query.limit) options.limit = parseInt(req.query.limit as string);
      if (req.query.since) options.since = new Date(req.query.since as string);

      const logs = await storage.getLogEntries(options);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get log entries" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const logEntry = insertLogEntrySchema.parse(req.body);
      const created = await storage.createLogEntry(logEntry);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid log entry data" });
    }
  });

  // Plugins endpoints
  app.get("/api/plugins", async (req, res) => {
    try {
      const plugins = await storage.getPlugins();
      res.json(plugins);
    } catch (error) {
      res.status(500).json({ message: "Failed to get plugins" });
    }
  });

  app.get("/api/plugins/:name", async (req, res) => {
    try {
      const plugin = await storage.getPlugin(req.params.name);
      if (!plugin) {
        return res.status(404).json({ message: "Plugin not found" });
      }
      res.json(plugin);
    } catch (error) {
      res.status(500).json({ message: "Failed to get plugin" });
    }
  });

  app.post("/api/plugins", async (req, res) => {
    try {
      const plugin = insertPluginSchema.parse(req.body);
      const created = await storage.createOrUpdatePlugin(plugin);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid plugin data" });
    }
  });

  // Framework configuration endpoints
  app.get("/api/config", async (req, res) => {
    try {
      const config = await storage.getFrameworkConfig();
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to get configuration" });
    }
  });

  app.put("/api/config", async (req, res) => {
    try {
      const config = insertFrameworkConfigSchema.parse(req.body);
      const updated = await storage.updateFrameworkConfig(config);
      
      // Restart Python framework with new config
      pythonMonitorService.restart().catch(console.error);
      
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: "Invalid configuration data" });
    }
  });

  // Framework control endpoints
  app.post("/api/framework/start", async (req, res) => {
    try {
      await pythonMonitorService.start();
      res.json({ message: "Framework started successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to start framework" });
    }
  });

  app.post("/api/framework/stop", async (req, res) => {
    try {
      await pythonMonitorService.stop();
      res.json({ message: "Framework stopped successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to stop framework" });
    }
  });

  app.post("/api/framework/restart", async (req, res) => {
    try {
      await pythonMonitorService.restart();
      res.json({ message: "Framework restarted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to restart framework" });
    }
  });

  app.get("/api/framework/status", async (req, res) => {
    try {
      const status = pythonMonitorService.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get framework status" });
    }
  });

  return httpServer;
}
