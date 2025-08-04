import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { WebSocket } from 'ws';

const execAsync = promisify(exec);

interface McpServerConfig {
  name: string;
  port: number;
  transport: 'http' | 'websocket';
  scenario: string;
}

interface TestMcpClient {
  baseUrl: string;
  transport: 'http' | 'websocket';
  
  // HTTP methods
  callTool(name: string, args: any): Promise<any>;
  listTools(): Promise<any>;
  readResource(uri: string): Promise<any>;
  listResources(): Promise<any>;
  getPrompt(name: string, args?: any): Promise<any>;
  listPrompts(): Promise<any>;
  getHealth(): Promise<any>;
  getStats(): Promise<any>;
  resetStats(): Promise<any>;
  
  // WebSocket methods (if implemented)
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

export class HttpMcpClient implements TestMcpClient {
  public baseUrl: string;
  public transport: 'http' = 'http';

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/tools/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name, arguments: args }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Tool call failed: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  }

  async listTools(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/tools/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });
    
    return await response.json();
  }

  async readResource(uri: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/resources/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri }
      })
    });
    
    return await response.json();
  }

  async listResources(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/resources/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/list',
        params: {}
      })
    });
    
    return await response.json();
  }

  async getPrompt(name: string, args: any = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/prompts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/get',
        params: { name, arguments: args }
      })
    });
    
    return await response.json();
  }

  async listPrompts(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/mcp/prompts/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'prompts/list',
        params: {}
      })
    });
    
    return await response.json();
  }

  async getHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return await response.json();
  }

  async getStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats`);
    return await response.json();
  }

  async resetStats(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/stats/reset`, { method: 'POST' });
    return await response.json();
  }

  async connect(): Promise<void> {
    // Not applicable for HTTP client
  }

  async disconnect(): Promise<void> {
    // Not applicable for HTTP client
  }
}

export class WebSocketMcpClient implements TestMcpClient {
  public baseUrl: string;
  public transport: 'websocket' = 'websocket';
  private ws?: WebSocket;
  private messageId = 1;
  private pendingRequests = new Map<number, { resolve: Function, reject: Function }>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace('http:', 'ws:').replace('https:', 'wss:');
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.baseUrl);
      
      this.ws.on('open', () => {
        resolve();
      });
      
      this.ws.on('error', (error) => {
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        try {
          const response = JSON.parse(data.toString());
          const pending = this.pendingRequests.get(response.id);
          if (pending) {
            this.pendingRequests.delete(response.id);
            if (response.error) {
              pending.reject(new Error(response.error.message));
            } else {
              pending.resolve(response);
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }

  private async sendRequest(method: string, params: any = {}): Promise<any> {
    if (!this.ws) {
      throw new Error('WebSocket not connected');
    }

    const id = this.messageId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(request));
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    return this.sendRequest('tools/call', { name, arguments: args });
  }

  async listTools(): Promise<any> {
    return this.sendRequest('tools/list');
  }

  async readResource(uri: string): Promise<any> {
    return this.sendRequest('resources/read', { uri });
  }

  async listResources(): Promise<any> {
    return this.sendRequest('resources/list');
  }

  async getPrompt(name: string, args: any = {}): Promise<any> {
    return this.sendRequest('prompts/get', { name, arguments: args });
  }

  async listPrompts(): Promise<any> {
    return this.sendRequest('prompts/list');
  }

  async getHealth(): Promise<any> {
    const httpUrl = this.baseUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const response = await fetch(`${httpUrl}/health`);
    return await response.json();
  }

  async getStats(): Promise<any> {
    const httpUrl = this.baseUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const response = await fetch(`${httpUrl}/stats`);
    return await response.json();
  }

  async resetStats(): Promise<any> {
    const httpUrl = this.baseUrl.replace('ws:', 'http:').replace('wss:', 'https:');
    const response = await fetch(`${httpUrl}/stats/reset`, { method: 'POST' });
    return await response.json();
  }
}

export async function startTestMcpServers(): Promise<void> {
  console.log('🚀 Starting Test MCP Servers...');
  try {
    // Check if containers are already running
    const { stdout } = await execAsync('docker ps --filter "name=test-mcp" --format "{{.Names}}"');
    if (stdout.trim()) {
      console.log('✅ Test MCP Servers already running');
      return;
    }
    
    await execAsync('cd docker/test-mcp-server && docker compose up -d');
    console.log('✅ Test MCP Servers started');
    
    // Wait for services to be healthy
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (error) {
    console.error('❌ Failed to start Test MCP Servers:', error);
    throw error;
  }
}

export async function stopTestMcpServers(): Promise<void> {
  console.log('🛑 Stopping Test MCP Servers...');
  try {
    await execAsync('cd docker/test-mcp-server && docker compose down');
    console.log('✅ Test MCP Servers stopped');
  } catch (error) {
    console.error('❌ Failed to stop Test MCP Servers:', error);
    // Don't throw here to allow cleanup to continue
  }
}

export async function waitForServerHealth(baseUrl: string, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${baseUrl}/health`, { timeout: 1000 });
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

export function createMcpClient(baseUrl: string, transport: 'http' | 'websocket' = 'http'): TestMcpClient {
  return transport === 'websocket' 
    ? new WebSocketMcpClient(baseUrl)
    : new HttpMcpClient(baseUrl);
}