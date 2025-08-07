// Client-side configuration
export const appConfig = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    timeout: 10000, // 10 seconds
  },

  // WebSocket Configuration  
  websocket: {
    url: import.meta.env.VITE_WS_URL || (
      typeof window !== 'undefined' 
        ? `ws://${window.location.host}/ws`
        : 'ws://localhost:3000/ws'
    ),
    reconnectInterval: 5000, // 5 seconds
    maxReconnectAttempts: 10,
  },

  // UI Configuration
  ui: {
    refreshIntervals: {
      dashboard: 30000,    // 30 seconds
      problems: 10000,     // 10 seconds
      metrics: 30000,      // 30 seconds
      logs: 5000,          // 5 seconds
    },
    pagination: {
      defaultPageSize: 20,
      maxPageSize: 100,
    },
    charts: {
      maxDataPoints: 100,
      colors: [
        'hsl(207, 90%, 54%)',
        'hsl(0, 84.2%, 60.2%)', 
        'hsl(38, 92%, 50%)',
        'hsl(142, 71%, 45%)'
      ],
    },
  },

  // Application Metadata
  app: {
    name: 'MCP.Guard Dashboard',
    version: '1.0.0',
    description: 'MCP.Guard',
  },
} as const;

// Type exports for TypeScript
export type AppConfig = typeof appConfig;
export type RefreshIntervals = typeof appConfig.ui.refreshIntervals;