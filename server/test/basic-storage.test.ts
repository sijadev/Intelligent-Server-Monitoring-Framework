import { describe, it, expect, beforeEach } from 'vitest';
import { MemStorage } from '../storage';
import type { InsertPlugin } from '@shared/schema';

describe('MemStorage', () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  describe('Plugin Management', () => {
    it('should create a plugin', async () => {
      const pluginData: InsertPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        config: { test: true }
      };

      const plugin = await storage.createOrUpdatePlugin(pluginData);
      expect(plugin.id).toBeDefined();
      expect(plugin.name).toBe('test-plugin');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.type).toBe('collector');
      expect(plugin.status).toBe('running');
    });

    it('should get all plugins', async () => {
      const plugins = await storage.getPlugins();
      expect(Array.isArray(plugins)).toBe(true);
    });

    it('should get plugin by name', async () => {
      const pluginData: InsertPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        config: {}
      };

      await storage.createOrUpdatePlugin(pluginData);
      const plugin = await storage.getPlugin('test-plugin');
      expect(plugin?.name).toBe('test-plugin');
    });

    it('should update a plugin', async () => {
      const pluginData: InsertPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        config: {}
      };

      const created = await storage.createOrUpdatePlugin(pluginData);
      const updated = await storage.updatePlugin(created.id, { status: 'stopped' });
      
      expect(updated?.status).toBe('stopped');
    });

    it('should delete a plugin', async () => {
      const pluginData: InsertPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        config: {}
      };

      const created = await storage.createOrUpdatePlugin(pluginData);
      const deleted = await storage.deletePlugin(created.id);
      
      expect(deleted).toBeDefined();
    });
  });

  describe('Dashboard Data', () => {
    it('should get dashboard data', async () => {
      const data = await storage.getDashboardData();
      expect(data).toBeDefined();
      expect(data.status).toBeDefined();
      expect(typeof data.status.uptime).toBe('string');
      expect(Array.isArray(data.recentProblems)).toBe(true);
      expect(Array.isArray(data.pluginStatus)).toBe(true);
    });
  });

  describe('Problems Management', () => {
    it('should get problems', async () => {
      const problems = await storage.getProblems();
      expect(Array.isArray(problems)).toBe(true);
    });

    it('should get active problems', async () => {
      const problems = await storage.getActiveProblem();
      expect(Array.isArray(problems)).toBe(true);
    });
  });

  describe('Metrics Management', () => {
    it('should get metrics history', async () => {
      const metrics = await storage.getMetricsHistory();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should get latest metrics', async () => {
      const metrics = await storage.getLatestMetrics();
      // Should return undefined for empty storage
      expect(metrics).toBeUndefined();
    });
  });

  describe('Configuration Management', () => {
    it('should get framework config', async () => {
      const config = await storage.getFrameworkConfig();
      expect(config).toBeDefined();
      if (config) {
        expect(typeof config.monitoringInterval).toBe('number');
        expect(typeof config.learningEnabled).toBe('boolean');
      }
    });
  });
});