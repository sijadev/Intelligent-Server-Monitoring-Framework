/**
 * Dependency Injection Container
 * Implements proper IoC patterns for service management
 */

import { EventEmitter } from 'events';
import { IDependencyContainer, DIOptions, IService } from '../interfaces/service.interfaces';

/**
 * Service registration information
 */
interface ServiceRegistration<T = any> {
  name: string;
  factory: () => T | Promise<T>;
  instance?: T;
  options: Required<DIOptions>;
  dependents: Set<string>; // Services that depend on this service
  dependencies: Set<string>; // Services this service depends on
  initialized: boolean;
}

/**
 * Dependency resolution context for circular dependency detection
 */
interface ResolutionContext {
  resolving: Set<string>;
  resolved: Map<string, any>;
}

/**
 * Professional-grade Dependency Injection Container
 */
export class DependencyContainer extends EventEmitter implements IDependencyContainer {
  private services = new Map<string, ServiceRegistration>();
  private initializationOrder: string[] = [];
  private readonly maxResolutionDepth = 50;

  constructor() {
    super();
    this.setMaxListeners(100); // Allow many service listeners
  }

  /**
   * Register a service with the container
   */
  register<T>(
    name: string, 
    factory: () => T | Promise<T>, 
    options: DIOptions = {}
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const registration: ServiceRegistration<T> = {
      name,
      factory,
      options: {
        singleton: options.singleton ?? true,
        lazy: options.lazy ?? true,
        dependencies: options.dependencies ?? [],
      },
      dependents: new Set(),
      dependencies: new Set(options.dependencies),
      initialized: false,
    };

    this.services.set(name, registration);
    
    // Update dependency graph
    this.updateDependencyGraph(name, registration.options.dependencies);
    
    this.emit('service:registered', name, registration);
    
    // If not lazy, initialize immediately
    if (!registration.options.lazy) {
      setImmediate(() => this.resolve<T>(name));
    }
  }

  /**
   * Register a singleton service (convenience method)
   */
  registerSingleton<T>(name: string, factory: () => T | Promise<T>): void {
    this.register(name, factory, { singleton: true, lazy: true });
  }

  /**
   * Register a service instance directly
   */
  registerInstance<T>(name: string, instance: T): void {
    const registration: ServiceRegistration<T> = {
      name,
      factory: () => instance,
      instance,
      options: {
        singleton: true,
        lazy: false,
        dependencies: [],
      },
      dependents: new Set(),
      dependencies: new Set(),
      initialized: true,
    };

    this.services.set(name, registration);
    this.emit('service:registered', name, registration);
  }

  /**
   * Resolve a service from the container
   */
  async resolve<T>(name: string): Promise<T> {
    const context: ResolutionContext = {
      resolving: new Set(),
      resolved: new Map(),
    };
    
    return this.resolveWithContext<T>(name, context);
  }

  /**
   * Resolve service with circular dependency detection
   */
  private async resolveWithContext<T>(
    name: string, 
    context: ResolutionContext,
    depth = 0
  ): Promise<T> {
    if (depth > this.maxResolutionDepth) {
      throw new Error(`Maximum resolution depth exceeded for service '${name}'. Possible circular dependency.`);
    }

    // Check if already resolved in this context
    if (context.resolved.has(name)) {
      return context.resolved.get(name) as T;
    }

    // Check for circular dependencies
    if (context.resolving.has(name)) {
      const cycle = Array.from(context.resolving).concat(name).join(' -> ');
      throw new Error(`Circular dependency detected: ${cycle}`);
    }

    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return existing singleton instance if available
    if (registration.options.singleton && registration.instance) {
      context.resolved.set(name, registration.instance);
      return registration.instance as T;
    }

    context.resolving.add(name);

    try {
      // Resolve dependencies first
      const dependencies: Record<string, any> = {};
      for (const depName of registration.dependencies) {
        dependencies[depName] = await this.resolveWithContext(depName, context, depth + 1);
      }

      // Create the service instance
      this.emit('service:resolving', name);
      
      let instance = await registration.factory();
      
      // If it's a service, inject dependencies
      if (this.isService(instance)) {
        await this.injectDependencies(instance, dependencies);
      }

      // Store singleton instance
      if (registration.options.singleton) {
        registration.instance = instance;
      }

      // Initialize if it's a service
      if (this.isService(instance) && !registration.initialized) {
        await instance.initialize();
        registration.initialized = true;
        this.emit('service:initialized', name, instance);
      }

      context.resolved.set(name, instance);
      this.emit('service:resolved', name, instance);

      return instance as T;

    } finally {
      context.resolving.delete(name);
    }
  }

