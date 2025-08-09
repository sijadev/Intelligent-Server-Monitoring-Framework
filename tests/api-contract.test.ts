import { describe, test, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

let app: express.Express;

beforeAll(async () => {
  // Ensure Test Manager initializes in test environment
  process.env.TEST_MANAGER_ENABLE_IN_TEST = 'true';

  app = express();
  app.use(express.json());

  // Mock storage-init to avoid DB dependency
  const { MemStorage } = await import('../server/storage');
  const mem = new MemStorage();
  const mockModule = { storage: mem };
  const modPath = '../server/storage-init';
  // @ts-ignore - dynamic mock injection
  const { vi } = await import('vitest');
  vi.doMock(modPath, () => mockModule);

  // Stub python monitor to keep tests fast and avoid process spawn
  vi.doMock('../server/services/python-monitor', () => ({
    pythonMonitorService: {
      start: async () => {},
      stop: async () => {},
      restart: async () => {},
      getStatus: () => ({ running: false, hasProcess: false, apiAvailable: false }),
      getFrameworkData: async () => ({ status: { running: false } }),
      sendCommand: async () => {},
      on: () => {},
      off: () => {},
      emit: () => {},
    },
  }));

  // Register routes after mock
  const { registerRoutes } = await import('../server/routes');
  await registerRoutes(app);
});

describe('API contract (router-level)', () => {
  const endpoints: Array<{
    method: 'get' | 'post' | 'put' | 'patch' | 'delete';
    path: string;
    ok: number[];
    body?: any;
  }> = [
    { method: 'get', path: '/api/health/live', ok: [200] },
    { method: 'get', path: '/api/health', ok: [200, 503] },
    { method: 'get', path: '/api/health/detailed', ok: [200, 503] },
    { method: 'get', path: '/api/dashboard', ok: [200] },
    { method: 'get', path: '/api/plugins', ok: [200] },
    { method: 'get', path: '/api/problems', ok: [200] },
    { method: 'get', path: '/api/metrics', ok: [200] },
    { method: 'get', path: '/api/mcp/servers', ok: [200] },
    { method: 'get', path: '/api/logs', ok: [200] },
    { method: 'get', path: '/api/config', ok: [200, 404] },
    { method: 'get', path: '/api/framework/status', ok: [200, 503] },
    { method: 'get', path: '/api/framework/config', ok: [200, 404] },
    { method: 'get', path: '/api/ai/stats', ok: [200, 404, 503] },
    { method: 'get', path: '/api/deployments', ok: [200] },
    { method: 'get', path: '/api/code-analysis/runs', ok: [200] },
  ];

  for (const ep of endpoints) {
    test(`${ep.method.toUpperCase()} ${ep.path}`, async () => {
      const res = await request(app)
        [ep.method](ep.path)
        .send(ep.body || {});
      expect(ep.ok).toContain(res.status);
      if (res.status !== 204) {
        const ct = res.headers['content-type'] || '';
        if (typeof ct === 'string' && ct.includes('application/json')) {
          expect(() => JSON.parse(res.text)).not.toThrow();
        }
      }
    });
  }
});

describe('API mutations (light POST/PUT/PATCH flows)', () => {
  test('POST /api/logs creates a log entry', async () => {
    const payload = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'contract-test-log',
      source: 'contract-test',
      metadata: { a: 1 },
    };
    const res = await request(app).post('/api/logs').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.message).toBe('contract-test-log');
  });

  test('POST /api/metrics creates a metrics record', async () => {
    const payload = {
      timestamp: new Date().toISOString(),
      cpuUsage: 12.3,
      memoryUsage: 45.6,
      metadata: { node: 'A' },
    };
    const res = await request(app).post('/api/metrics').send(payload);
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty('id');
  });

  test('POST /api/problems then PATCH resolve', async () => {
    const create = await request(app).post('/api/problems').send({
      type: 'test_problem',
      severity: 'LOW',
      description: 'example',
      timestamp: new Date().toISOString(),
      metadata: {},
    });
    expect(create.status).toBe(201);
    const id = create.body.id as string;
    const resolve = await request(app).patch(`/api/problems/${id}/resolve`).send();
    expect(resolve.status).toBe(200);
    expect(resolve.body.resolved).toBe(true);
  });

  test('POST /api/plugins then PUT update', async () => {
    const create = await request(app)
      .post('/api/plugins')
      .send({
        name: 'example-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'stopped',
        config: { k: 'v' },
      });
    expect(create.status).toBe(200);
    const id = create.body.id as string;
    // Controller sets status to running on create; now stop it
    const update = await request(app).put(`/api/plugins/${id}`).send({ status: 'stopped' });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe('stopped');
  });

  test('POST /api/mcp/servers then PUT update', async () => {
    const now = new Date().toISOString();
    const create = await request(app).post('/api/mcp/servers').send({
      serverId: 'srv-1',
      name: 'Server One',
      host: 'localhost',
      port: 3000,
      protocol: 'http',
      status: 'running',
      discoveryMethod: 'manual',
      discoveredAt: now,
      lastSeen: now,
      capabilities: [],
      metadata: {},
    });
    expect(create.status).toBe(200);
    const update = await request(app).put('/api/mcp/servers/srv-1').send({ status: 'stopped' });
    expect(update.status).toBe(200);
    expect(update.body.status).toBe('stopped');
  });

  test('POST /api/deployments then POST metrics', async () => {
    const create = await request(app).post('/api/deployments').send({
      type: 'manual_fix',
      strategy: 'direct_deployment',
      status: 'in_progress',
      initiatedBy: 'user_manual',
      description: 'deploy test',
      startTime: new Date().toISOString(),
      filesChanged: [],
      testResults: {},
    });
    expect(create.status).toBe(201);
    const id = create.body.id as string;
    const metrics = await request(app).post(`/api/deployments/${id}/metrics`).send({
      timestamp: new Date().toISOString(),
      errorRate: 5,
      responseTime: 120,
      availability: 99,
      cpuUsage: 20,
      memoryUsage: 30,
      requestCount: 10,
      metadata: {},
    });
    expect(metrics.status).toBe(201);
    expect(metrics.body).toHaveProperty('deploymentId', id);
  });

  test('POST /api/ai/interventions creates intervention', async () => {
    const res = await request(app).post('/api/ai/interventions').send({
      problemType: 'network',
      issueDescription: 'latency',
      solutionApplied: 'restart-service',
      confidence: 80,
      riskScore: 10,
      outcome: 'success',
      timestamp: new Date().toISOString(),
      metadata: {},
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  test('POST /api/ai/models then PATCH update', async () => {
    const create = await request(app).post('/api/ai/models').send({
      name: 'demo-model',
      version: '1.0.0',
      problemType: 'generic',
      modelPath: './models/demo.bin',
      lastTrained: new Date().toISOString(),
      accuracy: 90,
      metadata: {},
    });
    expect(create.status).toBe(201);
    const id = create.body.id as string;
    const update = await request(app).patch(`/api/ai/models/${id}`).send({ isActive: false });
    expect(update.status).toBe(200);
    expect(update.body.isActive).toBe(false);
  });

  test('POST /api/framework/config updates config (light)', async () => {
    const res = await request(app).post('/api/framework/config').send({
      serverType: 'development',
      monitoringInterval: 15,
      learningEnabled: true,
      autoRemediation: true,
      logLevel: 'INFO',
      dataDir: './data',
      codeAnalysisEnabled: false,
      sourceDirectories: [],
      autoFixEnabled: false,
      confidenceThreshold: 70,
      backupDirectory: './backups',
    });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('config');
  });
});
