import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { 
  startTestMcpServers, 
  stopTestMcpServers, 
  waitForServerHealth, 
  createMcpClient,
  HttpMcpClient,
  WebSocketMcpClient 
} from './test-mcp-client';

const TEST_SERVERS = {
  basic: 'http://localhost:3001',
  errors: 'http://localhost:3002', 
  performance: 'http://localhost:3003',
  websocket: 'ws://localhost:3004'
};

describe('MCP Integration Tests', () => {
  beforeAll(async () => {
    console.log('🔧 Setting up Test MCP Servers...');
    await startTestMcpServers();
    
    // Wait for all servers to be healthy
    const healthChecks = Object.values(TEST_SERVERS).map(async (url) => {
      const httpUrl = url.replace('ws:', 'http:');
      const isHealthy = await waitForServerHealth(httpUrl, 10); // Reduce retries
      if (!isHealthy) {
        console.warn(`⚠️ Server ${httpUrl} not responding, continuing anyway`);
      }
    });
    
    await Promise.all(healthChecks);
    console.log('✅ All Test MCP Servers setup complete');
  }, 120000); // 120 second timeout for server startup

  afterAll(async () => {
    await stopTestMcpServers();
  });

  describe('Basic Functionality Tests', () => {
    let client: HttpMcpClient;

    beforeAll(() => {
      client = createMcpClient(TEST_SERVERS.basic, 'http') as HttpMcpClient;
    });

    it('should respond to health checks', async () => {
      const health = await client.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.server).toBe('Basic Test MCP Server');
      expect(health.version).toBe('1.0.0');
      expect(health).toHaveProperty('uptime');
      expect(health).toHaveProperty('stats');
    });

    it('should list available tools', async () => {
      const response = await client.listTools();
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('tools');
      expect(Array.isArray(response.result.tools)).toBe(true);
      
      const tools = response.result.tools;
      const toolNames = tools.map((tool: any) => tool.name);
      expect(toolNames).toContain('echo');
      expect(toolNames).toContain('calculate');
    });

    it('should call echo tool successfully', async () => {
      const response = await client.callTool('echo', { message: 'Hello MCP!' });
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('content');
      expect(Array.isArray(response.result.content)).toBe(true);
      
      const content = JSON.parse(response.result.content[0].text);
      expect(content.tool).toBe('echo');
      expect(content.input.message).toBe('Hello MCP!');
      expect(content.processed).toBe(true);
    });

    it('should perform calculations with calculate tool', async () => {
      const response = await client.callTool('calculate', {
        operation: 'add',
        a: 5,
        b: 3
      });
      
      expect(response).toHaveProperty('result');
      const content = JSON.parse(response.result.content[0].text);
      expect(content.tool).toBe('calculate');
      expect(content.input.operation).toBe('add');
      expect(content.input.a).toBe(5);
      expect(content.input.b).toBe(3);
    });

    it('should list available resources', async () => {
      const response = await client.listResources();
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('resources');
      expect(Array.isArray(response.result.resources)).toBe(true);
      
      const resources = response.result.resources;
      const resourceUris = resources.map((resource: any) => resource.uri);
      expect(resourceUris).toContain('test://basic-data');
    });

    it('should read resource content', async () => {
      const response = await client.readResource('test://basic-data');
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('contents');
      expect(Array.isArray(response.result.contents)).toBe(true);
      
      const content = response.result.contents[0];
      expect(content.uri).toBe('test://basic-data');
      expect(content.mimeType).toBe('application/json');
      
      const data = JSON.parse(content.text);
      expect(data.testData).toBe('basic');
      expect(data.items).toEqual([1, 2, 3]);
    });

    it('should list available prompts', async () => {
      const response = await client.listPrompts();
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('prompts');
      expect(Array.isArray(response.result.prompts)).toBe(true);
      
      const prompts = response.result.prompts;
      const promptNames = prompts.map((prompt: any) => prompt.name);
      expect(promptNames).toContain('hello');
    });

    it('should execute prompts with arguments', async () => {
      const response = await client.getPrompt('hello', { name: 'World' });
      
      expect(response).toHaveProperty('result');
      expect(response.result).toHaveProperty('messages');
      expect(Array.isArray(response.result.messages)).toBe(true);
      
      const message = response.result.messages[0];
      expect(message.role).toBe('user');
      expect(message.content.text).toContain('Hello World!');
    });

    it('should track statistics', async () => {
      // Reset stats first
      await client.resetStats();
      
      // Make some requests
      await client.listTools();
      await client.callTool('echo', { message: 'test' });
      await client.listResources();
      
      const stats = await client.getStats();
      
      expect(stats.requestCount).toBeGreaterThan(0);
      expect(stats.toolCalls).toHaveProperty('echo');
      expect(stats.toolCalls.echo).toBeGreaterThan(0);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(new Date(stats.lastActivity)).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling Tests', () => {
    let client: HttpMcpClient;

    beforeAll(() => {
      client = createMcpClient(TEST_SERVERS.errors, 'http') as HttpMcpClient;
    });

    it('should handle tool errors gracefully', async () => {
      try {
        await client.callTool('unreliable_tool', { data: 'test' });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Tool call failed');
      }
    });

    it('should handle timeout scenarios', async () => {
      try {
        await client.callTool('timeout_tool', { duration: 1000 });
        // Should timeout or fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    }, 15000); // Extended timeout for this test

    it('should handle resource errors', async () => {
      try {
        await client.readResource('test://broken-resource');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle missing resources', async () => {
      try {
        await client.readResource('test://missing-resource');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle prompt errors', async () => {
      try {
        await client.getPrompt('broken_prompt');
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should still serve working endpoints despite errors', async () => {
      // Working tool should still work
      const response = await client.callTool('reliable_tool', { data: 'test' });
      expect(response).toHaveProperty('result');
      
      // Working resource should still work
      const resourceResponse = await client.readResource('test://working-resource');
      expect(resourceResponse).toHaveProperty('result');
      
      // Working prompt should still work
      const promptResponse = await client.getPrompt('working_prompt');
      expect(promptResponse).toHaveProperty('result');
    });
  });

  describe('Performance Tests', () => {
    let client: HttpMcpClient;

    beforeAll(() => {
      client = createMcpClient(TEST_SERVERS.performance, 'http') as HttpMcpClient;
    });

    it('should handle fast operations efficiently', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 10 }, () => 
        client.callTool('fast_tool', { data: 'speed test' })
      );
      
      const responses = await Promise.all(promises);
      const endTime = Date.now();
      
      expect(responses).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      responses.forEach(response => {
        expect(response).toHaveProperty('result');
      });
    });

    it('should handle different data sizes', async () => {
      const small = await client.readResource('test://small-data');
      const medium = await client.readResource('test://medium-data');
      const large = await client.readResource('test://large-data');
      
      expect(small.result.contents[0].text).toContain('small');
      expect(medium.result.contents[0].text).toContain('medium');
      expect(large.result.contents[0].text).toContain('large');
    });

    it('should track performance metrics', async () => {
      await client.resetStats();
      
      const iterations = 5;
      const promises = Array.from({ length: iterations }, () => 
        client.callTool('fast_tool', { data: 'perf test' })
      );
      
      await Promise.all(promises);
      
      const stats = await client.getStats();
      expect(stats.requestCount).toBeGreaterThanOrEqual(iterations);
      expect(stats.toolCalls.fast_tool).toBe(iterations);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
    });
  });

  describe('WebSocket Integration Tests', () => {
    let client: WebSocketMcpClient;

    beforeAll(async () => {
      client = createMcpClient(TEST_SERVERS.websocket, 'websocket') as WebSocketMcpClient;
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should connect to WebSocket server', async () => {
      const health = await client.getHealth();
      expect(health.status).toBe('healthy');
    });

    // Note: WebSocket MCP implementation would need to be completed
    // These tests serve as placeholders for when that's implemented
    it.skip('should handle WebSocket tool calls', async () => {
      const response = await client.callTool('echo', { message: 'WebSocket test' });
      expect(response).toHaveProperty('result');
    });

    it.skip('should handle WebSocket resource requests', async () => {
      const response = await client.readResource('test://basic-data');
      expect(response).toHaveProperty('result');
    });
  });

  describe('Load and Stress Tests', () => {
    let client: HttpMcpClient;

    beforeAll(() => {
      client = createMcpClient(TEST_SERVERS.performance, 'http') as HttpMcpClient;
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 20;
      const promises = Array.from({ length: concurrentRequests }, (_, i) => 
        client.callTool('fast_tool', { data: `concurrent-${i}` })
      );
      
      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(concurrentRequests);
      responses.forEach((response, index) => {
        expect(response).toHaveProperty('result');
        const content = JSON.parse(response.result.content[0].text);
        expect(content.input.data).toBe(`concurrent-${index}`);
      });
    });

    it('should maintain performance under load', async () => {
      await client.resetStats();
      
      const loadTestDuration = 5000; // 5 seconds
      const startTime = Date.now();
      const requests: Promise<any>[] = [];
      
      while (Date.now() - startTime < loadTestDuration) {
        requests.push(client.callTool('fast_tool', { data: 'load test' }));
        
        // Add small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const responses = await Promise.all(requests);
      const stats = await client.getStats();
      
      expect(responses.length).toBeGreaterThan(10); // Should handle multiple requests
      expect(stats.requestCount).toBeGreaterThan(10);
      expect(stats.averageResponseTime).toBeLessThan(1000); // Should maintain reasonable response times
    }, 10000); // Extended timeout for load test
  });
});