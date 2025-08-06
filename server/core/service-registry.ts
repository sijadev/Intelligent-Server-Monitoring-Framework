/**
 * Service Registry and Composition Patterns
 * Manages service lifecycle and composition
 */

import { EventEmitter } from 'events';
import { container, DependencyContainer } from './dependency-container';
import { 
  IService, 
  IServiceFactory,
  ServiceHealthStatus,
  IStorageService,
  IPythonFrameworkService,
  ITestManagerService,
  ILoggerService,
  IConfigurationProvider
} from '../interfaces/service.interfaces';

// ============================================================================
// SERVICE REGISTRY
// ============================================================================

/**
 * Central service registry for the IMF system
 */
export class ServiceRegistry extends EventEmitter {
  private readonly container: DependencyContainer;
  private readonly serviceFactories = new Map<string, IServiceFactory>();
  private initializationPromise?: Promise<void>;
  private shutdownPromise?: Promise<void>;

  constructor(dependencyContainer: DependencyContainer = container) {
    super();
    this.container = dependencyContainer;
    this.setMaxListeners(100);

    // Listen to container events
    this.container.on('service:initialized', (name, service) => {
      this.emit('service:ready', name, service);
    });

    this.container.on('service:error', (name, error) => {
      this.emit('service:error', name, error);
    });
  }

  /**
   * Register core IMF services
   */
  async registerCoreServices(): Promise<void> {
    console.log('🔧 Registering core IMF services...');

    // Configuration Provider (from existing config)
    this.container.registerInstance('config', await this.createConfigProvider());

    // Logger Service
    this.container.register('logger', 
      () => this.createLoggerService(),
      { dependencies: ['config'] }
    );

    // Storage Service  
    this.container.register('storage',
      () => this.createStorageService(),
      { dependencies: ['config', 'logger'] }
    );

    // Python Framework Service
    this.container.register('pythonFramework',
      () => this.createPythonFrameworkService(),
      { dependencies: ['config', 'logger'] }
    );

    // Test Manager Service
    this.container.register('testManager',
      () => this.createTestManagerService(), 
      { dependencies: ['config', 'logger'] }
    );

    console.log('✅ Core services registered');
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  /**
   * Shutdown all services
   */
  async shutdown(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }

    this.shutdownPromise = this.performShutdown();
    return this.shutdownPromise;
  }

  /**
   * Get a service by name
   */
  async getService<T extends IService>(name: string): Promise<T> {
    return await this.container.resolve<T>(name);
  }

  /**
   * Check if service is registered
   */
  hasService(name: string): boolean {
    return this.container.has(name);
  }

  /**
   * Get all service health statuses
   */
  async getHealthStatus(): Promise<Record<string, ServiceHealthStatus>> {
    return await this.container.getHealthStatus();
  }

  /**
   * Get service names
   */
  getServiceNames(): string[] {
    return this.container.getServiceNames();
  }

  /**
   * Register a custom service
   */
  registerService<T extends IService>(
    name: string,
    factory: () => T | Promise<T>,
    dependencies: string[] = []
  ): void {
    this.container.register(name, factory, { dependencies });
    this.emit('service:registered', name);
  }

  /**
   * Register a service factory
   */
  registerFactory(name: string, factory: IServiceFactory): void {
    this.serviceFactories.set(name, factory);
    this.emit('factory:registered', name);
  }

  /**
   * Create service using factory
   */
  async createServiceFromFactory<T extends IService>(
    factoryName: string, 
    serviceName: string, 
    config?: any
  ): Promise<T> {
    const factory = this.serviceFactories.get(factoryName);
    if (!factory) {
      throw new Error(`Service factory '${factoryName}' not found`);
    }

    return await factory.createService<T>(serviceName, config);
  }

  // ============================================================================
  // PRIVATE IMPLEMENTATION
  // ============================================================================

  private async performInitialization(): Promise<void> {
    try {
      console.log('🚀 Initializing IMF service registry...');
      
      await this.registerCoreServices();
      await this.container.initializeAll();
      
      console.log('✅ IMF service registry initialized successfully');
      this.emit('registry:initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize service registry:', error);
      this.emit('registry:error', error);
      throw error;
    }
  }

  private async performShutdown(): Promise<void> {
    try {
      console.log('🛑 Shutting down IMF service registry...');
      
      await this.container.shutdownAll();
      
      // Cleanup factories
      for (const [name, factory] of this.serviceFactories) {
        if (typeof factory.destroyAll === 'function') {
          await factory.destroyAll();
        }
      }
      
      console.log('✅ IMF service registry shut down successfully');
      this.emit('registry:shutdown');
      
    } catch (error) {
      console.error('❌ Error during service registry shutdown:', error);
      this.emit('registry:error', error);
    }
  }

  // ============================================================================
  // SERVICE FACTORY METHODS
  // ============================================================================

