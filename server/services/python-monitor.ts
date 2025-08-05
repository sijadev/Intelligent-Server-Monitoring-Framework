import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs/promises';
import { 
  type Problem, 
  type Metrics, 
  type LogEntry, 
  type Plugin,
  type FrameworkConfig 
} from '@shared/schema';
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

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners to handle multiple test scenarios
    this.pythonPath = path.join(process.cwd(), 'python-framework', 'enhanced_main.py');
    this.configPath = path.join(process.cwd(), 'python-framework', 'config.yaml');
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      // Ensure config file exists
      await this.updateConfigFile();

      // Start Python process - use enhanced version for continuous monitoring
      const pythonScript = 'enhanced_main.py';
      const scriptPath = path.join(path.dirname(this.pythonPath), pythonScript);
      
      // Use the virtual environment Python if available
      const venvPython = path.join(process.cwd(), '.venv', 'bin', 'python3');
      const pythonCmd = await fs.access(venvPython).then(() => venvPython).catch(() => 'python3');
      
      console.log(`Starting Python Framework with: ${pythonCmd}`);
      
      this.process = spawn(pythonCmd, [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: path.dirname(this.pythonPath),
        env: { 
          ...process.env,
          PYTHONPATH: path.join(process.cwd(), '.venv', 'lib', 'python3.12', 'site-packages')
        }
      });

      this.isRunning = true;

      // Handle stdout data (JSON output from framework)
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        console.log('Python Framework Output:', output.trim());
        logAggregator.logPythonFramework('output', output.trim());
        this.handlePythonOutput(output);
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
          this.emit('error', message);
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
        this.emit('exit', code);
      });

      // Handle process error
      this.process.on('error', (error) => {
        console.error('Python Framework Process Error:', error);
        this.isRunning = false;
        this.emit('error', error.message);
      });

      console.log('Python Monitoring Framework started');
      logAggregator.logPythonFramework('started', 'Python monitoring framework successfully started');
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
    await this.stop();
    await this.start();
  }

  async sendCommand(command: string, data?: any): Promise<void> {
    if (!this.isRunning || !this.process || !this.process.stdin) {
      throw new Error('Python Framework is not running');
    }

    const message = JSON.stringify({ command, data }) + '\n';
    this.process.stdin.write(message);
  }

  private async handlePythonOutput(output: string): Promise<void> {
    const lines = output.trim().split('\n');

    for (const line of lines) {
      try {
        // Try to parse as JSON
        const data = JSON.parse(line);
        await this.processFrameworkData(data);
      } catch (error) {
        // Handle non-JSON output (logs, etc.)
        if (line.trim()) {
          console.log('Python Framework Log:', line);
          logAggregator.logPythonFramework('non-json-output', line);
        }
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
            timestamp: problem.timestamp,
            metadata: problem.metadata || {},
          });
        }
        this.emit('problems', data.problems);
      }

      // Store metrics
      if (data.metrics) {
        await storage.createMetrics({
          timestamp: data.metrics.timestamp,
          cpuUsage: data.metrics.cpuUsage,
          memoryUsage: data.metrics.memoryUsage,
          diskUsage: data.metrics.diskUsage,
          loadAverage: data.metrics.loadAverage,
          networkConnections: data.metrics.networkConnections,
          processes: data.metrics.processes,
          metadata: data.metrics.metadata || {},
        });
        this.emit('metrics', data.metrics);
      }

      // Store log entries
      if (data.logEntries) {
        for (const logEntry of data.logEntries) {
          await storage.createLogEntry({
            timestamp: logEntry.timestamp,
            level: logEntry.level,
            message: logEntry.message,
            source: logEntry.source,
            rawLine: logEntry.rawLine,
            metadata: logEntry.metadata || {},
          });
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
    return `
# Intelligent Monitoring Framework Configuration
server_type: ${config.serverType}
monitoring_interval: ${config.monitoringInterval}
learning_enabled: ${config.learningEnabled}
auto_remediation: ${config.autoRemediation}
log_level: ${config.logLevel}
data_dir: ${config.dataDir}

# Log files to monitor
log_files:
${Array.isArray(config.logFiles) ? config.logFiles.map((file: any) => `  - path: "${file.path}"\n    type: "${file.type}"`).join('\n') : ''}

# Plugin configuration
plugins:
  collectors:
    - log_file_collector
    - system_metrics_collector
  detectors:
    - log_pattern_detector
    - threshold_detector
  remediators:
    - system_remediation

# Threshold configuration
thresholds:
  cpu_usage:
    warning: 80
    critical: 95
  memory_usage:
    warning: 85
    critical: 95
  disk_usage:
    warning: 85
    critical: 95
`.trim();
  }

  getStatus(): { running: boolean; processId?: number } {
    return {
      running: this.isRunning,
      processId: this.process?.pid,
    };
  }
}

// Singleton instance
export const pythonMonitorService = new PythonMonitorService();
