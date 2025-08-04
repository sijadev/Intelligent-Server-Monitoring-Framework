import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logAggregator } from '../services/log-aggregator';
import { serverState } from '../state/server-state';
import type { LogEntry } from '@shared/schema';

describe('Services', () => {
  describe('LogAggregator', () => {
    let consoleSpy: any;

    beforeEach(() => {
      // Spy on console methods
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        info: vi.spyOn(console, 'info').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log HTTP requests', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      logAggregator.logRequest('GET', '/api/plugins', 200, 150, 'test-agent');
      
      const logEntry = await logPromise;
      expect(logEntry.source).toBe('http');
      expect(logEntry.message).toContain('GET /api/plugins');
      expect(logEntry.level).toBe('INFO');
    });

    it('should log WebSocket events', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      logAggregator.logWebSocket('client_connected', 'client-123', { info: 'test' });
      
      const logEntry = await logPromise;
      expect(logEntry.source).toBe('websocket');
      expect(logEntry.message).toContain('client_connected');
      expect(logEntry.level).toBe('INFO');
    });

    it('should log Python framework events', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      logAggregator.logPythonFramework('plugin_loaded', 'Plugin loaded successfully', { plugin: 'test-plugin' });
      
      const logEntry = await logPromise;
      expect(logEntry.source).toBe('python-framework');
      expect(logEntry.message).toBe('Plugin loaded successfully');
      expect(logEntry.level).toBe('INFO');
    });

    it('should log database operations', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      logAggregator.logDatabase('SELECT', 'plugins', true, 25);
      
      const logEntry = await logPromise;
      expect(logEntry.source).toBe('database');
      expect(logEntry.message).toContain('SELECT on plugins');
      expect(logEntry.level).toBe('INFO');
    });

    it('should log plugin operations', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      logAggregator.logPlugin('test-plugin', 'start', true, 'Plugin started successfully');
      
      const logEntry = await logPromise;
      expect(logEntry.source).toBe('plugin');
      expect(logEntry.message).toContain('Plugin started successfully');
      expect(logEntry.level).toBe('INFO');
    });

    it('should emit log events when using log method', async () => {
      const logPromise = new Promise<LogEntry>((resolve) => {
        logAggregator.once('log', (logEntry: LogEntry) => {
          resolve(logEntry);
        });
      });

      await logAggregator.log('INFO', 'test', 'Test message', { key: 'value' });
      
      const logEntry = await logPromise;
      expect(logEntry.message).toBe('Test message');
      expect(logEntry.source).toBe('test');
      expect(logEntry.level).toBe('INFO');
    });
  });

  describe('ServerState', () => {
    beforeEach(() => {
      serverState.reset();
    });

    afterEach(() => {
      serverState.reset();
    });

    it('should initialize with default state', () => {
      const state = serverState.getState();
      
      expect(state.status).toBe('starting');
      expect(state.startTime).toBeNull();
      expect(state.pythonFramework.status).toBe('stopped');
      expect(state.database.status).toBe('connecting');
      expect(state.metrics.requestCount).toBe(0);
      expect(state.metrics.errorCount).toBe(0);
    });

    it('should update server status', () => {
      serverState.setServerStatus('running');
      
      const state = serverState.getState();
      expect(state.status).toBe('running');
      expect(state.startTime).toBeDefined();
    });

    it('should update Python framework status', () => {
      serverState.setPythonFrameworkStatus({
        status: 'running',
        pid: 12345,
        lastHeartbeat: new Date(),
      });

      const state = serverState.getState();
      expect(state.pythonFramework.status).toBe('running');
      expect(state.pythonFramework.pid).toBe(12345);
      expect(state.pythonFramework.lastHeartbeat).toBeDefined();
    });

    it('should update database status', () => {
      serverState.setDatabaseStatus({
        status: 'connected',
        lastConnection: new Date(),
      });

      const state = serverState.getState();
      expect(state.database.status).toBe('connected');
      expect(state.database.lastConnection).toBeDefined();
    });

    it('should update metrics', () => {
      const testMetrics = {
        id: 'test-metrics',
        timestamp: new Date(),
        cpuUsage: 45.5,
        memoryUsage: 62.3,
        diskUsage: 78.1,
        networkConnections: 25,
        processes: 156,
        loadAverage: 1.2,
      };

      serverState.updateMetrics({
        requestCount: 100,
        errorCount: 5,
        lastMetrics: testMetrics,
      });

      const state = serverState.getState();
      expect(state.metrics.requestCount).toBe(100);
      expect(state.metrics.errorCount).toBe(5);
      expect(state.metrics.lastMetrics).toEqual(testMetrics);
    });

    it('should increment request count', () => {
      serverState.incrementRequestCount();
      serverState.incrementRequestCount();

      const state = serverState.getState();
      expect(state.metrics.requestCount).toBe(2);
    });

    it('should increment error count', () => {
      serverState.incrementErrorCount();
      serverState.incrementErrorCount();
      serverState.incrementErrorCount();

      const state = serverState.getState();
      expect(state.metrics.errorCount).toBe(3);
    });

    it('should update active connections', () => {
      serverState.updateActiveConnections('websocket', 5);
      serverState.updateActiveConnections('http', 10);

      const state = serverState.getState();
      expect(state.activeConnections.websocket).toBe(5);
      expect(state.activeConnections.http).toBe(10);
    });

    it('should emit events on state changes', async () => {
      const serverStatusPromise = new Promise((resolve) => {
        serverState.once('server:status', (newStatus, oldStatus) => {
          expect(oldStatus).toBe('starting');
          expect(newStatus).toBe('running');
          resolve(true);
        });
      });

      const stateChangePromise = new Promise((resolve) => {
        serverState.once('state:change', (event) => {
          expect(event.type).toBe('server');
          expect(event.timestamp).toBeDefined();
          resolve(true);
        });
      });

      serverState.setServerStatus('running');
      
      await Promise.all([serverStatusPromise, stateChangePromise]);
    });

    it('should check if system is healthy', () => {
      // Initially not healthy (database connecting)
      expect(serverState.isHealthy()).toBe(false);

      // Set server running and database connected
      serverState.setServerStatus('running');
      serverState.setDatabaseStatus({ status: 'connected' });
      serverState.setPythonFrameworkStatus({ status: 'running' });

      expect(serverState.isHealthy()).toBe(true);
    });

    it('should calculate uptime correctly', async () => {
      serverState.setServerStatus('running');
      
      // Wait a small amount of time
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const uptime = serverState.getUptime();
      expect(uptime).toBeGreaterThan(0);
    });

    it('should handle graceful shutdown', async () => {
      serverState.setServerStatus('running');
      
      const shutdownPromise = serverState.shutdown();
      
      expect(serverState.getServerStatus()).toBe('stopping');
      
      await shutdownPromise;
      
      expect(serverState.getServerStatus()).toBe('stopped');
    });

    it('should emit shutdown event', async () => {
      const shutdownPromise = new Promise((resolve) => {
        serverState.once('server:shutdown', () => {
          resolve(true);
        });
      });

      await serverState.shutdown();
      await shutdownPromise;
    });

    it('should reset state', () => {
      // Make some changes
      serverState.setServerStatus('running');
      serverState.incrementRequestCount();
      serverState.incrementErrorCount();

      // Reset
      serverState.reset();

      // Check that state is back to initial
      const state = serverState.getState();
      expect(state.status).toBe('starting');
      expect(state.metrics.requestCount).toBe(0);
      expect(state.metrics.errorCount).toBe(0);
    });

    it('should emit reset event', async () => {
      const resetPromise = new Promise((resolve) => {
        serverState.once('state:reset', () => {
          resolve(true);
        });
      });

      serverState.reset();
      await resetPromise;
    });
  });
});