  private async createConfigProvider(): Promise<IConfigurationProvider> {
    const { config, isDevelopment, isProduction, isTest } = await import('../config');
    
    return {
      get: <T = any>(key: string, defaultValue?: T): T => {
        return (config as any)[key] ?? defaultValue;
      },
      set: (key: string, value: any) => {
        (config as any)[key] = value;
      },
      has: (key: string) => {
        return (config as any)[key] !== undefined;
      },
      getSection: (section: string) => {
        // Return all config keys that start with section prefix
        const result: Record<string, any> = {};
        const prefix = section.toUpperCase() + '_';
        
        for (const [key, value] of Object.entries(config)) {
          if (key.startsWith(prefix)) {
            result[key.substring(prefix.length).toLowerCase()] = value;
          }
        }
        return result;
      },
      reload: async () => {
        // Configuration reload logic if needed
      },
      environment: config.NODE_ENV as any,
      isDevelopment,
      isProduction,
      isTest
    };
  }

  private async createLoggerService(): Promise<ILoggerService> {
    const { logAggregator } = await import('../services/log-aggregator');
    
    return {
      name: 'logger',
      version: '1.0.0',
      
      async initialize() {
        // LogAggregator is already initialized
      },
      
      async cleanup() {
        // Cleanup if needed
      },
      
      getHealthStatus(): ServiceHealthStatus {
        return {
          healthy: true,
          status: 'running',
          lastCheck: new Date(),
          details: { aggregatorActive: true }
        };
      },
      
      async log(level: string, source: string, message: string, metadata?: any) {
        await logAggregator.log(level as any, source, message, metadata);
      },
      
      async getRecentLogs(limit = 100, filter?) {
        // Implement if logAggregator has this method
        return [];
      },
      
      async captureLog(entry) {
        await this.log(entry.level, entry.source, entry.message, entry.metadata);
      }
    };
  }

  private async createStorageService(): Promise<IStorageService> {
    const { storage } = await import('../storage-init');
    
    return {
      name: 'storage',
      version: '1.0.0',
      
      async initialize() {
        if (typeof storage.initialize === 'function') {
          await storage.initialize();
        }
      },
      
      async cleanup() {
        // Implement cleanup if needed
      },
      
      getHealthStatus(): ServiceHealthStatus {
        const isConnected = typeof storage.isConnected === 'function' ? 
          storage.isConnected() : true;
          
        return {
          healthy: isConnected,
          status: isConnected ? 'running' : 'error',
          lastCheck: new Date(),
          details: { connected: isConnected }
        };
      },
      
      isConnected() {
        return typeof storage.isConnected === 'function' ? 
          storage.isConnected() : true;
      },
      
      getConnection() {
        return storage;
      },
      
      async beginTransaction() {
        // Implement transaction support
        throw new Error('Transactions not yet implemented');
      },
      
      async query(sql: string, params?: any[]) {
        if (typeof storage.query === 'function') {
          return await storage.query(sql, params);
        }
        throw new Error('Query method not available');
      }
    };
  }

  private async createPythonFrameworkService(): Promise<IPythonFrameworkService> {
    const { PythonFrameworkService } = await import('./python-framework.service');
    return new PythonFrameworkService();
  }

  private async createTestManagerService(): Promise<ITestManagerService> {
    const { TestManagerService } = await import('../services/test-manager.service');
    
    // Create a wrapper that implements the interface
    const testManager = new TestManagerService();
    
    return {
      name: 'test-manager',
      version: '1.0.0',
      
      async initialize() {
        await testManager.initialize();
      },
      
      async cleanup() {
        // Cleanup if needed
      },
      
      getHealthStatus(): ServiceHealthStatus {
        return {
          healthy: testManager.isInitialized,
          status: testManager.isInitialized ? 'running' : 'stopped',
          lastCheck: new Date(),
          details: { initialized: testManager.isInitialized }
        };
      },
      
      async runTest(testId: string, options?) {
        // Implement test running
        return {
          id: testId,
          name: `Test ${testId}`,
          status: 'pending' as const,
          duration: 0,
          startTime: new Date()
        };
      },
      
      async getTestResults(testId?) {
        // Implement test results retrieval
        return [];
      },
      
      async generateTestData(scenario: string, count = 10) {
        const result = await testManager.generateTestData(scenario, count);
        return {
          id: `test-data-${Date.now()}`,
          scenario,
          dataCount: count,
          generatedAt: new Date(),
          data: result || []
        };
      },
      
      async validateTestEnvironment() {
        return {
          valid: true,
          errors: [],
          warnings: [],
          checkedItems: ['test-workspace', 'dependencies']
        };
      },
      
      // EventEmitter methods
      on: testManager.on.bind(testManager),
      emit: testManager.emit.bind(testManager),
      removeListener: testManager.removeListener.bind(testManager),
      addListener: testManager.addListener.bind(testManager),
      off: testManager.off.bind(testManager),
      once: testManager.once.bind(testManager),
      removeAllListeners: testManager.removeAllListeners.bind(testManager),
      listeners: testManager.listeners.bind(testManager),
      listenerCount: testManager.listenerCount.bind(testManager),
      setMaxListeners: testManager.setMaxListeners.bind(testManager),
      getMaxListeners: testManager.getMaxListeners.bind(testManager),
      prependListener: testManager.prependListener.bind(testManager),
      prependOnceListener: testManager.prependOnceListener.bind(testManager),
      eventNames: testManager.eventNames.bind(testManager),
      rawListeners: testManager.rawListeners.bind(testManager)
    };
  }
}

// ============================================================================
// EXPORT SINGLETON REGISTRY
// ============================================================================

export const serviceRegistry = new ServiceRegistry();