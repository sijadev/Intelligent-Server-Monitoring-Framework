import { EventEmitter } from 'events';
import type { IStorage } from '../storage';
import type { PythonMonitorService } from './python-monitor';
import { logAggregator } from './log-aggregator';
import { serverState } from '../state/server-state';

// Service Interface Definitions
export interface IStorageService {
  initialize(): Promise<void>;
  isConnected(): boolean;
  getHealthStatus(): { healthy: boolean; details: any };
}

export interface IPythonService {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): any;
  sendCommand(command: string, data?: any): Promise<void>;
}

export interface ILogService {
  captureLog(level: string, source: string, message: string, metadata?: any): void;
  getRecentLogs(limit?: number): any[];
}

// Service Dependencies
export interface ServiceDependencies {
  storage: IStorage;
  pythonMonitor: PythonMonitorService;
  logAggregator: typeof logAggregator;
}

// Service Container with Dependency Injection
class ServiceContainer extends EventEmitter {
  private services: Map<string, any> = new Map();
  private initialized: Set<string> = new Set();
  private dependencies: ServiceDependencies | null = null;

  // Register services
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
    this.emit('service:registered', name, service);
  }

  // Get service instance
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found. Make sure to register it first.`);
    }
    return service;
  }

  // Initialize all services
  async initialize(dependencies: ServiceDependencies): Promise<void> {
    this.dependencies = dependencies;
    
    console.log('🔧 Initializing service container...');
    
    // Register core services
    this.register('storage', dependencies.storage);
    this.register('pythonMonitor', dependencies.pythonMonitor);
    this.register('logAggregator', dependencies.logAggregator);
    this.register('serverState', serverState);

    // Initialize services in dependency order
    const initOrder = ['storage', 'logAggregator', 'pythonMonitor'];
    
    for (const serviceName of initOrder) {
      try {
        await this.initializeService(serviceName);
      } catch (error) {
        console.error(`❌ Failed to initialize service '${serviceName}':`, error);
        this.emit('service:error', serviceName, error);
        throw error;
      }
    }

    console.log('✅ All services initialized successfully');
    this.emit('container:ready');
  }

  private async initializeService(name: string): Promise<void> {
    if (this.initialized.has(name)) {
      return;
    }

    console.log(`  - Initializing ${name}...`);
    const service = this.get(name);

    // Service-specific initialization
    switch (name) {
      case 'storage':
        if (typeof service.initialize === 'function') {
          await service.initialize();
        }
        serverState.setDatabaseStatus({ status: 'connected', lastConnection: new Date() });
        break;

      case 'pythonMonitor':
        // Python service initialization is handled by routes.ts
        break;

      case 'logAggregator':
        // Log aggregator is ready immediately
        break;
    }

    this.initialized.add(name);
    this.emit('service:initialized', name);
  }

  // Health check for all services
  async healthCheck(): Promise<{ healthy: boolean; services: Record<string, any> }> {
    const results: Record<string, any> = {};
    let overallHealthy = true;

    for (const [name, service] of this.services) {
      try {
        if (typeof service.getHealthStatus === 'function') {
          results[name] = service.getHealthStatus();
        } else if (typeof service.isConnected === 'function') {
          results[name] = { healthy: service.isConnected(), status: 'operational' };
        } else {
          results[name] = { healthy: true, status: 'unknown' };
        }

        if (!results[name].healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        results[name] = { healthy: false, error: error.message };
        overallHealthy = false;
      }
    }

    return { healthy: overallHealthy, services: results };
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down services...');
    
    const shutdownOrder = ['pythonMonitor', 'storage']; // Reverse dependency order
    
    for (const serviceName of shutdownOrder) {
      try {
        const service = this.services.get(serviceName);
        if (service && typeof service.stop === 'function') {
          console.log(`  - Stopping ${serviceName}...`);
          await service.stop();
        }
      } catch (error) {
        console.error(`❌ Error stopping service '${serviceName}':`, error);
      }
    }

    await serverState.shutdown();
    console.log('✅ All services stopped');
    this.emit('container:shutdown');
  }

  // Get service status
  getServiceStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const name of this.services.keys()) {
      status[name] = this.initialized.has(name);
    }
    return status;
  }

  // Check if container is ready
  isReady(): boolean {
    return this.services.size > 0 && this.initialized.size === this.services.size;
  }
}

// Singleton instance
export const serviceContainer = new ServiceContainer();

// Helper functions
export function getService<T>(name: string): T {
  return serviceContainer.get<T>(name);
}

export function isServiceReady(): boolean {
  return serviceContainer.isReady();
}