import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerRoutes } from '../routes'
import { setupTestEnvironment } from './test-setup'

describe('MCP API Endpoints', () => {
  const { getStorage } = setupTestEnvironment()
  let app: express.Express
  let server: any
  let storage: any

  beforeEach(async () => {
    storage = getStorage()
    app = express()
    app.use(express.json())
    server = await registerRoutes(app as any)
  })

  afterEach(() => {
    if (server) {
      server.close()
    }
  })

  describe('GET /api/mcp/servers', () => {
    it('should return empty array when no servers exist', async () => {
      const response = await request(app)
        .get('/api/mcp/servers')
        .expect(200)

      expect(response.body).toEqual([])
    })

    it('should return list of MCP servers', async () => {
      // First create a test server via API
      const now = new Date();
      const testServer = {
        serverId: 'test-server-1',
        name: 'Test MCP Server',
        host: 'localhost',
        port: 8000,
        protocol: 'http',
        status: 'running',
        discoveryMethod: 'manual',
        discoveredAt: now,
        lastSeen: now,
        capabilities: ['test'],
        metadata: {}
      }

      // Create server via API
      await request(app)
        .post('/api/mcp/servers')
        .send(testServer)
        .expect(200)

      // Then get the list
      const response = await request(app)
        .get('/api/mcp/servers')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        serverId: 'test-server-1',
        name: 'Test MCP Server',
        host: 'localhost',
        port: 8000,
        protocol: 'http',
        status: 'running'
      })
    })
  })

  describe('POST /api/mcp/servers', () => {
    it('should create a new MCP server', async () => {
      const now = new Date();
      const newServer = {
        serverId: 'test-server-2',
        name: 'New Test Server',
        host: '127.0.0.1',
        port: 9000,
        protocol: 'websocket',
        status: 'stopped',
        discoveryMethod: 'port_scan',
        discoveredAt: now,
        lastSeen: now,
        capabilities: ['test', 'demo'],
        metadata: { test: true }
      }

      const response = await request(app)
        .post('/api/mcp/servers')
        .send(newServer)
        .expect(200)

      expect(response.body).toMatchObject({
        serverId: 'test-server-2',
        name: 'New Test Server',
        host: '127.0.0.1',
        port: 9000,
        protocol: 'websocket'
      })
    })

    it('should return 400 for invalid server data', async () => {
      const invalidServer = {
        name: 'Invalid Server',
        // Missing required fields
      }

      await request(app)
        .post('/api/mcp/servers')
        .send(invalidServer)
        .expect(400)
    })
  })

  describe('GET /api/mcp/servers/:serverId', () => {
    it('should return a specific MCP server', async () => {
      const now = new Date();
      const testServer = {
        serverId: 'test-server-3',
        name: 'Specific Test Server',
        host: 'localhost',
        port: 8001,
        protocol: 'http',
        status: 'running',
        discoveryMethod: 'process_scan',
        capabilities: ['specific'],
        discoveredAt: now,
        lastSeen: now,
        metadata: {}
      }

      // Create server via API first
      await request(app)
        .post('/api/mcp/servers')
        .send(testServer)
        .expect(200)

      // Then get the specific server
      const response = await request(app)
        .get('/api/mcp/servers/test-server-3')
        .expect(200)

      expect(response.body).toMatchObject({
        serverId: 'test-server-3',
        name: 'Specific Test Server'
      })
    })

    it('should return 404 for non-existent server', async () => {
      await request(app)
        .get('/api/mcp/servers/non-existent')
        .expect(404)
    })
  })

  describe('PUT /api/mcp/servers/:serverId', () => {
    it('should update an existing MCP server', async () => {
      const now = new Date();
      const testServer = {
        serverId: 'test-server-4',
        name: 'Update Test Server',
        host: 'localhost',
        port: 8002,
        protocol: 'http',
        status: 'stopped',
        discoveryMethod: 'manual',
        capabilities: ['update'],
        discoveredAt: now,
        lastSeen: now,
        metadata: {}
      }

      // Create server via API first
      await request(app)
        .post('/api/mcp/servers')
        .send(testServer)
        .expect(200)

      const updates = {
        status: 'running',
        port: 8003
      }

      const response = await request(app)
        .put('/api/mcp/servers/test-server-4')
        .send(updates)
        .expect(200)

      expect(response.body).toMatchObject({
        serverId: 'test-server-4',
        status: 'running',
        port: 8003
      })
    })

    it('should return 404 for non-existent server', async () => {
      const updates = { status: 'running' }

      await request(app)
        .put('/api/mcp/servers/non-existent')
        .send(updates)
        .expect(404)
    })
  })

  describe('DELETE /api/mcp/servers/:serverId', () => {
    it('should delete an existing MCP server', async () => {
      const now = new Date();
      const testServer = {
        serverId: 'test-server-5',
        name: 'Delete Test Server',
        host: 'localhost',
        port: 8004,
        protocol: 'http',
        status: 'running',
        discoveryMethod: 'manual',
        capabilities: ['delete'],
        discoveredAt: now,
        lastSeen: now,
        metadata: {}
      }

      // Create server via API first
      await request(app)
        .post('/api/mcp/servers')
        .send(testServer)
        .expect(200)

      // Delete the server
      await request(app)
        .delete('/api/mcp/servers/test-server-5')
        .expect(200)

      // Verify server is deleted by trying to get it
      await request(app)
        .get('/api/mcp/servers/test-server-5')
        .expect(404)
    })

    it('should return 404 for non-existent server', async () => {
      await request(app)
        .delete('/api/mcp/servers/non-existent')
        .expect(404)
    })
  })

  describe('GET /api/mcp/servers/:serverId/metrics', () => {
    it('should return metrics for a server', async () => {
      const now = new Date();
      const testServer = {
        serverId: 'test-server-6',
        name: 'Metrics Test Server',
        host: 'localhost',
        port: 8005,
        protocol: 'http',
        status: 'running',
        discoveryMethod: 'manual',
        capabilities: ['metrics'],
        discoveredAt: now,
        lastSeen: now,
        metadata: {}
      }

      // Create server via API first
      await request(app)
        .post('/api/mcp/servers')
        .send(testServer)
        .expect(200)

      // Create test metrics via API
      const testMetrics = {
        serverId: 'test-server-6',
        timestamp: new Date(),
        status: 'running',
        responseTime: 150,
        requestCount: 42,
        errorCount: 0,
        metadata: {}
      }

      await request(app)
        .post('/api/mcp/metrics')
        .send(testMetrics)
        .expect(200)

      const response = await request(app)
        .get('/api/mcp/servers/test-server-6/metrics')
        .expect(200)

      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        serverId: 'test-server-6',
        responseTime: 150,
        requestCount: 42,
        errorCount: 0
      })
    })

    it('should return empty array for server with no metrics', async () => {
      const response = await request(app)
        .get('/api/mcp/servers/non-existent/metrics')
        .expect(200)

      expect(response.body).toEqual([])
    })
  })

  describe('POST /api/mcp/metrics', () => {
    it('should create new MCP server metrics', async () => {
      const newMetrics = {
        serverId: 'test-server-7',
        timestamp: new Date(),
        status: 'running',
        responseTime: 200,
        requestCount: 100,
        errorCount: 5,
        metadata: { cpu: 45, memory: 67 }
      }

      const response = await request(app)
        .post('/api/mcp/metrics')
        .send(newMetrics)
        .expect(200)

      expect(response.body).toMatchObject({
        serverId: 'test-server-7',
        responseTime: 200,
        requestCount: 100,
        errorCount: 5
      })
    })

    it('should return 400 for invalid metrics data', async () => {
      const invalidMetrics = {
        serverId: 'test-server-8',
        // Missing required fields
      }

      await request(app)
        .post('/api/mcp/metrics')
        .send(invalidMetrics)
        .expect(400)
    })
  })

  describe('GET /api/mcp/dashboard', () => {
    it('should return MCP dashboard data', async () => {
      const now = new Date();
      // Create test servers and metrics
      const servers = [
        {
          serverId: 'dash-server-1',
          name: 'Dashboard Server 1',
          host: 'localhost',
          port: 8010,
          protocol: 'http',
          status: 'running',
          discoveryMethod: 'process_scan',
          capabilities: ['dash1'],
          discoveredAt: now,
          lastSeen: now,
          metadata: {}
        },
        {
          serverId: 'dash-server-2',
          name: 'Dashboard Server 2',
          host: 'localhost',
          port: 8011,
          protocol: 'websocket',
          status: 'stopped',
          discoveryMethod: 'port_scan',
          capabilities: ['dash2'],
          discoveredAt: now,
          lastSeen: now,
          metadata: {}
        }
      ]

      for (const server of servers) {
        await request(app)
          .post('/api/mcp/servers')
          .send(server)
          .expect(200)
      }

      const response = await request(app)
        .get('/api/mcp/dashboard')
        .expect(200)

      // Check that our test servers are included in the totals
      expect(response.body.totalServers).toBeGreaterThanOrEqual(2)
      expect(response.body.runningServers).toBeGreaterThanOrEqual(1)
      expect(response.body.stoppedServers).toBeGreaterThanOrEqual(1)
      expect(response.body.serversByProtocol).toHaveProperty('http')
      expect(response.body.serversByProtocol).toHaveProperty('websocket')
      expect(response.body.serversByDiscoveryMethod).toHaveProperty('process_scan')
      expect(response.body.serversByDiscoveryMethod).toHaveProperty('port_scan')
    })
  })
})