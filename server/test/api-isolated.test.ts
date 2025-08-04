import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { MemStorage } from '../storage';
import type { InsertPlugin, InsertProblem, InsertMetrics } from '@shared/schema';

// Simple isolated API tests without complex mocking
describe('Isolated API Tests', () => {
  let app: express.Application;
  let storage: MemStorage;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());
    
    // Create fresh memory storage
    storage = new MemStorage();
    
    // Register basic API routes directly
    setupBasicRoutes();
  });

  function setupBasicRoutes() {
    // Dashboard route
    app.get('/api/dashboard', async (req, res) => {
      try {
        const data = await storage.getDashboardData();
        res.json(data);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // Plugin routes
    app.get('/api/plugins', async (req, res) => {
      try {
        const plugins = await storage.getPlugins();
        res.json(plugins);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.post('/api/plugins', async (req, res) => {
      try {
        // Simple validation - check required fields
        const { name, version, type } = req.body;
        if (!name || !version || !type) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const pluginData = {
          ...req.body,
          status: req.body.status || 'running'
        };
        
        const created = await storage.createOrUpdatePlugin(pluginData);
        res.json(created);
      } catch (error) {
        res.status(400).json({ message: 'Invalid plugin data' });
      }
    });

    app.get('/api/plugins/:name', async (req, res) => {
      try {
        const plugin = await storage.getPlugin(req.params.name);
        if (!plugin) {
          return res.status(404).json({ message: 'Plugin not found' });
        }
        res.json(plugin);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    // Problems routes
    app.get('/api/problems', async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
        const problems = await storage.getProblems(limit);
        res.json(problems);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.post('/api/problems', async (req, res) => {
      try {
        // Simple validation
        const { type, description, severity } = req.body;
        if (!type || !description || !severity) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const problemData = {
          ...req.body,
          timestamp: req.body.timestamp || new Date(),
          resolved: req.body.resolved || false
        };
        
        const created = await storage.createProblem(problemData);
        res.json(created);
      } catch (error) {
        res.status(400).json({ message: 'Invalid problem data' });
      }
    });

    // Metrics routes
    app.get('/api/metrics', async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const metrics = await storage.getMetricsHistory(limit);
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
      }
    });

    app.post('/api/metrics', async (req, res) => {
      try {
        // Simple validation
        const { timestamp, cpuUsage } = req.body;
        if (!timestamp || cpuUsage === undefined) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        const created = await storage.createMetrics(req.body);
        res.json(created);
      } catch (error) {
        res.status(400).json({ message: 'Invalid metrics data' });
      }
    });
  }

  describe('Dashboard API', () => {
    it('should return dashboard data', async () => {
      const response = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(Array.isArray(response.body.recentProblems)).toBe(true);
      expect(Array.isArray(response.body.pluginStatus)).toBe(true);
    });
  });

  describe('Plugin API', () => {
    it('should return empty array initially', async () => {
      const response = await request(app)
        .get('/api/plugins')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should create a new plugin', async () => {
      const newPlugin = {
        name: 'test-collector',
        version: '1.0.0',
        type: 'collector',
        config: { interval: 30 }
      };

      const response = await request(app)
        .post('/api/plugins')
        .send(newPlugin)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('test-collector');
      expect(response.body.version).toBe('1.0.0');
      expect(response.body.type).toBe('collector');
      expect(response.body.status).toBe('running');
    });

    it('should get plugin by name', async () => {
      // First create a plugin
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'detector',
        status: 'running',
        config: {}
      };
      await storage.createOrUpdatePlugin(plugin);

      const response = await request(app)
        .get('/api/plugins/test-plugin')
        .expect(200);

      expect(response.body.name).toBe('test-plugin');
      expect(response.body.type).toBe('detector');
    });

    it('should return 404 for non-existent plugin', async () => {
      await request(app)
        .get('/api/plugins/non-existent')
        .expect(404);
    });
  });

  describe('Problems API', () => {
    it('should return problems list', async () => {
      const response = await request(app)
        .get('/api/problems')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create a new problem', async () => {
      const newProblem = {
        type: 'performance',
        description: 'High CPU usage detected',
        severity: 'HIGH',
        metadata: { cpuUsage: 95 }
      };

      const response = await request(app)
        .post('/api/problems')
        .send(newProblem)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.type).toBe('performance');
      expect(response.body.severity).toBe('HIGH');
    });
  });

  describe('Metrics API', () => {
    it('should return metrics history', async () => {
      const response = await request(app)
        .get('/api/metrics')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create new metrics', async () => {
      const newMetrics = {
        timestamp: new Date(),
        cpuUsage: 45.5,
        memoryUsage: 62.3,
        diskUsage: 78.1,
        networkConnections: 25,
        processes: 156,
        loadAverage: 1.2
      };

      const response = await request(app)
        .post('/api/metrics')
        .send(newMetrics)
        .expect(200);

      expect(response.body.id).toBeDefined();
      expect(response.body.cpuUsage).toBe(45.5);
      expect(response.body.memoryUsage).toBe(62.3);
    });
  });
});