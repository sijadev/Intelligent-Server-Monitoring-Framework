import { spawn, ChildProcess } from 'child_process';
// Using native fetch (Node.js 18+)

export interface DockerService {
  name: string;
  url: string;
  port: number;
  healthEndpoint?: string;
}

export interface ContainerTestOptions {
  services: DockerService[];
  startupTimeoutMs?: number;
  healthCheckTimeoutMs?: number;
  cleanupOnExit?: boolean;
}

export class DockerTestEnvironment {
  private processes: ChildProcess[] = [];
  private isStarted = false;
  private options: ContainerTestOptions;

  constructor(options: ContainerTestOptions) {
    this.options = {
      startupTimeoutMs: 120000, // 2 minutes
      healthCheckTimeoutMs: 60000, // 1 minute
      cleanupOnExit: true,
      ...options
    };

    // Auto-cleanup on process exit
    if (this.options.cleanupOnExit) {
      process.on('exit', () => this.cleanup());
      process.on('SIGINT', () => {
        this.cleanup().then(() => process.exit(0));
      });
      process.on('SIGTERM', () => {
        this.cleanup().then(() => process.exit(0));
      });
    }
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      console.log('🔄 Docker environment already started');
      return;
    }

    console.log('🐳 Starting Docker test environment...');
    
