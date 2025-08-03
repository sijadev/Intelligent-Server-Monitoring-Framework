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
  type CodeAnalysisConfig,
  type AiIntervention,
  type InsertAiIntervention,
  type Deployment,
  type InsertDeployment,
  type AiModel,
  type InsertAiModel,
  type DeploymentMetrics,
  type InsertDeploymentMetrics,
  type AiLearningStats,
  type DeploymentSummary
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

  // Code Issues
  getCodeIssues(limit?: number): Promise<CodeIssue[]>;
  getActiveCodeIssues(): Promise<CodeIssue[]>;
  createCodeIssue(codeIssue: InsertCodeIssue): Promise<CodeIssue>;
  resolveCodeIssue(id: string): Promise<CodeIssue | undefined>;
  applyCodeFix(id: string): Promise<CodeIssue | undefined>;

  // Code Analysis Runs
  getCodeAnalysisRuns(limit?: number): Promise<CodeAnalysisRun[]>;
  getLatestCodeAnalysisRun(): Promise<CodeAnalysisRun | undefined>;
  createCodeAnalysisRun(run: InsertCodeAnalysisRun): Promise<CodeAnalysisRun>;
  updateCodeAnalysisRun(id: string, updates: Partial<CodeAnalysisRun>): Promise<CodeAnalysisRun | undefined>;

  // AI Interventions
  getAiInterventions(limit?: number): Promise<AiIntervention[]>;
  createAiIntervention(intervention: InsertAiIntervention): Promise<AiIntervention>;
  getRecentAiInterventions(hours?: number): Promise<AiIntervention[]>;
  
  // Deployments
  getDeployments(limit?: number): Promise<Deployment[]>;
  getActiveDeployments(): Promise<Deployment[]>;
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined>;
  getDeployment(id: string): Promise<Deployment | undefined>;
  
  // AI Models
  getAiModels(): Promise<AiModel[]>;
  getActiveAiModels(): Promise<AiModel[]>;
  createAiModel(model: InsertAiModel): Promise<AiModel>;
  updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined>;
  
  // Deployment Metrics
  getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics[]>;
  createDeploymentMetrics(metrics: InsertDeploymentMetrics): Promise<DeploymentMetrics>;
  
  // AI Learning Statistics
  getAiLearningStats(): Promise<AiLearningStats>;
  
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
  private codeIssues: Map<string, CodeIssue>;
  private codeAnalysisRuns: Map<string, CodeAnalysisRun>;
  private aiInterventions: Map<string, AiIntervention>;
  private deployments: Map<string, Deployment>;
  private aiModels: Map<string, AiModel>;
  private deploymentMetrics: Map<string, DeploymentMetrics>;

  constructor() {
    this.users = new Map();
    this.problems = new Map();
    this.metrics = new Map();
    this.logEntries = new Map();
    this.plugins = new Map();
    this.frameworkConfig = undefined;
    this.codeIssues = new Map();
    this.codeAnalysisRuns = new Map();
    this.aiInterventions = new Map();
    this.deployments = new Map();
    this.aiModels = new Map();
    this.deploymentMetrics = new Map();

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
        codeAnalysisEnabled: false,
        sourceDirectories: [],
        autoFixEnabled: false,
        confidenceThreshold: 70,
        backupDirectory: "./backups",
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
      timestamp: new Date(insertProblem.timestamp),
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
      timestamp: new Date(insertMetrics.timestamp || new Date()),
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
      timestamp: new Date(insertLogEntry.timestamp),
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
      codeAnalysisEnabled: insertConfig.codeAnalysisEnabled || false,
      sourceDirectories: insertConfig.sourceDirectories || [],
      autoFixEnabled: insertConfig.autoFixEnabled || false,
      confidenceThreshold: insertConfig.confidenceThreshold || 70,
      backupDirectory: insertConfig.backupDirectory || "./backups",
      id,
      updatedAt: new Date(),
    };
    return this.frameworkConfig;
  }

  // Code Issues methods
  async getCodeIssues(limit: number = 50): Promise<CodeIssue[]> {
    const allIssues = Array.from(this.codeIssues.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allIssues.slice(0, limit);
  }

  async getActiveCodeIssues(): Promise<CodeIssue[]> {
    return Array.from(this.codeIssues.values())
      .filter(issue => !issue.fixApplied)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createCodeIssue(insertCodeIssue: InsertCodeIssue): Promise<CodeIssue> {
    const id = randomUUID();
    const codeIssue: CodeIssue = {
      ...insertCodeIssue,
      id,
      timestamp: new Date(insertCodeIssue.timestamp),
      fixApplied: false,
      metadata: insertCodeIssue.metadata || {},
    };
    this.codeIssues.set(id, codeIssue);
    return codeIssue;
  }

  async resolveCodeIssue(id: string): Promise<CodeIssue | undefined> {
    const codeIssue = this.codeIssues.get(id);
    if (codeIssue) {
      codeIssue.fixApplied = true;
      this.codeIssues.set(id, codeIssue);
    }
    return codeIssue;
  }

  async applyCodeFix(id: string): Promise<CodeIssue | undefined> {
    const codeIssue = this.codeIssues.get(id);
    if (codeIssue) {
      codeIssue.fixApplied = true;
      this.codeIssues.set(id, codeIssue);
    }
    return codeIssue;
  }

  // Code Analysis Runs methods
  async getCodeAnalysisRuns(limit: number = 20): Promise<CodeAnalysisRun[]> {
    const allRuns = Array.from(this.codeAnalysisRuns.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allRuns.slice(0, limit);
  }

  async getLatestCodeAnalysisRun(): Promise<CodeAnalysisRun | undefined> {
    const allRuns = Array.from(this.codeAnalysisRuns.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allRuns[0] || undefined;
  }

  async createCodeAnalysisRun(insertRun: InsertCodeAnalysisRun): Promise<CodeAnalysisRun> {
    const id = randomUUID();
    const run: CodeAnalysisRun = {
      ...insertRun,
      id,
      timestamp: new Date(insertRun.timestamp),
      metadata: insertRun.metadata || {},
    };
    this.codeAnalysisRuns.set(id, run);
    return run;
  }

  async updateCodeAnalysisRun(id: string, updates: Partial<CodeAnalysisRun>): Promise<CodeAnalysisRun | undefined> {
    const run = this.codeAnalysisRuns.get(id);
    if (run) {
      const updatedRun = { ...run, ...updates };
      this.codeAnalysisRuns.set(id, updatedRun);
      return updatedRun;
    }
    return undefined;
  }

  // AI Interventions methods
  async getAiInterventions(limit: number = 50): Promise<AiIntervention[]> {
    const allInterventions = Array.from(this.aiInterventions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return allInterventions.slice(0, limit);
  }

  async createAiIntervention(insertIntervention: InsertAiIntervention): Promise<AiIntervention> {
    const id = randomUUID();
    const intervention: AiIntervention = {
      ...insertIntervention,
      id,
      timestamp: new Date(insertIntervention.timestamp),
      metadata: insertIntervention.metadata || {},
    };
    this.aiInterventions.set(id, intervention);
    return intervention;
  }

  async getRecentAiInterventions(hours: number = 24): Promise<AiIntervention[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return Array.from(this.aiInterventions.values())
      .filter(intervention => intervention.timestamp > cutoffTime)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Deployments methods
  async getDeployments(limit: number = 50): Promise<Deployment[]> {
    const allDeployments = Array.from(this.deployments.values())
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    return allDeployments.slice(0, limit);
  }

  async getActiveDeployments(): Promise<Deployment[]> {
    return Array.from(this.deployments.values())
      .filter(deployment => ['pending', 'in_progress'].includes(deployment.status))
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const deployment: Deployment = {
      ...insertDeployment,
      id,
      startTime: new Date(insertDeployment.startTime),
      endTime: insertDeployment.endTime ? new Date(insertDeployment.endTime) : null,
      metadata: insertDeployment.metadata || {},
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async updateDeployment(id: string, updates: Partial<Deployment>): Promise<Deployment | undefined> {
    const deployment = this.deployments.get(id);
    if (deployment) {
      const updatedDeployment = { ...deployment, ...updates };
      this.deployments.set(id, updatedDeployment);
      return updatedDeployment;
    }
    return undefined;
  }

  async getDeployment(id: string): Promise<Deployment | undefined> {
    return this.deployments.get(id);
  }

  // AI Models methods
  async getAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values())
      .sort((a, b) => b.lastTrained.getTime() - a.lastTrained.getTime());
  }

  async getActiveAiModels(): Promise<AiModel[]> {
    return Array.from(this.aiModels.values())
      .filter(model => model.isActive)
      .sort((a, b) => b.lastTrained.getTime() - a.lastTrained.getTime());
  }

  async createAiModel(insertModel: InsertAiModel): Promise<AiModel> {
    const id = randomUUID();
    const model: AiModel = {
      ...insertModel,
      id,
      lastTrained: new Date(insertModel.lastTrained),
      metadata: insertModel.metadata || {},
    };
    this.aiModels.set(id, model);
    return model;
  }

  async updateAiModel(id: string, updates: Partial<AiModel>): Promise<AiModel | undefined> {
    const model = this.aiModels.get(id);
    if (model) {
      const updatedModel = { ...model, ...updates };
      this.aiModels.set(id, updatedModel);
      return updatedModel;
    }
    return undefined;
  }

  // Deployment Metrics methods
  async getDeploymentMetrics(deploymentId: string): Promise<DeploymentMetrics[]> {
    return Array.from(this.deploymentMetrics.values())
      .filter(metrics => metrics.deploymentId === deploymentId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createDeploymentMetrics(insertMetrics: InsertDeploymentMetrics): Promise<DeploymentMetrics> {
    const id = randomUUID();
    const metrics: DeploymentMetrics = {
      ...insertMetrics,
      id,
      timestamp: new Date(insertMetrics.timestamp),
      metadata: insertMetrics.metadata || {},
    };
    this.deploymentMetrics.set(id, metrics);
    return metrics;
  }

  // AI Learning Statistics
  async getAiLearningStats(): Promise<AiLearningStats> {
    const allInterventions = Array.from(this.aiInterventions.values());
    const successfulInterventions = allInterventions.filter(i => i.outcome === 'success');
    const recentInterventions = allInterventions.filter(i => 
      i.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    const problemTypes = new Set(allInterventions.map(i => i.problemType));
    const totalConfidence = allInterventions.reduce((sum, i) => sum + i.confidence, 0);
    const avgConfidence = allInterventions.length > 0 ? totalConfidence / allInterventions.length : 0;
    
    const successRate = allInterventions.length > 0 ? 
      successfulInterventions.length / allInterventions.length : 0;
    
    const recentDeployments = Array.from(this.deployments.values())
      .filter(d => d.startTime > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .length;
    
    const lastModelUpdate = Array.from(this.aiModels.values())
      .reduce((latest, model) => {
        return !latest || model.lastTrained > latest ? model.lastTrained : latest;
      }, null as Date | null);

    return {
      totalInterventions: allInterventions.length,
      successRate,
      problemTypesLearned: problemTypes.size,
      averageConfidence: avgConfidence,
      recentDeployments,
      lastModelUpdate,
    };
  }

  async getDashboardData(): Promise<DashboardData> {
    const activeProblems = await this.getActiveProblem();
    const currentMetrics = await this.getLatestMetrics();
    const allPlugins = await this.getPlugins();
    const activeCodeIssues = await this.getActiveCodeIssues();
    const lastCodeAnalysisRun = await this.getLatestCodeAnalysisRun();
    const config = await this.getFrameworkConfig();
    const aiLearningStats = await this.getAiLearningStats();
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
        filesChanged: deployment.filesChanged,
      })),
      activeDeployments: activeDeployments.map(deployment => ({
        id: deployment.id,
        type: deployment.type,
        status: deployment.status,
        description: deployment.description,
        startTime: deployment.startTime,
        duration: undefined, // Active deployments don't have end time yet
        initiatedBy: deployment.initiatedBy,
        filesChanged: deployment.filesChanged,
      })),
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
