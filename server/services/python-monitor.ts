import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import axios from 'axios';
import YAML from 'yaml';
import { getPythonApiUrl } from '../config';
import {
  type Problem,
  type Metrics,
  type LogEntry,
  type Plugin,
  type FrameworkConfig,
} from '../../shared/schema.js';
import { storage } from '../storage-init';
import { logAggregator } from './log-aggregator';

export interface PythonFrameworkData {
  problems?: Problem[];
  metrics?: Metrics;
  logEntries?: LogEntry[];
  plugins?: Plugin[];
  status?: {
    running: boolean;
    error?: string;
  };
}

export class PythonMonitorService extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunning = false;
  private pythonPath: string;
  private configPath: string;
  private pythonApiUrl: string;
  private stdoutBuffer: string = '';
  private apiAvailable: boolean = false;
  private metricsBuffer: Metrics[] = [];
  private logBuffer: LogEntry[] = [];
  private bufferFlushInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners to handle multiple test scenarios
    this.pythonPath = path.join(process.cwd(), 'python-framework', 'main.py');
    this.configPath = path.join(process.cwd(), 'python-framework', 'config.yaml');
    // Use centralized configuration for Python API URL
    this.pythonApiUrl = getPythonApiUrl();
    // Start periodic buffer flush
    this.bufferFlushInterval = setInterval(() => this.flushBuffers().catch(() => {}), 2000);
  }

  // Report errors without crashing the process if no 'error' listeners are attached
  private reportFrameworkError(err: unknown): void {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('PythonMonitorService error:', message);
    try {
      logAggregator.logPythonFramework('error', message);
    } catch {}
    // Emit a safe custom event
    this.emit('framework-error', message);
    // Only emit the special 'error' event if someone listens for it
    if (this.listenerCount('error') > 0) {
      this.emit('error', message);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Check if Python container is already running
      const status = await this.checkPythonApiStatus();
      if (status.running) {
        this.isRunning = true;
        this.apiAvailable = true;
        console.log('✅ Python framework already running in container');
        return;
      }

      // Try to start via API
      await this.startViaApi();

      // Fallback to local process if container not available
      if (!this.isRunning) {
        await this.startLocalProcess();
      }
    } catch (error) {
      console.warn('⚠️ Failed to start via API, trying local process:', (error as any).message);
      this.apiAvailable = false;
      await this.startLocalProcess();
    }
  }

  private async checkPythonApiStatus(): Promise<{ running: boolean; error?: string }> {
    try {
      const response = await axios.get(`${this.pythonApiUrl}/status`, { timeout: 5000 });
      this.apiAvailable = !!response.data?.running;
      return response.data;
    } catch (error) {
      this.apiAvailable = false;
      return { running: false, error: (error as any).message };
    }
  }

  private async startViaApi(): Promise<void> {
    try {
      const response = await axios.post(`${this.pythonApiUrl}/restart`, {}, { timeout: 10000 });
      console.log('🚀 Started Python framework via API:', response.data.message);
      this.isRunning = true;
      this.apiAvailable = true;
    } catch (error) {
      this.apiAvailable = false;
      throw new Error(`Failed to start via API: ${(error as any).message}`);
    }
  }

  private async startLocalProcess(): Promise<void> {
    // Ensure config file exists
    await this.updateConfigFile();

    try {
      // Start Python process - use enhanced version for continuous monitoring
      const pythonScript = 'main.py';
      const scriptPath = path.join(path.dirname(this.pythonPath), pythonScript);

      // Use the virtual environment Python if available
      const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python3');
      const pythonCmd = await fs
        .access(venvPython)
        .then(() => venvPython)
        .catch(() => 'python3');

      console.log(`Starting Python Framework with: ${pythonCmd}`);

      this.process = spawn(pythonCmd, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.pythonPath),
        env: {
          ...process.env,
        },
      });

      this.isRunning = true;

      // Handle stdout data (JSONL/NDJSON output from framework) with chunk-safe parsing
      this.process.stdout?.on('data', (data) => {
        const chunk = data.toString();
        if (chunk.trim()) {
          logAggregator.logPythonFramework('output', chunk.trim());
        }
        this.handleStdoutChunk(chunk);
      });

      // Handle stderr (Python often outputs INFO logs here)
      this.process.stderr?.on('data', (data) => {
        const message = data.toString().trim();

        // Parse log level from Python logging format
        let logLevel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = 'INFO';
        if (message.includes(' - ERROR -')) {
          logLevel = 'ERROR';
        } else if (message.includes(' - WARNING -') || message.includes(' - WARN -')) {
          logLevel = 'WARN';
        } else if (message.includes(' - DEBUG -')) {
          logLevel = 'DEBUG';
        }

        // Log to our aggregator with proper level
        logAggregator.logPythonFramework('log', message, { level: logLevel });

        // Only emit error events for actual ERROR level logs
        if (logLevel === 'ERROR') {
          console.error('Python Framework Error:', message);
          // Don't emit error events to avoid unhandled error crashes
          // this.emit('error', message);
        } else {
          // Log INFO/WARN/DEBUG as regular console output
          if (logLevel === 'WARN') {
            console.warn('Python Framework:', message);
          } else {
            console.log('Python Framework:', message);
          }
        }
      });

      // Handle process exit
      this.process.on('exit', (code) => {
        console.log(`Python Framework exited with code ${code}`);
        this.isRunning = false;
        this.process = null;
        if (this.bufferFlushInterval) {
          clearInterval(this.bufferFlushInterval);
          this.bufferFlushInterval = null;
        }
        this.emit('exit', code);
      });

      // Handle process error
      this.process.on('error', (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Python Framework Process Error:', msg);
        this.isRunning = false;
        this.reportFrameworkError(msg);
      });

      console.log('Python Monitoring Framework started');
      logAggregator.logPythonFramework(
        'started',
        'Python monitoring framework successfully started',
      );
      this.emit('started');
    } catch (error) {
      console.error('Failed to start Python Framework:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.process) {
      return;
    }

    return new Promise((resolve) => {
      this.process!.on('exit', () => {
        this.isRunning = false;
        this.process = null;
        if (this.bufferFlushInterval) {
          clearInterval(this.bufferFlushInterval);
          this.bufferFlushInterval = null;
        }
        console.log('Python Monitoring Framework stopped');
        logAggregator.logPythonFramework('stopped', 'Python monitoring framework stopped');
        this.emit('stopped');
        resolve();
      });

      // Send SIGTERM first
      this.process!.kill('SIGTERM');

      // Force kill after 5 seconds if still running
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 5000);
    });
  }

  async restart(): Promise<void> {
    try {
      // Try API restart first
      await axios.post(`${this.pythonApiUrl}/restart`, {}, { timeout: 10000 });
      console.log('🔄 Restarted Python framework via API');
    } catch (error) {
      // Fallback to local restart
      {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn('⚠️ API restart failed, falling back to local restart:', msg);
      }
      await this.stop();
      await this.start();
    }
  }

  async getFrameworkData(): Promise<PythonFrameworkData> {
    try {
      // Try to get data from API first
      const response = await axios.get(`${this.pythonApiUrl}/data`, { timeout: 5000 });
      return {
        problems: response.data.problems || [],
        metrics: response.data.metrics ?? undefined,
        logEntries: [], // Will be handled separately
        plugins: response.data.plugins || [],
        status: response.data.status || { running: false },
      };
    } catch (error) {
      // Return empty data if API not available
      return {
        problems: [],
        metrics: undefined,
        logEntries: [],
        plugins: [],
        status: { running: false, error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  getStatus(): { running: boolean; hasProcess: boolean; apiAvailable?: boolean } {
    return {
      running: this.isRunning,
      hasProcess: this.process !== null,
      apiAvailable: this.apiAvailable,
    };
  }

  async sendCommand(command: string, data?: any): Promise<void> {
    if (!this.isRunning || !this.process || !this.process.stdin) {
      throw new Error('Python Framework is not running');
    }

    const message = JSON.stringify({ command, data }) + '\n';
    this.process.stdin.write(message);
  }

  private ensureDate(value: any, context: string): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string') {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date string in ${context}: ${value}, using current time`);
        return new Date();
      }
      return date;
    }
    if (typeof value === 'number') {
      return new Date(value);
    }
    console.warn(`Invalid timestamp type in ${context}: ${typeof value}, using current time`);
    return new Date();
  }

  // Handle stdout chunk with buffer to safely parse line-delimited JSON
  private async handleStdoutChunk(chunk: string): Promise<void> {
    const MAX_BUFFER = 1024 * 1024; // 1MB safety cap
    this.stdoutBuffer += chunk;

    // Prevent unbounded growth
    if (this.stdoutBuffer.length > MAX_BUFFER) {
      console.warn('Python stdout buffer exceeded max size, resetting buffer');
      this.stdoutBuffer = '';
      return;
    }

    let newlineIndex: number;
    while ((newlineIndex = this.stdoutBuffer.indexOf('\n')) !== -1) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (!line) continue;

      try {
        const data = JSON.parse(line);
        await this.processFrameworkData(data);
      } catch (err) {
        // Not JSON, treat as log line
        logAggregator.logPythonFramework('non-json-output', line);
        console.log('Python Framework Log:', line);
      }
    }
  }

  private async processFrameworkData(data: PythonFrameworkData): Promise<void> {
    try {
      // Store problems
      if (data.problems) {
        for (const problem of data.problems) {
          await storage.createProblem({
            type: problem.type,
            severity: problem.severity,
            description: problem.description,
            timestamp: this.ensureDate(problem.timestamp, 'problem.timestamp'),
            metadata: problem.metadata || {},
          });
        }
        this.emit('problems', data.problems);
      }

      // Store metrics
      if (data.metrics) {
        const buffered: Metrics = {
          ...data.metrics,
          timestamp: this.ensureDate(data.metrics.timestamp, 'metrics.timestamp'),
        } as Metrics;
        this.metricsBuffer.push(buffered);
        if (this.metricsBuffer.length > 100) {
          await this.flushBuffers();
        }
        this.emit('metrics', data.metrics);
      }

      // Store log entries
      if (data.logEntries) {
        for (const logEntry of data.logEntries) {
          const buffered: LogEntry = {
            ...logEntry,
            timestamp: this.ensureDate(logEntry.timestamp, 'logEntry.timestamp'),
          } as LogEntry;
          this.logBuffer.push(buffered);
        }
        if (this.logBuffer.length > 250) {
          await this.flushBuffers();
        }
        this.emit('logEntries', data.logEntries);
      }

      // Update plugins
      if (data.plugins) {
        for (const plugin of data.plugins) {
          await storage.createOrUpdatePlugin({
            name: plugin.name,
            version: plugin.version,
            type: plugin.type,
            status: plugin.status,
            config: plugin.config || {},
          });
        }
        this.emit('plugins', data.plugins);
      }

      // Handle status updates
      if (data.status) {
        this.emit('status', data.status);
      }
    } catch (error) {
      console.error('Error processing framework data:', error);
      this.emit('error', error);
    }
  }

  private async flushBuffers(): Promise<void> {
    try {
      if (this.metricsBuffer.length > 0) {
        const items = this.metricsBuffer.splice(0, this.metricsBuffer.length);
        for (const m of items) {
          await storage.createMetrics({
            ...m,
            metadata: (m as any).metadata ?? {},
          });
        }
      }
      if (this.logBuffer.length > 0) {
        const items = this.logBuffer.splice(0, this.logBuffer.length);
        for (const l of items) {
          await storage.createLogEntry({
            ...l,
            metadata: (l as any).metadata ?? {},
          });
        }
      }
    } catch (err) {
      console.warn('Buffer flush error:', err instanceof Error ? err.message : String(err));
    }
  }

  private async updateConfigFile(): Promise<void> {
    try {
      const config = await storage.getFrameworkConfig();
      if (!config) {
        throw new Error('No framework configuration found');
      }

      const yamlConfig = this.convertToYaml(config);
      await fs.writeFile(this.configPath, yamlConfig, 'utf8');
    } catch (error) {
      console.error('Failed to update config file:', error);
      throw error;
    }
  }

  private convertToYaml(config: FrameworkConfig): string {
    const cfg: any = {
      // Intelligent Monitoring Framework Configuration
      server_type: config.serverType,
      monitoring_interval: config.monitoringInterval,
      learning_enabled: config.learningEnabled,
      auto_remediation: config.autoRemediation,
      log_level: config.logLevel,
      data_dir: config.dataDir,
      log_files: Array.isArray((config as any).logFiles)
        ? (config as any).logFiles.map((f: any) => ({ path: String(f.path), type: String(f.type) }))
        : [],
      plugins: {
        collectors: ['log_file_collector', 'system_metrics_collector'],
        detectors: ['log_pattern_detector', 'threshold_detector'],
        remediators: ['system_remediation'],
      },
      thresholds: {
        cpu_usage: { warning: 80, critical: 95 },
        memory_usage: { warning: 85, critical: 95 },
        disk_usage: { warning: 85, critical: 95 },
      },
    };

    return YAML.stringify(cfg);
  }
}

// Singleton instance
export const pythonMonitorService = new PythonMonitorService();
