import { z } from 'zod';

// Test scenario configurations
export const TestScenarioSchema = z.object({
  name: z.string(),
  description: z.string(),
  enabled: z.boolean().default(true),
});

export const ToolConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.any()),
  behavior: z.enum(['success', 'error', 'timeout', 'slow']).default('success'),
  responseData: z.any().optional(),
  errorMessage: z.string().optional(),
  delayMs: z.number().min(0).default(0),
});

export const ResourceConfigSchema = z.object({
  uri: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  mimeType: z.string().optional(),
  behavior: z.enum(['success', 'error', 'not_found', 'slow']).default('success'),
  content: z.string().optional(),
  errorMessage: z.string().optional(),
  delayMs: z.number().min(0).default(0),
});

export const PromptConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  arguments: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        required: z.boolean().default(false),
      }),
    )
    .default([]),
  behavior: z.enum(['success', 'error', 'slow']).default('success'),
  responseTemplate: z.string().optional(),
  errorMessage: z.string().optional(),
  delayMs: z.number().min(0).default(0),
});

export const ServerConfigSchema = z.object({
  server: z.object({
    name: z.string().default('Test MCP Server'),
    version: z.string().default('1.0.0'),
    port: z.number().min(1024).max(65535).default(3001),
    protocol: z.enum(['http', 'websocket', 'stdio']).default('http'),
    host: z.string().default('0.0.0.0'),
  }),
  scenarios: z.array(TestScenarioSchema).default([]),
  tools: z.array(ToolConfigSchema).default([]),
  resources: z.array(ResourceConfigSchema).default([]),
  prompts: z.array(PromptConfigSchema).default([]),
  errorSimulation: z
    .object({
      connectionDropRate: z.number().min(0).max(1).default(0),
      responseErrorRate: z.number().min(0).max(1).default(0),
      slowResponseRate: z.number().min(0).max(1).default(0),
      timeoutDuration: z.number().min(100).default(5000),
    })
    .default({}),
  logging: z
    .object({
      level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
      requests: z.boolean().default(true),
      responses: z.boolean().default(true),
    })
    .default({}),
});

export type TestScenario = z.infer<typeof TestScenarioSchema>;
export type ToolConfig = z.infer<typeof ToolConfigSchema>;
export type ResourceConfig = z.infer<typeof ResourceConfigSchema>;
export type PromptConfig = z.infer<typeof PromptConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

// MCP Protocol types
export interface McpRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: any;
}

export interface McpResponse {
  jsonrpc: string;
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpNotification {
  jsonrpc: string;
  method: string;
  params?: any;
}

// Test statistics
export interface TestStats {
  startTime: Date;
  requestCount: number;
  errorCount: number;
  toolCalls: Record<string, number>;
  resourceRequests: Record<string, number>;
  promptRequests: Record<string, number>;
  averageResponseTime: number;
  lastActivity: Date;
}
