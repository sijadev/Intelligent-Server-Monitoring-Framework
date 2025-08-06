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
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  
  // Session Configuration
  SESSION_SECRET: z.string().min(32).default('your-secure-random-session-secret-replace-this-in-production'),
  
  // Python Framework Configuration
  PYTHON_FRAMEWORK_ENABLED: z.coerce.boolean().default(true),
  PYTHON_API_URL: z.string().optional().transform(val => val && val !== '' ? val : 'http://localhost:8000').pipe(z.string().url()),
  MONITORING_INTERVAL: z.coerce.number().min(1).max(3600).default(30),
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  
  // Test Manager Configuration
  TEST_MANAGER_ENABLED: z.coerce.boolean().default(true),
  TEST_MANAGER_PATH: z.string().default('./'),
  TEST_MANAGER_WORKSPACE: z.string().default('./test-workspace'),
  WORKSPACE_PATH: z.string().default('./test-workspace'),
  TEST_MANAGER_TIMEOUT: z.coerce.number().min(10000).max(600000).default(60000),
  TEST_MANAGER_MAX_CONCURRENT: z.coerce.number().min(1).max(10).default(3),
  
  // MCP Configuration
  MCP_SERVER_ID: z.string().default('imf-main-server'),
  PROJECT_ID: z.string().default('imf-monitoring'),
  ORGANIZATION_ID: z.string().default('imf-org'),
  
  // AI Configuration
  AI_STORAGE_TYPE: z.enum(['memory', 'hybrid', 'database']).default('hybrid'),
  
  // CI/Environment Detection
  CI: z.coerce.boolean().default(false),
  GITHUB_ACTIONS: z.coerce.boolean().default(false),
  IMF_TEST_WORKSPACE: z.string().optional(),
  
  // Framework Mode Configuration
  IMF_FRAMEWORK_MODE: z.enum(['api', 'standalone', 'embedded']).default('standalone'),
  IMF_FRAMEWORK_PORT: z.coerce.number().min(1).max(65535).default(8000),
});

// Parse and validate configuration
const parseConfig = () => {
  try {
    const config = configSchema.parse(process.env);
    
    console.log('🔧 Configuration loaded:');
    console.log('  - NODE_ENV:', config.NODE_ENV);
    console.log('  - PORT:', config.PORT);
    console.log('  - DATABASE_URL:', config.DATABASE_URL ? 'configured' : 'not configured');
    console.log('  - REDIS_URL:', config.REDIS_URL);
    console.log('  - PYTHON_FRAMEWORK_ENABLED:', config.PYTHON_FRAMEWORK_ENABLED);
    console.log('  - PYTHON_API_URL:', config.PYTHON_API_URL);
    console.log('  - MONITORING_INTERVAL:', config.MONITORING_INTERVAL, 'seconds');
    console.log('  - LOG_LEVEL:', config.LOG_LEVEL);
    console.log('  - TEST_MANAGER_ENABLED:', config.TEST_MANAGER_ENABLED);
    console.log('  - WORKSPACE_PATH:', config.WORKSPACE_PATH);
    console.log('  - MCP_SERVER_ID:', config.MCP_SERVER_ID);
    console.log('  - AI_STORAGE_TYPE:', config.AI_STORAGE_TYPE);
    console.log('  - CI Environment:', config.CI || config.GITHUB_ACTIONS ? 'detected' : 'local');
    console.log('  - Framework Mode:', config.IMF_FRAMEWORK_MODE);
    
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
export const isCI = () => config.CI || config.GITHUB_ACTIONS;
export const isDockerEnvironment = () => process.env.DOCKER === 'true' || process.env.DOCKER_CONTAINER === 'true';

// Configuration getters with fallbacks
export const getWorkspacePath = () => config.IMF_TEST_WORKSPACE || config.WORKSPACE_PATH || config.TEST_MANAGER_WORKSPACE;
export const getPythonApiUrl = () => config.PYTHON_API_URL;
export const getRedisUrl = () => config.REDIS_URL;
export const getDatabaseUrl = () => config.DATABASE_URL;

// Logging configuration
export const getLogLevel = () => config.LOG_LEVEL;
export const shouldLogDebug = () => config.LOG_LEVEL === 'DEBUG' || isDevelopment();

// Service enablement checks  
export const isPythonFrameworkEnabled = () => config.PYTHON_FRAMEWORK_ENABLED;
export const isTestManagerEnabled = () => config.TEST_MANAGER_ENABLED;

// MCP Configuration
export const getMCPConfig = () => ({
  serverId: config.MCP_SERVER_ID,
  projectId: config.PROJECT_ID,
  organizationId: config.ORGANIZATION_ID,
});

// AI Configuration
export const getAIStorageType = () => config.AI_STORAGE_TYPE;

// Framework Mode Configuration
export const getFrameworkMode = () => config.IMF_FRAMEWORK_MODE;
export const getFrameworkPort = () => config.IMF_FRAMEWORK_PORT;