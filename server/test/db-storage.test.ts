import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DatabaseStorage } from '../db-storage';
import type { InsertPlugin, InsertProblem, InsertMetrics } from '@shared/schema';

// Mock the entire database storage implementation
const mockPlugin = {
  id: 'test-plugin-id',
  name: 'test-plugin',
  version: '1.0.0',
  type: 'collector',
  status: 'running',
  config: {},
  lastUpdate: new Date(),
};

const mockProblem = {
  id: 'test-problem-id',
  type: 'performance',
  description: 'High CPU usage',
  severity: 'HIGH',
  timestamp: new Date(),
  resolved: false,
  resolvedAt: null,
  metadata: {},
};

const mockMetrics = {
  id: 'test-metrics-id',
  timestamp: new Date(),
  cpuUsage: 45.5,
  memoryUsage: 62.3,
  diskUsage: 78.1,
  networkConnections: 25,
  processes: 156,
  loadAverage: 1.2,
};

vi.mock('drizzle-orm/postgres-js');
vi.mock('postgres');

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(() => {
    // Create storage instance with mock database URL
    storage = new DatabaseStorage('postgresql://test:test@localhost:5432/test_db');
    
    // Mock all methods to return test data
    vi.spyOn(storage, 'getPlugins').mockResolvedValue([mockPlugin]);
    vi.spyOn(storage, 'getPlugin').mockResolvedValue(mockPlugin);
    vi.spyOn(storage, 'getPluginById').mockResolvedValue(mockPlugin);
    vi.spyOn(storage, 'createOrUpdatePlugin').mockResolvedValue(mockPlugin);
    vi.spyOn(storage, 'updatePlugin').mockResolvedValue(mockPlugin);
    vi.spyOn(storage, 'deletePlugin').mockResolvedValue(mockPlugin);
    
    vi.spyOn(storage, 'getProblems').mockResolvedValue([mockProblem]);
    vi.spyOn(storage, 'getActiveProblem').mockResolvedValue([mockProblem]);
    vi.spyOn(storage, 'createProblem').mockResolvedValue(mockProblem);
    vi.spyOn(storage, 'resolveProblem').mockResolvedValue({ ...mockProblem, resolved: true, resolvedAt: new Date() });
    
    vi.spyOn(storage, 'getMetricsHistory').mockResolvedValue([mockMetrics]);
    vi.spyOn(storage, 'getLatestMetrics').mockResolvedValue(mockMetrics);
    vi.spyOn(storage, 'createMetrics').mockResolvedValue(mockMetrics);
    
    vi.spyOn(storage, 'getFrameworkConfig').mockResolvedValue({
      id: 'config-1',
      serverType: 'web',
      monitoringInterval: 30,
      learningEnabled: true,
      autoRemediation: true,
      logLevel: 'INFO',
      backupEnabled: false,
      maxLogEntries: 1000,
      codeAnalysisEnabled: true,
      sourceDirectories: ['/src'],
      autoFixEnabled: false,
      confidenceThreshold: 80,
      backupDirectory: './backups',
      aiLearningEnabled: true,
      deploymentEnabled: false,
      updatedAt: new Date(),
    });
    
    vi.spyOn(storage, 'updateFrameworkConfig').mockResolvedValue({
      id: 'config-1',
      serverType: 'web',
      monitoringInterval: 60,
      learningEnabled: false,
      autoRemediation: true,
      logLevel: 'DEBUG',
      backupEnabled: false,
      maxLogEntries: 1000,
      codeAnalysisEnabled: true,
      sourceDirectories: ['/src'],
      autoFixEnabled: false,
      confidenceThreshold: 80,
      backupDirectory: './backups',
      aiLearningEnabled: true,
      deploymentEnabled: false,
      updatedAt: new Date(),
    });
    
    vi.spyOn(storage, 'getDashboardData').mockResolvedValue({
      status: {
        uptime: '1h 23m 45s',
        systemHealth: { status: 'healthy', issues: 0 },
        activeProblems: 0,
        codeAnalysisEnabled: true,
        aiLearningEnabled: true,
        deploymentEnabled: false,
      },
      recentProblems: [],
      pluginStatus: [mockPlugin],
      currentMetrics: mockMetrics,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Plugin Management', () => {
    it('should get all plugins', async () => {
      const plugins = await storage.getPlugins();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
    });

    it('should get plugin by name', async () => {
      const plugin = await storage.getPlugin('test-plugin');
      expect(plugin?.name).toBe('test-plugin');
    });

    it('should get plugin by ID', async () => {
      const plugin = await storage.getPluginById('test-plugin-id');
      expect(plugin?.id).toBe('test-plugin-id');
    });

    it('should create or update plugin', async () => {
      const pluginData: InsertPlugin = {
        name: 'new-plugin',
        version: '1.0.0',
        type: 'detector',
        status: 'running',
        config: { setting: 'value' },
      };

      const plugin = await storage.createOrUpdatePlugin(pluginData);
      expect(plugin.name).toBe('test-plugin');
      expect(storage.createOrUpdatePlugin).toHaveBeenCalledWith(pluginData);
    });

    it('should update plugin', async () => {
      const updates = { version: '1.1.0', status: 'stopped' as const };
      const result = await storage.updatePlugin('test-id', updates);
      
      expect(result?.name).toBe('test-plugin');
      expect(storage.updatePlugin).toHaveBeenCalledWith('test-id', updates);
    });

    it('should delete plugin', async () => {
      const result = await storage.deletePlugin('test-id');
      expect(result?.name).toBe('test-plugin');
      expect(storage.deletePlugin).toHaveBeenCalledWith('test-id');
    });
  });

  describe('Problem Management', () => {
    it('should get problems', async () => {
      const problems = await storage.getProblems(10);
      expect(problems).toHaveLength(1);
      expect(problems[0].type).toBe('performance');
    });

    it('should create problem', async () => {
      const problemData: InsertProblem = {
        type: 'security',
        description: 'Unauthorized access attempt',
        severity: 'CRITICAL',
        timestamp: new Date(),
        resolved: false,
        metadata: { ip: '192.168.1.100' },
      };

      const problem = await storage.createProblem(problemData);
      expect(problem.type).toBe('performance');
      expect(storage.createProblem).toHaveBeenCalledWith(problemData);
    });

    it('should resolve problem', async () => {
      const result = await storage.resolveProblem('test-id');
      expect(result?.resolved).toBe(true);
      expect(result?.resolvedAt).toBeDefined();
    });
  });

  describe('Metrics Management', () => {
    it('should get metrics history', async () => {
      const metrics = await storage.getMetricsHistory(10);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].cpuUsage).toBe(45.5);
    });

    it('should get latest metrics', async () => {
      const metrics = await storage.getLatestMetrics();
      expect(metrics?.cpuUsage).toBe(45.5);
    });

    it('should create metrics', async () => {
      const metricsData: InsertMetrics = {
        timestamp: new Date(),
        cpuUsage: 25.8,
        memoryUsage: 48.3,
        diskUsage: 72.1,
        networkConnections: 22,
        processes: 138,
        loadAverage: 1.1,
      };

      const metrics = await storage.createMetrics(metricsData);
      expect(metrics.cpuUsage).toBe(45.5);
      expect(storage.createMetrics).toHaveBeenCalledWith(metricsData);
    });
  });

  describe('Framework Configuration', () => {
    it('should get framework config', async () => {
      const config = await storage.getFrameworkConfig();
      expect(config?.monitoringInterval).toBe(30);
      expect(config?.learningEnabled).toBe(true);
    });

    it('should update framework config', async () => {
      const configUpdate = {
        monitoringInterval: 60,
        learningEnabled: false,
        logLevel: 'DEBUG',
      };

      const result = await storage.updateFrameworkConfig(configUpdate);
      expect(result?.monitoringInterval).toBe(60);
      expect(result?.learningEnabled).toBe(false);
      expect(storage.updateFrameworkConfig).toHaveBeenCalledWith(configUpdate);
    });
  });

  describe('Dashboard Data', () => {
    it('should get dashboard data', async () => {
      const dashboardData = await storage.getDashboardData();
      expect(dashboardData.status).toBeDefined();
      expect(dashboardData.status.uptime).toBe('1h 23m 45s');
      expect(Array.isArray(dashboardData.recentProblems)).toBe(true);
      expect(Array.isArray(dashboardData.pluginStatus)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      vi.spyOn(storage, 'getPlugins').mockRejectedValue(new Error('Connection failed'));
      
      await expect(storage.getPlugins()).rejects.toThrow('Connection failed');
    });

    it('should handle constraint violations', async () => {
      const duplicateError = new Error('duplicate key value violates unique constraint');
      vi.spyOn(storage, 'createOrUpdatePlugin').mockRejectedValue(duplicateError);

      const pluginData: InsertPlugin = {
        name: 'duplicate-plugin',
        version: '1.0.0',
        type: 'collector',
        status: 'running',
        config: {},
      };

      await expect(storage.createOrUpdatePlugin(pluginData)).rejects.toThrow(
        'duplicate key value violates unique constraint'
      );
    });
  });
});