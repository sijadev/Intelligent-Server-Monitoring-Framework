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
}

export interface DashboardData {
  status: SystemStatus;
  recentProblems: Problem[];
  currentMetrics: Metrics | null;
  pluginStatus: Plugin[];
  codeIssues?: CodeIssue[];
  lastCodeAnalysisRun?: CodeAnalysisRun | null;
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
