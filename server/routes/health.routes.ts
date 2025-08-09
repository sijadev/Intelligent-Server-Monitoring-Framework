/**
 * Health Check Routes
 * Provides endpoints for monitoring system health
 */

import { Router } from 'express';
import { healthCheckService } from '../services/health-check.service';
import { logAggregator } from '../services/log-aggregator';
import { ErrorHandler } from '../utils/error-handler';

export const healthRoutes = Router();

/**
 * Basic health check endpoint
 */
healthRoutes.get('/', async (req, res) => {
  try {
    const health = await healthCheckService.checkSystemHealth();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      status: health.status,
      timestamp: health.timestamp,
      uptime: health.uptime,
      services: health.services.map((service) => ({
        service: service.service,
        status: service.status,
        latency: service.latency,
        error: service.error,
      })),
    });
  } catch (error) {
    ErrorHandler.handle(error, 'health-check', res);
  }
});

/**
 * Detailed health check with full service information
 */
healthRoutes.get('/detailed', async (req, res) => {
  try {
    const health = await healthCheckService.checkSystemHealth();

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      ...health,
    });
  } catch (error) {
    ErrorHandler.handle(error, 'detailed-health-check', res);
  }
});

/**
 * Individual service health check
 */
healthRoutes.get('/service/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const cachedHealth = healthCheckService.getServiceHealth(serviceName);

    if (!cachedHealth) {
      return res.status(404).json({
        success: false,
        error: `Service '${serviceName}' not found`,
      });
    }

    const statusCode =
      cachedHealth.status === 'healthy' ? 200 : cachedHealth.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: true,
      service: cachedHealth,
    });
  } catch (error) {
    ErrorHandler.handle(error, 'service-health-check', res);
  }
});

/**
 * Ready check - stricter than health check
 * Returns 200 only if all critical services are healthy
 */
healthRoutes.get('/ready', async (req, res) => {
  try {
    const health = await healthCheckService.checkSystemHealth();

    // For readiness, we require all critical services to be healthy
    const criticalServices = ['filesystem', 'memory'];
    const unhealthyCritical = health.services.filter(
      (s) => criticalServices.includes(s.service) && s.status !== 'healthy',
    );

    if (unhealthyCritical.length > 0) {
      return res.status(503).json({
        success: false,
        ready: false,
        reason: 'Critical services unhealthy',
        unhealthyServices: unhealthyCritical.map((s) => s.service),
      });
    }

    res.status(200).json({
      success: true,
      ready: true,
      timestamp: health.timestamp,
    });
  } catch (error) {
    ErrorHandler.handle(error, 'readiness-check', res);
  }
});

/**
 * Liveness check - minimal check to verify server is responsive
 */
healthRoutes.get('/live', (req, res) => {
  res.status(200).json({
    success: true,
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});
