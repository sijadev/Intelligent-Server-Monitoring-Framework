import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { ServerConfig, ServerConfigSchema } from './types';

export class ConfigManager {
  private config!: ServerConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.CONFIG_PATH || '/app/config/test-scenarios.json';
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (existsSync(this.configPath)) {
        const configData = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        this.config = ServerConfigSchema.parse(configData);
        console.log(`✅ Configuration loaded from ${this.configPath}`);
      } else {
        console.log(`⚠️  Config file not found at ${this.configPath}, using default configuration`);
        this.config = this.getDefaultConfig();
      }
    } catch (error) {
      console.error(`❌ Error loading configuration:`, error);
      console.log('🔄 Falling back to default configuration');
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): ServerConfig {
    return {
      server: {
        name: 'Test MCP Server',
        version: '1.0.0',
        port: 3001,
        protocol: 'http',
        host: '0.0.0.0',
      },
      scenarios: [
        {
          name: 'basic-functionality',
          description: 'Test basic MCP protocol functionality',
          enabled: true,
        },
        {
          name: 'error-handling',
          description: 'Test error handling and recovery',
          enabled: true,
        },
        {
          name: 'performance',
          description: 'Test performance under load',
          enabled: false,
        },
      ],
      tools: [
        {
          name: 'echo',
          description: 'Echo back the input data',
          inputSchema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
            required: ['message'],
          },
          behavior: 'success',
          responseData: { echoed: true },
          delayMs: 0,
        },
        {
          name: 'slow_operation',
          description: 'Simulate a slow operation',
          inputSchema: {
            type: 'object',
            properties: {
              duration: { type: 'number', minimum: 0 },
            },
          },
          behavior: 'slow',
          delayMs: 2000,
        },
        {
          name: 'error_tool',
          description: 'Always returns an error',
          inputSchema: {
            type: 'object',
            properties: {},
          },
          behavior: 'error',
          errorMessage: 'Simulated tool error',
          delayMs: 0,
        },
      ],
      resources: [
        {
          uri: 'test://sample-data',
          name: 'Sample Data',
          description: 'Sample test data resource',
          mimeType: 'application/json',
          behavior: 'success',
          content: JSON.stringify({ sample: 'data', timestamp: new Date().toISOString() }),
          delayMs: 0,
        },
        {
          uri: 'test://slow-resource',
          name: 'Slow Resource',
          description: 'Resource that takes time to load',
          mimeType: 'text/plain',
          behavior: 'slow',
          content: 'This resource loaded slowly',
          delayMs: 1500,
        },
        {
          uri: 'test://error-resource',
          name: 'Error Resource',
          description: 'Resource that always fails',
          behavior: 'error',
          errorMessage: 'Simulated resource error',
          delayMs: 0,
        },
      ],
      prompts: [
        {
          name: 'test_prompt',
          description: 'A simple test prompt',
          arguments: [
            {
              name: 'context',
              description: 'Context for the prompt',
              required: true,
            },
          ],
          behavior: 'success',
          responseTemplate: 'Test prompt response with context: {{context}}',
          delayMs: 0,
        },
        {
          name: 'slow_prompt',
          description: 'A prompt that takes time to respond',
          arguments: [],
          behavior: 'slow',
          delayMs: 1000,
          responseTemplate: 'Slow prompt response',
        },
      ],
      errorSimulation: {
        connectionDropRate: 0.01,
        responseErrorRate: 0.05,
        slowResponseRate: 0.1,
        timeoutDuration: 5000,
      },
      logging: {
        level: 'info',
        requests: true,
        responses: true,
      },
    };
  }

  public getConfig(): ServerConfig {
    return this.config;
  }

  public updateConfig(newConfig: Partial<ServerConfig>): void {
    this.config = ServerConfigSchema.parse({ ...this.config, ...newConfig });
  }

  public getEnabledScenarios() {
    return this.config.scenarios.filter((scenario) => scenario.enabled);
  }

  public isScenarioEnabled(scenarioName: string): boolean {
    const scenario = this.config.scenarios.find((s) => s.name === scenarioName);
    return scenario?.enabled ?? false;
  }

  public getToolConfig(toolName: string) {
    return this.config.tools.find((tool) => tool.name === toolName);
  }

  public getResourceConfig(uri: string) {
    return this.config.resources.find((resource) => resource.uri === uri);
  }

  public getPromptConfig(promptName: string) {
    return this.config.prompts.find((prompt) => prompt.name === promptName);
  }
}
