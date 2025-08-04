import { describe, it, expect } from 'vitest';

// Simple MCP integration test without complex setup
describe('Simple MCP Integration Test', () => {
  it('should be able to connect to running MCP server', async () => {
    const response = await fetch('http://localhost:3001/health');
    const health = await response.json();
    
    expect(response.ok).toBe(true);
    expect(health.status).toBe('healthy');
    expect(health.server).toBe('Basic Test MCP Server');
  });

  it('should list available tools', async () => {
    const response = await fetch('http://localhost:3001/mcp/tools/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.jsonrpc).toBe('2.0');
    expect(data.result).toHaveProperty('tools');
    expect(Array.isArray(data.result.tools)).toBe(true);
    expect(data.result.tools.length).toBeGreaterThan(0);
    
    const toolNames = data.result.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain('echo');
    expect(toolNames).toContain('calculate');
  });

  it('should call echo tool successfully', async () => {
    const response = await fetch('http://localhost:3001/mcp/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'Hello MCP Test' }
        }
      })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.jsonrpc).toBe('2.0');
    expect(data.result).toHaveProperty('content');
    expect(Array.isArray(data.result.content)).toBe(true);
    
    const content = JSON.parse(data.result.content[0].text);
    expect(content.tool).toBe('echo');
    expect(content.input.message).toBe('Hello MCP Test');
    expect(content.processed).toBe(true);
  });

  it('should read resources', async () => {
    const response = await fetch('http://localhost:3001/mcp/resources/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri: 'test://basic-data' }
      })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(true);
    expect(data.jsonrpc).toBe('2.0');
    expect(data.result).toHaveProperty('contents');
    expect(Array.isArray(data.result.contents)).toBe(true);
    
    const content = data.result.contents[0];
    expect(content.uri).toBe('test://basic-data');
    expect(content.mimeType).toBe('application/json');
    
    const resourceData = JSON.parse(content.text);
    expect(resourceData.testData).toBe('basic');
    expect(resourceData.items).toEqual([1, 2, 3]);
  });

  it('should handle error simulation server', async () => {
    const response = await fetch('http://localhost:3002/mcp/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'unreliable_tool',
          arguments: { data: 'test' }
        }
      })
    });

    const data = await response.json();
    
    expect(response.status).toBe(400); // Should return error status
    expect(data.jsonrpc).toBe('2.0');
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe(-32603);
    expect(data.error.message).toContain('Random tool failure');
  });

  it('should track statistics', async () => {
    // Reset stats first
    await fetch('http://localhost:3001/stats/reset', { method: 'POST' });
    
    // Make some requests
    await fetch('http://localhost:3001/mcp/tools/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    await fetch('http://localhost:3001/mcp/tools/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name: 'echo',
          arguments: { message: 'stats test' }
        }
      })
    });

    // Check stats
    const statsResponse = await fetch('http://localhost:3001/stats');
    const stats = await statsResponse.json();
    
    expect(stats.requestCount).toBeGreaterThan(0);
    expect(stats.toolCalls).toHaveProperty('echo');
    expect(stats.toolCalls.echo).toBeGreaterThan(0);
    expect(stats.averageResponseTime).toBeGreaterThanOrEqual(0);
  });
});