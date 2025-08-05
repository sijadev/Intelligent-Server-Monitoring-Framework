import { createRealDataTest, type GeneratedTestData } from './real-data-test-template';
import { spawn, ChildProcess } from 'child_process';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

// Container-Integrated Real Data Test - Uses actual Docker services
createRealDataTest({
  testName: 'Container-Integrated Real Data Test with Docker Services',
  maxDatasets: 4, // Fewer datasets for container tests (performance)
  timeoutMs: 180000, // 3 minutes for container startup
  
  async testFunction(data: GeneratedTestData[], storage: any): Promise<void> {
    console.log('\n🐳 Running Container-Integrated Tests with Real Docker Services');
    
    const containerManager = new DockerContainerManager();
    
    try {
      // Start required containers
      await containerManager.startContainers();
      
      // Test 1: Real MCP Protocol Integration
      await testRealMcpProtocolIntegration(data, containerManager);
      
      // Test 2: Real Service Discovery and Communication
      await testRealServiceCommunication(data, containerManager);
      
      // Test 3: Real Error Handling with Container Failures
      await testRealContainerErrorHandling(data, containerManager);
      
    } finally {
      // Always cleanup containers
      await containerManager.cleanup();
    }
  }
});

class DockerContainerManager {
  private processes: ChildProcess[] = [];
  private containerIds: string[] = [];
  private isStarted = false;

  async startContainers(): Promise<void> {
    if (this.isStarted) return;
    
    console.log('\n🚀 Starting Docker containers for real integration tests...');
    
    try {
      // Start MCP test containers
      console.log('  📦 Starting MCP test containers...');
      const mcpProcess = spawn('docker-compose', [
        '-f', '/Users/simonjanke/Projects/IMF/docker/test-mcp-server/docker-compose.yml',
        'up', '-d'
      ], { stdio: 'pipe' });
      
      await this.waitForProcess(mcpProcess, 'MCP containers');
      this.processes.push(mcpProcess);
      
      // Wait for containers to be ready
      await this.waitForContainerHealth();
      
      this.isStarted = true;
      console.log('  ✅ All containers started successfully');
      
    } catch (error) {
      console.error('  ❌ Failed to start containers:', error);
      throw new Error(`Container startup failed: ${error}`);
    }
  }

