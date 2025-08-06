/**
 * Patterns Integration Example
 * Demonstrates how to use all the new patterns and abstractions together
 */

import { imfApplication, IMFApplication } from './imf-application';
import { serviceRegistry } from './service-registry';
import { container } from './dependency-container';
import { 
  IService,
  IPythonFrameworkService,
  ITestManagerService,
  ServiceHealthStatus,
  DetectedProblem,
  MetricsData
} from '../interfaces/service.interfaces';
import { DomainRepositories } from '../repositories/domain.repositories';
import { BaseService, PeriodicService } from './base-service';

// ============================================================================
// EXAMPLE: CUSTOM SERVICE IMPLEMENTATION
// ============================================================================

/**
 * Example of creating a custom service using the base service pattern
 */
class MonitoringService extends PeriodicService {
  private repositories?: DomainRepositories;

  constructor() {
    super('monitoring', 15000); // Run every 15 seconds
  }

  protected async onDependenciesSet(): Promise<void> {
    // Access other services through dependency injection
    const app = this.dependencies.application as IMFApplication;
    this.repositories = app.getRepositories();
  }

  protected async onPeriodicServiceInitialize(): Promise<void> {
    await this.logger?.log('INFO', this.name, 'Monitoring service initialized');
  }

  protected async onPeriodicServiceCleanup(): Promise<void> {
    await this.logger?.log('INFO', this.name, 'Monitoring service cleaned up');
  }

  protected async performPeriodicTask(): Promise<void> {
    if (!this.repositories) return;

    // Example: Check for critical problems
    const problems = await this.repositories.problems.findBySeverity('CRITICAL');
    
    if (problems.length > 0) {
      await this.logger?.log('WARN', this.name,
        `Found ${problems.length} critical problems`,
        { problemIds: problems.map(p => p.id) }
      );
      
      this.safeEmit('critical:problems', problems);
    }

    // Example: Clean up old data
    const cleanupResults = await this.repositories.cleanup({
      metricsKeepDays: 30,
      logsKeepDays: 7
    });

    if (cleanupResults.metricsDeleted > 0 || cleanupResults.logsDeleted > 0) {
      await this.logger?.log('INFO', this.name,
        `Cleanup completed: ${cleanupResults.metricsDeleted} metrics, ${cleanupResults.logsDeleted} logs deleted`
      );
    }
  }
}

// ============================================================================
// EXAMPLE: SERVICE FACTORY PATTERN
// ============================================================================

/**
 * Example service factory for creating monitoring services
 */
class MonitoringServiceFactory {
  async createMonitoringService(name: string, config?: any): Promise<MonitoringService> {
    const service = new MonitoringService();
    
    // Register with dependency container
    container.register(name, () => service, {
      dependencies: ['application', 'logger']
    });
    
    return await container.resolve<MonitoringService>(name);
  }
}

// ============================================================================
// EXAMPLE: USAGE PATTERNS
// ============================================================================

/**
 * Example of how to use the new patterns in your application
 */
export class PatternsDemo {
  
  /**
   * Demonstrate dependency injection pattern
   */
  static async demonstrateDependencyInjection(): Promise<void> {
    console.log('🎯 Demonstrating Dependency Injection Pattern');
    
    // Register a custom service
    container.register('customService', () => {
      return {
        name: 'custom-service',
        version: '1.0.0',
        async initialize() { console.log('Custom service initialized'); },
        async cleanup() { console.log('Custom service cleaned up'); },
        getHealthStatus(): ServiceHealthStatus {
          return { healthy: true, status: 'running', lastCheck: new Date() };
        },
        customMethod() { return 'Hello from custom service!'; }
      };
    });

    // Resolve and use the service
    const customService = await container.resolve<IService & { customMethod(): string }>('customService');
    console.log('✅', customService.customMethod());
  }

  /**
   * Demonstrate repository pattern
   */
  static async demonstrateRepositoryPattern(): Promise<void> {
    console.log('🎯 Demonstrating Repository Pattern');
    
    // Initialize application to get repositories
    await imfApplication.initialize();
    const repositories = imfApplication.getRepositories();

    // Use repository for data access
    const recentProblems = await repositories.problems.findAll({
      limit: 5,
      orderBy: 'timestamp',
      orderDirection: 'DESC'
    });

    console.log('✅ Recent problems:', recentProblems.length);

    // Use repository for complex queries
    const problemStats = await repositories.problems.getStatistics();
    console.log('✅ Problem statistics:', problemStats);
  }

