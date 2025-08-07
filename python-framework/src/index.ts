/**
 * MCP.Guard Python Monitoring Framework - Node.js Interface
 * Provides programmatic access to the Python monitoring framework
 */

export { MCPGuardPythonFramework } from './cli.js';
export type { FrameworkOptions } from './cli.js';

// Type definitions for framework data structures
export interface FrameworkStatus {
  running: boolean;
  last_update?: string;
  plugins_count: number;
  problems_count: number;
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  loadAverage: number;
  networkInterfaces: number;
  processes: number;
  [key: string]: any;
}

export interface Problem {
  type: string;
  severity: string;
  description: string;
  timestamp: string;
}

export interface Plugin {
  name: string;
  version: string;
  type: 'collector' | 'detector' | 'remediator';
  status: 'running' | 'stopped' | 'error';
  description?: string;
}

export interface FrameworkData {
  problems: Problem[];
  metrics: SystemMetrics;
  plugins: Plugin[];
  status: { running: boolean };
}

/**
 * Client for interacting with the MCP.Guard Python Framework HTTP API
 */
export class MCPGuardFrameworkClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  private async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get framework status
   */
  async getStatus(): Promise<FrameworkStatus> {
    return this.request<FrameworkStatus>('/status');
  }

  /**
   * Get current system metrics
   */
  async getMetrics(): Promise<SystemMetrics> {
    return this.request<SystemMetrics>('/metrics');
  }

  /**
   * Get detected problems
   */
  async getProblems(): Promise<Problem[]> {
    return this.request<Problem[]>('/problems');
  }

  /**
   * Get plugin information
   */
  async getPlugins(): Promise<Plugin[]> {
    return this.request<Plugin[]>('/plugins');
  }

  /**
   * Get all framework data
   */
  async getData(): Promise<FrameworkData> {
    return this.request<FrameworkData>('/data');
  }

  /**
   * Start the framework
   */
  async start(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/start`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Stop the framework
   */
  async stop(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/stop`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Restart the framework
   */
  async restart(): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/restart`, { method: 'POST' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Check if the framework API is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.request('/health');
      return true;
    } catch {
      return false;
    }
  }
}