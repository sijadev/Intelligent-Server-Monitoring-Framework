/**
 * Core Service Interfaces and Abstractions
 * Defines contracts for all services in the IMF system
 */

import { EventEmitter } from 'events';

// ============================================================================
// CORE SERVICE INTERFACES
// ============================================================================

/**
 * Base interface for all services in the system
 */
export interface IService {
  readonly name: string;
  readonly version: string;

  initialize(): Promise<void>;
  cleanup(): Promise<void>;
  getHealthStatus(): ServiceHealthStatus;
}

/**
 * Service health status information
 */
export interface ServiceHealthStatus {
  healthy: boolean;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  details?: any;
  lastCheck: Date;
  uptime?: number;
}

/**
 * Service with lifecycle events
 */
export interface IServiceWithEvents extends IService {
  on(event: 'initialized' | 'error' | 'stopped', listener: (...args: any[]) => void): this;
  emit(event: string, ...args: any[]): boolean;
}

// ============================================================================
// STORAGE INTERFACES
// ============================================================================

/**
 * Generic repository interface for data access
 */
export interface IRepository<T, K = string> {
  findById(id: K): Promise<T | null>;
  findAll(options?: QueryOptions): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T | null>;
  delete(id: K): Promise<boolean>;
  count(filter?: any): Promise<number>;
}

/**
 * Query options for repository operations
 */
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  filter?: any;
}

/**
 * Storage service interface
 */
export interface IStorageService extends IService {
  isConnected(): boolean;
  getConnection(): any;
  beginTransaction(): Promise<ITransaction>;
  query(sql: string, params?: any[]): Promise<any>;
}

/**
 * Transaction interface
 */
export interface ITransaction {
  commit(): Promise<void>;
  rollback(): Promise<void>;
  query(sql: string, params?: any[]): Promise<any>;
}

// ============================================================================
// MONITORING INTERFACES
// ============================================================================

/**
 * Metrics data structure
 */
export interface MetricsData {
  timestamp: Date;
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  customMetrics?: Record<string, number>;
}

/**
 * Metrics collector interface
 */
export interface IMetricsCollector extends IService {
  collect(): Promise<MetricsData>;
  getLatestMetrics(): MetricsData | null;
}

/**
 * Problem detection interface
 */
export interface IProblemDetector extends IService {
  detectProblems(metrics: MetricsData, history?: MetricsData[]): Promise<DetectedProblem[]>;
}

/**
 * Detected problem structure
 */
export interface DetectedProblem {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  suggestedActions?: string[];
}

// ============================================================================
// PYTHON FRAMEWORK INTERFACES
// ============================================================================

/**
 * Python framework service interface
 */
export interface IPythonFrameworkService extends IServiceWithEvents {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  sendCommand(command: string, data?: any): Promise<any>;
  getStatus(): PythonFrameworkStatus;
  isRunning(): boolean;
}

/**
 * Python framework status
 */
export interface PythonFrameworkStatus {
  running: boolean;
  pid?: number;
  apiUrl: string;
  lastResponse?: Date;
  error?: string;
}

// ============================================================================
// TEST MANAGEMENT INTERFACES
// ============================================================================

/**
 * Test manager service interface
 */
export interface ITestManagerService extends IServiceWithEvents {
  runTest(testId: string, options?: TestOptions): Promise<TestResult>;
  getTestResults(testId?: string): Promise<TestResult[]>;
  generateTestData(scenario: string, count?: number): Promise<TestDataResult>;
  validateTestEnvironment(): Promise<ValidationResult>;
}

/**
 * Test execution options
 */
export interface TestOptions {
  timeout?: number;
  parallel?: boolean;
  environment?: 'test' | 'staging' | 'production';
  tags?: string[];
}

/**
 * Test result structure
 */
export interface TestResult {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  duration: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Test data generation result
 */
export interface TestDataResult {
  id: string;
  scenario: string;
  dataCount: number;
  generatedAt: Date;
  data: any[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  checkedItems: string[];
}

// ============================================================================
// LOGGING INTERFACES
// ============================================================================

/**
 * Log entry structure
 */
export interface ILogEntry {
  id?: string;
  timestamp: Date;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
  message: string;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * Logger service interface
 */
export interface ILoggerService extends IService {
  log(level: string, source: string, message: string, metadata?: any): Promise<void>;
  getRecentLogs(limit?: number, filter?: LogFilter): Promise<ILogEntry[]>;
  captureLog(entry: ILogEntry): Promise<void>;
}

/**
 * Log filtering options
 */
export interface LogFilter {
  level?: string;
  source?: string;
  since?: Date;
  until?: Date;
  search?: string;
}

// ============================================================================
// PLUGIN INTERFACES
// ============================================================================

/**
 * Plugin interface
 */
export interface IPlugin extends IService {
  readonly type: 'collector' | 'detector' | 'remediator' | 'notifier';
  readonly dependencies: string[];

  configure(config: PluginConfig): Promise<void>;
  execute(context: PluginContext): Promise<PluginResult>;
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  enabled: boolean;
  settings: Record<string, any>;
  schedule?: string;
}

/**
 * Plugin execution context
 */
export interface PluginContext {
  metrics?: MetricsData;
  problems?: DetectedProblem[];
  logs?: ILogEntry[];
  config: Record<string, any>;
}

/**
 * Plugin execution result
 */
export interface PluginResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// SERVICE FACTORY INTERFACE
// ============================================================================

/**
 * Service factory for creating and managing services
 */
export interface IServiceFactory {
  createService<T extends IService>(name: string, config?: any): Promise<T>;
  getService<T extends IService>(name: string): T | null;
  getAllServices(): IService[];
  destroyService(name: string): Promise<void>;
}

// ============================================================================
// DEPENDENCY INJECTION INTERFACES
// ============================================================================

/**
 * Dependency injection container interface
 */
export interface IDependencyContainer {
  register<T>(name: string, factory: () => T | Promise<T>, options?: DIOptions): void;
  registerSingleton<T>(name: string, factory: () => T | Promise<T>): void;
  resolve<T>(name: string): Promise<T>;
  has(name: string): boolean;
  clear(): void;
}

/**
 * Dependency injection options
 */
export interface DIOptions {
  singleton?: boolean;
  lazy?: boolean;
  dependencies?: string[];
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

/**
 * Configuration provider interface
 */
export interface IConfigurationProvider {
  get<T = any>(key: string, defaultValue?: T): T;
  set(key: string, value: any): void;
  has(key: string): boolean;
  getSection(section: string): Record<string, any>;
  reload(): Promise<void>;
}

/**
 * Environment-aware configuration
 */
export interface IEnvironmentConfig extends IConfigurationProvider {
  readonly environment: 'development' | 'test' | 'staging' | 'production';
  readonly isDevelopment: boolean;
  readonly isProduction: boolean;
  readonly isTest: boolean;
}
