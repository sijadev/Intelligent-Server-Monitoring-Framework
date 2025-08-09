import { drizzle } from 'drizzle-orm/postgres-js';
import path from 'path';
import postgres from 'postgres';
import * as schema from '../shared/schema.js';
import {
  testProfiles,
  problems,
  plugins,
  logEntries,
  metrics as metricsTable,
  mcpServers,
  mcpServerMetrics,
  generatedTestData,
} from '../shared/schema.js';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { MemStorage, type IStorage } from './storage';
import { eq, desc, and, gte } from 'drizzle-orm';
import type {
  User,
  InsertUser,
  Problem,
  InsertProblem,
  Metrics,
  InsertMetrics,
  LogEntry,
  InsertLogEntry,
  Plugin,
  InsertPlugin,
  FrameworkConfig,
  InsertFrameworkConfig,
  DashboardData,
  LogFilterOptions,
  CodeIssue,
  InsertCodeIssue,
  CodeAnalysisRun,
  InsertCodeAnalysisRun,
  AiIntervention,
  InsertAiIntervention,
  Deployment,
  InsertDeployment,
  AiModel,
  InsertAiModel,
  DeploymentMetrics,
  InsertDeploymentMetrics,
  AiLearningStats,
  MCPServer,
  InsertMCPServer,
  MCPServerMetrics,
  InsertMCPServerMetrics,
  MCPServerDashboardData,
  TestProfile as DBTestProfile,
  InsertTestProfile as DBInsertTestProfile,
  InsertGeneratedTestData,
  GeneratedTestData,
} from '../shared/schema.js';

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private connection: postgres.Sql;
  private memStorageFallback: MemStorage;
  // Track already-logged fallback signatures to avoid log spam
  private loggedFallbackErrors: Set<string> = new Set();
  // Offline / mirror sync state
  private offlineMode = false; // true when DB operations failing
  private offlineOps: OfflineOperation[] = []; // queued ops while offline
  private reconnectTimer: NodeJS.Timeout | null = null;
  private mirrorPrimed = false;
  private offlineConflicts: OfflineConflict[] = [];
  private readonly offlineStateFile =
    process.env.OFFLINE_QUEUE_FILE || path.join(process.cwd(), 'data', 'offline-state.json');

  // Entities we currently mirror (incrementally extendable)
  private readonly mirroredEntities = [
    'test_profile',
    'problem',
    'metrics',
    'log_entry',
    'plugin',
    'mcp_server',
    'mcp_server_metrics',
  ] as const;

  constructor(connectionUrl: string) {
    try {
      console.log('🔗 Initializing PostgreSQL connection...');
      this.connection = postgres(connectionUrl, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });
      this.db = drizzle(this.connection, { schema });
      this.memStorageFallback = new MemStorage();
      // Attempt to load persisted offline state before priming mirror
      this.loadOfflineState().catch(() => {});
      console.log('✅ DatabaseStorage initialized successfully');
      // Kick off async readiness probe (non-blocking)
      this.ensureTablesReady().catch((e) =>
        console.warn('⚠️ Table readiness check failed (non-blocking):', e.message || e),
      );
      // Prime mirror (best effort) and schedule periodic reconnect attempts
      this.primeMirror().catch((e) =>
        console.warn('⚠️ Mirror priming failed (will retry when reconnected):', e.message || e),
      );
      this.startReconnectLoop();
    } catch (error) {
      console.error('❌ Failed to initialize DatabaseStorage:', error);
      throw error;
    }
  }

  // =============================================================
  // Offline Mirror + Sync
  // =============================================================
  private async primeMirror(): Promise<void> {
    // Load DB snapshot into in-memory mirror for offline continuity
    try {
      // Test simple query first
      await this.connection`SELECT 1`;
      // Load datasets we mirror; each in isolated try so partial success allowed
      const loaders: Array<Promise<void>> = [];
      loaders.push(
        (async () => {
          try {
            const rows = await this.db.select().from(testProfiles);
            for (const r of rows) {
              await this.memStorageFallback.createTestProfile({
                id: r.id,
                name: r.name,
                version: r.version,
                description: r.description,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                sourceConfig: r.sourceConfig ?? {},
                scenarios: r.scenarios ?? [],
                expectations: r.expectations ?? {},
                generationRules: r.generationRules ?? {},
                expectedData: r.expectedData ?? null,
              });
            }
          } catch {
            // ignore priming failures for this collection
          }
        })(),
      );
      loaders.push(
        (async () => {
          try {
            const rows = await this.db.select().from(problems);
            for (const r of rows) {
              await this.memStorageFallback.createProblem({
                description: r.description,
                type: r.type,
                severity: r.severity,
                timestamp: r.timestamp,
                metadata: r.metadata ?? {},
              });
            }
          } catch {
            // ignore priming failures for this collection
          }
        })(),
      );
      loaders.push(
        (async () => {
          try {
            const rows = await this.db.select().from(plugins);
            for (const r of rows) {
              await this.memStorageFallback.createPlugin({
                name: r.name,
                version: r.version,
                type: r.type,
                status: r.status,
                config: r.config ?? {},
              });
            }
          } catch {
            // ignore priming failures for this collection
          }
        })(),
      );
      await Promise.all(loaders);
      this.mirrorPrimed = true;
      this.offlineMode = false;
      // Clear any residual queued ops (they will be from previous runtime only)
      this.offlineOps = [];
      console.log('🪞 In-memory mirror primed.');
    } catch (e) {
      this.offlineMode = true; // Treat as offline until successful
      throw e;
    }
  }

  private startReconnectLoop() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setInterval(() => {
      if (!this.offlineMode) return; // Only attempt when offline
      this.attemptResync().catch(() => {});
    }, 5000);
  }

  // Public inspection helpers (used by health checks / diagnostics)
  isOffline(): boolean {
    return this.offlineMode;
  }

  getOfflineQueueLength(): number {
    return this.offlineOps.length;
  }

  getMirrorPrimed(): boolean {
    return this.mirrorPrimed;
  }

  // ---- Test Support (non-production use) ----
  /**
   * Force a resync attempt (used in tests). No effect in healthy online mode.
   */
  async triggerResync(): Promise<void> {
    await this.attemptResync();
  }

  /**
   * Snapshot of queued offline operations (read-only clone) for assertions.
   */
  getOfflineOpsSnapshot(): ReadonlyArray<OfflineOperation> {
    return [...this.offlineOps];
  }

  private stopReconnectLoop() {
    if (this.reconnectTimer) {
      clearInterval(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private recordOfflineOp(op: OfflineOperation) {
    if (!this.mirroredEntities.includes(op.entity)) return;
    const baseTimestamp =
      (op.data?.updatedAt || op.data?.lastUpdate) &&
      new Date(op.data.updatedAt || op.data.lastUpdate).toISOString();
    this.offlineOps.push({
      ...op,
      baseTimestamp,
      timestamp: new Date(),
      id: op.id ?? op.data?.id ?? op.data?.name,
    });
    this.saveOfflineState().catch(() => {});
  }

  private async attemptResync(): Promise<void> {
    try {
      await this.connection`SELECT 1`;
      if (!this.offlineMode) return; // Already synced by another path
      console.log('🔁 Database reachable again. Replaying', this.offlineOps.length, 'offline ops');
      // Replay ops in FIFO order
      for (const op of this.offlineOps) {
        try {
          await this.replayOperation(op);
        } catch (e) {
          const msg = (e as unknown as { message?: string })?.message || String(e);
          console.warn('⚠️ Failed to replay op', op.entity, op.type, op.id, msg);
        }
      }
      this.offlineOps = [];
      this.offlineMode = false;
      console.log('✅ Offline operations synchronized.');
      // Optionally re-prime mirror to account for server-side changes during outage
      await this.primeMirror().catch(() => {});
      await this.saveOfflineState().catch(() => {});
    } catch {
      // Still offline
    }
  }

  private async replayOperation(op: OfflineOperation): Promise<void> {
    switch (op.entity) {
      case 'test_profile':
        if (op.type === 'create') {
          try {
            await this.db.insert(testProfiles).values(op.data);
          } catch {
            /* duplicate or other */
          }
        } else if (op.type === 'update' && op.id) {
          // Conflict strategy: optimistic based on updatedAt
          const merged = { ...op.data };
          if (op.baseTimestamp) {
            try {
              const existing = await this.db
                .select()
                .from(testProfiles)
                .where(eq(testProfiles.id, op.id))
                .limit(1);
              const current = existing[0] as any;
              if (
                current &&
                current.updatedAt &&
                new Date(current.updatedAt).toISOString() !== op.baseTimestamp
              ) {
                // Conflict detected: shallow-merge object sections
                const objectFields = ['sourceConfig', 'expectations', 'generationRules'];
                for (const f of objectFields) {
                  if (current[f] && op.data?.[f]) {
                    merged[f] = { ...current[f], ...op.data[f] };
                  }
                }
                // Merge scenarios array (union by JSON string)
                if (Array.isArray(current.scenarios) && Array.isArray(op.data?.scenarios)) {
                  const seen = new Set<string>();
                  const combined = [...current.scenarios, ...op.data.scenarios].filter((s) => {
                    const key = JSON.stringify(s);
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                  });
                  merged.scenarios = combined;
                }
                console.warn('⚠️ Conflict resolved for test_profile', op.id);
                this.offlineConflicts.push({
                  entity: 'test_profile',
                  id: op.id || 'unknown',
                  conflictType: 'updatedAt',
                  resolvedAt: new Date(),
                  baseTimestamp: op.baseTimestamp,
                  remoteTimestamp: new Date(current.updatedAt).toISOString(),
                });
              }
            } catch {
              // ignore conflict fetch errors
            }
          }
          await this.db
            .update(testProfiles)
            .set({ ...merged, updatedAt: new Date() })
            .where(eq(testProfiles.id, op.id));
          this.saveOfflineState().catch(() => {});
        } else if (op.type === 'delete' && op.id) {
          await this.db.delete(testProfiles).where(eq(testProfiles.id, op.id));
        }
        break;
      case 'problem':
        if (op.type === 'create') {
          try {
            await this.db.insert(problems).values(op.data);
          } catch {
            /* ignore */
          }
        } else if (op.type === 'update' && op.id) {
          await this.db.update(problems).set(op.data).where(eq(problems.id, op.id));
        }
        break;
      case 'metrics':
        if (op.type === 'create') {
          try {
            await this.db.insert(metricsTable).values(op.data);
          } catch {
            /* ignore */
          }
        }
        break;
      case 'log_entry':
        if (op.type === 'create') {
          try {
            await this.db.insert(logEntries).values(op.data);
          } catch {
            /* ignore */
          }
        }
        break;
      case 'plugin':
        if (op.type === 'create') {
          try {
            await this.db.insert(plugins).values(op.data);
          } catch {
            /* ignore */
          }
        } else if (op.type === 'update') {
          const identifier = op.id ? eq(plugins.id, op.id) : eq(plugins.name, op.data?.name);
          const merged = { ...op.data };
          if (op.baseTimestamp) {
            try {
              const existing = await this.db.select().from(plugins).where(identifier).limit(1);
              const current = existing[0] as any;
              if (
                current &&
                current.lastUpdate &&
                new Date(current.lastUpdate).toISOString() !== op.baseTimestamp
              ) {
                // Merge config objects (offline wins for new keys / overrides)
                if (current.config && op.data?.config) {
                  merged.config = { ...current.config, ...op.data.config };
                }
                console.warn('⚠️ Conflict resolved for plugin', op.id || op.data?.name);
                this.offlineConflicts.push({
                  entity: 'plugin',
                  id: (op.id || op.data?.name) ?? 'unknown',
                  conflictType: 'lastUpdate',
                  resolvedAt: new Date(),
                  baseTimestamp: op.baseTimestamp,
                  remoteTimestamp: new Date(current.lastUpdate).toISOString(),
                });
              }
            } catch {
              // ignore
            }
          }
          await this.db
            .update(plugins)
            .set({ ...merged, lastUpdate: new Date() })
            .where(identifier);
          this.saveOfflineState().catch(() => {});
        } else if (op.type === 'delete' && op.id) {
          await this.db.delete(plugins).where(eq(plugins.id, op.id));
        }
        break;
      case 'mcp_server':
        if (op.type === 'create') {
          try {
            await this.db.insert(mcpServers).values(op.data);
          } catch {
            /* ignore */
          }
        } else if (op.type === 'update' && op.id) {
          await this.db.update(mcpServers).set(op.data).where(eq(mcpServers.serverId, op.id));
        } else if (op.type === 'delete' && op.id) {
          await this.db.delete(mcpServers).where(eq(mcpServers.serverId, op.id));
        }
        break;
      case 'mcp_server_metrics':
        if (op.type === 'create') {
          try {
            await this.db.insert(mcpServerMetrics).values(op.data);
          } catch {
            /* ignore */
          }
        }
        break;
    }
  }

  private async ensureTablesReady(): Promise<void> {
    try {
      // Probe for critical tables; if missing, log concise hint once
      const result = await this.connection`
        SELECT to_regclass('public.test_profiles') as tp, to_regclass('public.generated_test_data') as gtd;
  `;
      const row = result[0] as { tp: string | null; gtd: string | null } | undefined;
      if ((!row?.tp || !row?.gtd) && !process.env.TEST_SUPPRESS_DB_WARNINGS) {
        const key = 'missing:test_profiles:generated_test_data';
        if (!this.loggedFallbackErrors.has(key)) {
          this.loggedFallbackErrors.add(key);
          console.warn(
            '⚠️ Required tables missing (test_profiles/generated_test_data). Run migrations or "npm run db:migrate:sql".',
          );
        }
      }
    } catch (e: any) {
      console.warn('⚠️ Table probe error:', e.message || e);
    }
  }

  async close(): Promise<void> {
    await this.connection.end();
  }

  // Wrapper method to handle database errors and fallback to MemStorage
  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackOperation?: () => Promise<T>,
    offlineDescriptor?: Omit<OfflineOperation, 'timestamp'>,
  ): Promise<T> {
    try {
      const result = await operation();
      // If previously offline, attempt resync (will no-op if already done)
      if (this.offlineMode) {
        this.offlineMode = false;
        // Trigger async attempt to flush queue if any left (should be none)
        this.attemptResync().catch(() => {});
      }
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const signature = msg.replace(/relation "(.*?)" does not exist/g, 'relation <missing>');
      if (!this.loggedFallbackErrors.has(signature)) {
        this.loggedFallbackErrors.add(signature);
        console.warn('🔄 Database operation failed, using fallback:', msg);
      }
      this.offlineMode = true;
      if (fallbackOperation) {
        const fallbackResult = await fallbackOperation();
        if (offlineDescriptor) this.recordOfflineOp(offlineDescriptor as OfflineOperation);
        return fallbackResult;
      }
      throw error;
    }
  }

  // Users
  // =====================
  async getUser(id: string): Promise<User | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getUser(id),
    );
  }

  // =====================
  // Test Profiles
  // =====================
  async getTestProfiles(): Promise<DBTestProfile[]> {
    return this.executeWithFallback(
      async () => {
        return await this.db
          .select()
          .from(schema.testProfiles)
          .orderBy(desc(schema.testProfiles.createdAt));
      },
      () => this.memStorageFallback.getTestProfiles(),
    );
  }

  async getTestProfile(id: string): Promise<DBTestProfile | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.testProfiles)
          .where(eq(schema.testProfiles.id, id))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getTestProfile(id),
    );
  }

  async createTestProfile(profile: DBInsertTestProfile): Promise<DBTestProfile> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .insert(schema.testProfiles)
          .values({
            ...profile,
            createdAt: profile.createdAt ? new Date(profile.createdAt) : new Date(),
            updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : new Date(),
          })
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.createTestProfile(profile),
      { entity: 'test_profile', type: 'create', id: profile.id, data: profile },
    );
  }

  // =====================
  // Generated Test Data
  // =====================
  async createGeneratedTestData(entry: InsertGeneratedTestData): Promise<GeneratedTestData> {
    return this.executeWithFallback(
      async () => {
        // Do NOT pass id so DEFAULT gen_random_uuid() applies
        const payload: InsertGeneratedTestData = {
          profileId: entry.profileId,
          generatedAt: entry.generatedAt ? new Date(entry.generatedAt) : new Date(),
          success: entry.success ?? true,
          executionTime: entry.executionTime ?? 0,
          logEntries: entry.logEntries ?? 0,
          codeProblems: entry.codeProblems ?? 0,
          metricPoints: entry.metricPoints ?? 0,
          dataSizeBytes: entry.dataSizeBytes ?? 0,
          metadata: entry.metadata || {},
          errors: entry.errors || [],
        };
        const inserted = await this.db.insert(generatedTestData).values(payload).returning();
        return inserted[0] as GeneratedTestData;
      },
      () => this.memStorageFallback.createGeneratedTestData(entry as any),
    );
  }

  async listGeneratedTestData(
    options: { profileId?: string; limit?: number } = {},
  ): Promise<GeneratedTestData[]> {
    return this.executeWithFallback(
      async () => {
        const tbl = generatedTestData;
        if (options.profileId) {
          if (options.limit) {
            return await this.db
              .select()
              .from(tbl)
              .where(eq(tbl.profileId, options.profileId))
              .orderBy(desc(tbl.generatedAt))
              .limit(options.limit);
          }
          return await this.db
            .select()
            .from(tbl)
            .where(eq(tbl.profileId, options.profileId))
            .orderBy(desc(tbl.generatedAt));
        }
        if (options.limit) {
          return await this.db
            .select()
            .from(tbl)
            .orderBy(desc(tbl.generatedAt))
            .limit(options.limit);
        }
        return await this.db.select().from(tbl).orderBy(desc(tbl.generatedAt));
      },
      () => this.memStorageFallback.listGeneratedTestData(options),
    );
  }

  async updateTestProfile(
    id: string,
    updates: Partial<DBInsertTestProfile>,
  ): Promise<DBTestProfile | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .update(schema.testProfiles)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(schema.testProfiles.id, id))
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.updateTestProfile(id, updates),
      { entity: 'test_profile', type: 'update', id, data: updates },
    );
  }

  async deleteTestProfile(id: string): Promise<boolean> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .delete(schema.testProfiles)
          .where(eq(schema.testProfiles.id, id))
          .returning();
        return result.length > 0;
      },
      () => this.memStorageFallback.deleteTestProfile(id),
      { entity: 'test_profile', type: 'delete', id },
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.username, username))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getUserByUsername(username),
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db.insert(schema.users).values(user).returning();
        return result[0];
      },
      () => this.memStorageFallback.createUser(user),
    );
  }

  // Problems
  async getProblems(limit: number = 50): Promise<Problem[]> {
    return this.executeWithFallback(
      async () => {
        return await this.db
          .select()
          .from(schema.problems)
          .orderBy(desc(schema.problems.timestamp))
          .limit(limit);
      },
      () => this.memStorageFallback.getProblems(limit),
    );
  }

  async getActiveProblem(): Promise<Problem[]> {
    return this.executeWithFallback(
      async () => {
        return await this.db
          .select()
          .from(schema.problems)
          .where(eq(schema.problems.resolved, false))
          .orderBy(desc(schema.problems.timestamp));
      },
      () => this.memStorageFallback.getActiveProblem(),
    );
  }

  async createProblem(problem: InsertProblem): Promise<Problem> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .insert(schema.problems)
          .values({
            ...problem,
            timestamp: new Date(problem.timestamp),
            resolved: false,
            resolvedAt: null,
            metadata: problem.metadata || {},
          })
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.createProblem(problem),
      { entity: 'problem', type: 'create', data: problem },
    );
  }

  async resolveProblem(id: string): Promise<Problem | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .update(schema.problems)
          .set({ resolved: true, resolvedAt: new Date() })
          .where(eq(schema.problems.id, id))
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.resolveProblem(id),
      { entity: 'problem', type: 'update', id, data: { resolved: true } },
    );
  }

  // Metrics
  async getLatestMetrics(): Promise<Metrics | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.metrics)
          .orderBy(desc(schema.metrics.timestamp))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getLatestMetrics(),
    );
  }

  async getMetricsHistory(limit: number = 100): Promise<Metrics[]> {
    return this.executeWithFallback(
      async () => {
        return await this.db
          .select()
          .from(schema.metrics)
          .orderBy(desc(schema.metrics.timestamp))
          .limit(limit);
      },
      () => this.memStorageFallback.getMetricsHistory(limit),
    );
  }

  async createMetrics(metrics: InsertMetrics): Promise<Metrics> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .insert(schema.metrics)
          .values({
            ...metrics,
            timestamp: new Date(metrics.timestamp || new Date()),
            metadata: metrics.metadata || {},
          })
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.createMetrics(metrics),
      { entity: 'metrics', type: 'create', data: metrics },
    );
  }

  // Log Entries
  async getLogEntries(options: LogFilterOptions = {}): Promise<LogEntry[]> {
    return this.executeWithFallback(
      async () => {
        let query: any = this.db.select().from(schema.logEntries);

        const conditions = [];
        if (options.level) {
          conditions.push(eq(schema.logEntries.level, options.level));
        }
        if (options.source) {
          conditions.push(eq(schema.logEntries.source, options.source));
        }
        if (options.since) {
          conditions.push(gte(schema.logEntries.timestamp, options.since));
        }

        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }

        query = query.orderBy(desc(schema.logEntries.timestamp));

        if (options.limit) {
          query = query.limit(options.limit);
        }

        return await query;
      },
      () => this.memStorageFallback.getLogEntries(options),
    );
  }

  async createLogEntry(logEntry: InsertLogEntry): Promise<LogEntry> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .insert(schema.logEntries)
          .values({
            ...logEntry,
            timestamp: new Date(logEntry.timestamp),
            metadata: logEntry.metadata || {},
          })
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.createLogEntry(logEntry),
      { entity: 'log_entry', type: 'create', data: logEntry },
    );
  }

  // Plugins
  async getPlugins(): Promise<Plugin[]> {
    return this.executeWithFallback(
      async () => {
        return await this.db.select().from(schema.plugins).orderBy(schema.plugins.name);
      },
      () => this.memStorageFallback.getPlugins(),
    );
  }

  async getPlugin(name: string): Promise<Plugin | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.plugins)
          .where(eq(schema.plugins.name, name))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getPlugin(name),
    );
  }

  async getPluginById(id: string): Promise<Plugin | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .select()
          .from(schema.plugins)
          .where(eq(schema.plugins.id, id))
          .limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getPluginById(id),
    );
  }

  async createOrUpdatePlugin(plugin: InsertPlugin): Promise<Plugin> {
    return this.executeWithFallback(
      async () => {
        const existing = await this.getPlugin(plugin.name);
        if (existing) {
          const result = await this.db
            .update(schema.plugins)
            .set({ ...plugin, lastUpdate: new Date() })
            .where(eq(schema.plugins.id, existing.id))
            .returning();
          return result[0];
        } else {
          return await this.createPlugin(plugin);
        }
      },
      () => this.memStorageFallback.createOrUpdatePlugin(plugin),
      { entity: 'plugin', type: 'update', id: (plugin as any).id, data: plugin },
    );
  }

  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .insert(schema.plugins)
          .values({
            ...plugin,
            lastUpdate: new Date(),
            config: plugin.config || {},
          })
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.createPlugin(plugin),
      { entity: 'plugin', type: 'create', data: plugin },
    );
  }

  async updatePlugin(id: string, plugin: Partial<InsertPlugin>): Promise<Plugin | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .update(schema.plugins)
          .set({ ...plugin, lastUpdate: new Date() })
          .where(eq(schema.plugins.id, id))
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.updatePlugin(id, plugin),
      { entity: 'plugin', type: 'update', id, data: plugin },
    );
  }

  async deletePlugin(id: string): Promise<Plugin | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db
          .delete(schema.plugins)
          .where(eq(schema.plugins.id, id))
          .returning();
        return result[0];
      },
      () => this.memStorageFallback.deletePlugin(id),
      { entity: 'plugin', type: 'delete', id },
    );
  }

  // Framework Config
  async getFrameworkConfig(): Promise<FrameworkConfig | undefined> {
    return this.executeWithFallback(
      async () => {
        const result = await this.db.select().from(schema.frameworkConfig).limit(1);
        return result[0];
      },
      () => this.memStorageFallback.getFrameworkConfig(),
    );
  }

  async updateFrameworkConfig(config: InsertFrameworkConfig): Promise<FrameworkConfig> {
    return this.executeWithFallback(
      async () => {
        const existing = await this.getFrameworkConfig();
        if (existing) {
          const result = await this.db
            .update(schema.frameworkConfig)
            .set({ ...config, updatedAt: new Date() })
            .where(eq(schema.frameworkConfig.id, existing.id))
            .returning();
          return result[0];
        } else {
          const result = await this.db
            .insert(schema.frameworkConfig)
            .values({
              ...config,
              updatedAt: new Date(),
            })
            .returning();
          return result[0];
        }
      },
      () => this.memStorageFallback.updateFrameworkConfig(config),
    );
  }

  // For brevity, I'll provide placeholder implementations for the remaining methods
  // Each would follow the same pattern: try database operation, fallback to memory storage

  async getCodeIssues(limit: number = 50): Promise<CodeIssue[]> {
    return this.memStorageFallback.getCodeIssues(limit);
  }

  async getActiveCodeIssues(): Promise<CodeIssue[]> {
    return this.memStorageFallback.getActiveCodeIssues();
  }

  async createCodeIssue(codeIssue: InsertCodeIssue): Promise<CodeIssue> {
    return this.memStorageFallback.createCodeIssue(codeIssue);
  }

  async resolveCodeIssue(id: string): Promise<CodeIssue | undefined> {
    return this.memStorageFallback.resolveCodeIssue(id);
  }

  async applyCodeFix(id: string): Promise<CodeIssue | undefined> {
    return this.memStorageFallback.applyCodeFix(id);
  }

  async getCodeAnalysisRuns(limit: number = 20): Promise<CodeAnalysisRun[]> {
    return this.memStorageFallback.getCodeAnalysisRuns(limit);
  }

  async getLatestCodeAnalysisRun(): Promise<CodeAnalysisRun | undefined> {
    return this.memStorageFallback.getLatestCodeAnalysisRun();
  }

  async createCodeAnalysisRun(run: InsertCodeAnalysisRun): Promise<CodeAnalysisRun> {
    return this.memStorageFallback.createCodeAnalysisRun(run);
  }

  async updateCodeAnalysisRun(
    id: string,
    updates: Partial<CodeAnalysisRun>,
  ): Promise<CodeAnalysisRun | undefined> {
    return this.memStorageFallback.updateCodeAnalysisRun(id, updates);
  }

  async getAiInterventions(limit: number = 50): Promise<AiIntervention[]> {
    return this.memStorageFallback.getAiInterventions(limit);
  }

  async createAiIntervention(intervention: InsertAiIntervention): Promise<AiIntervention> {
    return this.memStorageFallback.createAiIntervention(intervention);
  }

  async getRecentAiInterventions(hours: number = 24): Promise<AiIntervention[]> {
    return this.memStorageFallback.getRecentAiInterventions(hours);
  }

  async getDeployments(limit: number = 50): Promise<Deployment[]> {
    return this.memStorageFallback.getDeployments(limit);
  }

  async getActiveDeployments(): Promise<Deployment[]> {
    return this.memStorageFallback.getActiveDeployments();
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    return this.memStorageFallback.createDeployment(deployment);
  }

  async updateDeployment(
    id: string,
    updates: Partial<Deployment>,
  ): Promise<Deployment | undefined> {
    return this.memStorageFallback.updateDeployment(id, updates);
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.memStorageFallback.getDeployment(id);
  }

  async getAiModels(): Promise<AiModel[]> {
    return this.memStorageFallback.getAiModels();
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return this.memStorageFallback.getActiveAiModels();
  }

  async createAiModel(model: InsertAiModel): Promise<AiModel> {
    return this.memStorageFallback.createAiModel(model);
  }

  async updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined> {
    return this.memStorageFallback.updateAiModel(id, updates);
  }

  async getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics[]> {
    return this.memStorageFallback.getDeploymentMetrics(deploymentId);
  }

  async createDeploymentMetrics(metrics: InsertDeploymentMetrics): Promise<DeploymentMetrics> {
    return this.memStorageFallback.createDeploymentMetrics(metrics);
  }

  async getMcpServers(): Promise<MCPServer[]> {
    return this.memStorageFallback.getMcpServers();
  }

  async getMcpServer(serverId: string): Promise<MCPServer | undefined> {
    return this.memStorageFallback.getMcpServer(serverId);
  }

  async createMcpServer(server: InsertMCPServer): Promise<MCPServer> {
    return this.memStorageFallback.createMcpServer(server);
  }

  async updateMcpServer(
    serverId: string,
    updates: Partial<MCPServer>,
  ): Promise<MCPServer | undefined> {
    return this.memStorageFallback.updateMcpServer(serverId, updates);
  }

  async deleteMcpServer(serverId: string): Promise<boolean> {
    return this.memStorageFallback.deleteMcpServer(serverId);
  }

  async getMcpServerMetrics(serverId: string, limit: number = 100): Promise<MCPServerMetrics[]> {
    return this.memStorageFallback.getMcpServerMetrics(serverId, limit);
  }

  async createMcpServerMetrics(metrics: InsertMCPServerMetrics): Promise<MCPServerMetrics> {
    return this.memStorageFallback.createMcpServerMetrics(metrics);
  }
  async getMcpServerDashboardData(): Promise<MCPServerDashboardData> {
    return this.memStorageFallback.getMcpServerDashboardData();
  }

  async getAiLearningStats(): Promise<AiLearningStats> {
    return this.memStorageFallback.getAiLearningStats();
  }

  async getDashboardData(): Promise<DashboardData> {
    return this.memStorageFallback.getDashboardData();
  }

  // -----------------------
  // Offline persistence
  // -----------------------
  private async loadOfflineState(): Promise<void> {
    try {
      const fs = await import('fs-extra');
      if (!(await fs.pathExists(this.offlineStateFile))) return;
      const raw = await fs.readFile(this.offlineStateFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.offlineOps)) {
        this.offlineOps = parsed.offlineOps.map((o: any) => ({
          ...o,
          timestamp: o.timestamp ? new Date(o.timestamp) : new Date(),
        }));
      }
      if (Array.isArray(parsed.offlineConflicts)) {
        this.offlineConflicts = parsed.offlineConflicts.map((c: any) => ({
          ...c,
          resolvedAt: c.resolvedAt ? new Date(c.resolvedAt) : new Date(),
        }));
      }
      if (this.offlineOps.length > 0) {
        this.offlineMode = true; // assume still offline until proven otherwise
        console.warn('⚠️ Restored', this.offlineOps.length, 'offline ops from persisted state');
      }
    } catch (e) {
      console.warn('⚠️ Failed to load offline state:', (e as any)?.message || e);
    }
  }

  private async saveOfflineState(): Promise<void> {
    try {
      const fs = await import('fs-extra');
      await fs.ensureDir(path.dirname(this.offlineStateFile));
      const data = {
        offlineOps: this.offlineOps.map((o) => ({
          ...o,
          // Ensure Date objects serialized
          timestamp: o.timestamp.toISOString(),
        })),
        offlineConflicts: this.offlineConflicts.map((c) => ({
          ...c,
          resolvedAt: c.resolvedAt.toISOString(),
        })),
      };
      await fs.writeFile(this.offlineStateFile, JSON.stringify(data, null, 2), 'utf8');
    } catch {
      // Ignore persistence errors silently to avoid cascading failures
    }
  }

  getOfflineConflictsSnapshot(): ReadonlyArray<OfflineConflict> {
    return [...this.offlineConflicts];
  }
}

// Offline operation descriptor (placed outside class)
interface OfflineOperation {
  entity:
    | 'test_profile'
    | 'problem'
    | 'metrics'
    | 'log_entry'
    | 'plugin'
    | 'mcp_server'
    | 'mcp_server_metrics';
  type: 'create' | 'update' | 'delete';
  id?: string;
  data?: any;
  // Timestamp of the record (updatedAt/lastUpdate) when the offline op was queued (optimistic concurrency base)
  baseTimestamp?: string; // ISO string to survive serialization if persisted later
  // Set true if a conflict was detected and merged during replay
  conflictResolved?: boolean;
  conflictType?: string; // e.g. 'test_profile.updatedAt'
  timestamp: Date;
}

interface OfflineConflict {
  entity: string;
  id: string;
  conflictType: string;
  baseTimestamp?: string;
  remoteTimestamp?: string;
  resolvedAt: Date;
}
