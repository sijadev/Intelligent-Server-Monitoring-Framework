/**
 * Repository Pattern Implementation
 * Provides database abstraction layer with proper patterns
 */

import { eq, sql, and, or, desc, asc, count as drizzleCount } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import {
  IRepository,
  QueryOptions,
  IStorageService,
  ITransaction,
  ILoggerService,
} from '../interfaces/service.interfaces';
import { BaseRepository } from '../core/base-service';

// ============================================================================
// DRIZZLE REPOSITORY IMPLEMENTATION
// ============================================================================

/**
 * Drizzle ORM implementation of repository pattern
 */
export class DrizzleRepository<T, K = string> extends BaseRepository<T, K> {
  constructor(
    protected readonly db: PostgresJsDatabase<any>,
    protected readonly table: PgTable,
    protected readonly primaryKey: PgColumn,
    tableName: string,
    logger?: ILoggerService,
  ) {
    super(tableName, logger);
  }

  /**
   * Find entity by primary key
   */
  async findById(id: K): Promise<T | null> {
    return this.executeQuery(async () => {
      const results = await this.db
        .select()
        .from(this.table)
        .where(eq(this.primaryKey, id as any))
        .limit(1);

      return results[0] || null;
    }, `findById(${id})`);
  }

  /**
   * Find all entities with optional filtering
   */
  async findAll(options: QueryOptions = {}): Promise<T[]> {
    return this.executeQuery(
      async () => {
        let query = this.db.select().from(this.table);

        // Apply filtering
        if (options.filter) {
          const conditions = this.buildDrizzleConditions(options.filter);
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }
        }

        // Apply ordering
        if (options.orderBy) {
          const orderColumn = (this.table as any)[options.orderBy];
          if (orderColumn) {
            const orderFn = options.orderDirection === 'DESC' ? desc : asc;
            query = query.orderBy(orderFn(orderColumn));
          }
        }

        // Apply pagination
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.offset) {
          query = query.offset(options.offset);
        }

        return await query;
      },
      `findAll(${JSON.stringify(options)})`,
    );
  }

  /**
   * Create new entity
   */
  async create(entity: Omit<T, 'id'>): Promise<T> {
    return this.executeQuery(async () => {
      const results = await this.db
        .insert(this.table)
        .values(entity as any)
        .returning();

      if (results.length === 0) {
        throw new Error('Failed to create entity - no result returned');
      }

      return results[0];
    }, `create(${this.tableName})`);
  }

  /**
   * Update entity by primary key
   */
  async update(id: K, updates: Partial<T>): Promise<T | null> {
    return this.executeQuery(async () => {
      const results = await this.db
        .update(this.table)
        .set(updates as any)
        .where(eq(this.primaryKey, id as any))
        .returning();

      return results[0] || null;
    }, `update(${id})`);
  }

  /**
   * Delete entity by primary key
   */
  async delete(id: K): Promise<boolean> {
    return this.executeQuery(async () => {
      const results = await this.db
        .delete(this.table)
        .where(eq(this.primaryKey, id as any))
        .returning();

      return results.length > 0;
    }, `delete(${id})`);
  }

  /**
   * Count entities with optional filter
   */
  async count(filter?: any): Promise<number> {
    return this.executeQuery(
      async () => {
        let query = this.db.select({ count: drizzleCount() }).from(this.table);

        if (filter) {
          const conditions = this.buildDrizzleConditions(filter);
          if (conditions.length > 0) {
            query = query.where(and(...conditions));
          }
        }

        const result = await query;
        return result[0]?.count || 0;
      },
      `count(${JSON.stringify(filter)})`,
    );
  }

  /**
   * Find entities matching any of the provided conditions (OR query)
   */
  async findByAny(conditions: Record<string, any>[]): Promise<T[]> {
    return this.executeQuery(async () => {
      const orConditions = conditions.map((condition) =>
        and(...this.buildDrizzleConditions(condition)),
      );

      return await this.db
        .select()
        .from(this.table)
        .where(or(...orConditions));
    }, `findByAny`);
  }

  /**
   * Execute a custom query with the repository's error handling
   */
  async executeCustomQuery<R>(
    queryFn: (db: PostgresJsDatabase<any>) => Promise<R>,
    operationName: string,
  ): Promise<R> {
    return this.executeQuery(() => queryFn(this.db), operationName);
  }

  /**
   * Build Drizzle conditions from filter object
   */
  private buildDrizzleConditions(filter: Record<string, any>): any[] {
    const conditions: any[] = [];

    for (const [key, value] of Object.entries(filter)) {
      const column = (this.table as any)[key];
      if (!column) {
        console.warn(`Column '${key}' not found in table '${this.tableName}'`);
        continue;
      }

      if (value === null) {
        conditions.push(sql`${column} IS NULL`);
      } else if (value === undefined) {
        continue; // Skip undefined values
      } else if (Array.isArray(value)) {
        conditions.push(sql`${column} = ANY(${value})`);
      } else if (typeof value === 'object' && value.operator) {
        // Support for complex conditions: { operator: 'gt', value: 10 }
        conditions.push(this.buildOperatorCondition(column, value));
      } else {
        conditions.push(eq(column, value));
      }
    }

    return conditions;
  }

  /**
   * Build operator-based conditions (gt, lt, gte, lte, like, etc.)
   */
  private buildOperatorCondition(column: any, condition: { operator: string; value: any }): any {
    const { operator, value } = condition;

    switch (operator.toLowerCase()) {
      case 'gt':
        return sql`${column} > ${value}`;
      case 'gte':
        return sql`${column} >= ${value}`;
      case 'lt':
        return sql`${column} < ${value}`;
      case 'lte':
        return sql`${column} <= ${value}`;
      case 'like':
        return sql`${column} LIKE ${value}`;
      case 'ilike':
        return sql`${column} ILIKE ${value}`;
      case 'not':
        return sql`${column} != ${value}`;
      default:
        throw new Error(`Unsupported operator: ${operator}`);
    }
  }
}

