// API Constants
export const API_ROUTES = {
  DASHBOARD: '/api/dashboard',
  PLUGINS: '/api/plugins',
  PROBLEMS: '/api/problems',
  METRICS: '/api/metrics',
  LOGS: '/api/logs',
  CONFIG: '/api/config',
  FRAMEWORK: '/api/framework',
  DEBUG: '/api/debug'
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500
} as const;

// Default Values
export const DEFAULTS = {
  METRICS_LIMIT: 100,
  PROBLEMS_LIMIT: 50,
  LOGS_LIMIT: 1000,
  WEBSOCKET_CLIENT_ID_LENGTH: 9,
  MAX_LOG_ENTRIES: 1000
} as const;

// Plugin States
export const PLUGIN_STATUS = {
  RUNNING: 'running',
  STOPPED: 'stopped',
  ERROR: 'error'
} as const;

// Problem Severities
export const PROBLEM_SEVERITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
} as const;

// Log Levels
export const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
} as const;

// Sources
export const LOG_SOURCES = {
  SERVER: 'server',
  DATABASE: 'database',
  PYTHON: 'python',
  WEBSOCKET: 'websocket',
  HTTP: 'http',
  PLUGIN: 'plugin',
  CONTROLLER: 'controller'
} as const;