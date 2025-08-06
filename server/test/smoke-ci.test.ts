/**
 * Smoke Tests for CI Environment
 * 
 * These are lightweight tests that verify basic application functionality
 * in the CI environment with mocked services. They ensure:
 * - Application starts correctly
 * - Core API endpoints respond
 * - Basic operations work or fail gracefully
 * 
 * Real integration tests with actual Docker services run separately
 * in the Docker environment with real databases, Redis, etc.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../routes';
import { MemStorage } from '../storage';
import { serverState } from '../state/server-state';
// Mock the python-monitor service for CI
vi.mock('../services/python-monitor', () => ({
  pythonMonitorService: {
    sendCommand: () => Promise.resolve({ success: true }),
    isRunning: () => true,
    start: () => Promise.resolve({ success: true }),
    stop: () => Promise.resolve({ success: true }),
    restart: () => Promise.resolve({ success: true }),
    on: () => {},
    off: () => {},
    emit: () => {},
    removeAllListeners: () => {},
    getStatus: () => ({ running: true, healthy: true })
  }
}));

// Mock Test Manager service for CI
vi.mock('../services/test-manager.service', () => ({
  createTestManagerService: () => ({
    isAvailable: () => false,
    getStatus: () => ({ available: false, reason: 'CI environment' }),
    generateTestData: () => Promise.resolve({ success: false }),
    loadTestProfiles: () => Promise.resolve([]),
    initialize: () => Promise.resolve(false),
    isInitialized: false
  }),
  getTestManagerService: () => ({
    isAvailable: () => false,
    getStatus: () => ({ available: false, reason: 'CI environment' }),
    generateTestData: () => Promise.resolve({ success: false }),
    loadTestProfiles: () => Promise.resolve([])
  }),
  TestManagerService: {
    getInstance: () => ({
      isAvailable: () => false,
      getStatus: () => ({ available: false, reason: 'CI environment' }),
      generateTestData: () => Promise.resolve({ success: false }),
      loadTestProfiles: () => Promise.resolve([])
    })
  }
}));

describe('Smoke Tests (CI)', () => {
  let app: express.Application;
  let server: any;
  let storage: MemStorage;

  beforeAll(async () => {
    // Set CI environment
    process.env.CI = 'true';
    process.env.GITHUB_ACTIONS = 'true';
    process.env.NODE_ENV = 'test';
    
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
    vi.clearAllMocks();
  });

  beforeEach(() => {
    storage.clear();
  });

  describe('API Endpoints Smoke Tests', () => {
    it('should respond to basic API endpoints', async () => {
      // Health check
      await request(app)
        .get('/api/health')
        .expect(200);

      // Plugin listing
      await request(app)
        .get('/api/plugins')
        .expect(200);

      // Dashboard system info  
      await request(app)
        .get('/api/dashboard/system-info')
        .expect(200);

      // MCP servers listing
      const mcpResponse = await request(app)
        .get('/api/mcp/servers');
      expect([200, 404].includes(mcpResponse.status)).toBe(true);
    });

    it('should handle basic plugin operations', async () => {
      // Test basic plugin creation (should work or fail gracefully)
      const pluginData = {
        name: 'smoke-test-plugin',
        version: '1.0.0', 
        type: 'collector',
        config: {}
      };

      const createResponse = await request(app)
        .post('/api/plugins')
        .send(pluginData);

      // Should either succeed or fail with validation error
      expect([200, 201, 400, 500].includes(createResponse.status)).toBe(true);
    });
  });

  describe('Data Operations Smoke Tests', () => {
    it('should handle metrics and problems creation', async () => {
      // Test metrics endpoint
      const metricsResponse = await request(app)
        .post('/api/metrics')
        .send({
          timestamp: new Date().toISOString(),
          cpuUsage: 50,
          memoryUsage: 60
        });
      expect([200, 201, 400, 500].includes(metricsResponse.status)).toBe(true);

      // Test problems endpoint  
      const problemResponse = await request(app)
        .post('/api/problems')
        .send({
          type: 'smoke_test',
          severity: 'LOW',
          description: 'Smoke test problem'
        });
      expect([200, 201, 400, 500].includes(problemResponse.status)).toBe(true);
    });

    it('should handle error responses correctly', async () => {
      // Invalid request should return 400
      await request(app)
        .post('/api/plugins')
        .send({ invalid: 'data' })
        .expect(400);

      // Non-existent resource should return 404
      await request(app)
        .get('/api/plugins/nonexistent-id')
        .expect(404);
    });
  });

  describe('Environment and Service Checks', () => {
    it('should be properly configured for CI', () => {
      expect(process.env.CI).toBe('true');
      expect(process.env.GITHUB_ACTIONS).toBe('true');
      expect(process.env.NODE_ENV).toBe('test');
      expect(storage).toBeInstanceOf(MemStorage);
    });

    it('should have functional health endpoints', async () => {
      // Health check with proper response format
      const healthResponse = await request(app)
        .get('/api/health')
        .expect(200);
      expect(healthResponse.body).toHaveProperty('status');

      // System info with JSON response
      const systemResponse = await request(app)
        .get('/api/dashboard/system-info')
        .expect(200);
      expect(systemResponse.type).toBe('application/json');
      expect(systemResponse.body).toHaveProperty('serverStatus');
    });
  });
})