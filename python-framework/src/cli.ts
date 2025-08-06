#!/usr/bin/env node

import { spawn, ChildProcess } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

// Get the directory where this package is installed
const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface FrameworkOptions {
  mode?: 'api' | 'standalone' | 'docker';
  port?: number;
  config?: string;
  verbose?: boolean;
}

class IMFPythonFramework {
  private process: ChildProcess | null = null;
  private options: FrameworkOptions;

  constructor(options: FrameworkOptions = {}) {
    this.options = {
      mode: 'api',
      port: 8000,
      verbose: false,
      ...options
    };
  }

  private getPythonScript(): string {
    const { mode } = this.options;
    
    switch (mode) {
      case 'api':
        return resolve(packageDir, 'api_server.py');
      case 'standalone':
        return resolve(packageDir, 'enhanced_main.py');
      case 'docker':
        return resolve(packageDir, 'api_server.py');
      default:
        return resolve(packageDir, 'api_server.py');
    }
  }

  private getEnvironment(): Record<string, string> {
    const env: Record<string, string> = {};
    
    if (this.options.port) {
      env.PORT = this.options.port.toString();
    }
    
    if (this.options.config) {
      env.CONFIG_FILE = this.options.config;
    }

    // Copy environment variables
    Object.keys(process.env).forEach(key => {
      if (process.env[key] !== undefined) {
        env[key] = process.env[key]!;
      }
    });

    // Set Python path to include the framework directory
    env.PYTHONPATH = `${packageDir}:${env.PYTHONPATH || ''}`;
    
    return env;
  }

  async start(): Promise<void> {
    const script = this.getPythonScript();
    
    if (!existsSync(script)) {
      throw new Error(`Python script not found: ${script}`);
    }

    console.log(`🚀 Starting IMF Python Framework in ${this.options.mode} mode...`);
    console.log(`📍 Script: ${script}`);
    console.log(`🔌 Port: ${this.options.port}`);

    this.process = spawn('python', [script], {
      cwd: packageDir,
      env: this.getEnvironment(),
      stdio: this.options.verbose ? 'inherit' : 'pipe'
    });

    this.process.on('error', (error: Error) => {
      console.error('❌ Failed to start Python framework:', error.message);
      process.exit(1);
    });

    this.process.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ Python framework exited with code ${code}`);
        process.exit(code || 1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  stop(): void {
    if (this.process) {
      console.log('🛑 Stopping IMF Python Framework...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  async status(): Promise<object> {
    if (!this.options.port) {
      throw new Error('Port not specified for status check');
    }

    try {
      const response = await fetch(`http://localhost:${this.options.port}/status`);
      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to get framework status: ${message}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'start';

  const options: FrameworkOptions = {
    mode: 'api',
    port: 8000,
    verbose: false
  };

  // Parse command line arguments
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--mode' && args[i + 1]) {
      options.mode = args[++i] as 'api' | 'standalone' | 'docker';
    } else if (arg === '--port' && args[i + 1]) {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--config' && args[i + 1]) {
      options.config = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    }
  }

  const framework = new IMFPythonFramework(options);

  try {
    switch (command) {
      case 'start':
        await framework.start();
        break;
      
      case 'status':
        const status = await framework.status();
        console.log(JSON.stringify(status, null, 2));
        break;
      
      case 'stop':
        framework.stop();
        break;
      
      case 'help':
      case '--help':
      case '-h':
        printHelp();
        break;
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error:', message);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
🐍 IMF Python Monitoring Framework

Usage: imf-python-framework <command> [options]

Commands:
  start     Start the monitoring framework (default)
  status    Get current framework status
  stop      Stop the running framework
  help      Show this help message

Options:
  --mode <mode>     Framework mode: api, standalone, docker (default: api)
  --port <port>     API server port (default: 8000)
  --config <file>   Configuration file path
  --verbose, -v     Enable verbose logging

Examples:
  imf-python-framework start --mode api --port 8000
  imf-python-framework start --mode standalone --verbose
  imf-python-framework status
  imf-python-framework --help

Environment Variables:
  PORT              API server port
  CONFIG_FILE       Configuration file path
  PYTHONPATH        Python module search path
`);
}

// Run CLI if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { IMFPythonFramework };
export type { FrameworkOptions };