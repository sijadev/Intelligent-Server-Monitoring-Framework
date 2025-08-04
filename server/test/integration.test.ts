import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { MemStorage } from '../storage';
import { serverState } from '../state/server-state';
import type { InsertPlugin, InsertProblem, InsertMetrics } from '@shared/schema';

describe('Integration Tests', () => {
  let app: express.Application;
  let server: any;
  let storage: MemStorage;

  beforeAll(async () => {
    // Setup complete application
    app = express();
    app.use(express.json());
    
    storage = new MemStorage();
    vi.doMock('../storage-init', () => ({
      storage: storage
    }));

    server = await registerRoutes(app);
    
    // Initialize server state
    serverState.setServerStatus('running');
    serverState.setDatabaseStatus({ status: 'connected', lastConnection: new Date() });
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
    await serverState.shutdown();
    vi.resetAllMocks();
  });

  beforeEach(() => {
    serverState.reset();
    serverState.setServerStatus('running');
    serverState.setDatabaseStatus({ status: 'connected', lastConnection: new Date() });
  });

  describe('Complete Plugin Lifecycle', () => {
    it('should handle complete plugin lifecycle: create -> update -> control -> delete', async () => {
      // 1. Create a plugin
      const pluginData: InsertPlugin = {
        name: 'lifecycle-test-plugin',
        version: '1.0.0',
        type: 'collector',
        config: { interval: 30, enabled: true }
      };

      const createResponse = await request(app)
        .post('/api/plugins')
        .send(pluginData)
        .expect(200);

      expect(createResponse.body.id).toBeDefined();
      expect(createResponse.body.name).toBe('lifecycle-test-plugin');
      expect(createResponse.body.status).toBe('running');

      const pluginId = createResponse.body.id;

      // 2. Verify plugin appears in list
      const listResponse = await request(app)
        .get('/api/plugins')
        .expect(200);

      expect(listResponse.body.length).toBe(1);
      expect(listResponse.body[0].name).toBe('lifecycle-test-plugin');

      // 3. Update plugin
      const updateData = {
        version: '1.1.0',
        config: { interval: 60, enabled: true, newFeature: true }
      };

      const updateResponse = await request(app)
        .put(`/api/plugins/${pluginId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.version).toBe('1.1.0');

      // 4. Stop plugin
      const stopResponse = await request(app)
        .post(`/api/plugins/${pluginId}/stop`)
        .expect(200);

      expect(stopResponse.body.status).toBe('stopped');

      // 5. Start plugin again
      const startResponse = await request(app)
        .post(`/api/plugins/${pluginId}/start`)
        .expect(200);

      expect(startResponse.body.status).toBe('running');

      // 6. Verify plugin is in dashboard data
      const dashboardResponse = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(dashboardResponse.body.pluginStatus.length).toBe(1);
      expect(dashboardResponse.body.pluginStatus[0].name).toBe('lifecycle-test-plugin');

      // 7. Delete plugin
      await request(app)
        .delete(`/api/plugins/${pluginId}`)
        .expect(200);

      // 8. Verify plugin is gone
      const finalListResponse = await request(app)
        .get('/api/plugins')
        .expect(200);

      expect(finalListResponse.body.length).toBe(0);
    });
  });

  describe('Problem Detection and Resolution Flow', () => {
    it('should handle problem detection, tracking, and resolution', async () => {
      // 1. Create metrics that indicate a problem
      const highCpuMetrics: InsertMetrics = {
        timestamp: new Date(),
        cpuUsage: 95.5, // High CPU usage
        memoryUsage: 85.2,
        diskUsage: 65.3,
        networkConnections: 150,
        processes: 200,
        loadAverage: 4.5
      };

      const metricsResponse = await request(app)
        .post('/api/metrics')
        .send(highCpuMetrics)
        .expect(200);

      expect(metricsResponse.body.cpuUsage).toBe(95.5);

      // 2. Create a problem based on the metrics
      const problemData: InsertProblem = {
        type: 'performance',
        description: 'High CPU usage detected',
        severity: 'HIGH',
        timestamp: new Date(),
        resolved: false,
        metadata: {
          cpuUsage: 95.5,
          detectedBy: 'system-monitor',
          affectedServices: ['web-server', 'database']
        }
      };

      const problemResponse = await request(app)
        .post('/api/problems')
        .send(problemData)
        .expect(200);

      expect(problemResponse.body.id).toBeDefined();
      expect(problemResponse.body.severity).toBe('HIGH');

      const problemId = problemResponse.body.id;

      // 3. Verify problem appears in active problems
      const activeProblemsResponse = await request(app)
        .get('/api/problems/active')
        .expect(200);

      expect(activeProblemsResponse.body.length).toBe(1);
      expect(activeProblemsResponse.body[0].id).toBe(problemId);

      // 4. Check dashboard shows the problem
      const dashboardResponse = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(dashboardResponse.body.status.activeProblems).toBe(1);
      expect(dashboardResponse.body.recentProblems.length).toBe(1);

      // 5. Add normal metrics (problem resolved)
      const normalMetrics: InsertMetrics = {
        timestamp: new Date(),
        cpuUsage: 25.3, // Normal CPU usage
        memoryUsage: 45.1,
        diskUsage: 65.3,
        networkConnections: 80,
        processes: 120,
        loadAverage: 1.2
      };

      await request(app)
        .post('/api/metrics')
        .send(normalMetrics)
        .expect(200);

      // 6. Resolve the problem
      const resolveResponse = await request(app)
        .patch(`/api/problems/${problemId}/resolve`)
        .expect(200);

      expect(resolveResponse.body.resolved).toBe(true);
      expect(resolveResponse.body.resolvedAt).toBeDefined();

      // 7. Verify problem is no longer active
      const finalActiveProblemsResponse = await request(app)
        .get('/api/problems/active')
        .expect(200);

      expect(finalActiveProblemsResponse.body.length).toBe(0);

      // 8. Verify problem still appears in full problems list
      const allProblemsResponse = await request(app)
        .get('/api/problems')
        .expect(200);

      expect(allProblemsResponse.body.length).toBe(1);
      expect(allProblemsResponse.body[0].resolved).toBe(true);
    });
  });

  describe('Metrics Collection and Analysis', () => {
    it('should collect metrics over time and provide analysis', async () => {
      const baseTime = new Date();
      const metrics: InsertMetrics[] = [];

      // 1. Create time series of metrics
      for (let i = 0; i < 10; i++) {
        const metric: InsertMetrics = {
          timestamp: new Date(baseTime.getTime() + i * 60000), // 1 minute intervals
          cpuUsage: 20 + Math.sin(i * 0.5) * 30, // Oscillating CPU usage
          memoryUsage: 40 + i * 2, // Gradually increasing memory
          diskUsage: 60 + Math.random() * 10, // Random disk usage
          networkConnections: 50 + i * 5,
          processes: 100 + i,
          loadAverage: 1.0 + i * 0.1
        };
        metrics.push(metric);

        await request(app)
          .post('/api/metrics')
          .send(metric)
          .expect(200);
      }

      // 2. Get metrics history
      const historyResponse = await request(app)
        .get('/api/metrics?limit=10')
        .expect(200);

      expect(historyResponse.body.length).toBe(10);

      // 3. Get latest metrics
      const latestResponse = await request(app)
        .get('/api/metrics/latest')
        .expect(200);

      expect(latestResponse.body).toBeDefined();
      expect(latestResponse.body.processes).toBe(109); // Last value

      // 4. Verify dashboard includes latest metrics
      const dashboard = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(dashboard.body.currentMetrics).toBeDefined();
      expect(dashboard.body.currentMetrics.processes).toBe(109);
    });
  });

  describe('Configuration Management Flow', () => {
    it('should manage framework configuration changes', async () => {
      // 1. Get initial configuration
      const initialConfigResponse = await request(app)
        .get('/api/config')
        .expect(200);

      expect(initialConfigResponse.body).toBeDefined();
      expect(typeof initialConfigResponse.body.monitoringInterval).toBe('number');

      // 2. Update configuration
      const configUpdate = {
        monitoringInterval: 120,
        learningEnabled: false,
        autoRemediation: true,
        logLevel: 'DEBUG',
        codeAnalysisEnabled: true,
        sourceDirectories: ['/src', '/lib'],
        confidenceThreshold: 85
      };

      const updateResponse = await request(app)
        .put('/api/config')
        .send(configUpdate)
        .expect(200);

      expect(updateResponse.body.monitoringInterval).toBe(120);
      expect(updateResponse.body.learningEnabled).toBe(false);
      expect(updateResponse.body.logLevel).toBe('DEBUG');

      // 3. Verify configuration persists
      const verifyResponse = await request(app)
        .get('/api/config')
        .expect(200);

      expect(verifyResponse.body.monitoringInterval).toBe(120);
      expect(verifyResponse.body.learningEnabled).toBe(false);

      // 4. Verify dashboard reflects new configuration
      const dashboardResponse = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(dashboardResponse.body.status.codeAnalysisEnabled).toBe(true);
    });
  });

  describe('Framework Control Integration', () => {
    it('should handle framework lifecycle operations', async () => {
      // 1. Check initial framework status
      const initialStatusResponse = await request(app)
        .get('/api/framework/status')
        .expect(200);

      expect(initialStatusResponse.body).toBeDefined();

      // 2. Stop framework
      const stopResponse = await request(app)
        .post('/api/framework/stop')
        .expect(200);

      expect(stopResponse.body.message).toContain('stopped');

      // 3. Start framework
      const startResponse = await request(app)
        .post('/api/framework/start')
        .expect(200);

      expect(startResponse.body.message).toContain('started');

      // 4. Restart framework
      const restartResponse = await request(app)
        .post('/api/framework/restart')
        .expect(200);

      expect(restartResponse.body.message).toContain('restarted');

      // 5. Verify status after operations
      const finalStatusResponse = await request(app)
        .get('/api/framework/status')
        .expect(200);

      expect(finalStatusResponse.body).toBeDefined();
    });
  });

  describe('Logging Integration', () => {
    it('should capture and retrieve logs from various sources', async () => {
      // 1. Create log entries from different sources
      const logEntries = [
        {
          timestamp: new Date(),
          level: 'INFO',
          source: 'server',
          message: 'Server started successfully',
          metadata: { port: 3000 }
        },
        {
          timestamp: new Date(),
          level: 'ERROR',
          source: 'python',
          message: 'Plugin failed to load',
          metadata: { plugin: 'test-plugin', error: 'Module not found' }
        },
        {
          timestamp: new Date(),
          level: 'WARN',
          source: 'system',
          message: 'High memory usage detected',
          metadata: { usage: 85.5 }
        }
      ];

      // Add each log entry
      for (const logEntry of logEntries) {
        await request(app)
          .post('/api/logs')
          .send(logEntry)
          .expect(200);
      }

      // 2. Retrieve all logs
      const allLogsResponse = await request(app)
        .get('/api/logs')
        .expect(200);

      expect(allLogsResponse.body.length).toBe(3);

      // 3. Filter by level
      const errorLogsResponse = await request(app)
        .get('/api/logs?level=ERROR')
        .expect(200);

      expect(errorLogsResponse.body.length).toBe(1);
      expect(errorLogsResponse.body[0].level).toBe('ERROR');

      // 4. Filter by source
      const serverLogsResponse = await request(app)
        .get('/api/logs?source=server')
        .expect(200);

      expect(serverLogsResponse.body.length).toBe(1);
      expect(serverLogsResponse.body[0].source).toBe('server');

      // 5. Limit results
      const limitedLogsResponse = await request(app)
        .get('/api/logs?limit=2')
        .expect(200);

      expect(limitedLogsResponse.body.length).toBe(2);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle various error conditions gracefully', async () => {
      // 1. Test invalid plugin data
      const invalidPlugin = {
        name: '', // Invalid: empty name
        type: 'invalid-type'
      };

      await request(app)
        .post('/api/plugins')
        .send(invalidPlugin)
        .expect(400);

      // 2. Test non-existent resource access
      await request(app)
        .get('/api/plugins/non-existent-plugin')
        .expect(404);

      await request(app)
        .patch('/api/problems/non-existent-problem/resolve')
        .expect(404);

      // 3. Test invalid problem data
      const invalidProblem = {
        type: '', // Invalid: empty type
        severity: 'INVALID_SEVERITY'
      };

      await request(app)
        .post('/api/problems')
        .send(invalidProblem)
        .expect(400);

      // 4. Test invalid metrics data
      const invalidMetrics = {
        timestamp: 'invalid-date',
        cpuUsage: 'not-a-number'
      };

      await request(app)
        .post('/api/metrics')
        .send(invalidMetrics)
        .expect(400);

      // 5. Verify system remains stable after errors
      const healthCheck = await request(app)
        .get('/api/dashboard')
        .expect(200);

      expect(healthCheck.body).toBeDefined();
      expect(healthCheck.body.status).toBeDefined();
    });
  });

  describe('Performance and Load Handling', () => {
    it('should handle multiple concurrent requests', async () => {
      const concurrentRequests = 20;
      const promises: Promise<any>[] = [];

      // Create multiple plugins concurrently
      for (let i = 0; i < concurrentRequests; i++) {
        const plugin: InsertPlugin = {
          name: `concurrent-plugin-${i}`,
          version: '1.0.0',
          type: 'collector',
          config: { id: i }
        };

        promises.push(
          request(app)
            .post('/api/plugins')
            .send(plugin)
        );
      }

      // Wait for all requests to complete
      const results = await Promise.all(promises);

      // Verify all succeeded
      results.forEach((result, index) => {
        expect(result.status).toBe(200);
        expect(result.body.name).toBe(`concurrent-plugin-${index}`);
      });

      // Verify all plugins are in the system
      const pluginsResponse = await request(app)
        .get('/api/plugins')
        .expect(200);

      expect(pluginsResponse.body.length).toBe(concurrentRequests);
    });

    it('should handle rapid metrics ingestion', async () => {
      const metricsCount = 50;
      const promises: Promise<any>[] = [];

      // Create many metrics rapidly
      for (let i = 0; i < metricsCount; i++) {
        const metrics: InsertMetrics = {
          timestamp: new Date(Date.now() + i * 1000),
          cpuUsage: Math.random() * 100,
          memoryUsage: Math.random() * 100,
          diskUsage: Math.random() * 100,
          networkConnections: Math.floor(Math.random() * 200),
          processes: Math.floor(Math.random() * 300),
          loadAverage: Math.random() * 5
        };

        promises.push(
          request(app)
            .post('/api/metrics')
            .send(metrics)
        );
      }

      const results = await Promise.all(promises);

      // Verify all succeeded
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Verify metrics are stored
      const metricsResponse = await request(app)
        .get(`/api/metrics?limit=${metricsCount}`)
        .expect(200);

      expect(metricsResponse.body.length).toBe(metricsCount);
    });
  });
});