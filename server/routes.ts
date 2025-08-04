import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { config } from "./config";
import { storage } from "./storage-init";
import { pythonMonitorService } from "./services/python-monitor";
import { logAggregator } from "./services/log-aggregator";
import { 
  insertProblemSchema, 
  insertMetricsSchema, 
  insertLogEntrySchema,
  insertPluginSchema,
  insertFrameworkConfigSchema,
  insertAiInterventionSchema,
  insertDeploymentSchema,
  insertAiModelSchema,
  insertDeploymentMetricsSchema,
  insertMcpServerSchema,
  insertMcpServerMetricsSchema,
  type LogFilterOptions 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize Python monitoring service
  if (config.PYTHON_FRAMEWORK_ENABLED) {
    pythonMonitorService.start().catch(error => {
      console.warn('Failed to start Python monitoring service:', error.message);
      console.log('Python monitoring will be disabled. Install psutil: pip install psutil');
    });
  } else {
    console.log('Python framework disabled via PYTHON_FRAMEWORK_ENABLED=false');
  }

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

  // Listen to log aggregator events
  logAggregator.on('log', (logEntry) => {
    broadcast('logEntries', [logEntry]);
  });


  // WebSocket connection handling
  wss.on('connection', (ws) => {
    const clientId = Math.random().toString(36).substr(2, 9);
    console.log(`👋 WebSocket client connected (${clientId})`);
    logAggregator.logWebSocket('client_connected', clientId);

    // Send initial data
    storage.getDashboardData().then(data => {
      ws.send(JSON.stringify({ type: 'dashboard', data }));
    });

    ws.on('close', () => {
      console.log(`✋ WebSocket client disconnected (${clientId})`);
      logAggregator.logWebSocket('client_disconnected', clientId);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      logAggregator.logWebSocket('client_error', clientId, { error: error.message });
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
      // Convert timestamp string to Date object if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }
      
      const problem = insertProblemSchema.parse(req.body);
      const created = await storage.createProblem(problem);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid problem data", error: error.message });
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
      // Convert timestamp string to Date object if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }
      
      const metrics = insertMetricsSchema.parse(req.body);
      const created = await storage.createMetrics(metrics);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid metrics data", error: error.message });
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
      // Convert timestamp string to Date object if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }
      
      const logEntry = insertLogEntrySchema.parse(req.body);
      const created = await storage.createLogEntry(logEntry);
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid log entry data", error: error.message });
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
      // Set default status if not provided
      if (!req.body.status) {
        req.body.status = 'running';
      }
      
      const plugin = insertPluginSchema.parse(req.body);
      
      const created = await storage.createOrUpdatePlugin(plugin);
      
      // Notify Python framework about new plugin
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        console.warn('Failed to notify Python framework about new plugin:', error);
      }
      
      res.json(created);
    } catch (error) {
      res.status(400).json({ message: "Invalid plugin data", error: error.message });
    }
  });

  app.put("/api/plugins/:pluginId", async (req, res) => {
    try {
      const plugin = insertPluginSchema.parse(req.body);
      const updated = await storage.updatePlugin(req.params.pluginId, plugin);
      if (!updated) {
        return res.status(404).json({ message: "Plugin not found" });
      }
      
      // Notify Python framework about plugin update
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        console.warn('Failed to notify Python framework about plugin update:', error);
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update plugin" });
    }
  });

  app.delete("/api/plugins/:pluginId", async (req, res) => {
    try {
      const deleted = await storage.deletePlugin(req.params.pluginId);
      if (!deleted) {
        return res.status(404).json({ message: "Plugin not found" });
      }
      
      // Notify Python framework about plugin deletion
      try {
        await pythonMonitorService.sendCommand('reload_plugins');
      } catch (error) {
        console.warn('Failed to notify Python framework about plugin deletion:', error);
      }
      
      res.json({ message: "Plugin deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plugin" });
    }
  });

  // Plugin control endpoints
  app.post("/api/plugins/:pluginId/start", async (req, res) => {
    try {
      const plugin = await storage.getPlugin(req.params.pluginId);
      if (!plugin) {
        return res.status(404).json({ message: "Plugin not found" });
      }
      
      const updated = await storage.updatePlugin(req.params.pluginId, { 
        status: 'running' 
      });
      
      // Notify Python framework
      try {
        await pythonMonitorService.sendCommand('start_plugin', { pluginId: req.params.pluginId });
      } catch (error) {
        console.warn('Failed to start plugin in Python framework:', error);
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to start plugin" });
    }
  });

  app.post("/api/plugins/:pluginId/stop", async (req, res) => {
    try {
      const plugin = await storage.getPlugin(req.params.pluginId);
      if (!plugin) {
        return res.status(404).json({ message: "Plugin not found" });
      }
      
      const updated = await storage.updatePlugin(req.params.pluginId, { 
        status: 'stopped' 
      });
      
      // Notify Python framework
      try {
        await pythonMonitorService.sendCommand('stop_plugin', { pluginId: req.params.pluginId });
      } catch (error) {
        console.warn('Failed to stop plugin in Python framework:', error);
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to stop plugin" });
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

  // Code Analysis endpoints
  app.get("/api/code-issues", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const issues = await storage.getCodeIssues(limit);
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to get code issues" });
    }
  });

  app.get("/api/code-issues/active", async (req, res) => {
    try {
      const issues = await storage.getActiveCodeIssues();
      res.json(issues);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active code issues" });
    }
  });

  app.put("/api/code-issues/:id/resolve", async (req, res) => {
    try {
      const resolved = await storage.resolveCodeIssue(req.params.id);
      if (!resolved) {
        return res.status(404).json({ message: "Code issue not found" });
      }
      res.json(resolved);
    } catch (error) {
      res.status(500).json({ message: "Failed to resolve code issue" });
    }
  });

  app.put("/api/code-issues/:id/apply-fix", async (req, res) => {
    try {
      const fixed = await storage.applyCodeFix(req.params.id);
      if (!fixed) {
        return res.status(404).json({ message: "Code issue not found" });
      }
      res.json(fixed);
    } catch (error) {
      res.status(500).json({ message: "Failed to apply code fix" });
    }
  });

  // Code Analysis Runs endpoints
  app.get("/api/code-analysis/runs", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const runs = await storage.getCodeAnalysisRuns(limit);
      res.json(runs);
    } catch (error) {
      res.status(500).json({ message: "Failed to get code analysis runs" });
    }
  });

  app.get("/api/code-analysis/runs/latest", async (req, res) => {
    try {
      const run = await storage.getLatestCodeAnalysisRun();
      res.json(run);
    } catch (error) {
      res.status(500).json({ message: "Failed to get latest code analysis run" });
    }
  });

  app.post("/api/code-analysis/start", async (req, res) => {
    try {
      const config = await storage.getFrameworkConfig();
      if (!config?.codeAnalysisEnabled) {
        return res.status(400).json({ message: "Code analysis is not enabled in configuration" });
      }

      // Create a new analysis run
      const run = await storage.createCodeAnalysisRun({
        timestamp: new Date(),
        sourceDirectories: config.sourceDirectories || [],
        filesAnalyzed: 0,
        issuesFound: 0,
        fixesApplied: 0,
        status: "running",
        duration: null,
        metadata: {
          triggeredBy: "manual",
          confidenceThreshold: config.confidenceThreshold || 70
        }
      });

      res.json({ message: "Code analysis started", runId: run.id, run });
    } catch (error) {
      res.status(500).json({ message: "Failed to start code analysis" });
    }
  });

  app.get("/api/code-analysis/config", async (req, res) => {
    try {
      const config = await storage.getFrameworkConfig();
      if (!config) {
        return res.status(404).json({ message: "Configuration not found" });
      }
      
      const codeAnalysisConfig = {
        enabled: config.codeAnalysisEnabled || false,
        sourceDirectories: config.sourceDirectories || [],
        autoFix: config.autoFixEnabled || false,
        confidenceThreshold: (config.confidenceThreshold || 70) / 100,
        backupDirectory: config.backupDirectory || "./backups"
      };
      
      res.json(codeAnalysisConfig);
    } catch (error) {
      res.status(500).json({ message: "Failed to get code analysis configuration" });
    }
  });

  // AI Interventions endpoints
  app.get("/api/ai/interventions", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const interventions = await storage.getAiInterventions(limit);
      res.json(interventions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get AI interventions" });
    }
  });

  app.post("/api/ai/interventions", async (req, res) => {
    try {
      const validatedData = insertAiInterventionSchema.parse(req.body);
      const intervention = await storage.createAiIntervention(validatedData);
      broadcast('aiIntervention', intervention);
      res.status(201).json(intervention);
    } catch (error) {
      res.status(400).json({ message: "Invalid intervention data" });
    }
  });

  app.get("/api/ai/interventions/recent", async (req, res) => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const interventions = await storage.getRecentAiInterventions(hours);
      res.json(interventions);
    } catch (error) {
      res.status(500).json({ message: "Failed to get recent AI interventions" });
    }
  });

  // Deployments endpoints
  app.get("/api/deployments", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const deployments = await storage.getDeployments(limit);
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deployments" });
    }
  });

  app.get("/api/deployments/active", async (req, res) => {
    try {
      const deployments = await storage.getActiveDeployments();
      res.json(deployments);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active deployments" });
    }
  });

  app.post("/api/deployments", async (req, res) => {
    try {
      const validatedData = insertDeploymentSchema.parse(req.body);
      const deployment = await storage.createDeployment(validatedData);
      broadcast('deployment', deployment);
      res.status(201).json(deployment);
    } catch (error) {
      res.status(400).json({ message: "Invalid deployment data" });
    }
  });

  app.get("/api/deployments/:id", async (req, res) => {
    try {
      const deployment = await storage.getDeployment(req.params.id);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      res.json(deployment);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deployment" });
    }
  });

  app.patch("/api/deployments/:id", async (req, res) => {
    try {
      const updates = req.body;
      const deployment = await storage.updateDeployment(req.params.id, updates);
      if (!deployment) {
        return res.status(404).json({ message: "Deployment not found" });
      }
      broadcast('deploymentUpdate', deployment);
      res.json(deployment);
    } catch (error) {
      res.status(500).json({ message: "Failed to update deployment" });
    }
  });

  // AI Models endpoints
  app.get("/api/ai/models", async (req, res) => {
    try {
      const models = await storage.getAiModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to get AI models" });
    }
  });

  app.get("/api/ai/models/active", async (req, res) => {
    try {
      const models = await storage.getActiveAiModels();
      res.json(models);
    } catch (error) {
      res.status(500).json({ message: "Failed to get active AI models" });
    }
  });

  app.post("/api/ai/models", async (req, res) => {
    try {
      const validatedData = insertAiModelSchema.parse(req.body);
      const model = await storage.createAiModel(validatedData);
      broadcast('aiModel', model);
      res.status(201).json(model);
    } catch (error) {
      res.status(400).json({ message: "Invalid AI model data" });
    }
  });

  app.patch("/api/ai/models/:id", async (req, res) => {
    try {
      const updates = req.body;
      const model = await storage.updateAiModel(req.params.id, updates);
      if (!model) {
        return res.status(404).json({ message: "AI model not found" });
      }
      broadcast('aiModelUpdate', model);
      res.json(model);
    } catch (error) {
      res.status(500).json({ message: "Failed to update AI model" });
    }
  });

  // Deployment Metrics endpoints
  app.get("/api/deployments/:id/metrics", async (req, res) => {
    try {
      const metrics = await storage.getDeploymentMetrics(req.params.id);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get deployment metrics" });
    }
  });

  app.post("/api/deployments/:id/metrics", async (req, res) => {
    try {
      const validatedData = insertDeploymentMetricsSchema.parse({
        ...req.body,
        deploymentId: req.params.id
      });
      const metrics = await storage.createDeploymentMetrics(validatedData);
      broadcast('deploymentMetrics', metrics);
      res.status(201).json(metrics);
    } catch (error) {
      res.status(400).json({ message: "Invalid deployment metrics data" });
    }
  });

  // AI Learning Statistics endpoint
  app.get("/api/ai/stats", async (req, res) => {
    try {
      const stats = await storage.getAiLearningStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get AI learning statistics" });
    }
  });

  // AI Operations endpoints
  app.post("/api/ai/train", async (req, res) => {
    try {
      // This would trigger AI model training
      // For now, return a placeholder response
      res.json({ 
        message: "AI training initiated",
        status: "started",
        estimatedDuration: "5-10 minutes"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to start AI training" });
    }
  });

  app.post("/api/ai/predict", async (req, res) => {
    try {
      const { problemType, confidence, riskScore } = req.body;
      
      // This would use the AI system to predict intervention success
      // For now, return a placeholder prediction
      const prediction = {
        successProbability: Math.max(0, confidence - riskScore),
        recommendedAction: confidence > 0.8 ? "auto_apply" : "manual_review",
        confidence: confidence || 0.5
      };
      
      res.json(prediction);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate AI prediction" });
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

  // MCP Server endpoints
  app.get("/api/mcp/servers", async (req, res) => {
    try {
      const servers = await storage.getMcpServers();
      res.json(servers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get MCP servers" });
    }
  });

  app.get("/api/mcp/servers/:serverId", async (req, res) => {
    try {
      const server = await storage.getMcpServer(req.params.serverId);
      if (!server) {
        return res.status(404).json({ message: "MCP server not found" });
      }
      res.json(server);
    } catch (error) {
      res.status(500).json({ message: "Failed to get MCP server" });
    }
  });

  app.post("/api/mcp/servers", async (req, res) => {
    try {
      // Convert timestamp strings to Date objects if needed
      if (req.body.discoveredAt && typeof req.body.discoveredAt === 'string') {
        req.body.discoveredAt = new Date(req.body.discoveredAt);
      }
      if (req.body.lastSeen && typeof req.body.lastSeen === 'string') {
        req.body.lastSeen = new Date(req.body.lastSeen);
      }
      
      const server = insertMcpServerSchema.parse(req.body);
      const created = await storage.createMcpServer(server);
      res.json(created);
    } catch (error) {
      console.error("MCP server creation error:", error);
      res.status(400).json({ message: "Invalid MCP server data", error: (error as Error).message });
    }
  });

  app.put("/api/mcp/servers/:serverId", async (req, res) => {
    try {
      const updates = req.body;
      const updated = await storage.updateMcpServer(req.params.serverId, updates);
      if (!updated) {
        return res.status(404).json({ message: "MCP server not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update MCP server" });
    }
  });

  app.delete("/api/mcp/servers/:serverId", async (req, res) => {
    try {
      const deleted = await storage.deleteMcpServer(req.params.serverId);
      if (!deleted) {
        return res.status(404).json({ message: "MCP server not found" });
      }
      res.json({ message: "MCP server deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete MCP server" });
    }
  });

  app.get("/api/mcp/servers/:serverId/metrics", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const metrics = await storage.getMcpServerMetrics(req.params.serverId, limit);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get MCP server metrics" });
    }
  });

  app.post("/api/mcp/metrics", async (req, res) => {
    try {
      // Convert timestamp strings to Date objects if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }
      
      const metrics = insertMcpServerMetricsSchema.parse(req.body);
      const created = await storage.createMcpServerMetrics(metrics);
      res.json(created);
    } catch (error) {
      console.error("MCP server metrics creation error:", error);
      res.status(400).json({ message: "Invalid MCP server metrics data", error: (error as Error).message });
    }
  });

  // ============================================================================
  // MCP SERVER MANAGEMENT API
  // ============================================================================

  app.get("/api/mcp/dashboard", async (req, res) => {
    try {
      const dashboard = await storage.getMcpServerDashboardData();
      res.json(dashboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get MCP dashboard data" });
    }
  });

  // Debug endpoint to test storage
  app.get("/api/debug/storage", async (req, res) => {
    try {
      console.log('🔍 Testing storage system...');
      
      // Test storage type
      const storageType = storage.constructor.name;
      console.log('  - Storage type:', storageType);
      
      // Test basic operations
      const plugins = await storage.getPlugins();
      console.log('  - Plugins count:', plugins.length);
      
      const problems = await storage.getProblems();
      console.log('  - Problems count:', problems.length);
      
      // Test creating a plugin
      try {
        const testPlugin = await storage.createOrUpdatePlugin({
          name: 'test_plugin',
          version: '1.0.0',
          type: 'collector',
          status: 'running',
          config: { test: true }
        });
        console.log('  - Test plugin created:', testPlugin.id);
      } catch (error) {
        console.error('  - Failed to create test plugin:', error);
      }
      
      res.json({
        storageType,
        pluginsCount: plugins.length,
        problemsCount: problems.length,
        databaseUrl: config.DATABASE_URL ? 'present' : 'missing',
        configuration: {
          nodeEnv: config.NODE_ENV,
          port: config.PORT,
          pythonFrameworkEnabled: config.PYTHON_FRAMEWORK_ENABLED,
          monitoringInterval: config.MONITORING_INTERVAL,
          logLevel: config.LOG_LEVEL
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Storage debug failed:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return httpServer;
}
