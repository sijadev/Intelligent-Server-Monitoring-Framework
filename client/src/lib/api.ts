import { apiRequest } from "./queryClient";
import type { 
  DashboardData, 
  Problem, 
  Metrics, 
  LogEntry, 
  Plugin, 
  FrameworkConfig,
  LogFilterOptions,
  SystemStatus 
} from "@shared/schema";

export const api = {
  // Dashboard
  getDashboard: async (): Promise<DashboardData> => {
    const response = await apiRequest('GET', '/api/dashboard');
    return response.json();
  },

  // Problems
  getProblems: async (limit?: number): Promise<Problem[]> => {
    const url = limit ? `/api/problems?limit=${limit}` : '/api/problems';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  getActiveProblems: async (): Promise<Problem[]> => {
    const response = await apiRequest('GET', '/api/problems/active');
    return response.json();
  },

  resolveProblem: async (id: string): Promise<Problem> => {
    const response = await apiRequest('PATCH', `/api/problems/${id}/resolve`);
    return response.json();
  },

  // Metrics
  getMetrics: async (limit?: number): Promise<Metrics[]> => {
    const url = limit ? `/api/metrics?limit=${limit}` : '/api/metrics';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  getLatestMetrics: async (): Promise<Metrics | null> => {
    const response = await apiRequest('GET', '/api/metrics/latest');
    return response.json();
  },

  // Logs
  getLogs: async (options?: LogFilterOptions): Promise<LogEntry[]> => {
    const params = new URLSearchParams();
    if (options?.level) params.append('level', options.level);
    if (options?.source) params.append('source', options.source);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.since) params.append('since', options.since.toISOString());

    const url = params.toString() ? `/api/logs?${params}` : '/api/logs';
    const response = await apiRequest('GET', url);
    return response.json();
  },

  // Plugins
  getPlugins: async (): Promise<Plugin[]> => {
    const response = await apiRequest('GET', '/api/plugins');
    return response.json();
  },

  getPlugin: async (name: string): Promise<Plugin> => {
    const response = await apiRequest('GET', `/api/plugins/${name}`);
    return response.json();
  },

  createPlugin: async (plugin: any): Promise<Plugin> => {
    const response = await apiRequest('POST', '/api/plugins', plugin);
    return response.json();
  },

  updatePlugin: async (id: string, plugin: any): Promise<Plugin> => {
    const response = await apiRequest('PUT', `/api/plugins/${id}`, plugin);
    return response.json();
  },

  deletePlugin: async (id: string): Promise<void> => {
    await apiRequest('DELETE', `/api/plugins/${id}`);
  },

  // Configuration
  getConfig: async (): Promise<FrameworkConfig> => {
    const response = await apiRequest('GET', '/api/config');
    return response.json();
  },

  updateConfig: async (config: Partial<FrameworkConfig>): Promise<FrameworkConfig> => {
    const response = await apiRequest('PUT', '/api/config', config);
    return response.json();
  },

  // Framework Control
  startFramework: async (): Promise<{ message: string }> => {
    const response = await apiRequest('POST', '/api/framework/start');
    return response.json();
  },

  stopFramework: async (): Promise<{ message: string }> => {
    const response = await apiRequest('POST', '/api/framework/stop');
    return response.json();
  },

  restartFramework: async (): Promise<{ message: string }> => {
    const response = await apiRequest('POST', '/api/framework/restart');
    return response.json();
  },

  getFrameworkStatus: async (): Promise<{ running: boolean; processId?: number }> => {
    const response = await apiRequest('GET', '/api/framework/status');
    return response.json();
  },

  // Generic HTTP methods for code analysis endpoints
  get: async (url: string): Promise<any> => {
    const response = await apiRequest('GET', url);
    return response.json();
  },

  post: async (url: string, data?: any): Promise<any> => {
    const response = await apiRequest('POST', url, data);
    return response.json();
  },

  put: async (url: string, data?: any): Promise<any> => {
    const response = await apiRequest('PUT', url, data);
    return response.json();
  },

  patch: async (url: string, data?: any): Promise<any> => {
    const response = await apiRequest('PATCH', url, data);
    return response.json();
  }
};