  /**
   * Check if service exists in container
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all registered service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get service registration info
   */
  getServiceInfo(name: string): ServiceRegistration | undefined {
    return this.services.get(name);
  }

  /**
   * Initialize all services in dependency order
   */
  async initializeAll(): Promise<void> {
    const order = this.calculateInitializationOrder();
    
    console.log('🔧 Initializing services in dependency order:', order.join(' -> '));

    for (const serviceName of order) {
      try {
        await this.resolve(serviceName);
        console.log(`  ✅ ${serviceName} initialized`);
      } catch (error) {
        console.error(`  ❌ Failed to initialize ${serviceName}:`, error);
        throw error;
      }
    }

    this.emit('container:initialized');
  }

  /**
   * Shutdown all services in reverse dependency order
   */
  async shutdownAll(): Promise<void> {
    const order = this.calculateInitializationOrder().reverse();
    
    console.log('🛑 Shutting down services:', order.join(' -> '));

    for (const serviceName of order) {
      try {
        const registration = this.services.get(serviceName);
        if (registration?.instance && this.isService(registration.instance)) {
          await registration.instance.cleanup();
          console.log(`  ✅ ${serviceName} shut down`);
        }
      } catch (error) {
        console.error(`  ❌ Error shutting down ${serviceName}:`, error);
      }
    }

    this.emit('container:shutdown');
  }

  /**
   * Clear all registrations
   */
  clear(): void {
    this.services.clear();
    this.initializationOrder = [];
    this.emit('container:cleared');
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};

    for (const [name, registration] of this.services) {
      try {
        if (registration.instance && this.isService(registration.instance)) {
          status[name] = registration.instance.getHealthStatus();
        } else {
          status[name] = { 
            healthy: true, 
            status: registration.instance ? 'running' : 'not_initialized',
            lastCheck: new Date()
          };
        }
      } catch (error) {
        status[name] = { 
          healthy: false, 
          status: 'error',
          error: error.message,
          lastCheck: new Date()
        };
      }
    }

    return status;
  }

  /**
   * Calculate proper initialization order based on dependencies
   */
  private calculateInitializationOrder(): string[] {
    if (this.initializationOrder.length === 0) {
      this.initializationOrder = this.topologicalSort();
    }
    return [...this.initializationOrder];
  }

  /**
   * Topological sort for dependency resolution order
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const result: string[] = [];

    const visit = (serviceName: string) => {
      if (temp.has(serviceName)) {
        throw new Error(`Circular dependency detected involving: ${serviceName}`);
      }
      
      if (!visited.has(serviceName)) {
        temp.add(serviceName);
        
        const registration = this.services.get(serviceName);
        if (registration) {
          for (const dependency of registration.dependencies) {
            visit(dependency);
          }
        }
        
        temp.delete(serviceName);
        visited.add(serviceName);
        result.push(serviceName);
      }
    };

    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return result;
  }

  /**
   * Update dependency graph when registering services
   */
  private updateDependencyGraph(serviceName: string, dependencies: string[]): void {
    for (const depName of dependencies) {
      const depRegistration = this.services.get(depName);
      if (depRegistration) {
        depRegistration.dependents.add(serviceName);
      }
    }
    
    // Clear cached initialization order
    this.initializationOrder = [];
  }

  /**
   * Inject dependencies into a service instance
   */
  private async injectDependencies(instance: any, dependencies: Record<string, any>): Promise<void> {
    // If the instance has a setDependencies method, use it
    if (typeof instance.setDependencies === 'function') {
      await instance.setDependencies(dependencies);
    }
    
    // Alternatively, set dependencies directly if the instance expects them
    if (instance.dependencies) {
      Object.assign(instance.dependencies, dependencies);
    }
  }

  /**
   * Type guard to check if an object is a service
   */
  private isService(obj: any): obj is IService {
    return obj && 
           typeof obj.name === 'string' &&
           typeof obj.version === 'string' &&
           typeof obj.initialize === 'function' &&
           typeof obj.cleanup === 'function' &&
           typeof obj.getHealthStatus === 'function';
  }
}

// Export singleton instance
export const container = new DependencyContainer();