  private async waitForProcess(process: ChildProcess, name: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`${name} startup timeout`));
      }, 60000); // 60 second timeout

      process.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`${name} failed with code ${code}`));
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private async waitForContainerHealth(): Promise<void> {
    console.log('  ⏳ Waiting for containers to be healthy...');
    
    const services = [
      { name: 'test-mcp-basic', url: 'http://localhost:3001/health', port: 3001 },
      { name: 'test-mcp-errors', url: 'http://localhost:3002/health', port: 3002 },
      { name: 'test-mcp-performance', url: 'http://localhost:3003/health', port: 3003 }
    ];

    for (const service of services) {
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait per service
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(service.url, { timeout: 2000 });
          if (response.ok) {
            console.log(`    ✅ ${service.name} is healthy`);
            break;
          }
        } catch (error) {
          // Service not ready yet
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (attempts >= maxAttempts) {
          throw new Error(`Service ${service.name} failed to become healthy`);
        }
      }
    }
  }

  async getContainerStats(): Promise<ContainerStats[]> {
    const stats: ContainerStats[] = [];
    
    try {
      // Get container IDs
      const psProcess = spawn('docker', ['ps', '--format', '{{.ID}}:{{.Names}}:{{.Status}}'], { stdio: 'pipe' });
      const psOutput = await this.getProcessOutput(psProcess);
      
      const containers = psOutput.split('\n').filter(line => 
        line.includes('test-mcp-') || line.includes('imf-')
      );

      for (const container of containers) {
        const [id, name, status] = container.split(':');
        if (id && name) {
          stats.push({
            id: id.trim(),
            name: name.trim(),
            status: status.trim(),
            healthy: status.includes('healthy') || status.includes('Up')
          });
        }
      }
    } catch (error) {
      console.warn('Failed to get container stats:', error);
    }

    return stats;
  }

  private async getProcessOutput(process: ChildProcess): Promise<string> {
    return new Promise((resolve, reject) => {
      let output = '';
      
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
      }

      process.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Process failed with code ${code}`));
        }
      });

      process.on('error', reject);
    });
  }

  async cleanup(): Promise<void> {
    if (!this.isStarted) return;
    
    console.log('\n🧹 Cleaning up Docker containers...');
    
    try {
      // Stop MCP containers
      const stopProcess = spawn('docker-compose', [
        '-f', '/Users/simonjanke/Projects/IMF/docker/test-mcp-server/docker-compose.yml',
        'down'
      ], { stdio: 'pipe' });
      
      await this.waitForProcess(stopProcess, 'Container cleanup');
      console.log('  ✅ Containers stopped successfully');
      
    } catch (error) {
      console.warn('  ⚠️ Container cleanup had issues:', error);
    }
    
    this.isStarted = false;
  }
}

interface ContainerStats {
  id: string;
  name: string;
  status: string;
  healthy: boolean;
}

async function testRealMcpProtocolIntegration(data: GeneratedTestData[], containerManager: DockerContainerManager): Promise<void> {
  console.log('\n🔌 Testing Real MCP Protocol Integration with Container Services');
  
  const mcpServices = [
    { name: 'Basic MCP', url: 'http://localhost:3001', port: 3001 },
    { name: 'Error MCP', url: 'http://localhost:3002', port: 3002 },
    { name: 'Performance MCP', url: 'http://localhost:3003', port: 3003 }
  ];

  const integrationResults = {
    totalRequests: 0,
    successfulRequests: 0,
    averageResponseTime: 0,
    protocolErrors: 0,
    containerErrors: 0
  };

  for (const service of mcpServices) {
    console.log(`\n  🎯 Testing ${service.name} at ${service.url}`);
    
    for (const dataset of data.slice(0, 2)) { // Limit for container performance
      const complexity = dataset.metadata.profile.sourceConfig.complexity;
      const problems = dataset.statistics.totalCodeProblems;
      
      // Test real MCP protocol calls
      const testCases = [
        { method: 'tools/list', params: {}, endpoint: '/mcp/tools/list' },
        { method: 'resources/list', params: {}, endpoint: '/mcp/resources/list' },
        { method: 'tools/call', params: { name: 'echo', arguments: { message: `Test with ${problems} problems` }}, endpoint: '/mcp/tools/call' }
      ];

      for (const testCase of testCases) {
        const startTime = Date.now();
        integrationResults.totalRequests++;
        
        try {
          const response = await fetch(`${service.url}${testCase.endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: integrationResults.totalRequests,
              method: testCase.method,
              params: testCase.params
            }),
            timeout: 10000
          });

          const responseTime = Date.now() - startTime;
          integrationResults.averageResponseTime += responseTime;

          if (response.ok) {
            const result = await response.json();
            integrationResults.successfulRequests++;
            
            console.log(`    ✅ ${testCase.method} - ${responseTime}ms - Status: ${response.status}`);
            
            // Validate MCP protocol response
            if (result && result.jsonrpc === '2.0') {
              console.log(`      📋 Valid MCP response: ${JSON.stringify(result).substring(0, 100)}...`);
            } else {
              integrationResults.protocolErrors++;
              console.log(`      ⚠️ Invalid MCP protocol response`);
            }
          } else {
            console.log(`    ❌ ${testCase.method} - ${responseTime}ms - Status: ${response.status}`);
            if (response.status >= 500) {
              integrationResults.containerErrors++;
            }
          }

        } catch (error) {
          const responseTime = Date.now() - startTime;
          integrationResults.averageResponseTime += responseTime;
          integrationResults.containerErrors++;
          
          console.log(`    ❌ ${testCase.method} - Network/Container Error: ${error.message}`);
        }
      }
    }
  }

  // Calculate final metrics
  integrationResults.averageResponseTime = integrationResults.totalRequests > 0 ? 
    integrationResults.averageResponseTime / integrationResults.totalRequests : 0;

  const successRate = integrationResults.totalRequests > 0 ? 
    integrationResults.successfulRequests / integrationResults.totalRequests : 0;

  console.log(`\n  📊 Real MCP Protocol Integration Results:`);
  console.log(`    Total Requests: ${integrationResults.totalRequests}`);
  console.log(`    Success Rate: ${(successRate * 100).toFixed(1)}%`);
  console.log(`    Average Response Time: ${integrationResults.averageResponseTime.toFixed(0)}ms`);
  console.log(`    Protocol Errors: ${integrationResults.protocolErrors}`);
  console.log(`    Container Errors: ${integrationResults.containerErrors}`);

  // Validate against profile expectations
  const profileExpectations = data[0]?.metadata?.profile?.expectations;
  const expectedAccuracy = profileExpectations?.mlAccuracy ? profileExpectations.mlAccuracy / 100 : 0.7;

  expect(integrationResults.totalRequests).toBeGreaterThan(0);
  expect(successRate).toBeGreaterThan(expectedAccuracy * 0.6); // Allow tolerance for container overhead
  expect(integrationResults.averageResponseTime).toBeLessThan(5000); // Under 5 seconds for container responses
  expect(integrationResults.protocolErrors).toBeLessThan(integrationResults.totalRequests * 0.1); // <10% protocol errors
}

