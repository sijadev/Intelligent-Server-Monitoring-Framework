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
  type LogFilterOptions
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Problems
  getProblems(limit?: number): Promise<Problem[]>;
  getActiveProblem(): Promise<Problem[]>;
  createProblem(problem: InsertProblem): Promise<Problem>;
  resolveProblem(id: string): Promise<Problem | undefined>;

  // Metrics
  getLatestMetrics(): Promise<Metrics | undefined>;
  getMetricsHistory(limit?: number): Promise<Metrics[]>;
  createMetrics(metrics: InsertMetrics): Promise<Metrics>;

  // Log Entries
  getLogEntries(options?: LogFilterOptions): Promise<LogEntry[]>;
  createLogEntry(logEntry: InsertLogEntry): Promise<LogEntry>;

  // Plugins
  getPlugins(): Promise<Plugin[]>;
  getPlugin(name: string): Promise<Plugin | undefined>;
  createOrUpdatePlugin(plugin: InsertPlugin): Promise<Plugin>;

  // Framework Config
  getFrameworkConfig(): Promise<FrameworkConfig | undefined>;
  updateFrameworkConfig(config: InsertFrameworkConfig): Promise<FrameworkConfig>;

  // Dashboard Data
  getDashboardData(): Promise<DashboardData>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private problems: Map<string, Problem>;
  private metrics: Map<string, Metrics>;
  private logEntries: Map<string, LogEntry>;
  private plugins: Map<string, Plugin>;
  private frameworkConfig: FrameworkConfig | undefined;

  constructor() {
    this.users = new Map();
    this.problems = new Map();
    this.metrics = new Map();
    this.logEntries = new Map();
    this.plugins = new Map();
    this.frameworkConfig = undefined;

    // Initialize with default config
    this.initializeDefaultConfig();
  }

  private async initializeDefaultConfig() {
    if (!this.frameworkConfig) {
      const defaultConfig: InsertFrameworkConfig = {
        serverType: "generic",
        monitoringInterval: 30,
        learningEnabled: true,
        autoRemediation: true,
        logLevel: "INFO",
        dataDir: "./data",
        logFiles: [
          { path: "/var/log/application.log", type: "application" },
          { path: "/var/log/system.log", type: "system" }
        ],
      };
      await this.updateFrameworkConfig(defaultConfig);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProblems(limit: number = 50): Promise<Problem[]> {
    const allProblems = Array.from(this.problems.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allProblems.slice(0, limit);
  }

  async getActiveProblem(): Promise<Problem[]> {
    return Array.from(this.problems.values())
      .filter(problem => !problem.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createProblem(insertProblem: InsertProblem): Promise<Problem> {
    const id = randomUUID();
    const problem: Problem = {
      ...insertProblem,
      id,
      resolved: false,
      resolvedAt: null,
      metadata: insertProblem.metadata || {},
    };
    this.problems.set(id, problem);
    return problem;
  }

  async resolveProblem(id: string): Promise<Problem | undefined> {
    const problem = this.problems.get(id);
    if (problem) {
      problem.resolved = true;
      problem.resolvedAt = new Date();
      this.problems.set(id, problem);
    }
    return problem;
  }

  async getLatestMetrics(): Promise<Metrics | undefined> {
    const allMetrics = Array.from(this.metrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allMetrics[0] || undefined;
  }

  async getMetricsHistory(limit: number = 100): Promise<Metrics[]> {
    const allMetrics = Array.from(this.metrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allMetrics.slice(0, limit);
  }

  async createMetrics(insertMetrics: InsertMetrics): Promise<Metrics> {
    const id = randomUUID();
    const metrics: Metrics = { 
      ...insertMetrics, 
      id,
      metadata: insertMetrics.metadata || {},
      cpuUsage: insertMetrics.cpuUsage || null,
      memoryUsage: insertMetrics.memoryUsage || null,
      diskUsage: insertMetrics.diskUsage || null,
      loadAverage: insertMetrics.loadAverage || null,
      networkConnections: insertMetrics.networkConnections || null,
      processes: insertMetrics.processes || null,
    };
    this.metrics.set(id, metrics);
    return metrics;
  }

  async getLogEntries(options: LogFilterOptions = {}): Promise<LogEntry[]> {
    let entries = Array.from(this.logEntries.values());

    if (options.level) {
      entries = entries.filter(entry => entry.level.toLowerCase() === options.level!.toLowerCase());
    }

    if (options.source) {
      entries = entries.filter(entry => entry.source === options.source);
    }

    if (options.since) {
      entries = entries.filter(entry => entry.timestamp >= options.since!);
    }

    entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      entries = entries.slice(0, options.limit);
    }

    return entries;
  }

  async createLogEntry(insertLogEntry: InsertLogEntry): Promise<LogEntry> {
    const id = randomUUID();
    const logEntry: LogEntry = { 
      ...insertLogEntry, 
      id,
      metadata: insertLogEntry.metadata || {},
      rawLine: insertLogEntry.rawLine || null,
    };
    this.logEntries.set(id, logEntry);
    return logEntry;
  }

  async getPlugins(): Promise<Plugin[]> {
    return Array.from(this.plugins.values())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getPlugin(name: string): Promise<Plugin | undefined> {
    return Array.from(this.plugins.values()).find(plugin => plugin.name === name);
  }

  async createOrUpdatePlugin(insertPlugin: InsertPlugin): Promise<Plugin> {
    const existing = await this.getPlugin(insertPlugin.name);
    const id = existing?.id || randomUUID();
    const plugin: Plugin = {
      ...insertPlugin,
      id,
      lastUpdate: new Date(),
      config: insertPlugin.config || {},
    };
    this.plugins.set(id, plugin);
    return plugin;
  }

  async getFrameworkConfig(): Promise<FrameworkConfig | undefined> {
    return this.frameworkConfig;
  }

  async updateFrameworkConfig(insertConfig: InsertFrameworkConfig): Promise<FrameworkConfig> {
    const id = this.frameworkConfig?.id || randomUUID();
    this.frameworkConfig = {
      serverType: insertConfig.serverType || "generic",
      monitoringInterval: insertConfig.monitoringInterval || 30,
      learningEnabled: insertConfig.learningEnabled || true,
      autoRemediation: insertConfig.autoRemediation || true,
      logLevel: insertConfig.logLevel || "INFO",
      dataDir: insertConfig.dataDir || "./data",
      logFiles: insertConfig.logFiles || [],
      id,
      updatedAt: new Date(),
    };
    return this.frameworkConfig;
  }

  async getDashboardData(): Promise<DashboardData> {
    const activeProblems = await this.getActiveProblem();
    const currentMetrics = await this.getLatestMetrics();
    const allPlugins = await this.getPlugins();

    const status: SystemStatus = {
      running: true,
      uptime: this.calculateUptime(),
      pluginCount: allPlugins.length,
      activeProblems: activeProblems.length,
      lastUpdate: new Date().toISOString(),
    };

    return {
      status,
      recentProblems: activeProblems.slice(0, 10),
      currentMetrics: currentMetrics || null,
      pluginStatus: allPlugins,
    };
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

export const storage = new MemStorage();
