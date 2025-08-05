import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables first
dotenv.config();

// Configuration schema with validation and defaults
const configSchema = z.object({
  // Server Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  
  // Database Configuration
  DATABASE_URL: z.string().url().optional(),
  
  // Session Configuration
  SESSION_SECRET: z.string().min(32).default('your-secure-random-session-secret-replace-this-in-production'),
  
  // Python Framework Configuration
  PYTHON_FRAMEWORK_ENABLED: z.coerce.boolean().default(true),
  MONITORING_INTERVAL: z.coerce.number().min(1).max(3600).default(30),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  
  // Test Manager Configuration
  TEST_MANAGER_ENABLED: z.coerce.boolean().default(true),
  TEST_MANAGER_PATH: z.string().default('/Users/simonjanke/Projects/imf-test-manager'),
  TEST_MANAGER_WORKSPACE: z.string().default('./test-workspace'),
  TEST_MANAGER_TIMEOUT: z.coerce.number().min(10000).max(600000).default(60000),
  TEST_MANAGER_MAX_CONCURRENT: z.coerce.number().min(1).max(10).default(3),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    const config = configSchema.parse(process.env);
    
    console.log('🔧 Configuration loaded:');
    console.log('  - NODE_ENV:', config.NODE_ENV);
    console.log('  - PORT:', config.PORT);
    console.log('  - DATABASE_URL:', config.DATABASE_URL ? 'configured' : 'not configured');
    console.log('  - PYTHON_FRAMEWORK_ENABLED:', config.PYTHON_FRAMEWORK_ENABLED);
    console.log('  - MONITORING_INTERVAL:', config.MONITORING_INTERVAL, 'seconds');
    console.log('  - LOG_LEVEL:', config.LOG_LEVEL);
    console.log('  - TEST_MANAGER_ENABLED:', config.TEST_MANAGER_ENABLED);
    console.log('  - TEST_MANAGER_PATH:', config.TEST_MANAGER_PATH);
    console.log('  - TEST_MANAGER_WORKSPACE:', config.TEST_MANAGER_WORKSPACE);
    
    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error);
    if (error instanceof z.ZodError) {
      console.error('Configuration errors:');
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

// Export validated configuration
export const config = parseConfig();

// Type for the configuration
export type AppConfig = typeof config;

// Helper functions for common configuration checks
export const isDevelopment = () => config.NODE_ENV === 'development';
export const isProduction = () => config.NODE_ENV === 'production';
export const isTest = () => config.NODE_ENV === 'test';
export const hasDatabaseUrl = () => Boolean(config.DATABASE_URL);