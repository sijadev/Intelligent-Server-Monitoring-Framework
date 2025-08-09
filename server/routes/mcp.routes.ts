import { Router } from 'express';
import { storage } from '../storage-init';
import { insertMcpServerSchema, insertMcpServerMetricsSchema } from '../../shared/schema.js';

const router = Router();

// MCP Server endpoints
router.get('/servers', async (req, res) => {
  try {
    const servers = await storage.getMcpServers();
    res.json(servers);
  } catch (error) {
    console.error('❌ MCP Servers Storage Error:', error);

    // Return proper error with fallback data
    res.status(503).json({
      error: 'Database connection failed',
      message: 'Unable to retrieve MCP servers from database',
      fallback: {
        servers: [
          {
            id: 'imf-main-server',
            serverId: 'imf-main-server',
            name: 'IMF Main Server (Fallback)',
            status: 'unknown',
            url: 'http://localhost:3000',
            version: '1.0.0',
            uptime: '24h 0m 0s',
            lastSeen: new Date().toISOString(),
            capabilities: ['monitoring', 'analysis', 'remediation'],
            metrics: {
              requestCount: 0,
              errorCount: 0,
              avgResponseTime: 0,
            },
          },
        ],
      },
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/servers/:serverId', async (req, res) => {
  try {
    const server = await storage.getMcpServer(req.params.serverId);
    if (!server) {
      return res.status(404).json({ message: 'MCP server not found' });
    }
    res.json(server);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get MCP server' });
  }
});

router.post('/servers', async (req, res) => {
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
    console.error('MCP server creation error:', error);
    res.status(400).json({ message: 'Invalid MCP server data', error: (error as Error).message });
  }
});

router.put('/servers/:serverId', async (req, res) => {
  try {
    const updates = req.body;
    const updated = await storage.updateMcpServer(req.params.serverId, updates);
    if (!updated) {
      return res.status(404).json({ message: 'MCP server not found' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update MCP server' });
  }
});

router.delete('/servers/:serverId', async (req, res) => {
  try {
    const deleted = await storage.deleteMcpServer(req.params.serverId);
    if (!deleted) {
      return res.status(404).json({ message: 'MCP server not found' });
    }
    res.json({ message: 'MCP server deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete MCP server' });
  }
});

router.get('/servers/:serverId/metrics', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const metrics = await storage.getMcpServerMetrics(req.params.serverId, limit);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get MCP server metrics' });
  }
});

router.post('/metrics', async (req, res) => {
  try {
    // Convert timestamp strings to Date objects if needed
    if (req.body.timestamp && typeof req.body.timestamp === 'string') {
      req.body.timestamp = new Date(req.body.timestamp);
    }

    const metrics = insertMcpServerMetricsSchema.parse(req.body);
    const created = await storage.createMcpServerMetrics(metrics);
    res.json(created);
  } catch (error) {
    console.error('MCP server metrics creation error:', error);
    res
      .status(400)
      .json({ message: 'Invalid MCP server metrics data', error: (error as Error).message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const dashboard = await storage.getMcpServerDashboardData();
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get MCP dashboard data' });
  }
});

export { router as mcpRoutes };