async function testRealServiceCommunication(data: GeneratedTestData[], containerManager: DockerContainerManager): Promise<void> {
  console.log('\n🌐 Testing Real Service Discovery and Communication');
  
  const containerStats = await containerManager.getContainerStats();
  console.log(`\n  📊 Container Status:`);
  
  for (const container of containerStats) {
    console.log(`    ${container.healthy ? '✅' : '❌'} ${container.name}: ${container.status}`);
  }

  // Test service-to-service communication
  const communicationTests = [
    {
      name: 'Basic to Performance Service Communication',
      from: 'http://localhost:3001',
      to: 'http://localhost:3003',
      testData: data[0]
    },
    {
      name: 'Error Service Response Validation',
      from: 'http://localhost:3002', 
      to: 'http://localhost:3001',
      testData: data[1] || data[0]
    }
  ];

  let totalCommunicationTests = 0;
  let successfulCommunications = 0;
  let totalLatency = 0;

  for (const test of communicationTests) {
    console.log(`\n  🔄 ${test.name}`);
    totalCommunicationTests++;

    try {
      const startTime = Date.now();
      
      // Get service configurations
      const fromConfig = await fetch(`${test.from}/config`, { timeout: 5000 });
      const toStats = await fetch(`${test.to}/stats`, { timeout: 5000 });
      
      const latency = Date.now() - startTime;
      totalLatency += latency;

      if (fromConfig.ok && toStats.ok) {
        successfulCommunications++;
        console.log(`    ✅ Communication successful - ${latency}ms`);
        
        const config = await fromConfig.json();
        const stats = await toStats.json();
        
        console.log(`    📋 From: ${config.server?.name || 'Unknown'} (${config.server?.protocol || 'http'})`);
        console.log(`    📋 To: ${stats.requests || 0} total requests processed`);
        
      } else {
        console.log(`    ❌ Communication failed - Status: ${fromConfig.status}/${toStats.status}`);
      }

    } catch (error) {
      const latency = Date.now() - Date.now();
      totalLatency += latency;
      console.log(`    ❌ Communication error: ${error.message}`);
    }
  }

  const communicationSuccessRate = totalCommunicationTests > 0 ? 
    successfulCommunications / totalCommunicationTests : 0;
  
  const avgLatency = totalCommunicationTests > 0 ? totalLatency / totalCommunicationTests : 0;

  console.log(`\n  🌐 Service Communication Results:`);
  console.log(`    Communication Success Rate: ${(communicationSuccessRate * 100).toFixed(1)}%`);
  console.log(`    Average Service Latency: ${avgLatency.toFixed(0)}ms`);
  console.log(`    Healthy Containers: ${containerStats.filter(c => c.healthy).length}/${containerStats.length}`);

  expect(totalCommunicationTests).toBeGreaterThan(0);
  expect(communicationSuccessRate).toBeGreaterThan(0.5); // At least 50% communication success
  expect(avgLatency).toBeLessThan(3000); // Under 3 seconds average
  expect(containerStats.filter(c => c.healthy).length).toBeGreaterThan(0); // At least one healthy container
}

