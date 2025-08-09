/**
 * Refactored Python Framework Service
 * Implements proper service patterns and abstractions
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs/promises';
import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  IPythonFrameworkService,
  PythonFrameworkStatus,
  MetricsData,
  DetectedProblem,
  ILoggerService,
  IConfigurationProvider,
} from '../interfaces/service.interfaces';
import { BaseService } from '../core/base-service';

// ============================================================================
// PYTHON FRAMEWORK SERVICE INTERFACES
// ============================================================================

interface PythonFrameworkConfig {
  pythonPath: string;
  configPath: string;
  apiUrl: string;
  healthCheckInterval: number;
  maxRestartAttempts: number;
  restartDelay: number;
  timeout: number;
}

interface PythonApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

interface PythonFrameworkData {
  problems?: DetectedProblem[];
  metrics?: MetricsData;
  status?: {
    running: boolean;
    pid?: number;
    error?: string;
  };
}

// ============================================================================
// PYTHON API CLIENT
// ============================================================================

/**
 * Dedicated client for Python framework API communication
 */
class PythonApiClient {
  private client: AxiosInstance;
  private logger?: ILoggerService;

  constructor(apiUrl: string, timeout: number = 5000, logger?: ILoggerService) {
    this.logger = logger;
    this.client = axios.create({
      baseURL: apiUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IMF-Server/1.0.0',
      },
    });

