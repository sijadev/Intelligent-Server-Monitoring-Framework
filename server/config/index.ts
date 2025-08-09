/**
 * Enhanced Configuration with Development Support
 */

export * from '../config';
export * from './development-config';

import { config } from '../config';
import { loadDevelopmentConfig, getDevConfig } from './development-config';

/**
 * Initialize application configuration
 */
export async function initializeConfig(): Promise<void> {
  if (config.NODE_ENV === 'development') {
    await loadDevelopmentConfig();
    console.log('📋 Development configuration loaded');
  }
}

/**
 * Get configuration value with development override support
 */
export function getConfig<T>(key: string, defaultValue: T, devConfigPath?: string): T {
  // First try environment/config
  const envValue = (config as any)[key];
  if (envValue !== undefined) {
    return envValue;
  }

  // Then try development config if available
  if (devConfigPath && config.NODE_ENV === 'development') {
    return getDevConfig(devConfigPath, defaultValue);
  }

  return defaultValue;
}
