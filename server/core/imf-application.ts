/**
 * IMF Application - Service Composition and Orchestration
 * Main application class that orchestrates all services using proper patterns
 */

import { EventEmitter } from 'events';
import { serviceRegistry, ServiceRegistry } from './service-registry';
import { DomainRepositories } from '../repositories/domain.repositories';
import {
  IService,
  IStorageService,
  IPythonFrameworkService,
  ITestManagerService,
  ILoggerService,
  IConfigurationProvider,
  ServiceHealthStatus,
} from '../interfaces/service.interfaces';

// ============================================================================
// APPLICATION INTERFACES
// ============================================================================

interface ApplicationConfig {
  environment: 'development' | 'test' | 'staging' | 'production';
  port: number;
  logLevel: string;
  enablePythonFramework: boolean;
  enableTestManager: boolean;
  healthCheckInterval: number;
}

interface ApplicationStatus {
  running: boolean;
  startTime: Date;
  uptime: number;
  services: Record<string, ServiceHealthStatus>;
  environment: string;
  version: string;
}

// ============================================================================
// MAIN IMF APPLICATION CLASS
// ============================================================================

/**
 * Main IMF Application - Orchestrates all services and components
 */
export class IMFApplication extends EventEmitter {
  private registry: ServiceRegistry;
  private repositories?: DomainRepositories;
  private startTime?: Date;
  private healthCheckTimer?: NodeJS.Timeout;
  private shutdownInProgress = false;

  // Service references (populated after initialization)
  private config?: IConfigurationProvider;
  private logger?: ILoggerService;
  private storage?: IStorageService;
  private pythonFramework?: IPythonFrameworkService;
  private testManager?: ITestManagerService;

  public readonly version = '2.0.0';

  constructor(registry: ServiceRegistry = serviceRegistry) {
    super();
    this.registry = registry;
    this.setMaxListeners(100);
    this.setupEventListeners();
  }

