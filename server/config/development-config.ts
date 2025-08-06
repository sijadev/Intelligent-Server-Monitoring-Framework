/**
 * Development Configuration Loader
 * Loads local development settings to override defaults
 */

import fs from 'fs-extra';
import path from 'path';
import { config } from '../config';

interface DevelopmentConfig {
  environment: string;
  services: {
    testManager: {
      enabled: boolean;
      mockMode: boolean;
      cliRequired: boolean;
      reason: string;
    };
    pythonFramework: {
      enabled: boolean;
      autoStart: boolean;
      healthCheckInterval: number;
      maxRetries: number;
    };
    storage: {
      type: string;
      migrations: {
        autoRun: boolean;
      };
    };
    monitoring: {
      enabled: boolean;
      interval: number;
      healthChecks: boolean;
    };
  };
  logging: {
    level: string;
    console: boolean;
    file: boolean;
  };
  development: {
    hotReload: boolean;
    debugMode: boolean;
    mockExternalServices: boolean;
    bypassAuthentication: boolean;
    enableTestRoutes: boolean;
  };
  workspace: {
    path: string;
    createIfMissing: boolean;
    cleanOnStart: boolean;
  };
  ports: {
    main: number;
    python: number;
    redis: number;
    database: number;
  };
  external: {
    requirePythonAPI: boolean;
    requireRedis: boolean;
    requireTestManager: boolean;
    gracefulFallback: boolean;
  };
}

let developmentConfig: DevelopmentConfig | null = null;

/**
 * Load development configuration
 */
export async function loadDevelopmentConfig(): Promise<DevelopmentConfig | null> {
  if (developmentConfig) {
    return developmentConfig;
  }

  const configPath = path.join(process.cwd(), '.config', 'development.json');
  
  try {
    if (await fs.pathExists(configPath)) {
      developmentConfig = await fs.readJson(configPath);
      console.log('📋 Loaded development configuration from .config/development.json');
      return developmentConfig;
    }
  } catch (error) {
    console.warn('⚠️ Failed to load development config:', error.message);
  }

  return null;
}

/**
 * Get development config value with fallback
 */
export function getDevConfig<T>(path: string, fallback: T): T {
  if (!developmentConfig) {
    return fallback;
  }

  const keys = path.split('.');
  let value: any = developmentConfig;
  
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return fallback;
    }
  }
  
  return value !== undefined ? value : fallback;
}

/**
 * Check if service is enabled in development config
 */
export function isServiceEnabled(serviceName: string): boolean {
  if (config.NODE_ENV !== 'development') {
    return true; // Always enabled in non-development
  }

  return getDevConfig(`services.${serviceName}.enabled`, true);
}

/**
 * Check if service should run in mock mode
 */
export function isServiceMockMode(serviceName: string): boolean {
  if (config.NODE_ENV !== 'development') {
    return false; // Never mock in non-development
  }

  return getDevConfig(`services.${serviceName}.mockMode`, false);
}

/**
 * Check if external service is required
 */
export function isExternalServiceRequired(serviceName: string): boolean {
  if (config.NODE_ENV !== 'development') {
    return true; // Always required in non-development
  }

  return getDevConfig(`external.require${serviceName.charAt(0).toUpperCase()}${serviceName.slice(1)}`, false);
}

/**
 * Get development-specific configuration
 */
export function isDevelopmentMode(): boolean {
  return config.NODE_ENV === 'development';
}

/**
 * Get graceful fallback setting
 */
export function useGracefulFallback(): boolean {
  return getDevConfig('external.gracefulFallback', true);
}

// Auto-load development config if in development mode
if (config.NODE_ENV === 'development') {
  loadDevelopmentConfig().catch(err => {
    console.warn('Failed to auto-load development config:', err.message);
  });
}

export { developmentConfig };
export type { DevelopmentConfig };