// ============================================================================
// REPOSITORY FACTORY
// ============================================================================

/**
 * Factory for creating repository instances
 */
export class RepositoryFactory {
  constructor(
    private readonly db: PostgresJsDatabase<any>,
    private readonly logger?: ILoggerService,
  ) {}

  /**
   * Create a repository for a specific table
   */
  create<T, K = string>(
    table: PgTable,
    primaryKey: PgColumn,
    tableName: string,
  ): DrizzleRepository<T, K> {
    return new DrizzleRepository<T, K>(this.db, table, primaryKey, tableName, this.logger);
  }

  /**
   * Create multiple repositories at once
   */
  createMany<T extends Record<string, any>>(
    configs: Array<{
      name: keyof T;
      table: PgTable;
      primaryKey: PgColumn;
      tableName: string;
    }>,
  ): T {
    const repositories = {} as T;

    for (const config of configs) {
      repositories[config.name] = this.create(config.table, config.primaryKey, config.tableName);
    }

    return repositories;
  }
}

// ============================================================================
// TRANSACTION MANAGER
// ============================================================================

/**
 * Transaction manager for coordinating multiple repository operations
 */
export class TransactionManager {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  /**
   * Execute operations within a transaction
   */
  async executeInTransaction<T>(
    operations: (tx: PostgresJsDatabase<any>) => Promise<T>,
  ): Promise<T> {
    return await this.db.transaction(async (tx) => {
      return await operations(tx);
    });
  }

  /**
   * Execute multiple repository operations in a transaction
   */
  async executeRepositoryOperations<T>(
    operations: Array<(repositories: any) => Promise<any>>,
  ): Promise<T[]> {
    return await this.db.transaction(async (tx) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }

      return results;
    });
  }
}
