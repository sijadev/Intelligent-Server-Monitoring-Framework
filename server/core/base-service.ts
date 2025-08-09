/**
 * Abstract Base Service Classes
 * Provides common service patterns and implementations
 */

import { EventEmitter } from 'events';
import {
  IService,
  IServiceWithEvents,
  ServiceHealthStatus,
  IRepository,
  QueryOptions,
  ILoggerService,
} from '../interfaces/service.interfaces';

// ============================================================================
// ABSTRACT BASE SERVICE
// ============================================================================

/**
 * Abstract base class for all services
 */
export abstract class BaseService extends EventEmitter implements IServiceWithEvents {
  protected _initialized = false;
  protected _startTime?: Date;
  protected _lastError?: Error;
  protected dependencies: Record<string, any> = {};

  constructor(
    public readonly name: string,
    public readonly version: string = '1.0.0',
  ) {
    super();
    this.setMaxListeners(50);
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    try {
      this._startTime = new Date();
      await this.onInitialize();
      this._initialized = true;
      this.emit('initialized');
    } catch (error) {
      this._lastError = error as Error;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Cleanup and shutdown the service
   */
  async cleanup(): Promise<void> {
    try {
      await this.onCleanup();
      this._initialized = false;
      this.emit('stopped');
    } catch (error) {
      this._lastError = error as Error;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): ServiceHealthStatus {
    const now = new Date();
    return {
      healthy: this._initialized && !this._lastError,
      status: this.getServiceStatus(),
      details: this.getHealthDetails(),
      lastCheck: now,
      uptime: this._startTime ? now.getTime() - this._startTime.getTime() : 0,
    };
  }

  /**
   * Set service dependencies (called by DI container)
   */
  async setDependencies(deps: Record<string, any>): Promise<void> {
    this.dependencies = { ...this.dependencies, ...deps };
    await this.onDependenciesSet();
  }

  /**
   * Check if service is initialized
   */
  get isInitialized(): boolean {
    return this._initialized;
  }

  /**
   * Get service uptime in milliseconds
   */
  get uptime(): number {
    return this._startTime ? Date.now() - this._startTime.getTime() : 0;
  }

  // Abstract methods to be implemented by concrete services
  protected abstract onInitialize(): Promise<void>;
  protected abstract onCleanup(): Promise<void>;

  // Optional lifecycle hooks
  protected async onDependenciesSet(): Promise<void> {
    // Override in subclasses if needed
  }

  protected getHealthDetails(): any {
    return {
      initialized: this._initialized,
      uptime: this.uptime,
      lastError: this._lastError?.message,
    };
  }

  protected getServiceStatus(): ServiceHealthStatus['status'] {
    if (this._lastError) return 'error';
    if (!this._initialized) return 'stopped';
    return 'running';
  }

  /**
   * Protected helper to safely emit errors
   */
  protected safeEmit(event: string, ...args: any[]): void {
    try {
      this.emit(event, ...args);
    } catch (error) {
      console.error(`Error emitting event '${event}' from service '${this.name}':`, error);
    }
  }

  /**
   * Protected helper for async operations with error handling
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this._lastError = error as Error;
      this.safeEmit('error', error);
      throw new Error(`${operationName} failed in service '${this.name}': ${error.message}`);
    }
  }
}

// ============================================================================
// REPOSITORY BASE CLASS
// ============================================================================

/**
 * Abstract base repository class
 */
export abstract class BaseRepository<T, K = string> implements IRepository<T, K> {
  protected logger?: ILoggerService;

  constructor(
    protected readonly tableName: string,
    logger?: ILoggerService,
  ) {
    this.logger = logger;
  }

  abstract findById(id: K): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<T[]>;
  abstract create(entity: Omit<T, 'id'>): Promise<T>;
  abstract update(id: K, updates: Partial<T>): Promise<T | null>;
  abstract delete(id: K): Promise<boolean>;
  abstract count(filter?: any): Promise<number>;

  /**
   * Protected helper for consistent error handling
   */
  protected async executeQuery<R>(operation: () => Promise<R>, operationName: string): Promise<R> {
    const startTime = Date.now();

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      await this.logger?.log('DEBUG', 'repository', `${operationName} completed in ${duration}ms`, {
        table: this.tableName,
        duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      await this.logger?.log(
        'ERROR',
        'repository',
        `${operationName} failed after ${duration}ms: ${error.message}`,
        { table: this.tableName, error: error.message, duration },
      );

      throw new Error(`Repository operation '${operationName}' failed: ${error.message}`);
    }
  }

  /**
   * Build WHERE clause from filter object
   */
  protected buildWhereClause(filter: any): { clause: string; params: any[] } {
    if (!filter || typeof filter !== 'object') {
      return { clause: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (value === undefined) {
        continue; // Skip undefined values
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => `$${paramIndex++}`).join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        params.push(...value);
      } else {
        conditions.push(`${key} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, params };
  }

  /**
   * Build ORDER BY clause from options
   */
  protected buildOrderClause(options?: QueryOptions): string {
    if (!options?.orderBy) {
      return '';
    }

    const direction = options.orderDirection || 'ASC';
    return `ORDER BY ${options.orderBy} ${direction}`;
  }

  /**
   * Build LIMIT/OFFSET clause from options
   */
  protected buildPaginationClause(options?: QueryOptions): { clause: string; params: any[] } {
    const clauses: string[] = [];
    const params: any[] = [];

    if (options?.limit) {
      clauses.push(`LIMIT $${params.length + 1}`);
      params.push(options.limit);
    }

    if (options?.offset) {
      clauses.push(`OFFSET $${params.length + 1}`);
      params.push(options.offset);
    }

    return {
      clause: clauses.join(' '),
      params,
    };
  }
}

// ============================================================================
// PERIODIC SERVICE BASE CLASS
// ============================================================================

/**
 * Base class for services that run periodic tasks
 */
export abstract class PeriodicService extends BaseService {
  private intervalId?: NodeJS.Timeout;
  protected intervalMs: number;

  constructor(
    name: string,
    intervalMs: number = 30000, // 30 seconds default
    version: string = '1.0.0',
  ) {
    super(name, version);
    this.intervalMs = intervalMs;
  }

  protected async onInitialize(): Promise<void> {
    await this.onPeriodicServiceInitialize();
    this.startPeriodicTask();
  }

  protected async onCleanup(): Promise<void> {
    this.stopPeriodicTask();
    await this.onPeriodicServiceCleanup();
  }

  /**
   * Start the periodic task
   */
  private startPeriodicTask(): void {
    if (this.intervalId) {
      return; // Already running
    }

    // Run immediately, then start interval
    setImmediate(() => this.executePeriodicTask());

    this.intervalId = setInterval(() => {
      this.executePeriodicTask();
    }, this.intervalMs);
  }

  /**
   * Stop the periodic task
   */
  private stopPeriodicTask(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
  }

  /**
   * Execute the periodic task with error handling
   */
  private async executePeriodicTask(): Promise<void> {
    try {
      await this.performPeriodicTask();
    } catch (error) {
      this._lastError = error as Error;
      this.safeEmit('periodic:error', error);
      await this.logger?.log('ERROR', this.name, `Periodic task failed: ${error.message}`, {
        error: error.message,
      });
    }
  }

  /**
   * Update the interval (will restart the periodic task)
   */
  setInterval(intervalMs: number): void {
    this.intervalMs = intervalMs;
    if (this.intervalId) {
      this.stopPeriodicTask();
      this.startPeriodicTask();
    }
  }

  // Get logger from dependencies
  protected get logger(): ILoggerService | undefined {
    return this.dependencies.logger;
  }

  // Abstract methods for periodic services
  protected abstract onPeriodicServiceInitialize(): Promise<void>;
  protected abstract onPeriodicServiceCleanup(): Promise<void>;
  protected abstract performPeriodicTask(): Promise<void>;
}

// ============================================================================
// SERVICE FACTORY BASE CLASS
// ============================================================================

/**
 * Abstract factory for creating services
 */
export abstract class ServiceFactory<T extends IService> {
  protected services = new Map<string, T>();

  /**
   * Create a new service instance
   */
  async create(name: string, config?: any): Promise<T> {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' already exists`);
    }

    const service = await this.createInstance(name, config);
    await service.initialize();

    this.services.set(name, service);
    return service;
  }

  /**
   * Get existing service
   */
  get(name: string): T | undefined {
    return this.services.get(name);
  }

  /**
   * Destroy a service
   */
  async destroy(name: string): Promise<boolean> {
    const service = this.services.get(name);
    if (!service) {
      return false;
    }

    await service.cleanup();
    this.services.delete(name);
    return true;
  }

  /**
   * Get all services
   */
  getAll(): T[] {
    return Array.from(this.services.values());
  }

  /**
   * Destroy all services
   */
  async destroyAll(): Promise<void> {
    for (const [name, service] of this.services) {
      try {
        await service.cleanup();
      } catch (error) {
        console.error(`Error destroying service '${name}':`, error);
      }
    }
    this.services.clear();
  }

  // Abstract method to create specific service instances
  protected abstract createInstance(name: string, config?: any): Promise<T>;
}
