import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const problems = pgTable("problems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata").default({}),
  resolved: boolean("resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
});

export const metrics = pgTable("metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  cpuUsage: integer("cpu_usage"),
  memoryUsage: integer("memory_usage"),
  diskUsage: integer("disk_usage"),
  loadAverage: integer("load_average"),
  networkConnections: integer("network_connections"),
  processes: integer("processes"),
  metadata: jsonb("metadata").default({}),
});

export const logEntries = pgTable("log_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  rawLine: text("raw_line"),
  metadata: jsonb("metadata").default({}),
});

export const plugins = pgTable("plugins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  version: text("version").notNull(),
  type: text("type").notNull(), // collector, detector, remediator
  status: text("status").notNull(), // running, stopped, error
  config: jsonb("config").default({}),
  lastUpdate: timestamp("last_update").notNull(),
});

export const frameworkConfig = pgTable("framework_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverType: text("server_type").default("generic"),
  monitoringInterval: integer("monitoring_interval").default(30),
  learningEnabled: boolean("learning_enabled").default(true),
  autoRemediation: boolean("auto_remediation").default(true),
  logLevel: text("log_level").default("INFO"),
  dataDir: text("data_dir").default("./data"),
  logFiles: jsonb("log_files").default([]),
  // Code Analysis Configuration
  codeAnalysisEnabled: boolean("code_analysis_enabled").default(false),
  sourceDirectories: jsonb("source_directories").default([]),
  autoFixEnabled: boolean("auto_fix_enabled").default(false),
  confidenceThreshold: integer("confidence_threshold").default(70), // stored as percentage (0-100)
  backupDirectory: text("backup_directory").default("./backups"),
  
  // AI Learning Configuration
  aiLearningEnabled: boolean("ai_learning_enabled").default(false),
  aiModelDir: text("ai_model_dir").default("./ai_models"),
  aiMinConfidence: integer("ai_min_confidence").default(75), // stored as percentage (0-100)
  aiMaxRiskScore: integer("ai_max_risk_score").default(30), // stored as percentage (0-100)
  aiMinSuccessProbability: integer("ai_min_success_probability").default(80), // stored as percentage (0-100)
  aiMaxDeploymentsPerHour: integer("ai_max_deployments_per_hour").default(2),
  aiRequireApproval: boolean("ai_require_approval").default(true),
  aiLearningRate: integer("ai_learning_rate").default(10), // stored as percentage (0-100)
  aiRetrainFrequency: integer("ai_retrain_frequency").default(50),
  
  // Deployment Configuration
  deploymentEnabled: boolean("deployment_enabled").default(false),
  gitRepoPath: text("git_repo_path").default("."),
  useDocker: boolean("use_docker").default(true),
  useKubernetes: boolean("use_kubernetes").default(false),
  deploymentStrategies: jsonb("deployment_strategies").default({"low_risk": "direct_deployment", "medium_risk": "canary_deployment", "high_risk": "blue_green_deployment"}),
  testCommands: jsonb("test_commands").default(["python -m pytest tests/ -v"]),
  dockerImageName: text("docker_image_name").default("mcp-server"),
  k8sDeploymentName: text("k8s_deployment_name").default("mcp-server-deployment"),
  k8sNamespace: text("k8s_namespace").default("production"),
  restartCommand: text("restart_command").default("sudo systemctl restart mcp-server"),
  rollbackTimeout: integer("rollback_timeout").default(300),
  
  // Safety and Monitoring Configuration
  businessHoursRestriction: boolean("business_hours_restriction").default(true),
  maxConcurrentDeployments: integer("max_concurrent_deployments").default(1),
  monitoringPeriod: integer("monitoring_period").default(600),
  autoRollbackTriggers: jsonb("auto_rollback_triggers").default({"error_rate_increase": 0.5, "response_time_increase": 1.0, "availability_drop": 0.05}),
  emergencyContacts: jsonb("emergency_contacts").default(["devops@company.com"]),
  
  updatedAt: timestamp("updated_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProblemSchema = createInsertSchema(problems).omit({
  id: true,
  resolvedAt: true,
});

