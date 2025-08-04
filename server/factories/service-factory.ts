import { config } from '../config';
import { DatabaseStorage } from '../db-storage';
import { MemStorage } from '../storage';
import { PythonMonitorService } from '../services/python-monitor';
import { logAggregator } from '../services/log-aggregator';
import type { IStorage } from '../storage';

// Service Factory Interface
export interface IServiceFactory {
  createStorageService(): Promise<IStorage>;
  createPythonMonitorService(): PythonMonitorService;
  createLogAggregatorService(): typeof logAggregator;
}

// Configuration for service creation
export interface ServiceFactoryConfig {
  storage: {
    type: 'database' | 'memory';
    databaseUrl?: string;
  };
  python: {
    enabled: boolean;
    scriptPath?: string;
    monitoringInterval?: number;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
  };
}

// Main Service Factory
export class ServiceFactory implements IServiceFactory {
  private config: ServiceFactoryConfig;

  constructor(factoryConfig?: Partial<ServiceFactoryConfig>) {
    this.config = this.buildConfig(factoryConfig);
  }

  private buildConfig(partial?: Partial<ServiceFactoryConfig>): ServiceFactoryConfig {
    return {
      storage: {
        type: config.DATABASE_URL ? 'database' : 'memory',
        databaseUrl: config.DATABASE_URL,
        ...partial?.storage,
      },
      python: {
        enabled: config.PYTHON_FRAMEWORK_ENABLED,
        monitoringInterval: config.MONITORING_INTERVAL,
        ...partial?.python,
      },
      logging: {
        level: config.LOG_LEVEL,
        enableConsole: true,
        enableFile: false,
        ...partial?.logging,
      },
    };
  }

  async createStorageService(): Promise<IStorage> {
    console.log(`🏭 Creating storage service (${this.config.storage.type})...`);

    if (this.config.storage.type === 'database' && this.config.storage.databaseUrl) {
      try {
        const storage = new DatabaseStorage(this.config.storage.databaseUrl);
        await this.validateStorageConnection(storage);
        console.log('✅ Database storage service created');
        return storage;
      } catch (error) {
        console.warn('⚠️ Database storage failed, falling back to memory storage:', error);
        return new MemStorage();
      }
    } else {
      console.log('📝 Using memory storage service');
      return new MemStorage();
    }
  }

  createPythonMonitorService(): PythonMonitorService {
    console.log(`🏭 Creating Python monitor service (enabled: ${this.config.python.enabled})...`);
    
    const service = new PythonMonitorService();
    
    // Configure service based on factory config
    if (this.config.python.scriptPath) {
      // Set custom script path if provided
      (service as any).scriptPath = this.config.python.scriptPath;
    }

    console.log('✅ Python monitor service created');
    return service;
  }

  createLogAggregatorService(): typeof logAggregator {
    console.log('🏭 Creating log aggregator service...');
    console.log('✅ Log aggregator service created');
    return logAggregator;
  }

  private async validateStorageConnection(storage: IStorage): Promise<void> {
    try {
      // Test basic storage operations
      const testData = await storage.getDashboardData();
      console.log('🔍 Storage connection validated');
    } catch (error) {
      throw new Error(`Storage validation failed: ${(error as Error).message}`);
    }
  }

  // Factory method for creating all services at once
  async createAllServices(): Promise<{
    storage: IStorage;
    pythonMonitor: PythonMonitorService;
    logAggregator: typeof logAggregator;
  }> {
    console.log('🏭 Creating all services...');

    const [storage, pythonMonitor, logAggregator] = await Promise.all([
      this.createStorageService(),
      Promise.resolve(this.createPythonMonitorService()),
      Promise.resolve(this.createLogAggregatorService()),
    ]);

    console.log('✅ All services created successfully');

    return {
      storage,
      pythonMonitor,
      logAggregator,
    };
  }

  // Get current configuration
  getConfig(): ServiceFactoryConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<ServiceFactoryConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Specialized factories for different environments

// Development Factory
export class DevelopmentServiceFactory extends ServiceFactory {
  constructor() {
    super({
      storage: {
        type: 'database', // Always use database in development
      },
      python: {
        enabled: true,
      },
      logging: {
        level: 'DEBUG',
        enableConsole: true,
        enableFile: true,
      },
    });
  }
}

// Production Factory
export class ProductionServiceFactory extends ServiceFactory {
  constructor() {
    super({
      storage: {
        type: 'database', // Always use database in production
      },
      python: {
        enabled: true,
      },
      logging: {
        level: 'INFO',
        enableConsole: false,
        enableFile: true,
      },
    });
  }
}

// Test Factory
export class TestServiceFactory extends ServiceFactory {
  constructor() {
    super({
      storage: {
        type: 'memory', // Use memory storage for tests
      },
      python: {
        enabled: false, // Disable Python framework in tests
      },
      logging: {
        level: 'ERROR',
        enableConsole: false,
        enableFile: false,
      },
    });
  }
}

// Factory selector based on environment
export function createServiceFactory(): ServiceFactory {
  switch (config.NODE_ENV) {
    case 'development':
      return new DevelopmentServiceFactory();
    case 'production':
      return new ProductionServiceFactory();
    case 'test':
      return new TestServiceFactory();
    default:
      return new ServiceFactory();
  }
}