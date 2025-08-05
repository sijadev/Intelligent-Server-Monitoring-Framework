import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { 
  type User, 
  type InsertUser, 
  type Problem, 
  type InsertProblem,
  type Metrics,
  type InsertMetrics,
  type LogEntry,
  type InsertLogEntry,
  type Plugin,
  type InsertPlugin,
  type FrameworkConfig,
  type InsertFrameworkConfig,
  type DashboardData,
  type SystemStatus,
  type LogFilterOptions,
  type CodeIssue,
  type InsertCodeIssue,
  type CodeAnalysisRun,
  type InsertCodeAnalysisRun,
  type AiIntervention,
  type InsertAiIntervention,
  type Deployment,
  type InsertDeployment,
  type AiModel,
  type InsertAiModel,
  type DeploymentMetrics,
  type InsertDeploymentMetrics,
  type AiLearningStats,
  type MCPServer,
  type InsertMCPServer,
  type MCPServerMetrics,
  type InsertMCPServerMetrics,
  type MCPServerDashboardData,
  users,
  problems,
  metrics,
  logEntries,
  plugins,
  frameworkConfig,
  codeIssues,
  codeAnalysisRuns,
  aiInterventions,
  deployments,
  aiModels,
  deploymentMetrics,
  mcpServers,
  mcpServerMetrics
} from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  private db: ReturnType<typeof drizzle>;
  private sql: postgres.Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl);
    this.db = drizzle(this.sql);
  }

  async close() {
    await this.sql.end();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(user).returning();
    return result[0];
  }

  // Problems
  async getProblems(limit: number = 50): Promise<Problem[]> {
    return await this.db.select().from(problems)
      .orderBy(desc(problems.timestamp))
      .limit(limit);
  }

  async getActiveProblem(): Promise<Problem[]> {
    return await this.db.select().from(problems)
      .where(eq(problems.resolved, false))
      .orderBy(desc(problems.timestamp));
  }

  async createProblem(problem: InsertProblem): Promise<Problem> {
    const result = await this.db.insert(problems).values(problem).returning();
    return result[0];
  }

  async resolveProblem(id: string): Promise<Problem | undefined> {
    const result = await this.db.update(problems)
      .set({ resolved: true, resolvedAt: new Date() })
      .where(eq(problems.id, id))
      .returning();
    return result[0];
  }

  // Metrics
  async getLatestMetrics(): Promise<Metrics | undefined> {
    const result = await this.db.select().from(metrics)
      .orderBy(desc(metrics.timestamp))
      .limit(1);
    return result[0];
  }

  async getMetricsHistory(limit: number = 100): Promise<Metrics[]> {
    return await this.db.select().from(metrics)
      .orderBy(desc(metrics.timestamp))
      .limit(limit);
  }

  async createMetrics(metricsData: InsertMetrics): Promise<Metrics> {
    const result = await this.db.insert(metrics).values(metricsData).returning();
    return result[0];
  }

  // Log Entries
  async getLogEntries(options: LogFilterOptions = {}): Promise<LogEntry[]> {
    const conditions = [];
    if (options.level) {
      conditions.push(eq(logEntries.level, options.level));
    }
    if (options.source) {
      conditions.push(eq(logEntries.source, options.source));
    }
    if (options.since) {
      conditions.push(gte(logEntries.timestamp, options.since));
    }

    const baseQuery = this.db.select().from(logEntries);
    const queryWithWhere = conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery;
    
    const queryWithOrder = queryWithWhere.orderBy(desc(logEntries.timestamp));
    
    const finalQuery = options.limit 
      ? queryWithOrder.limit(options.limit)
      : queryWithOrder;

    return await finalQuery;
  }

  async createLogEntry(logEntry: InsertLogEntry): Promise<LogEntry> {
    const result = await this.db.insert(logEntries).values(logEntry).returning();
    return result[0];
  }

  // Plugins - HAUPTFOKUS: Persistente Speicherung
  async getPlugins(): Promise<Plugin[]> {
    return await this.db.select().from(plugins)
      .orderBy(plugins.name);
  }

  async getPlugin(name: string): Promise<Plugin | undefined> {
    const result = await this.db.select().from(plugins)
      .where(eq(plugins.name, name));
    return result[0];
  }

  async getPluginById(id: string): Promise<Plugin | undefined> {
    const result = await this.db.select().from(plugins)
      .where(eq(plugins.id, id));
    return result[0];
  }

  async createOrUpdatePlugin(plugin: InsertPlugin): Promise<Plugin> {
    // Try to find existing plugin by name
    const existing = await this.getPlugin(plugin.name);
    
    if (existing) {
      // Update existing plugin
      const result = await this.db.update(plugins)
        .set({ 
          ...plugin, 
          lastUpdate: new Date(),
          config: plugin.config || {} 
        })
        .where(eq(plugins.id, existing.id))
        .returning();
      return result[0];
    } else {
      // Create new plugin
      const result = await this.db.insert(plugins)
        .values({ 
          ...plugin, 
          lastUpdate: new Date(),
          config: plugin.config || {} 
        })
        .returning();
      return result[0];
    }
  }

  async createPlugin(plugin: InsertPlugin): Promise<Plugin> {
    const result = await this.db.insert(plugins)
      .values({ 
        ...plugin, 
        lastUpdate: new Date(),
        config: plugin.config || {} 
      })
      .returning();
    return result[0];
  }

  async updatePlugin(id: string, plugin: Partial<InsertPlugin>): Promise<Plugin | undefined> {
    const result = await this.db.update(plugins)
      .set({ 
        ...plugin, 
        lastUpdate: new Date(),
        config: plugin.config || {} 
      })
      .where(eq(plugins.id, id))
      .returning();
    return result[0] || undefined;
  }

  async deletePlugin(id: string): Promise<Plugin | undefined> {
    const result = await this.db.delete(plugins)
      .where(eq(plugins.id, id))
      .returning();
    return result[0] || undefined;
  }

  // Framework Config
  async getFrameworkConfig(): Promise<FrameworkConfig | undefined> {
    try {
      const result = await this.db.select().from(frameworkConfig).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error in getFrameworkConfig:', error);
      throw error;
    }
  }

  async updateFrameworkConfig(config: InsertFrameworkConfig): Promise<FrameworkConfig> {
    const existing = await this.getFrameworkConfig();
    
    if (existing) {
      const result = await this.db.update(frameworkConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(frameworkConfig.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await this.db.insert(frameworkConfig)
        .values({ ...config, updatedAt: new Date() })
        .returning();
      return result[0];
    }
  }

  // Code Issues
  async getCodeIssues(limit: number = 50): Promise<CodeIssue[]> {
    return await this.db.select().from(codeIssues)
      .orderBy(desc(codeIssues.timestamp))
      .limit(limit);
  }

  async getActiveCodeIssues(): Promise<CodeIssue[]> {
    return await this.db.select().from(codeIssues)
      .where(eq(codeIssues.fixApplied, false))
      .orderBy(desc(codeIssues.timestamp));
  }

  async createCodeIssue(codeIssue: InsertCodeIssue): Promise<CodeIssue> {
    const result = await this.db.insert(codeIssues).values(codeIssue).returning();
    return result[0];
  }

  async resolveCodeIssue(id: string): Promise<CodeIssue | undefined> {
    const result = await this.db.update(codeIssues)
      .set({ fixApplied: true })
      .where(eq(codeIssues.id, id))
      .returning();
    return result[0];
  }

  async applyCodeFix(id: string): Promise<CodeIssue | undefined> {
    const result = await this.db.update(codeIssues)
      .set({ fixApplied: true })
      .where(eq(codeIssues.id, id))
      .returning();
    return result[0];
  }

  // Code Analysis Runs
  async getCodeAnalysisRuns(limit: number = 20): Promise<CodeAnalysisRun[]> {
    return await this.db.select().from(codeAnalysisRuns)
      .orderBy(desc(codeAnalysisRuns.timestamp))
      .limit(limit);
  }

  async getLatestCodeAnalysisRun(): Promise<CodeAnalysisRun | undefined> {
    const result = await this.db.select().from(codeAnalysisRuns)
      .orderBy(desc(codeAnalysisRuns.timestamp))
      .limit(1);
    return result[0];
  }

  async createCodeAnalysisRun(run: InsertCodeAnalysisRun): Promise<CodeAnalysisRun> {
    const result = await this.db.insert(codeAnalysisRuns).values(run).returning();
    return result[0];
  }

  async updateCodeAnalysisRun(id: string, updates: Partial<CodeAnalysisRun>): Promise<CodeAnalysisRun | undefined> {
    const result = await this.db.update(codeAnalysisRuns)
      .set(updates)
      .where(eq(codeAnalysisRuns.id, id))
      .returning();
    return result[0];
  }

  // AI Interventions
  async getAiInterventions(limit: number = 50): Promise<AiIntervention[]> {
    return await this.db.select().from(aiInterventions)
      .orderBy(desc(aiInterventions.timestamp))
      .limit(limit);
  }

  async createAiIntervention(intervention: InsertAiIntervention): Promise<AiIntervention> {
    const result = await this.db.insert(aiInterventions).values(intervention).returning();
    return result[0];
  }

  async getRecentAiInterventions(hours: number = 24): Promise<AiIntervention[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await this.db.select().from(aiInterventions)
      .where(gte(aiInterventions.timestamp, cutoffTime))
      .orderBy(desc(aiInterventions.timestamp));
  }

  // Deployments
  async getDeployments(limit: number = 50): Promise<Deployment[]> {
    return await this.db.select().from(deployments)
      .orderBy(desc(deployments.startTime))
      .limit(limit);
  }

  async getActiveDeployments(): Promise<Deployment[]> {
    return await this.db.select().from(deployments)
      .where(sql`${deployments.status} IN ('pending', 'in_progress')`)
      .orderBy(desc(deployments.startTime));
  }

  async createDeployment(deployment: InsertDeployment): Promise<Deployment> {
    const result = await this.db.insert(deployments).values(deployment).returning();
    return result[0];
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined> {
    const result = await this.db.update(deployments)
      .set(updates)
      .where(eq(deployments.id, id))
      .returning();
    return result[0];
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    const result = await this.db.select().from(deployments)
      .where(eq(deployments.id, id));
    return result[0];
  }

  // AI Models
  async getAiModels(): Promise<AiModel[]> {
    return await this.db.select().from(aiModels)
      .orderBy(desc(aiModels.lastTrained));
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return await this.db.select().from(aiModels)
      .where(eq(aiModels.isActive, true))
      .orderBy(desc(aiModels.lastTrained));
  }

  async createAiModel(model: InsertAiModel): Promise<AiModel> {
    const result = await this.db.insert(aiModels).values(model).returning();
    return result[0];
  }

  async updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined> {
    const result = await this.db.update(aiModels)
      .set(updates)
      .where(eq(aiModels.id, id))
      .returning();
    return result[0];
  }

  // Deployment Metrics
  async getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics[]> {
    return await this.db.select().from(deploymentMetrics)
      .where(eq(deploymentMetrics.deploymentId, deploymentId))
      .orderBy(desc(deploymentMetrics.timestamp));
  }

  async createDeploymentMetrics(metrics: InsertDeploymentMetrics): Promise<DeploymentMetrics> {
    const result = await this.db.insert(deploymentMetrics).values(metrics).returning();
    return result[0];
  }

  // MCP Servers
  async getMcpServers(): Promise<MCPServer[]> {
    return await this.db.select().from(mcpServers)
      .orderBy(mcpServers.name);
  }

  async getMcpServer(serverId: string): Promise<MCPServer | undefined> {
    const result = await this.db.select().from(mcpServers)
      .where(eq(mcpServers.serverId, serverId));
    return result[0];
  }

  async createMcpServer(server: InsertMCPServer): Promise<MCPServer> {
    const result = await this.db.insert(mcpServers).values(server).returning();
    return result[0];
  }

  async updateMcpServer(serverId: string, updates: Partial<MCPServer>): Promise<MCPServer | undefined> {
    const result = await this.db.update(mcpServers)
      .set(updates)
      .where(eq(mcpServers.serverId, serverId))
      .returning();
    return result[0];
  }

  async deleteMcpServer(serverId: string): Promise<boolean> {
    const result = await this.db.delete(mcpServers)
      .where(eq(mcpServers.serverId, serverId))
      .returning();
    return result.length > 0;
  }

  // MCP Server Metrics
  async getMcpServerMetrics(serverId: string, limit: number = 100): Promise<MCPServerMetrics[]> {
    return await this.db.select().from(mcpServerMetrics)
      .where(eq(mcpServerMetrics.serverId, serverId))
      .orderBy(desc(mcpServerMetrics.timestamp))
      .limit(limit);
  }

  async createMcpServerMetrics(metrics: InsertMCPServerMetrics): Promise<MCPServerMetrics> {
    const result = await this.db.insert(mcpServerMetrics).values(metrics).returning();
    return result[0];
  }

  async getMcpServerDashboardData(): Promise<MCPServerDashboardData> {
    const allServers = await this.getMcpServers();
    const totalServers = allServers.length;
    const runningServers = allServers.filter(server => server.status === 'running').length;
    const stoppedServers = allServers.filter(server => server.status === 'stopped').length;

    // Calculate average response time from recent metrics
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMetrics = await this.db.select().from(mcpServerMetrics)
      .where(and(
        gte(mcpServerMetrics.timestamp, oneHourAgo),
        sql`${mcpServerMetrics.responseTime} IS NOT NULL`
      ));

    const averageResponseTime = recentMetrics.length > 0
      ? recentMetrics.reduce((sum, metrics) => sum + (metrics.responseTime || 0), 0) / recentMetrics.length
      : 0;

    const totalErrors = recentMetrics.reduce((sum, metrics) => sum + (metrics.errorCount || 0), 0);

    // Recent discoveries (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentDiscoveries = allServers.filter(server => server.discoveredAt > oneDayAgo).length;

    // Group by protocol
    const serversByProtocol: Record<string, number> = {};
    allServers.forEach(server => {
      serversByProtocol[server.protocol] = (serversByProtocol[server.protocol] || 0) + 1;
    });

    // Group by discovery method
    const serversByDiscoveryMethod: Record<string, number> = {};
    allServers.forEach(server => {
      serversByDiscoveryMethod[server.discoveryMethod] = (serversByDiscoveryMethod[server.discoveryMethod] || 0) + 1;
    });

    return {
      totalServers,
      runningServers,
      stoppedServers,
      averageResponseTime,
      totalErrors,
      recentDiscoveries,
      serversByProtocol,
      serversByDiscoveryMethod,
    };
  }

  // AI Learning Statistics
  async getAiLearningStats(): Promise<AiLearningStats> {
    const allInterventions = await this.getAiInterventions();
    const successfulInterventions = allInterventions.filter(i => i.outcome === 'success');
    const recentInterventions = await this.getRecentAiInterventions(24 * 7); // Last 7 days
    
    const problemTypes = new Set(allInterventions.map(i => i.problemType));
    const totalConfidence = allInterventions.reduce((sum, i) => sum + i.confidence, 0);
    const avgConfidence = allInterventions.length > 0 ? totalConfidence / allInterventions.length : 0;
    
    const successRate = allInterventions.length > 0 ? 
      successfulInterventions.length / allInterventions.length : 0;
    
    const recentDeployments = (await this.getDeployments(100))
      .filter(d => d.startTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;
    
    const models = await this.getAiModels();
    const lastModelUpdate = models.length > 0 ? 
      models.reduce((latest, model) => {
        return !latest || model.lastTrained > latest ? model.lastTrained : latest;
      }, null as Date | null) : null;

    return {
      totalInterventions: allInterventions.length,
      successRate,
      problemTypesLearned: problemTypes.size,
      averageConfidence: avgConfidence,
      recentDeployments,
      lastModelUpdate,
    };
  }

  // Dashboard Data
  async getDashboardData(): Promise<DashboardData> {
    try {
      const activeProblems = await this.getActiveProblem();
      const currentMetrics = await this.getLatestMetrics();
      const allPlugins = await this.getPlugins();
      const activeCodeIssues = await this.getActiveCodeIssues();
      const lastCodeAnalysisRun = await this.getLatestCodeAnalysisRun();
      const config = await this.getFrameworkConfig();
      
      // Skip AI learning stats which might contain the problematic query
      let aiLearningStats: AiLearningStats;
      try {
        aiLearningStats = await this.getAiLearningStats();
      } catch (error) {
        console.error('Error getting AI learning stats:', error);
        aiLearningStats = {
          totalInterventions: 0,
          successRate: 0,
          averageConfidence: 0,
          totalModelRetrains: 0,
          lastModelUpdate: null,
          modelAccuracy: 0
        };
      }
      
      const activeDeployments = await this.getActiveDeployments();
      const recentDeployments = await this.getDeployments(10);

    const recentAiInterventions = await this.getRecentAiInterventions(24);

    const status: SystemStatus = {
      running: true,
      uptime: this.calculateUptime(),
      pluginCount: allPlugins.length,
      activeProblems: activeProblems.length,
      lastUpdate: new Date().toISOString(),
      codeAnalysisEnabled: config?.codeAnalysisEnabled || false,
      codeIssuesCount: activeCodeIssues.length,
      aiLearningEnabled: config?.aiLearningEnabled || false,
      deploymentEnabled: config?.deploymentEnabled || false,
      activeDeployments: activeDeployments.length,
      pendingAiInterventions: recentAiInterventions.filter(i => i.outcome === 'pending').length,
    };

    return {
      status,
      recentProblems: activeProblems.slice(0, 10),
      currentMetrics: currentMetrics || null,
      pluginStatus: allPlugins,
      codeIssues: activeCodeIssues.slice(0, 10),
      lastCodeAnalysisRun,
      aiLearningStats,
      recentDeployments: recentDeployments.map(deployment => ({
        id: deployment.id,
        type: deployment.type,
        status: deployment.status,
        description: deployment.description,
        startTime: deployment.startTime,
        duration: deployment.endTime ? 
          deployment.endTime.getTime() - deployment.startTime.getTime() : undefined,
        initiatedBy: deployment.initiatedBy,
        filesChanged: Array.isArray(deployment.filesChanged) ? deployment.filesChanged : [],
      })),
      activeDeployments: activeDeployments.map(deployment => ({
        id: deployment.id,
        type: deployment.type,
        status: deployment.status,
        description: deployment.description,
        startTime: deployment.startTime,
        duration: undefined, // Active deployments don't have end time yet
        initiatedBy: deployment.initiatedBy,
        filesChanged: Array.isArray(deployment.filesChanged) ? deployment.filesChanged : [],
      })),
    };
    } catch (error) {
      console.error('Error in getDashboardData, returning fallback data:', error);
      // Return fallback data structure
      return {
        status: {
          running: true,
          uptime: this.calculateUptime(),
          pluginCount: 0,
          activeProblems: 0,
          lastUpdate: new Date().toISOString(),
          codeAnalysisEnabled: false,
          codeIssuesCount: 0,
          aiLearningEnabled: false,
          deploymentEnabled: false,
          activeDeployments: 0,
          pendingAiInterventions: 0,
        },
        recentProblems: [],
        currentMetrics: null,
        pluginStatus: [],
        codeIssues: [],
        lastCodeAnalysisRun: null,
        aiLearningStats: {
          totalInterventions: 0,
          successRate: 0,
          averageConfidence: 0,
          totalModelRetrains: 0,
          lastModelUpdate: null,
          modelAccuracy: 0
        },
        recentDeployments: [],
        activeDeployments: [],
        recentAiInterventions: [],
      };
    }
  }

  private calculateUptime(): string {
    // Simple uptime calculation - in real implementation this would track actual start time
    const now = Date.now();
    const startTime = now - (24 * 60 * 60 * 1000); // 24 hours ago for demo
    const uptime = now - startTime;
    
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }
}