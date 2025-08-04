import { eventBus } from '../events/event-bus';

// Base Repository Interface
export interface IRepository<T, CreateT = Partial<T>, UpdateT = Partial<T>> {
  // CRUD Operations
  findById(id: string): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(data: CreateT): Promise<T>;
  update(id: string, data: UpdateT): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  
  // Query Options
  count(filters?: Record<string, any>): Promise<number>;
  exists(id: string): Promise<boolean>;
}

// Query Options Interface
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Base Repository Implementation
export abstract class BaseRepository<T, CreateT = Partial<T>, UpdateT = Partial<T>> 
  implements IRepository<T, CreateT, UpdateT> {
  
  protected abstract tableName: string;
  
  // Abstract methods to be implemented by concrete repositories
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(options?: QueryOptions): Promise<T[]>;
  abstract create(data: CreateT): Promise<T>;
  abstract update(id: string, data: UpdateT): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
  abstract count(filters?: Record<string, any>): Promise<number>;
  abstract exists(id: string): Promise<boolean>;

  // Common utility methods
  protected emitEvent(event: string, data: any): void {
    eventBus.emit(event as any, {
      ...data,
      timestamp: new Date(),
    });
  }

  protected logQuery(operation: string, params?: any): void {
    console.log(`📊 ${this.tableName} - ${operation}`, params || '');
  }

  // Validation helpers
  protected validateId(id: string): void {
    if (!id || typeof id !== 'string') {
      throw new Error(`Invalid ID provided: ${id}`);
    }
  }

  protected validateData(data: any): void {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data provided');
    }
  }

  // Error handling
  protected handleError(operation: string, error: Error): never {
    console.error(`❌ ${this.tableName} - ${operation} failed:`, error);
    this.emitEvent('database:error', { error, table: this.tableName });
    throw error;
  }

  // Pagination helpers
  protected buildPaginationQuery(options?: QueryOptions): {
    limit: number;
    offset: number;
    orderBy: string;
    orderDirection: 'asc' | 'desc';
  } {
    return {
      limit: options?.limit || 50,
      offset: options?.offset || 0,
      orderBy: options?.orderBy || 'id',
      orderDirection: options?.orderDirection || 'desc',
    };
  }

  // Filter helpers
  protected buildFilters(filters?: Record<string, any>): Record<string, any> {
    if (!filters) return {};
    
    // Remove undefined/null values
    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as Record<string, any>);
  }
}

// Transaction support interface
export interface ITransactionRepository {
  beginTransaction(): Promise<any>;
  commitTransaction(transaction: any): Promise<void>;
  rollbackTransaction(transaction: any): Promise<void>;
  withTransaction<T>(callback: (transaction: any) => Promise<T>): Promise<T>;
}

// Cacheable repository interface
export interface ICacheableRepository<T> {
  findByIdCached(id: string, ttl?: number): Promise<T | null>;
  invalidateCache(id?: string): Promise<void>;
  clearCache(): Promise<void>;
}