  /**
   * Initialize the IMF application
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Starting IMF Application v' + this.version);
      this.startTime = new Date();

      // Initialize service registry
      await this.registry.initialize();

      // Get service references
      await this.loadServiceReferences();

      // Initialize repositories
      await this.initializeRepositories();

      // Start health monitoring
      this.startHealthMonitoring();

      // Register graceful shutdown handlers
      this.registerShutdownHandlers();

      console.log('✅ IMF Application initialized successfully');
      this.emit('initialized');
    } catch (error) {
      console.error('❌ Failed to initialize IMF Application:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Shutdown the IMF application gracefully
   */
  async shutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      return;
    }

    this.shutdownInProgress = true;

    try {
      console.log('🛑 Shutting down IMF Application...');

      // Stop health monitoring
      if (this.healthCheckTimer) {
        clearInterval(this.healthCheckTimer);
        this.healthCheckTimer = undefined;
      }

      // Shutdown service registry (which shutdowns all services)
      await this.registry.shutdown();

      console.log('✅ IMF Application shutdown completed');
      this.emit('shutdown');
    } catch (error) {
      console.error('❌ Error during IMF Application shutdown:', error);
      this.emit('error', error);
    }
  }

  /**
   * Get application status
   */
  async getStatus(): Promise<ApplicationStatus> {
    const now = new Date();
    const serviceHealths = await this.registry.getHealthStatus();

    return {
      running: !!this.startTime && !this.shutdownInProgress,
      startTime: this.startTime || now,
      uptime: this.startTime ? now.getTime() - this.startTime.getTime() : 0,
      services: serviceHealths,
      environment: this.config?.get('NODE_ENV', 'unknown') || 'unknown',
      version: this.version,
    };
  }

  /**
   * Get application configuration
   */
  getConfiguration(): ApplicationConfig {
    return {
      environment: this.config?.get('NODE_ENV', 'development') || 'development',
      port: this.config?.get('PORT', 3000) || 3000,
      logLevel: this.config?.get('LOG_LEVEL', 'INFO') || 'INFO',
      enablePythonFramework: this.config?.get('PYTHON_FRAMEWORK_ENABLED', true) ?? true,
      enableTestManager: this.config?.get('TEST_MANAGER_ENABLED', true) ?? true,
      healthCheckInterval: 30000, // 30 seconds
    };
  }

  /**
   * Get service by name
   */
  async getService<T extends IService>(name: string): Promise<T> {
    return await this.registry.getService<T>(name);
  }

  /**
   * Check if service is available
   */
  hasService(name: string): boolean {
    return this.registry.hasService(name);
  }

  /**
   * Get repositories collection
   */
  getRepositories(): DomainRepositories {
    if (!this.repositories) {
      throw new Error('Repositories not initialized. Call initialize() first.');
    }
    return this.repositories;
  }

  /**
   * Perform health check on all services
   */
  async performHealthCheck(): Promise<Record<string, ServiceHealthStatus>> {
    return await this.registry.getHealthStatus();
  }

  /**
   * Get application metrics and statistics
   */
  async getApplicationMetrics(): Promise<{
    status: ApplicationStatus;
    systemStats: Awaited<ReturnType<DomainRepositories['getSystemStatistics']>>;
    serviceCount: number;
    healthyServices: number;
  }> {
    const [status, systemStats] = await Promise.all([
      this.getStatus(),
      this.repositories?.getSystemStatistics() ||
        Promise.resolve({
          problems: { total: 0, active: 0, resolved: 0, bySeverity: {}, byType: {} },
          totalMetrics: 0,
          totalLogs: 0,
          totalPlugins: 0,
        }),
    ]);

    const serviceHealths = Object.values(status.services);
    const healthyServices = serviceHealths.filter((h) => h.healthy).length;

    return {
      status,
      systemStats,
      serviceCount: serviceHealths.length,
      healthyServices,
    };
  }

  /**
   * Execute application-level operations
   */
  async executeOperation<T>(
    operation: (app: IMFApplication) => Promise<T>,
    operationName: string,
  ): Promise<T> {
    try {
      await this.logger?.log('DEBUG', 'imf-application', `Executing operation: ${operationName}`);

      const startTime = Date.now();
      const result = await operation(this);
      const duration = Date.now() - startTime;

      await this.logger?.log(
        'INFO',
        'imf-application',
        `Operation '${operationName}' completed in ${duration}ms`,
      );

      return result;
    } catch (error) {
      await this.logger?.log(
        'ERROR',
        'imf-application',
        `Operation '${operationName}' failed: ${error.message}`,
        { error: error.message },
      );
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private setupEventListeners(): void {
    this.registry.on('service:ready', (name, service) => {
      this.emit('service:ready', name, service);
    });

    this.registry.on('service:error', (name, error) => {
      this.emit('service:error', name, error);
    });

    this.registry.on('registry:initialized', () => {
      this.emit('services:ready');
    });
  }

  private async loadServiceReferences(): Promise<void> {
    // Load core service references
    this.config = await this.registry.getService<IConfigurationProvider>('config');
    this.logger = await this.registry.getService<ILoggerService>('logger');
    this.storage = await this.registry.getService<IStorageService>('storage');

    // Load optional services based on configuration
    const appConfig = this.getConfiguration();

    if (appConfig.enablePythonFramework) {
      try {
        this.pythonFramework =
          await this.registry.getService<IPythonFrameworkService>('pythonFramework');
      } catch (error) {
        await this.logger?.log(
          'WARN',
          'imf-application',
          `Python Framework service not available: ${error.message}`,
        );
      }
    }

    if (appConfig.enableTestManager) {
      try {
        this.testManager = await this.registry.getService<ITestManagerService>('testManager');
      } catch (error) {
        await this.logger?.log(
          'WARN',
          'imf-application',
          `Test Manager service not available: ${error.message}`,
        );
      }
    }
  }

  private async initializeRepositories(): Promise<void> {
    if (!this.storage) {
      throw new Error('Storage service is required for repositories');
    }

    const db = this.storage.getConnection();
    this.repositories = new DomainRepositories(db, this.logger);
    await this.repositories.initialize();

    await this.logger?.log('INFO', 'imf-application', 'Domain repositories initialized');
  }

  private startHealthMonitoring(): void {
    const config = this.getConfiguration();

    this.healthCheckTimer = setInterval(async () => {
      try {
        const healthStatus = await this.performHealthCheck();

        const unhealthyServices = Object.entries(healthStatus)
          .filter(([_, status]) => !status.healthy)
          .map(([name, _]) => name);

        if (unhealthyServices.length > 0) {
          await this.logger?.log(
            'WARN',
            'imf-application',
            `Unhealthy services detected: ${unhealthyServices.join(', ')}`,
          );
          this.emit('health:warning', unhealthyServices);
        }

        this.emit('health:check', healthStatus);
      } catch (error) {
        await this.logger?.log('ERROR', 'imf-application', `Health check failed: ${error.message}`);
        this.emit('health:error', error);
      }
    }, config.healthCheckInterval);
  }

  private registerShutdownHandlers(): void {
    // Graceful shutdown on SIGTERM
    process.on('SIGTERM', async () => {
      await this.logger?.log(
        'INFO',
        'imf-application',
        'Received SIGTERM, initiating graceful shutdown',
      );
      await this.shutdown();
      process.exit(0);
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      await this.logger?.log(
        'INFO',
        'imf-application',
        'Received SIGINT, initiating graceful shutdown',
      );
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      await this.logger?.log('ERROR', 'imf-application', `Uncaught exception: ${error.message}`, {
        error: error.message,
        stack: error.stack,
      });

      this.emit('error', error);
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      await this.logger?.log(
        'ERROR',
        'imf-application',
        `Unhandled rejection at: ${promise}, reason: ${reason}`,
      );

      this.emit('error', reason);
    });
  }
}

// ============================================================================
// EXPORT SINGLETON APPLICATION INSTANCE
// ============================================================================

export const imfApplication = new IMFApplication();
