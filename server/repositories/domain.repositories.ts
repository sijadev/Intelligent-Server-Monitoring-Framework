/**
 * Domain-Specific Repository Implementations
 * Implements repositories for core IMF entities
 */

import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { DrizzleRepository, RepositoryFactory } from './base.repository';
import {
  problems,
  metrics,
  logEntries,
  plugins,
  frameworkConfig,
  codeIssues,
  codeAnalysisRuns,
  aiInterventions,
  deployments,
  mcpServers,
  mcpServerMetrics,
} from '../../shared/schema.js';
import {
  Problem,
  Metrics,
  LogEntry,
  Plugin,
  FrameworkConfig,
  CodeIssue,
  CodeAnalysisRun,
  AiIntervention,
  Deployment,
  MCPServer,
  MCPServerMetrics,
  InsertProblem,
  InsertMetrics,
  InsertLogEntry,
  InsertPlugin,
  InsertFrameworkConfig,
  InsertCodeIssue,
  InsertCodeAnalysisRun,
  InsertAiIntervention,
  InsertDeployment,
  InsertMCPServer,
  InsertMCPServerMetrics,
} from '../../shared/schema.js';
import { QueryOptions, ILoggerService } from '../interfaces/service.interfaces';
import { eq, desc, and, gte, lte, like, or, sql } from 'drizzle-orm';

// ============================================================================
// PROBLEM REPOSITORY
// ============================================================================

export class ProblemRepository extends DrizzleRepository<Problem, string> {
  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    super(db, problems, problems.id, 'problems', logger);
  }

  /**
   * Find active (unresolved) problems
   */
  async findActive(): Promise<Problem[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(problems)
        .where(eq(problems.resolved, false))
        .orderBy(desc(problems.timestamp));
    }, 'findActiveProblems');
  }

  /**
   * Find problems by severity
   */
  async findBySeverity(severity: string): Promise<Problem[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(problems)
        .where(eq(problems.severity, severity))
        .orderBy(desc(problems.timestamp));
    }, `findBySeverity(${severity})`);
  }

  /**
   * Find problems by type
   */
  async findByType(type: string): Promise<Problem[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(problems)
        .where(eq(problems.type, type))
        .orderBy(desc(problems.timestamp));
    }, `findByType(${type})`);
  }

  /**
   * Resolve a problem
   */
  async resolve(id: string): Promise<Problem | null> {
    return this.executeQuery(async () => {
      const results = await this.db
        .update(problems)
        .set({
          resolved: true,
          resolvedAt: new Date(),
        })
        .where(eq(problems.id, id))
        .returning();

      return results[0] || null;
    }, `resolve(${id})`);
  }

  /**
   * Find problems in date range
   */
  async findInDateRange(startDate: Date, endDate: Date): Promise<Problem[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(problems)
        .where(and(gte(problems.timestamp, startDate), lte(problems.timestamp, endDate)))
        .orderBy(desc(problems.timestamp));
    }, 'findInDateRange');
  }

  /**
   * Get problem statistics
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  }> {
    return this.executeQuery(async () => {
      const [totalResult, activeResult, resolvedResult] = await Promise.all([
        this.db.select({ count: sql<number>`count(*)` }).from(problems),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(problems)
          .where(eq(problems.resolved, false)),
        this.db
          .select({ count: sql<number>`count(*)` })
          .from(problems)
          .where(eq(problems.resolved, true)),
      ]);

      const [severityStats, typeStats] = await Promise.all([
        this.db
          .select({
            severity: problems.severity,
            count: sql<number>`count(*)`,
          })
          .from(problems)
          .groupBy(problems.severity),
        this.db
          .select({
            type: problems.type,
            count: sql<number>`count(*)`,
          })
          .from(problems)
          .groupBy(problems.type),
      ]);

      const bySeverity: Record<string, number> = {};
      severityStats.forEach((stat) => {
        bySeverity[stat.severity] = stat.count;
      });

      const byType: Record<string, number> = {};
      typeStats.forEach((stat) => {
        byType[stat.type] = stat.count;
      });

      return {
        total: totalResult[0]?.count || 0,
        active: activeResult[0]?.count || 0,
        resolved: resolvedResult[0]?.count || 0,
        bySeverity,
        byType,
      };
    }, 'getStatistics');
  }
}

// ============================================================================
// METRICS REPOSITORY
// ============================================================================

export class MetricsRepository extends DrizzleRepository<Metrics, string> {
  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    super(db, metrics, metrics.id, 'metrics', logger);
  }

  /**
   * Get latest metrics
   */
  async getLatest(): Promise<Metrics | null> {
    return this.executeQuery(async () => {
      const results = await this.db
        .select()
        .from(metrics)
        .orderBy(desc(metrics.timestamp))
        .limit(1);

      return results[0] || null;
    }, 'getLatest');
  }

  /**
   * Get metrics in time range
   */
  async getInTimeRange(startTime: Date, endTime: Date): Promise<Metrics[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(metrics)
        .where(and(gte(metrics.timestamp, startTime), lte(metrics.timestamp, endTime)))
        .orderBy(desc(metrics.timestamp));
    }, 'getInTimeRange');
  }

  /**
   * Get average metrics for time period
   */
  async getAverages(
    startTime: Date,
    endTime: Date,
  ): Promise<{
    avgCpuUsage: number;
    avgMemoryUsage: number;
    avgDiskUsage: number;
    avgLoadAverage: number;
  } | null> {
    return this.executeQuery(async () => {
      const result = await this.db
        .select({
          avgCpuUsage: sql<number>`AVG(${metrics.cpuUsage})`,
          avgMemoryUsage: sql<number>`AVG(${metrics.memoryUsage})`,
          avgDiskUsage: sql<number>`AVG(${metrics.diskUsage})`,
          avgLoadAverage: sql<number>`AVG(${metrics.loadAverage})`,
        })
        .from(metrics)
        .where(and(gte(metrics.timestamp, startTime), lte(metrics.timestamp, endTime)));

      return result[0] || null;
    }, 'getAverages');
  }

  /**
   * Cleanup old metrics (keep only recent data)
   */
  async cleanup(keepDays: number = 30): Promise<number> {
    return this.executeQuery(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const result = await this.db
        .delete(metrics)
        .where(lte(metrics.timestamp, cutoffDate))
        .returning({ id: metrics.id });

      return result.length;
    }, `cleanup(${keepDays}days)`);
  }
}