export const insertMetricsSchema = createInsertSchema(metrics).omit({
  id: true,
});

export const insertLogEntrySchema = createInsertSchema(logEntries).omit({
  id: true,
});

export const insertPluginSchema = createInsertSchema(plugins).omit({
  id: true,
  lastUpdate: true,
});

export const insertFrameworkConfigSchema = createInsertSchema(frameworkConfig).omit({
  id: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problems.$inferSelect;

export type InsertMetrics = z.infer<typeof insertMetricsSchema>;
export type Metrics = typeof metrics.$inferSelect;

export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type LogEntry = typeof logEntries.$inferSelect;

export type InsertPlugin = z.infer<typeof insertPluginSchema>;
export type Plugin = typeof plugins.$inferSelect;

export type InsertFrameworkConfig = z.infer<typeof insertFrameworkConfigSchema>;
export type FrameworkConfig = typeof frameworkConfig.$inferSelect;

// Code Analysis types
export const codeIssues = pgTable("code_issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueType: text("issue_type").notNull(), // syntax_error, logic_error, security_issue, performance_issue
  severity: text("severity").notNull(), // LOW, MEDIUM, HIGH, CRITICAL
  description: text("description").notNull(),
  filePath: text("file_path").notNull(),
  lineNumber: integer("line_number"),
  functionName: text("function_name"),
  confidence: integer("confidence").notNull(), // 0-100
  suggestedFix: text("suggested_fix"),
  fixApplied: boolean("fix_applied").default(false),
  timestamp: timestamp("timestamp").notNull(),
  metadata: jsonb("metadata").default({}),
});

export const codeAnalysisRuns = pgTable("code_analysis_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  sourceDirectories: jsonb("source_directories").notNull(),
  filesAnalyzed: integer("files_analyzed").notNull(),
  issuesFound: integer("issues_found").notNull(),
  fixesApplied: integer("fixes_applied").default(0),
  status: text("status").notNull(), // running, completed, failed
  duration: integer("duration_ms"), // in milliseconds
  metadata: jsonb("metadata").default({}),
});

// Insert schemas for new tables
export const insertCodeIssueSchema = createInsertSchema(codeIssues).omit({
  id: true,
});

export const insertCodeAnalysisRunSchema = createInsertSchema(codeAnalysisRuns).omit({
  id: true,
});

// Types for new tables
export type InsertCodeIssue = z.infer<typeof insertCodeIssueSchema>;
export type CodeIssue = typeof codeIssues.$inferSelect;

export type InsertCodeAnalysisRun = z.infer<typeof insertCodeAnalysisRunSchema>;
export type CodeAnalysisRun = typeof codeAnalysisRuns.$inferSelect;

// API Response types
export interface SystemStatus {
  running: boolean;
  uptime: string;
  pluginCount: number;
  activeProblems: number;
  lastUpdate: string;
  codeAnalysisEnabled?: boolean;
  codeIssuesCount?: number;
  aiLearningEnabled?: boolean;
  deploymentEnabled?: boolean;
  activeDeployments?: number;
  pendingAiInterventions?: number;
}

export interface DashboardData {
  status: SystemStatus;
  recentProblems: Problem[];
  currentMetrics: Metrics | null;
  pluginStatus: Plugin[];
  codeIssues?: CodeIssue[];
  lastCodeAnalysisRun?: CodeAnalysisRun | null;
  aiLearningStats?: AiLearningStats;
  recentDeployments?: DeploymentSummary[];
  activeDeployments?: DeploymentSummary[];
}

export interface LogFilterOptions {
  level?: string;
  source?: string;
  limit?: number;
  since?: Date;
}

// Code Analysis specific interfaces
export interface CodeAnalysisConfig {
  enabled: boolean;
  sourceDirectories: string[];
  autoFix: boolean;
  confidenceThreshold: number; // 0.0 - 1.0
  backupDirectory: string;
}

