import { describe, it, expect } from 'vitest';
import { config, isDevelopment, isProduction, isTest, hasDatabaseUrl } from '../config';

describe('Server Configuration', () => {
  it('should load configuration successfully', () => {
    expect(config).toBeDefined();
    expect(typeof config.NODE_ENV).toBe('string');
    expect(typeof config.PORT).toBe('number');
    expect(typeof config.PYTHON_FRAMEWORK_ENABLED).toBe('boolean');
    expect(typeof config.MONITORING_INTERVAL).toBe('number');
    expect(typeof config.LOG_LEVEL).toBe('string');
  });

  it('should have valid port configuration', () => {
    expect(config.PORT).toBeGreaterThan(0);
    expect(config.PORT).toBeLessThanOrEqual(65535);
  });

  it('should have valid monitoring interval', () => {
    expect(config.MONITORING_INTERVAL).toBeGreaterThanOrEqual(1);
    expect(config.MONITORING_INTERVAL).toBeLessThanOrEqual(3600);
  });

  it('should have valid log level', () => {
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    expect(validLogLevels).toContain(config.LOG_LEVEL);
  });

  it('should have valid environment', () => {
    const validEnvs = ['development', 'production', 'test'];
    expect(validEnvs).toContain(config.NODE_ENV);
  });

  describe('Helper Functions', () => {
    it('should correctly identify development environment', () => {
      const result = isDevelopment();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(config.NODE_ENV === 'development');
    });

    it('should correctly identify production environment', () => {
      const result = isProduction();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(config.NODE_ENV === 'production');
    });

    it('should correctly identify test environment', () => {
      const result = isTest();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(config.NODE_ENV === 'test');
    });

    it('should correctly check database URL presence', () => {
      const result = hasDatabaseUrl();
      expect(typeof result).toBe('boolean');
      expect(result).toBe(Boolean(config.DATABASE_URL));
    });
  });
});