// ============================================================================
// LOG ENTRY REPOSITORY
// ============================================================================

export class LogEntryRepository extends DrizzleRepository<LogEntry, string> {
  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    super(db, logEntries, logEntries.id, 'log_entries', logger);
  }

  /**
   * Find logs by level
   */
  async findByLevel(level: string, limit: number = 100): Promise<LogEntry[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(logEntries)
        .where(eq(logEntries.level, level))
        .orderBy(desc(logEntries.timestamp))
        .limit(limit);
    }, `findByLevel(${level})`);
  }

  /**
   * Find logs by source
   */
  async findBySource(source: string, limit: number = 100): Promise<LogEntry[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(logEntries)
        .where(eq(logEntries.source, source))
        .orderBy(desc(logEntries.timestamp))
        .limit(limit);
    }, `findBySource(${source})`);
  }

  /**
   * Search logs by message content
   */
  async search(searchTerm: string, limit: number = 100): Promise<LogEntry[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(logEntries)
        .where(like(logEntries.message, `%${searchTerm}%`))
        .orderBy(desc(logEntries.timestamp))
        .limit(limit);
    }, `search(${searchTerm})`);
  }

  /**
   * Get recent logs with filtering
   */
  async getRecent(
    options: {
      level?: string;
      source?: string;
      limit?: number;
      since?: Date;
    } = {},
  ): Promise<LogEntry[]> {
    return this.executeQuery(async () => {
      let query = this.db.select().from(logEntries);

      const conditions: any[] = [];

      if (options.level) {
        conditions.push(eq(logEntries.level, options.level));
      }

      if (options.source) {
        conditions.push(eq(logEntries.source, options.source));
      }

      if (options.since) {
        conditions.push(gte(logEntries.timestamp, options.since));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      query = query.orderBy(desc(logEntries.timestamp));

      if (options.limit) {
        query = query.limit(options.limit);
      }

      return await query;
    }, 'getRecent');
  }

  /**
   * Cleanup old log entries
   */
  async cleanup(keepDays: number = 7): Promise<number> {
    return this.executeQuery(async () => {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const result = await this.db
        .delete(logEntries)
        .where(lte(logEntries.timestamp, cutoffDate))
        .returning({ id: logEntries.id });

      return result.length;
    }, `cleanup(${keepDays}days)`);
  }
}

