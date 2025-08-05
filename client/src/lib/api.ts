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
    try {
      console.log('POST request to:', url, 'with data:', data);
      const response = await apiRequest('POST', url, data);
      console.log('POST response status:', response.status);
      
      // Check if response has content
      const contentType = response.headers.get('content-type');
      console.log('Response content-type:', contentType);
      
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text);
        throw new Error(`Server returned non-JSON response: ${text}`);
      }
      
      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      if (!responseText.trim()) {
        throw new Error('Server returned empty response');
      }
      
      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response text that failed to parse:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
    } catch (error) {
      console.error('API POST error:', error);
      // Re-throw with proper error structure
      throw new Error(error instanceof Error ? error.message : String(error));
    }
  },

  put: async (url: string, data?: any): Promise<any> => {
    const response = await apiRequest('PUT', url, data);
    return response.json();
  },

  patch: async (url: string, data?: any): Promise<any> => {
    const response = await apiRequest('PATCH', url, data);
    return response.json();
  },

  // Test Manager API methods
  get: async (path: string): Promise<any> => {
    try {
      console.log(`🔍 GET request to: ${path}`);
      const response = await apiRequest('GET', `/api${path}`);
      const result = await response.json();
      console.log(`📊 GET ${path} response:`, result);
      return result;
    } catch (error) {
      console.error(`❌ GET ${path} error:`, error);
      throw error;
    }
  },

  post: async (path: string, data?: any): Promise<any> => {
    try {
      console.log(`🚀 POST request to: ${path}`, data);
      const response = await apiRequest('POST', `/api${path}`, data);
      const result = await response.json();
      console.log(`📊 POST ${path} response:`, result);
      return result;
    } catch (error) {
      console.error(`❌ POST ${path} error:`, error);
      throw error;
    }
  },

  delete: async (path: string): Promise<any> => {
    try {
      console.log(`🗑️ DELETE request to: ${path}`);
      const response = await apiRequest('DELETE', `/api${path}`);
      const result = await response.json();
      console.log(`📊 DELETE ${path} response:`, result);
      return result;
    } catch (error) {
      console.error(`❌ DELETE ${path} error:`, error);
      throw error;
    }
  },

  // Dedicated method for test manager profile creation with enhanced error handling
  createTestProfile: async (profileData: any): Promise<any> => {
    try {
      console.log('🚀 Creating test profile via dedicated method');
      console.log('📝 Profile data:', JSON.stringify(profileData, null, 2));
      
      const response = await fetch('/api/test-manager/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(profileData),
        credentials: 'include'
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response statusText:', response.statusText);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      if (!responseText) {
        throw new Error('Empty response from server');
      }

      try {
        const result = JSON.parse(responseText);
        console.log('✅ Parsed result:', result);
        return result;
      } catch (parseError) {
        console.error('❌ JSON parse failed:', parseError);
        console.error('📄 Failed to parse:', responseText);
        throw new Error(`Invalid JSON: ${responseText}`);
      }
    } catch (error) {
      console.error('❌ createTestProfile error:', error);
      throw error;
    }
  }
};
