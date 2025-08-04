import { describe, it, expect, vi } from 'vitest';
import { setupTestEnvironment, testHelpers } from './test-setup';

describe('Test Isolation Example', () => {
  // Setup isolated test environment
  const { getStorage, isUsingRealDatabase } = setupTestEnvironment({
    useRealDatabase: false, // Set to true to test with real database
    isolateEachTest: true,
    cleanupAfterTests: true,
  });

  describe('Memory Storage Isolation', () => {
    it('should start with empty storage', async () => {
      const storage = getStorage();
      const plugins = await storage.getPlugins();
      expect(plugins).toHaveLength(0);
    });

    it('should isolate data between tests', async () => {
      const storage = getStorage();
      
      // Create test plugin
      const testPlugin = testHelpers.createTestPlugin();
      await storage.createOrUpdatePlugin(testPlugin);
      
      const plugins = await storage.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe(testPlugin.name);
    });

    it('should start fresh again (isolation test)', async () => {
      const storage = getStorage();
      const plugins = await storage.getPlugins();
      
      // Should be empty due to isolation
      expect(plugins).toHaveLength(0);
    });
  });

  describe('Multiple Entity Isolation', () => {
    it('should handle multiple entities independently', async () => {
      const storage = getStorage();
      
      // Create test data
      const testPlugin = testHelpers.createTestPlugin();
      const testMetrics = testHelpers.createTestMetrics();
      const testProblem = testHelpers.createTestProblem();
      
      // Store data
      await storage.createOrUpdatePlugin(testPlugin);
      await storage.createMetrics(testMetrics);
      await storage.createProblem(testProblem);
      
      // Verify isolation
      const plugins = await storage.getPlugins();
      const metrics = await storage.getMetricsHistory();
      const problems = await storage.getProblems();
      
      expect(plugins).toHaveLength(1);
      expect(metrics).toHaveLength(1);
      expect(problems).toHaveLength(1);
      
      expect(plugins[0].name).toBe(testPlugin.name);
      expect(metrics[0].cpuUsage).toBe(testMetrics.cpuUsage);
      expect(problems[0].type).toBe(testProblem.type);
    });
  });

  describe('Database Detection', () => {
    it('should report storage type correctly', () => {
      const usingRealDb = isUsingRealDatabase();
      
      if (process.env.TEST_DATABASE_URL) {
        expect(usingRealDb).toBe(true);
      } else {
        expect(usingRealDb).toBe(false);
      }
    });
  });

  describe('Test Helpers', () => {
    it('should generate unique test data', () => {
      const user1 = testHelpers.createTestUser();
      const user2 = testHelpers.createTestUser();
      
      expect(user1.email).not.toBe(user2.email);
      expect(user1.name).not.toBe(user2.name);
    });

    it('should create valid plugin data', () => {
      const plugin = testHelpers.createTestPlugin();
      
      expect(plugin.name).toMatch(/^test-plugin-\d+-\w+$/);
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.type).toBe('collector');
      expect(plugin.status).toBe('running');
      expect(plugin.config).toEqual({ testMode: true });
    });

    it('should create realistic metrics data', () => {
      const metrics = testHelpers.createTestMetrics();
      
      expect(metrics.timestamp).toBeInstanceOf(Date);
      expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
      expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
      expect(typeof metrics.networkConnections).toBe('number');
      expect(typeof metrics.processes).toBe('number');
    });
  });

  describe('Async Operations Isolation', () => {
    it('should handle concurrent operations safely', async () => {
      const storage = getStorage();
      
      // Create multiple plugins concurrently
      const plugins = Array.from({ length: 5 }, () => testHelpers.createTestPlugin());
      
      await Promise.all(
        plugins.map(plugin => storage.createOrUpdatePlugin(plugin))
      );
      
      const storedPlugins = await storage.getPlugins();
      expect(storedPlugins).toHaveLength(5);
      
      // Verify all plugins were stored correctly
      const storedNames = storedPlugins.map(p => p.name).sort();
      const expectedNames = plugins.map(p => p.name).sort();
      expect(storedNames).toEqual(expectedNames);
    });
    
    it('should handle mixed operations', async () => {
      const storage = getStorage();
      
      // Mix different types of operations
      const operations = [
        storage.createOrUpdatePlugin(testHelpers.createTestPlugin()),
        storage.createMetrics(testHelpers.createTestMetrics()),
        storage.createProblem(testHelpers.createTestProblem()),
        storage.createLogEntry(testHelpers.createTestLogEntry()),
      ];
      
      await Promise.all(operations);
      
      // Verify all data was stored
      const [plugins, metrics, problems, logs] = await Promise.all([
        storage.getPlugins(),
        storage.getMetricsHistory(),
        storage.getProblems(),
        storage.getLogEntries(),
      ]);
      
      expect(plugins).toHaveLength(1);
      expect(metrics).toHaveLength(1);
      expect(problems).toHaveLength(1);
      expect(logs).toHaveLength(1);
    });
  });
});