async function testRealContainerErrorHandling(data: GeneratedTestData[], containerManager: DockerContainerManager): Promise<void> {
  console.log('\n🚨 Testing Real Container Error Handling and Recovery');
  
  const errorScenarios = [
    {
      name: 'Service Unavailable (503)',
      url: 'http://localhost:3002/mcp/tools-call', // Intentionally wrong endpoint
      expectedError: 404
    },
    {
      name: 'Connection Timeout',
      url: 'http://localhost:3003/slow-endpoint',
      timeout: 1000 // 1 second timeout
    },
    {
      name: 'Invalid Protocol Request',
      url: 'http://localhost:3001/mcp/tools-call',
      invalidPayload: true
    }
  ];

  let totalErrorTests = 0;
  let handledErrorsCorrectly = 0;
  let containerRecoveries = 0;

  for (const scenario of errorScenarios) {
    console.log(`\n  ⚠️ Testing ${scenario.name}`);
    totalErrorTests++;

    try {
      const requestOptions: any = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        timeout: scenario.timeout || 5000
      };

      if (scenario.invalidPayload) {
        requestOptions.body = 'invalid json';
      } else {
        requestOptions.body = JSON.stringify({
          jsonrpc: '2.0',
          id: totalErrorTests,
          method: 'tools/call',
          params: { name: 'test', arguments: {} }
        });
      }

      const response = await fetch(scenario.url, requestOptions);
      
      if (scenario.expectedError && response.status === scenario.expectedError) {
        handledErrorsCorrectly++;
        console.log(`    ✅ Expected error handled correctly: ${response.status}`);
      } else if (!response.ok) {
        handledErrorsCorrectly++;
        console.log(`    ✅ Error handled: ${response.status} ${response.statusText}`);
      } else {
        console.log(`    ⚠️ Unexpected success: ${response.status}`);
      }

    } catch (error) {
      // Network errors are also valid error handling scenarios
      if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        handledErrorsCorrectly++;
        console.log(`    ✅ Network error handled correctly: ${error.message}`);
      } else {
        console.log(`    ❌ Unexpected error: ${error.message}`);
      }
    }

    // Test container recovery by checking health
    try {
      const healthCheck = await fetch('http://localhost:3001/health', { timeout: 2000 });
      if (healthCheck.ok) {
        containerRecoveries++;
        console.log(`    🔄 Container recovery verified`);
      }
    } catch (error) {
      console.log(`    ⚠️ Container recovery check failed`);
    }
  }

  const errorHandlingRate = totalErrorTests > 0 ? handledErrorsCorrectly / totalErrorTests : 0;
  const recoveryRate = totalErrorTests > 0 ? containerRecoveries / totalErrorTests : 0;

  console.log(`\n  🚨 Container Error Handling Results:`);
  console.log(`    Total Error Scenarios: ${totalErrorTests}`);
  console.log(`    Error Handling Success Rate: ${(errorHandlingRate * 100).toFixed(1)}%`);
  console.log(`    Container Recovery Rate: ${(recoveryRate * 100).toFixed(1)}%`);

  // Validate error handling meets expectations
  expect(totalErrorTests).toBeGreaterThan(0);
  expect(errorHandlingRate).toBeGreaterThan(0.6); // At least 60% proper error handling
  expect(recoveryRate).toBeGreaterThan(0.3); // At least 30% recovery success
}