export interface CodeAnalysisReport {
  id: string;
  timestamp: Date;
  filesAnalyzed: number;
  issuesFound: CodeIssue[];
  fixesApplied: number;
  duration: number;
  status: 'running' | 'completed' | 'failed';
}

export interface CodeFixSuggestion {
  issueId: string;
  description: string;
  confidence: number;
  originalCode: string;
  suggestedCode: string;
  reasoning: string;
}

// AI Learning and Deployment tables
export const aiInterventions = pgTable("ai_interventions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  problemType: text("problem_type").notNull(),
  issueDescription: text("issue_description").notNull(),
  solutionApplied: text("solution_applied").notNull(),
  confidence: integer("confidence").notNull(), // 0-100
  riskScore: integer("risk_score").notNull(), // 0-100
  outcome: text("outcome").notNull(), // success, failure, partial
  timestamp: timestamp("timestamp").notNull(),
  deploymentId: varchar("deployment_id"),
  codeIssueId: varchar("code_issue_id"),
  metadata: jsonb("metadata").default({}),
});

export const deployments = pgTable("deployments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // ai_fix, manual_fix, rollback
  strategy: text("strategy").notNull(), // direct_deployment, canary_deployment, blue_green_deployment
  status: text("status").notNull(), // pending, in_progress, completed, failed, rolled_back
  initiatedBy: text("initiated_by").notNull(), // ai_system, user_manual
  commitHash: text("commit_hash"),
  description: text("description").notNull(),
  filesChanged: jsonb("files_changed").default([]),
  testResults: jsonb("test_results").default({}),
  rollbackCommitHash: text("rollback_commit_hash"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration_ms"), // in milliseconds
  metadata: jsonb("metadata").default({}),
});

export const aiModels = pgTable("ai_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull(),
  problemType: text("problem_type").notNull(),
  modelPath: text("model_path").notNull(),
  accuracy: integer("accuracy"), // 0-100
  trainingDataSize: integer("training_data_size"),
  lastTrained: timestamp("last_trained").notNull(),
  isActive: boolean("is_active").default(true),
  metadata: jsonb("metadata").default({}),
});

export const deploymentMetrics = pgTable("deployment_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  deploymentId: varchar("deployment_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  errorRate: integer("error_rate"), // stored as percentage * 100 (e.g., 0.05% = 5)
  responseTime: integer("response_time_ms"),
  availability: integer("availability"), // stored as percentage (0-100)
  cpuUsage: integer("cpu_usage"),
  memoryUsage: integer("memory_usage"),
  requestCount: integer("request_count"),
  metadata: jsonb("metadata").default({}),
});

// Insert schemas for new tables
export const insertAiInterventionSchema = createInsertSchema(aiInterventions).omit({
  id: true,
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  endTime: true,
  duration: true,
});

export const insertAiModelSchema = createInsertSchema(aiModels).omit({
  id: true,
});

export const insertDeploymentMetricsSchema = createInsertSchema(deploymentMetrics).omit({
  id: true,
});

// Types for new tables
export type InsertAiIntervention = z.infer<typeof insertAiInterventionSchema>;
export type AiIntervention = typeof aiInterventions.$inferSelect;

export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

export type InsertAiModel = z.infer<typeof insertAiModelSchema>;
export type AiModel = typeof aiModels.$inferSelect;

export type InsertDeploymentMetrics = z.infer<typeof insertDeploymentMetricsSchema>;
export type DeploymentMetrics = typeof deploymentMetrics.$inferSelect;

// Enhanced interfaces
export interface AiLearningConfig {
  enabled: boolean;
  modelDir: string;
  minConfidence: number; // 0.0 - 1.0
  maxRiskScore: number; // 0.0 - 1.0
  minSuccessProbability: number; // 0.0 - 1.0
  maxDeploymentsPerHour: number;
  requireApproval: boolean;
  learningRate: number; // 0.0 - 1.0
  retrainFrequency: number;
}

