import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { MemStorage } from '../storage';
import type { DatabaseStorage } from '../db-storage';

// Global test configuration
export interface TestConfig {
  useRealDatabase?: boolean;
  isolateEachTest?: boolean;
  cleanupAfterTests?: boolean;
}

// Test database configuration - use same as development by default
const TEST_DB_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://simonjanke@localhost:5432/imf_database';

// Global test state
let testStorage: MemStorage | DatabaseStorage;
let originalEnv: Record<string, string | undefined>;

/**
 * Setup test environment with proper isolation
 */
export function setupTestEnvironment(testConfig: TestConfig = {}) {
  const {
    useRealDatabase = false,
    isolateEachTest = true,
    cleanupAfterTests = true,
  } = testConfig;

  beforeAll(async () => {
    // Store original environment
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
    };

    // Set test environment
    process.env.NODE_ENV = 'test';
    
    if (useRealDatabase) {
      process.env.DATABASE_URL = TEST_DB_URL;
      
      try {
        // Dynamic import to avoid issues when database is not available
        const { DatabaseStorage } = await import('../db-storage');
        testStorage = new DatabaseStorage(TEST_DB_URL);
        // DatabaseStorage doesn't need initialize() method
        console.log('✅ Test database initialized');
      } catch (error) {
        console.warn('⚠️  Test database initialization failed, falling back to MemStorage:', error);
        testStorage = new MemStorage();
      }
    } else {
      testStorage = new MemStorage();
    }
  });

  afterAll(async () => {
    if (cleanupAfterTests) {
      // Cleanup test data
      if (testStorage && 'sql' in testStorage) { // Check if it's DatabaseStorage
        try {
          console.log('🧹 afterAll: Cleaning up test database...');
          await cleanupTestDatabase();
          console.log('✅ Test database cleaned up after all tests');
        } catch (error) {
          console.warn('⚠️  Test database cleanup failed:', error);
        }
      }
    }

    // Restore original environment
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  });

  if (isolateEachTest) {
    beforeEach(async () => {
      console.log('🔄 beforeEach: Cleaning test data...');
      // Clear test data before each test
      if (testStorage instanceof MemStorage) {
        testStorage.clear();
        console.log('🧹 MemStorage cleared');
      } else if (testStorage && 'sql' in testStorage) { // Check if it's DatabaseStorage
        console.log('🗄️  DatabaseStorage detected, running cleanup...');
        await cleanupTestDatabase();
      } else {
        console.log('⚠️  Unknown storage type:', typeof testStorage, testStorage);
      }
    });
  }

  return {
    getStorage: () => testStorage,
    isUsingRealDatabase: () => testStorage && 'sql' in testStorage,
  };
}

/**
 * Clean up test database tables
 */
async function cleanupTestDatabase() {
  if (!testStorage || !('sql' in testStorage)) return;

  try {
    const storage = testStorage as any;
    // Clear all test data in reverse dependency order
    await storage.sql`DELETE FROM mcp_server_metrics`;
    await storage.sql`DELETE FROM mcp_servers`;
    await storage.sql`DELETE FROM deployment_metrics`;
    await storage.sql`DELETE FROM deployments`;
    await storage.sql`DELETE FROM ai_interventions`;
    await storage.sql`DELETE FROM ai_models`;
    await storage.sql`DELETE FROM code_analysis_runs`;
    await storage.sql`DELETE FROM code_issues`;
    await storage.sql`DELETE FROM log_entries`;
    await storage.sql`DELETE FROM metrics`;
    await storage.sql`DELETE FROM problems`;
    await storage.sql`DELETE FROM plugins`;
    await storage.sql`DELETE FROM framework_config`;
    await storage.sql`DELETE FROM users`;
    console.log('🧹 Test database tables cleared');
  } catch (error) {
    console.warn('Warning: Could not clean test database:', error);
  }
}

/**
 * Create isolated test database instance
 */
export async function createTestDatabase(): Promise<any> {
  const uniqueDbName = `imf_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const testUrl = TEST_DB_URL.replace(/\/[^\/]+$/, `/${uniqueDbName}`);
  
  try {
    const { DatabaseStorage } = await import('../db-storage');
    const storage = new DatabaseStorage(testUrl);
    
    // Create database
    const adminStorage = new DatabaseStorage(TEST_DB_URL.replace(/\/[^\/]+$/, '/postgres'));
    await adminStorage.query(`CREATE DATABASE "${uniqueDbName}"`);
    await adminStorage.close();
    
    // Initialize schema
    await storage.initialize();
    
    return storage;
  } catch (error) {
    console.warn(`Failed to create isolated test database ${uniqueDbName}:`, error);
    throw error;
  }
}

/**
 * Destroy isolated test database
 */
export async function destroyTestDatabase(storage: any, dbName: string) {
  try {
    await storage.close();
    
    const { DatabaseStorage } = await import('../db-storage');
    const adminStorage = new DatabaseStorage(TEST_DB_URL.replace(/\/[^\/]+$/, '/postgres'));
    await adminStorage.query(`DROP DATABASE IF EXISTS "${dbName}"`);
    await adminStorage.close();
  } catch (error) {
    console.warn(`Failed to destroy test database ${dbName}:`, error);
  }
}

/**
 * Mock external services for testing
 */
export function mockExternalServices() {
  // Mock Python framework
  const mockPythonService = {
    sendCommand: async (command: string) => ({ success: true, command }),
    isRunning: () => true,
    start: async () => ({ success: true }),
    stop: async () => ({ success: true }),
    restart: async () => ({ success: true }),
  };

  return {
    pythonService: mockPythonService,
  };
}

/**
 * Wait for async operations to complete
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate test data
 */
export const testHelpers = {
  createTestUser: () => ({
    email: `test-${Date.now()}-${Math.random().toString(36).substr(2, 5)}@example.com`,
    name: `Test User ${Math.random().toString(36).substr(2, 8)}`,
  }),
  
  createTestPlugin: () => ({
    name: `test-plugin-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    version: '1.0.0',
    type: 'collector' as const,
    status: 'running' as const,
    config: { testMode: true },
  }),
  
  createTestMetrics: () => ({
    timestamp: new Date(),
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    diskUsage: Math.random() * 100,
    loadAverage: Math.random() * 4,
    networkConnections: Math.floor(Math.random() * 1000),
    processes: Math.floor(Math.random() * 500),
  }),
  
  createTestProblem: () => ({
    timestamp: new Date(),
    type: 'test_issue',
    severity: 'MEDIUM' as const,
    description: `Test problem ${Date.now()}`,
    source: 'test-suite',
    metadata: { testCase: true },
  }),
  
  createTestLogEntry: () => ({
    timestamp: new Date(),
    level: 'INFO' as const,
    message: `Test log message ${Date.now()}`,
    source: 'test-suite',
    metadata: { testRun: true },
  }),
};