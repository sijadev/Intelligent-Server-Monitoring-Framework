import express from 'express';
import { ConfigManager } from './config-manager';
import { TestStats } from './types';

export class SimpleMcpServer {
  private config: ConfigManager;
  private stats: TestStats;
  private app: express.Application;

  constructor(configPath?: string) {
    this.config = new ConfigManager(configPath);
    this.app = express();
    this.stats = {
      startTime: new Date(),
      requestCount: 0,
      errorCount: 0,
      toolCalls: {},
      resourceRequests: {},
      promptRequests: {},
      averageResponseTime: 0,
      lastActivity: new Date(),
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      this.stats.requestCount++;
      this.stats.lastActivity = new Date();
      next();
    });
  }

  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: this.config.getConfig().server.name,
        version: this.config.getConfig().server.version,
        uptime: Date.now() - this.stats.startTime.getTime(),
        stats: this.stats,
      });
    });

    // Configuration
    this.app.get('/config', (req, res) => {
      res.json(this.config.getConfig());
    });

    // Statistics
    this.app.get('/stats', (req, res) => {
      res.json(this.stats);
    });

    this.app.post('/stats/reset', (req, res) => {
      this.resetStats();
      res.json({ message: 'Statistics reset successfully' });
    });

    // MCP Protocol endpoints
    this.app.post('/mcp/tools/list', async (req, res) => {
      try {
        const tools = this.config.getConfig().tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: { tools },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });

    this.app.post('/mcp/tools/call', async (req, res) => {
      try {
        const { name, arguments: args } = req.body.params;
        const startTime = Date.now();

        this.stats.toolCalls[name] = (this.stats.toolCalls[name] || 0) + 1;

        const toolConfig = this.config.getToolConfig(name);
        if (!toolConfig) {
          throw new Error(`Tool '${name}' not found`);
        }

        // Simulate delay
        if (toolConfig.delayMs > 0) {
          await this.delay(toolConfig.delayMs);
        }

        // Simulate behaviors
        switch (toolConfig.behavior) {
          case 'error':
            throw new Error(toolConfig.errorMessage || 'Simulated tool error');
          case 'timeout':
            await this.delay(this.config.getConfig().errorSimulation.timeoutDuration + 1000);
            throw new Error('Tool operation timed out');
          case 'slow':
            await this.delay(toolConfig.delayMs || 3000);
            break;
        }

        const responseTime = Date.now() - startTime;
        this.updateResponseTime(responseTime);

        const responseData = toolConfig.responseData || {
          tool: name,
          input: args,
          timestamp: new Date().toISOString(),
          processed: true,
        };

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(responseData, null, 2),
              },
            ],
          },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });

    this.app.post('/mcp/resources/list', async (req, res) => {
      try {
        const resources = this.config.getConfig().resources.map((resource) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }));

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: { resources },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });

    this.app.post('/mcp/resources/read', async (req, res) => {
      try {
        const { uri } = req.body.params;
        const startTime = Date.now();

        this.stats.resourceRequests[uri] = (this.stats.resourceRequests[uri] || 0) + 1;

        const resourceConfig = this.config.getResourceConfig(uri);
        if (!resourceConfig) {
          throw new Error(`Resource '${uri}' not found`);
        }

        // Simulate delay
        if (resourceConfig.delayMs > 0) {
          await this.delay(resourceConfig.delayMs);
        }

        // Simulate behaviors
        switch (resourceConfig.behavior) {
          case 'error':
            throw new Error(resourceConfig.errorMessage || 'Simulated resource error');
          case 'not_found':
            throw new Error(`Resource '${uri}' not found`);
          case 'slow':
            await this.delay(resourceConfig.delayMs || 2000);
            break;
        }

        const responseTime = Date.now() - startTime;
        this.updateResponseTime(responseTime);

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            contents: [
              {
                uri: resourceConfig.uri,
                mimeType: resourceConfig.mimeType || 'text/plain',
                text: resourceConfig.content || `Content for ${uri}`,
              },
            ],
          },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });

    this.app.post('/mcp/prompts/list', async (req, res) => {
      try {
        const prompts = this.config.getConfig().prompts.map((prompt) => ({
          name: prompt.name,
          description: prompt.description,
          arguments: prompt.arguments,
        }));

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: { prompts },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });

    this.app.post('/mcp/prompts/get', async (req, res) => {
      try {
        const { name, arguments: args } = req.body.params;
        const startTime = Date.now();

        this.stats.promptRequests[name] = (this.stats.promptRequests[name] || 0) + 1;

        const promptConfig = this.config.getPromptConfig(name);
        if (!promptConfig) {
          throw new Error(`Prompt '${name}' not found`);
        }

        // Simulate delay
        if (promptConfig.delayMs > 0) {
          await this.delay(promptConfig.delayMs);
        }

        // Simulate behaviors
        switch (promptConfig.behavior) {
          case 'error':
            throw new Error(promptConfig.errorMessage || 'Simulated prompt error');
          case 'slow':
            await this.delay(promptConfig.delayMs || 1500);
            break;
        }

        const responseTime = Date.now() - startTime;
        this.updateResponseTime(responseTime);

        // Process template with arguments
        let responseText = promptConfig.responseTemplate || `Response for prompt: ${name}`;
        if (args) {
          Object.entries(args).forEach(([key, value]) => {
            responseText = responseText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
          });
        }

        res.json({
          jsonrpc: '2.0',
          id: req.body.id,
          result: {
            description: promptConfig.description,
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: responseText,
                },
              },
            ],
          },
        });
      } catch (error) {
        this.handleError(req, res, error);
      }
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private updateResponseTime(responseTime: number): void {
    const totalTime = this.stats.averageResponseTime * (this.stats.requestCount - 1) + responseTime;
    this.stats.averageResponseTime = totalTime / this.stats.requestCount;
  }

  private handleError(req: express.Request, res: express.Response, error: any): void {
    this.stats.errorCount++;
    console.error('MCP Server Error:', error);

    res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id,
      error: {
        code: -32603,
        message: error.message || 'Internal error',
      },
    });
  }

  private resetStats(): void {
    this.stats = {
      startTime: new Date(),
      requestCount: 0,
      errorCount: 0,
      toolCalls: {},
      resourceRequests: {},
      promptRequests: {},
      averageResponseTime: 0,
      lastActivity: new Date(),
    };
  }

  public async start(): Promise<void> {
    const { port, host } = this.config.getConfig().server;

    return new Promise((resolve) => {
      this.app.listen(port, host, () => {
        console.log(`🚀 Simple MCP Server listening on ${host}:${port}`);
        resolve();
      });
    });
  }

  public getStats(): TestStats {
    return { ...this.stats };
  }

  public getConfig(): ConfigManager {
    return this.config;
  }
}