export interface DeploymentConfig {
  enabled: boolean;
  gitRepoPath: string;
  useDocker: boolean;
  useKubernetes: boolean;
  deploymentStrategies: Record<string, string>;
  testCommands: string[];
  dockerImageName: string;
  k8sDeploymentName: string;
  k8sNamespace: string;
  restartCommand: string;
  rollbackTimeout: number;
}

export interface SafetyConfig {
  businessHoursRestriction: boolean;
  maxConcurrentDeployments: number;
  monitoringPeriod: number;
  autoRollbackTriggers: {
    errorRateIncrease: number;
    responseTimeIncrease: number;
    availabilityDrop: number;
  };
  emergencyContacts: string[];
}

export interface AiLearningStats {
  totalInterventions: number;
  successRate: number;
  problemTypesLearned: number;
  averageConfidence: number;
  recentDeployments: number;
  lastModelUpdate: Date | null;
}

export interface DeploymentSummary {
  id: string;
  type: string;
  status: string;
  description: string;
  startTime: Date;
  duration?: number;
  initiatedBy: string;
  filesChanged: string[];
}

// ============================================================================
// MCP SERVER TABLES
// ============================================================================

export const mcpServers = pgTable("mcp_servers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: text("server_id").notNull().unique(),
  name: text("name").notNull(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  protocol: text("protocol").notNull(), // http, https, websocket
  status: text("status").notNull(), // running, stopped, unknown
  
  // Process information
  pid: integer("pid"),
  processName: text("process_name"),
  commandLine: text("command_line"),
  workingDirectory: text("working_directory"),
  
  // Code location
  executablePath: text("executable_path"),
  sourceDirectory: text("source_directory"),
  configFile: text("config_file"),
  logFiles: text("log_files").array(),
  
  // Runtime information
  version: text("version"),
  capabilities: text("capabilities").array(),
  healthEndpoint: text("health_endpoint"),
  metricsEndpoint: text("metrics_endpoint"),
  
  // Container information (if containerized)
  containerId: text("container_id"),
  containerName: text("container_name"),
  imageName: text("image_name"),
  
  // Discovery metadata
  discoveryMethod: text("discovery_method").notNull(),
  discoveredAt: timestamp("discovered_at").notNull(),
  lastSeen: timestamp("last_seen").notNull(),
  
  metadata: jsonb("metadata").default({}),
});

export const mcpServerMetrics = pgTable("mcp_server_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  serverId: text("server_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  
  // Basic metrics
  responseTime: integer("response_time"), // milliseconds
  uptime: integer("uptime"), // seconds
  requestCount: integer("request_count"),
  errorCount: integer("error_count"),
  
  // Process metrics
  processCpuPercent: integer("process_cpu_percent"), // percentage
  processMemoryMb: integer("process_memory_mb"),
  processThreads: integer("process_threads"),
  processOpenFiles: integer("process_open_files"),
  processConnections: integer("process_connections"),
  
  metadata: jsonb("metadata").default({}),
});

// MCP Server schemas and types
export const insertMcpServerSchema = createInsertSchema(mcpServers);
export const insertMcpServerMetricsSchema = createInsertSchema(mcpServerMetrics);

export type MCPServer = typeof mcpServers.$inferSelect;
export type InsertMCPServer = z.infer<typeof insertMcpServerSchema>;
export type MCPServerMetrics = typeof mcpServerMetrics.$inferSelect;
export type InsertMCPServerMetrics = z.infer<typeof insertMcpServerMetricsSchema>;

// MCP Server dashboard data
export interface MCPServerDashboardData {
  totalServers: number;
  runningServers: number;
  stoppedServers: number;
  averageResponseTime: number;
  totalErrors: number;
  recentDiscoveries: number;
  serversByProtocol: Record<string, number>;
  serversByDiscoveryMethod: Record<string, number>;
}