    try {
      await this.startContainers();
      await this.waitForHealthChecks();
      
      this.isStarted = true;
      console.log('✅ Docker test environment ready');
      
    } catch (error) {
      console.error('❌ Failed to start Docker environment:', error);
      await this.cleanup();
      throw error;
    }
  }

  private async startContainers(): Promise<void> {
    console.log('📦 Starting Docker containers...');
    
    // Start MCP test containers
    const mcpComposeFile = '/Users/simonjanke/Projects/IMF/docker/test-mcp-server/docker-compose.yml';
    
    const startProcess = spawn('docker-compose', [
      '-f', mcpComposeFile,
      'up', '-d', '--build'
    ], { 
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: '/Users/simonjanke/Projects/IMF/docker/test-mcp-server'
    });

    await this.waitForProcess(startProcess, 'Docker Compose Start');
    console.log('  ✅ Containers started');
  }

  private async waitForHealthChecks(): Promise<void> {
    console.log('⏳ Waiting for services to be healthy...');
    
    const healthCheckPromises = this.options.services.map(service => 
      this.waitForServiceHealth(service)
    );

    await Promise.all(healthCheckPromises);
    console.log('  ✅ All services are healthy');
  }

  private async waitForServiceHealth(service: DockerService): Promise<void> {
    const healthUrl = service.healthEndpoint ? 
      `${service.url}${service.healthEndpoint}` : 
      `${service.url}/health`;
    
    const maxAttempts = Math.floor(this.options.healthCheckTimeoutMs! / 1000);
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(healthUrl, { 
          timeout: 2000,
          headers: { 'User-Agent': 'IMF-Test-Runner' }
        });
        
        if (response.ok) {
          console.log(`    ✅ ${service.name} (${service.port}) is healthy`);
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      attempts++;
      await this.sleep(1000);
    }

    throw new Error(`Service ${service.name} failed to become healthy after ${maxAttempts} seconds`);
  }

  async getServiceStats(): Promise<ServiceStats[]> {
    const stats: ServiceStats[] = [];

    for (const service of this.options.services) {
      try {
        const [healthResponse, statsResponse] = await Promise.all([
          fetch(`${service.url}/health`, { timeout: 2000 }).catch(() => null),
          fetch(`${service.url}/stats`, { timeout: 2000 }).catch(() => null)
        ]);

        const serviceStats: ServiceStats = {
          name: service.name,
          url: service.url,
          port: service.port,
          healthy: healthResponse?.ok || false,
          responseTime: 0,
          requests: 0,
          errors: 0
        };

        if (statsResponse?.ok) {
          const statsData = await statsResponse.json();
          serviceStats.requests = statsData.requests || 0;
          serviceStats.errors = statsData.errors || 0;
          serviceStats.responseTime = statsData.averageResponseTime || 0;
        }

        stats.push(serviceStats);

      } catch (error) {
        stats.push({
          name: service.name,
          url: service.url,
          port: service.port,
          healthy: false,
          responseTime: 0,
          requests: 0,
          errors: 0,
          error: error.message
        });
      }
    }

    return stats;
  }

  async resetServiceStats(): Promise<void> {
    console.log('🔄 Resetting service statistics...');
    
    const resetPromises = this.options.services.map(async service => {
      try {
        await fetch(`${service.url}/stats/reset`, { 
          method: 'POST',
          timeout: 5000 
        });
        console.log(`  ✅ Reset stats for ${service.name}`);
      } catch (error) {
        console.log(`  ⚠️ Failed to reset stats for ${service.name}: ${error.message}`);
      }
    });

    await Promise.all(resetPromises);
  }

  async testServiceConnectivity(): Promise<ConnectivityResult[]> {
    console.log('🔗 Testing service connectivity...');
    
    const results: ConnectivityResult[] = [];

    for (const service of this.options.services) {
      const startTime = Date.now();
      
      try {
        const response = await fetch(`${service.url}/health`, { 
          timeout: 5000,
          headers: { 'User-Agent': 'IMF-Connectivity-Test' }
        });
        
        const responseTime = Date.now() - startTime;
        
        results.push({
          service: service.name,
          url: service.url,
          connected: response.ok,
          responseTime,
          statusCode: response.status,
          error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
        });

      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        results.push({
          service: service.name,
          url: service.url,
          connected: false,
          responseTime,
          statusCode: 0,
          error: error.message
        });
      }
    }

    // Log results
    for (const result of results) {
      const status = result.connected ? '✅' : '❌';
      console.log(`  ${status} ${result.service}: ${result.responseTime}ms ${result.error ? `(${result.error})` : ''}`);
    }

    return results;
  }

  private async waitForProcess(process: ChildProcess, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        process.kill();
        reject(new Error(`${name} timeout after ${this.options.startupTimeoutMs}ms`));
      }, this.options.startupTimeoutMs);

      let output = '';
      let errorOutput = '';

      if (process.stdout) {
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      if (process.stderr) {
        process.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
      }

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${name} failed with code ${code}. Error: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`${name} process error: ${error.message}`));
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async cleanup(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    console.log('🧹 Cleaning up Docker test environment...');

    try {
      // Stop containers
      const mcpComposeFile = '/Users/simonjanke/Projects/IMF/docker/test-mcp-server/docker-compose.yml';
      
      const stopProcess = spawn('docker-compose', [
        '-f', mcpComposeFile,
        'down', '--remove-orphans'
      ], { 
        stdio: ['ignore', 'pipe', 'pipe'],
        cwd: '/Users/simonjanke/Projects/IMF/docker/test-mcp-server'
      });

      await this.waitForProcess(stopProcess, 'Docker Compose Stop');
      console.log('  ✅ Containers stopped');

    } catch (error) {
      console.warn('  ⚠️ Cleanup warning:', error.message);
    }

    this.isStarted = false;
    console.log('✅ Docker test environment cleaned up');
  }
}

export interface ServiceStats {
  name: string;
  url: string;
  port: number;
  healthy: boolean;
  responseTime: number;
  requests: number;
  errors: number;
  error?: string;
}

export interface ConnectivityResult {
  service: string;
  url: string;
  connected: boolean;
  responseTime: number;
  statusCode: number;
  error?: string;
}

// Pre-configured Docker environments
export const MCP_TEST_ENVIRONMENT: ContainerTestOptions = {
  services: [
    { name: 'MCP Basic', url: 'http://localhost:3001', port: 3001 },
    { name: 'MCP Errors', url: 'http://localhost:3002', port: 3002 },
    { name: 'MCP Performance', url: 'http://localhost:3003', port: 3003 }
  ],
  startupTimeoutMs: 120000,
  healthCheckTimeoutMs: 60000,
  cleanupOnExit: true
};

// Utility function for tests
export async function withDockerEnvironment<T>(
  options: ContainerTestOptions,
  testFunction: (env: DockerTestEnvironment) => Promise<T>
): Promise<T> {
  const env = new DockerTestEnvironment(options);
  
  try {
    await env.start();
    return await testFunction(env);
  } finally {
    await env.cleanup();
  }
}