// ============================================================================
// PLUGIN REPOSITORY
// ============================================================================

export class PluginRepository extends DrizzleRepository<Plugin, string> {
  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    super(db, plugins, plugins.id, 'plugins', logger);
  }

  /**
   * Find plugins by type
   */
  async findByType(type: string): Promise<Plugin[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(plugins)
        .where(eq(plugins.type, type))
        .orderBy(plugins.name);
    }, `findByType(${type})`);
  }

  /**
   * Find plugins by status
   */
  async findByStatus(status: string): Promise<Plugin[]> {
    return this.executeQuery(async () => {
      return await this.db
        .select()
        .from(plugins)
        .where(eq(plugins.status, status))
        .orderBy(plugins.name);
    }, `findByStatus(${status})`);
  }

  /**
   * Find plugin by name
   */
  async findByName(name: string): Promise<Plugin | null> {
    return this.executeQuery(async () => {
      const results = await this.db.select().from(plugins).where(eq(plugins.name, name)).limit(1);

      return results[0] || null;
    }, `findByName(${name})`);
  }

  /**
   * Update plugin status
   */
  async updateStatus(id: string, status: string): Promise<Plugin | null> {
    return this.executeQuery(async () => {
      const results = await this.db
        .update(plugins)
        .set({
          status,
          lastUpdate: new Date(),
        })
        .where(eq(plugins.id, id))
        .returning();

      return results[0] || null;
    }, `updateStatus(${id}, ${status})`);
  }
}

// ============================================================================
// REPOSITORY COLLECTION
// ============================================================================

/**
 * Collection of all domain repositories
 */
export class DomainRepositories {
  public readonly problems: ProblemRepository;
  public readonly metrics: MetricsRepository;
  public readonly logEntries: LogEntryRepository;
  public readonly plugins: PluginRepository;

  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    this.problems = new ProblemRepository(db, logger);
    this.metrics = new MetricsRepository(db, logger);
    this.logEntries = new LogEntryRepository(db, logger);
    this.plugins = new PluginRepository(db, logger);
  }

  /**
   * Initialize all repositories
   */
  async initialize(): Promise<void> {
    // Any initialization logic if needed
  }

  /**
   * Cleanup old data from all repositories
   */
  async cleanup(
    options: {
      metricsKeepDays?: number;
      logsKeepDays?: number;
    } = {},
  ): Promise<{
    metricsDeleted: number;
    logsDeleted: number;
  }> {
    const [metricsDeleted, logsDeleted] = await Promise.all([
      this.metrics.cleanup(options.metricsKeepDays),
      this.logEntries.cleanup(options.logsKeepDays),
    ]);

    return { metricsDeleted, logsDeleted };
  }

  /**
   * Get overall system statistics
   */
  async getSystemStatistics(): Promise<{
    problems: Awaited<ReturnType<ProblemRepository['getStatistics']>>;
    totalMetrics: number;
    totalLogs: number;
    totalPlugins: number;
  }> {
    const [problemStats, metricsCount, logsCount, pluginsCount] = await Promise.all([
      this.problems.getStatistics(),
      this.metrics.count(),
      this.logEntries.count(),
      this.plugins.count(),
    ]);

    return {
      problems: problemStats,
      totalMetrics: metricsCount,
      totalLogs: logsCount,
      totalPlugins: pluginsCount,
    };
  }
}