  /**
   * Demonstrate service composition pattern
   */
  static async demonstrateServiceComposition(): Promise<void> {
    console.log('🎯 Demonstrating Service Composition Pattern');
    
    await imfApplication.initialize();

    // Access composed services
    try {
      const pythonFramework = await imfApplication.getService<IPythonFrameworkService>('pythonFramework');
      const status = pythonFramework.getStatus();
      console.log('✅ Python framework status:', status.running ? 'Running' : 'Stopped');
    } catch (error) {
      console.log('⚠️ Python framework not available:', error.message);
    }

    try {
      const testManager = await imfApplication.getService<ITestManagerService>('testManager');
      const validation = await testManager.validateTestEnvironment();
      console.log('✅ Test environment valid:', validation.valid);
    } catch (error) {
      console.log('⚠️ Test manager not available:', error.message);
    }
  }

  /**
   * Demonstrate application orchestration
   */
  static async demonstrateApplicationOrchestration(): Promise<void> {
    console.log('🎯 Demonstrating Application Orchestration');
    
    await imfApplication.initialize();

    // Get application metrics
    const metrics = await imfApplication.getApplicationMetrics();
    console.log('✅ Application metrics:');
    console.log('  - Services:', metrics.serviceCount);
    console.log('  - Healthy services:', metrics.healthyServices);
    console.log('  - Total problems:', metrics.systemStats.problems.total);
    console.log('  - Active problems:', metrics.systemStats.problems.active);

    // Execute application operation
    const result = await imfApplication.executeOperation(async (app) => {
      const repositories = app.getRepositories();
      const latestMetrics = await repositories.metrics.getLatest();
      return latestMetrics ? 'Metrics available' : 'No metrics found';
    }, 'check-latest-metrics');

    console.log('✅ Operation result:', result);
  }

  /**
   * Demonstrate error handling patterns
   */
  static async demonstrateErrorHandling(): Promise<void> {
    console.log('🎯 Demonstrating Error Handling Patterns');
    
    try {
      // This will throw an error to demonstrate error handling
      await container.resolve('non-existent-service');
    } catch (error) {
      console.log('✅ Error handled properly:', error.message);
    }

    // Demonstrate service error handling
    const customService = new (class extends BaseService {
      constructor() {
        super('demo-service', '1.0.0');
      }
      
      protected async onInitialize(): Promise<void> {
        // Simulate initialization
      }
      
      protected async onCleanup(): Promise<void> {
        // Simulate cleanup
      }
      
      async riskyOperation(): Promise<string> {
        return await this.executeWithErrorHandling(async () => {
          if (Math.random() > 0.5) {
            throw new Error('Random error occurred');
          }
          return 'Operation successful';
        }, 'riskyOperation');
      }
    })();

    await customService.initialize();
    
    try {
      const result = await customService.riskyOperation();
      console.log('✅ Risky operation result:', result);
    } catch (error) {
      console.log('✅ Risky operation error handled:', error.message);
    }
  }

  /**
   * Run all pattern demonstrations
   */
  static async runAll(): Promise<void> {
    try {
      console.log('🚀 Running Pattern Demonstrations\n');
      
      await this.demonstrateDependencyInjection();
      console.log();
      
      await this.demonstrateRepositoryPattern();
      console.log();
      
      await this.demonstrateServiceComposition();
      console.log();
      
      await this.demonstrateApplicationOrchestration();
      console.log();
      
      await this.demonstrateErrorHandling();
      console.log();
      
      console.log('✅ All pattern demonstrations completed successfully!');
      
    } catch (error) {
      console.error('❌ Pattern demonstration failed:', error);
    } finally {
      // Clean shutdown
      await imfApplication.shutdown();
    }
  }
}

// ============================================================================
// INTEGRATION HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to create a fully configured IMF application
 */
export async function createIMFApplication(): Promise<IMFApplication> {
  // Initialize the application with all patterns
  await imfApplication.initialize();
  return imfApplication;
}

/**
 * Helper to register custom services with the application
 */
export function registerCustomService<T extends IService>(
  name: string,
  serviceFactory: () => T | Promise<T>,
  dependencies: string[] = []
): void {
  serviceRegistry.registerService(name, serviceFactory, dependencies);
}

/**
 * Helper to get a strongly typed service
 */
export async function getTypedService<T extends IService>(name: string): Promise<T> {
  return await imfApplication.getService<T>(name);
}

/**
 * Helper to execute operations with error handling and logging
 */
export async function executeWithPatterns<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  return await imfApplication.executeOperation(async () => {
    return await operation();
  }, operationName);
}

// Export the main application instance and patterns
export { 
  imfApplication,
  serviceRegistry, 
  container,
  MonitoringService,
  MonitoringServiceFactory
};