    // Add response interceptor for consistent error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error),
    );
  }

  /**
   * Check if Python API is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200 && response.data?.status === 'healthy';
    } catch (error) {
      await this.logger?.log('DEBUG', 'python-api-client', `Health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get framework status
   */
  async getStatus(): Promise<PythonFrameworkData | null> {
    try {
      const response = await this.client.get<PythonApiResponse<PythonFrameworkData>>('/status');
      return response.data.data || null;
    } catch (error) {
      await this.logger?.log('WARN', 'python-api-client', `Failed to get status: ${error.message}`);
      return null;
    }
  }

  /**
   * Send command to Python framework
   */
  async sendCommand(command: string, data?: any): Promise<any> {
    try {
      const response = await this.client.post<PythonApiResponse>('/command', {
        command,
        data,
        timestamp: new Date().toISOString(),
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Command execution failed');
      }

      return response.data.data;
    } catch (error) {
      await this.logger?.log(
        'ERROR',
        'python-api-client',
        `Command '${command}' failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get framework metrics
   */
  async getMetrics(): Promise<MetricsData | null> {
    try {
      const response = await this.client.get<PythonApiResponse<MetricsData>>('/metrics');
      return response.data.data || null;
    } catch (error) {
      await this.logger?.log(
        'DEBUG',
        'python-api-client',
        `Failed to get metrics: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Get detected problems
   */
  async getProblems(): Promise<DetectedProblem[]> {
    try {
      const response = await this.client.get<PythonApiResponse<DetectedProblem[]>>('/problems');
      return response.data.data || [];
    } catch (error) {
      await this.logger?.log(
        'DEBUG',
        'python-api-client',
        `Failed to get problems: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Update API URL (for container environments)
   */
  updateApiUrl(newUrl: string): void {
    this.client.defaults.baseURL = newUrl;
  }

  /**
   * Handle API errors consistently
   */
  private async handleApiError(error: AxiosError): Promise<never> {
    const message = error.response?.data?.error || error.message;
    const status = error.response?.status;

    await this.logger?.log('ERROR', 'python-api-client', `API error (${status}): ${message}`, {
      url: error.config?.url,
      method: error.config?.method,
    });

    throw new Error(`Python API error: ${message}`);
  }
}

// ============================================================================
// PYTHON PROCESS MANAGER
// ============================================================================

/**
 * Manages the Python framework process lifecycle
 */
class PythonProcessManager {
  private process?: ChildProcess;
  private logger?: ILoggerService;
  private restartAttempts = 0;

  constructor(
    private readonly config: PythonFrameworkConfig,
    logger?: ILoggerService,
  ) {
    this.logger = logger;
  }

  /**
   * Start Python framework process
   */
  async start(): Promise<void> {
    if (this.process && !this.process.killed) {
      await this.logger?.log('WARN', 'python-process-manager', 'Python process is already running');
      return;
    }

    try {
      await this.logger?.log(
        'INFO',
        'python-process-manager',
        `Starting Python framework: ${this.config.pythonPath}`,
      );

      this.process = spawn('python', [this.config.pythonPath], {
        cwd: path.dirname(this.config.pythonPath),
        env: {
          ...process.env,
          PYTHONPATH: path.dirname(this.config.pythonPath),
          IMF_CONFIG_PATH: this.config.configPath,
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.setupProcessHandlers();

      // Wait for process to start
      await this.waitForProcessStart();

      this.restartAttempts = 0;
      await this.logger?.log(
        'INFO',
        'python-process-manager',
        `Python framework started with PID: ${this.process.pid}`,
      );
    } catch (error) {
      await this.logger?.log(
        'ERROR',
        'python-process-manager',
        `Failed to start Python framework: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Stop Python framework process
   */
  async stop(): Promise<void> {
    if (!this.process || this.process.killed) {
      return;
    }

    try {
      await this.logger?.log('INFO', 'python-process-manager', 'Stopping Python framework process');

      // Graceful shutdown
      this.process.kill('SIGTERM');

      // Wait for graceful shutdown
      const shutdownPromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);

        this.process?.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });

      await shutdownPromise;
      this.process = undefined;

      await this.logger?.log('INFO', 'python-process-manager', 'Python framework process stopped');
    } catch (error) {
      await this.logger?.log(
        'ERROR',
        'python-process-manager',
        `Error stopping Python framework: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Restart Python framework process
   */
  async restart(): Promise<void> {
    await this.logger?.log('INFO', 'python-process-manager', 'Restarting Python framework');

    await this.stop();
    await new Promise((resolve) => setTimeout(resolve, this.config.restartDelay));
    await this.start();
  }

  /**
   * Check if process is running
   */
  isRunning(): boolean {
    return !!(this.process && !this.process.killed);
  }

  /**
   * Get process PID
   */
  getPid(): number | undefined {
    return this.process?.pid;
  }

  /**
   * Setup process event handlers
   */
  private setupProcessHandlers(): void {
    if (!this.process) return;

    this.process.stdout?.on('data', (data) => {
      this.logger?.log('DEBUG', 'python-stdout', data.toString().trim());
    });

    this.process.stderr?.on('data', (data) => {
      this.logger?.log('WARN', 'python-stderr', data.toString().trim());
    });

    this.process.on('error', async (error) => {
      await this.logger?.log(
        'ERROR',
        'python-process-manager',
        `Python process error: ${error.message}`,
      );
    });

    this.process.on('exit', async (code, signal) => {
      await this.logger?.log(
        'INFO',
        'python-process-manager',
        `Python process exited with code: ${code}, signal: ${signal}`,
      );

      // Auto-restart on unexpected exit
      if (code !== 0 && this.restartAttempts < this.config.maxRestartAttempts) {
        this.restartAttempts++;
        await this.logger?.log(
          'INFO',
          'python-process-manager',
          `Auto-restarting Python framework (attempt ${this.restartAttempts}/${this.config.maxRestartAttempts})`,
        );

        setTimeout(() => this.start(), this.config.restartDelay);
      }
    });
  }

  /**
   * Wait for process to start properly
   */
  private async waitForProcessStart(): Promise<void> {
    if (!this.process) {
      throw new Error('Process not started');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Python process start timeout'));
      }, this.config.timeout);

      // Check if process exits immediately
      this.process!.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Python process exited with code: ${code}`));
        }
      });

      // Assume started if no immediate exit
      setTimeout(() => {
        clearTimeout(timeout);
        resolve();
      }, 2000);
    });
  }
}

// ============================================================================
// MAIN PYTHON FRAMEWORK SERVICE
// ============================================================================

/**
 * Refactored Python Framework Service with proper patterns
 */
