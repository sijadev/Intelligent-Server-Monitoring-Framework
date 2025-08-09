/**
 * Service Health Check System
 * Monitors critical dependencies and provides health status
 */

import { config, getDatabaseUrl, getRedisUrl, getPythonApiUrl } from '../config';
import net from 'net';
import { pythonMonitorService } from './python-monitor';
import { logAggregator } from './log-aggregator';
import { ErrorHandler } from '../utils/error-handler';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  error?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface SystemHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  timestamp: Date;
  uptime: number;
}

export class HealthCheckService {
  private healthChecks: Map<string, HealthCheckResult> = new Map();
  private startTime = Date.now();

  /**
   * Check health of all critical services
   */
  async checkSystemHealth(): Promise<SystemHealth> {
    // Lightweight mode: return synthetic fast result to avoid network/filesystem latency in tests
    if (config.IMF_LIGHTWEIGHT_TEST) {
      const now = new Date();
      const services: HealthCheckResult[] = [
        { service: 'database', status: 'healthy', timestamp: now },
        { service: 'redis', status: 'healthy', timestamp: now },
        {
          service: 'python-api',
          status: config.PYTHON_FRAMEWORK_ENABLED ? 'degraded' : 'degraded',
          error: 'Skipped in lightweight mode',
          timestamp: now,
        },
        { service: 'filesystem', status: 'healthy', timestamp: now },
        { service: 'memory', status: 'healthy', timestamp: now },
      ];
      return {
        status: 'healthy',
        services,
        timestamp: now,
        uptime: Date.now() - this.startTime,
      };
    }
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkPythonAPI(),
      this.checkFileSystem(),
      this.checkMemory(),
    ]);

    const services: HealthCheckResult[] = checks.map((result, index) => {
      const serviceName = ['database', 'redis', 'python-api', 'filesystem', 'memory'][index];

      if (result.status === 'fulfilled') {
        this.healthChecks.set(serviceName, result.value);
        return result.value;
      } else {
        const errorResult: HealthCheckResult = {
          service: serviceName,
          status: 'unhealthy',
          error: result.reason?.message || 'Unknown error',
          timestamp: new Date(),
        };
        this.healthChecks.set(serviceName, errorResult);
        return errorResult;
      }
    });

    const systemStatus = this.calculateSystemStatus(services);

    return {
      status: systemStatus,
      services,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const databaseUrl = getDatabaseUrl();
      if (!databaseUrl) {
        return {
          service: 'database',
          status: 'degraded',
          error: 'Database URL not configured',
          timestamp: new Date(),
        };
      }

      // Simple connection test - in real implementation, use actual DB client
      const url = new URL(databaseUrl);
      const isReachable = await this.testTCPConnection(url.hostname, parseInt(url.port) || 5432);

      return {
        service: 'database',
        status: isReachable ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        timestamp: new Date(),
        metadata: {
          host: url.hostname,
          port: url.port,
          database: url.pathname?.slice(1) || 'unknown',
        },
      };
    } catch (error) {
      return {
        service: 'database',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database check failed',
        timestamp: new Date(),
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const redisUrl = getRedisUrl();
      const url = new URL(redisUrl);
      const isReachable = await this.testTCPConnection(url.hostname, parseInt(url.port) || 6379);

      return {
        service: 'redis',
        status: isReachable ? 'healthy' : 'unhealthy',
        latency: Date.now() - start,
        timestamp: new Date(),
        metadata: {
          host: url.hostname,
          port: url.port,
        },
      };
    } catch (error) {
      return {
        service: 'redis',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Redis check failed',
        timestamp: new Date(),
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check Python API health
   */
  private async checkPythonAPI(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      if (!config.PYTHON_FRAMEWORK_ENABLED) {
        return {
          service: 'python-api',
          status: 'degraded',
          error: 'Python framework disabled',
          timestamp: new Date(),
        };
      }

      const pythonUrl = getPythonApiUrl();
      // Prefer local service status if running locally
      const svcStatus = pythonMonitorService.getStatus();
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'degraded';

      if (svcStatus.running && (svcStatus.apiAvailable || svcStatus.hasProcess)) {
        status = 'healthy';
      } else {
        // Fallback to API ping
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
          const response = await fetch(`${pythonUrl}/health`, {
            method: 'GET',
            signal: controller.signal,
          });
          status = response.ok ? 'healthy' : 'unhealthy';
        } finally {
          clearTimeout(timeout);
        }
      }

      return {
        service: 'python-api',
        status,
        latency: Date.now() - start,
        timestamp: new Date(),
        metadata: {
          url: pythonUrl,
          apiAvailable: svcStatus.apiAvailable,
          hasProcess: svcStatus.hasProcess,
        },
      };
    } catch (error) {
      return {
        service: 'python-api',
        status: 'degraded', // Degraded since it's optional
        error: error instanceof Error ? error.message : 'Python API unreachable',
        timestamp: new Date(),
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check filesystem health
   */
  private async checkFileSystem(): Promise<HealthCheckResult> {
    const start = Date.now();

    try {
      const fs = await import('fs-extra');
      const testFile = '/tmp/imf-health-check.tmp';

      // Test write/read/delete
      await fs.writeFile(testFile, 'health-check');
      const content = await fs.readFile(testFile, 'utf8');
      await fs.remove(testFile);

      if (content !== 'health-check') {
        throw new Error('File content mismatch');
      }

      return {
        service: 'filesystem',
        status: 'healthy',
        latency: Date.now() - start,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        service: 'filesystem',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Filesystem check failed',
        timestamp: new Date(),
        latency: Date.now() - start,
      };
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<HealthCheckResult> {
    try {
      const memUsage = process.memoryUsage();
      const totalHeap = memUsage.heapTotal;
      const usedHeap = memUsage.heapUsed;
      const heapUsagePercent = (usedHeap / totalHeap) * 100;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (heapUsagePercent > 90) status = 'unhealthy';
      else if (heapUsagePercent > 75) status = 'degraded';

      return {
        service: 'memory',
        status,
        timestamp: new Date(),
        metadata: {
          heapUsed: Math.round(usedHeap / 1024 / 1024), // MB
          heapTotal: Math.round(totalHeap / 1024 / 1024), // MB
          heapUsagePercent: Math.round(heapUsagePercent),
          rss: Math.round(memUsage.rss / 1024 / 1024), // MB
          external: Math.round(memUsage.external / 1024 / 1024), // MB
        },
      };
    } catch (error) {
      return {
        service: 'memory',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Memory check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Test TCP connection to a host/port
   */
  private async testTCPConnection(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();

      const timeout = setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 3000);

      socket.connect(port, host, () => {
        clearTimeout(timeout);
        socket.destroy();
        resolve(true);
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });
  }

  /**
   * Calculate overall system status based on service health
   */
  private calculateSystemStatus(
    services: HealthCheckResult[],
  ): 'healthy' | 'unhealthy' | 'degraded' {
    const unhealthyServices = services.filter((s) => s.status === 'unhealthy');
    const degradedServices = services.filter((s) => s.status === 'degraded');

    // Critical services that must be healthy
    const criticalServices = ['filesystem', 'memory'];
    const unhealthyCritical = unhealthyServices.filter((s) => criticalServices.includes(s.service));

    if (unhealthyCritical.length > 0) {
      return 'unhealthy';
    }

    if (unhealthyServices.length > 0 || degradedServices.length > 1) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Get cached health status for a service
   */
  getServiceHealth(serviceName: string): HealthCheckResult | null {
    return this.healthChecks.get(serviceName) || null;
  }

  /**
   * Start periodic health monitoring
   */
  startPeriodicHealthCheck(intervalMs = 30000): NodeJS.Timeout {
    logAggregator.log('INFO', 'HealthCheckService', 'Starting periodic health monitoring', {
      intervalMs,
    });

    return setInterval(async () => {
      try {
        const health = await this.checkSystemHealth();

        // Log unhealthy services
        const unhealthyServices = health.services.filter((s) => s.status === 'unhealthy');
        if (unhealthyServices.length > 0) {
          logAggregator.log('ERROR', 'HealthCheckService', 'Unhealthy services detected', {
            unhealthyServices: unhealthyServices.map((s) => ({
              service: s.service,
              error: s.error,
              latency: s.latency,
            })),
          });
        }

        // Log degraded services
        const degradedServices = health.services.filter((s) => s.status === 'degraded');
        if (degradedServices.length > 0) {
          logAggregator.log('WARN', 'HealthCheckService', 'Degraded services detected', {
            degradedServices: degradedServices.map((s) => ({
              service: s.service,
              error: s.error,
              latency: s.latency,
            })),
          });
        }
      } catch (error) {
        ErrorHandler.handle(error, 'HealthCheckService.periodicCheck');
      }
    }, intervalMs);
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();