export class PythonFrameworkService extends BaseService implements IPythonFrameworkService {
  private apiClient: PythonApiClient;
  private processManager: PythonProcessManager;
  private config: PythonFrameworkConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<PythonFrameworkConfig>) {
    super('python-framework', '2.0.0');

    // Default configuration
    this.config = {
      pythonPath: path.join(process.cwd(), 'python-framework', 'main.py'),
      configPath: path.join(process.cwd(), 'python-framework', 'config.yaml'),
      apiUrl: 'http://localhost:8000',
      healthCheckInterval: 30000, // 30 seconds
      maxRestartAttempts: 3,
      restartDelay: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
      ...config,
    };

    this.processManager = new PythonProcessManager(this.config);
    this.apiClient = new PythonApiClient(this.config.apiUrl, this.config.timeout);
  }

  /**
   * Initialize the service
   */
  protected async onInitialize(): Promise<void> {
    const configProvider = this.dependencies.config as IConfigurationProvider;
    const logger = this.dependencies.logger as ILoggerService;

    // Update config from dependencies
    if (configProvider) {
      this.config.apiUrl = configProvider.get('PYTHON_API_URL', this.config.apiUrl);
      this.apiClient.updateApiUrl(this.config.apiUrl);
    }

    // Set logger for components
    this.processManager = new PythonProcessManager(this.config, logger);
    this.apiClient = new PythonApiClient(this.config.apiUrl, this.config.timeout, logger);

    // Try to connect to existing Python API first
    const isHealthy = await this.apiClient.checkHealth();
    if (isHealthy) {
      await logger?.log('INFO', this.name, 'Connected to existing Python framework API');
    } else {
      // Start Python process if API is not available
      await this.processManager.start();

      // Wait for API to be ready
      await this.waitForApiReady();
    }

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Cleanup the service
   */
  protected async onCleanup(): Promise<void> {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    await this.processManager.stop();
  }

  /**
   * Start the Python framework
   */
  async start(): Promise<void> {
    if (this.isRunning()) {
      return;
    }

    await this.processManager.start();
    await this.waitForApiReady();
    this.safeEmit('started');
  }

  /**
   * Stop the Python framework
   */
  async stop(): Promise<void> {
    await this.processManager.stop();
    this.safeEmit('stopped');
  }

  /**
   * Restart the Python framework
   */
  async restart(): Promise<void> {
    await this.processManager.restart();
    await this.waitForApiReady();
    this.safeEmit('restarted');
  }

  /**
   * Send command to Python framework
   */
  async sendCommand(command: string, data?: any): Promise<any> {
    return await this.executeWithErrorHandling(
      () => this.apiClient.sendCommand(command, data),
      `sendCommand(${command})`,
    );
  }

  /**
   * Get Python framework status
   */
  getStatus(): PythonFrameworkStatus {
    return {
      running: this.isRunning(),
      pid: this.processManager.getPid(),
      apiUrl: this.config.apiUrl,
      error: this._lastError?.message,
    };
  }

  /**
   * Check if Python framework is running
   */
  isRunning(): boolean {
    return this.processManager.isRunning();
  }

  /**
   * Get framework data (metrics, problems, etc.)
   */
  async getFrameworkData(): Promise<PythonFrameworkData | null> {
    return await this.apiClient.getStatus();
  }

  /**
   * Get framework metrics
   */
  async getMetrics(): Promise<MetricsData | null> {
    return await this.apiClient.getMetrics();
  }

  /**
   * Get detected problems
   */
  async getProblems(): Promise<DetectedProblem[]> {
    return await this.apiClient.getProblems();
  }

  /**
   * Wait for Python API to be ready
   */
  private async waitForApiReady(maxAttempts: number = 30): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const isHealthy = await this.apiClient.checkHealth();
      if (isHealthy) {
        const logger = this.dependencies.logger as ILoggerService;
        await logger?.log('INFO', this.name, `Python API is ready after ${attempt} attempts`);
        return;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    throw new Error(`Python API did not become ready after ${maxAttempts} attempts`);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(async () => {
      try {
        const isHealthy = await this.apiClient.checkHealth();
        if (!isHealthy && this.isRunning()) {
          const logger = this.dependencies.logger as ILoggerService;
          await logger?.log(
            'WARN',
            this.name,
            'Python API health check failed, attempting restart',
          );
          await this.restart();
        }
      } catch (error) {
        this.safeEmit('health:error', error);
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * Get detailed health information
   */
  protected getHealthDetails(): any {
    return {
      ...super.getHealthDetails(),
      processRunning: this.processManager.isRunning(),
      processPid: this.processManager.getPid(),
      apiUrl: this.config.apiUrl,
      restartAttempts: this.processManager['restartAttempts'] || 0,
      maxRestartAttempts: this.config.maxRestartAttempts,
    };
  }
}
