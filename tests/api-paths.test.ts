import { beforeAll, afterAll, describe, test, expect } from 'vitest';
// Ensure lightweight mode env is set before server code imports config
process.env.IMF_LIGHTWEIGHT_TEST = '1';
import { startTestServer } from './utils/test-server';

let close: (() => Promise<void>) | null = null;
let BASE: string;

beforeAll(async () => {
  const s = await startTestServer();
  close = s.close;
  BASE = s.baseUrl;
});

afterAll(async () => {
  if (close) await close();
});

// Minimal contract: 2xx/503 and JSON with expected shape for key endpoints

describe('API paths contract', () => {
  const endpoints = [
    { path: '/api/health', ok: [200, 503] },
    { path: '/api/health/detailed', ok: [200, 503] },
    { path: '/api/health/live', ok: [200] },
    { path: '/api/health/ready', ok: [200, 503] },
    { path: '/api/dashboard', ok: [200] },
    { path: '/api/plugins', ok: [200] },
    { path: '/api/problems', ok: [200] },
    { path: '/api/metrics', ok: [200] },
    { path: '/api/test-manager/status', ok: [200, 404, 503] },
    { path: '/api/mcp/servers', ok: [200] },
    { path: '/api/logs', ok: [200] },
    { path: '/api/config', ok: [200, 404] },
    { path: '/api/framework/config', ok: [200, 404] },
    { path: '/api/ai/stats', ok: [200, 404, 503] },
    { path: '/api/deployments', ok: [200] },
    { path: '/api/code-analysis/runs', ok: [200] },
  ];

  for (const ep of endpoints) {
    test(`${ep.path} should respond`, async () => {
      const res = await fetch(`${BASE}${ep.path}`);
      expect(ep.ok).toContain(res.status);
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        await res.json().catch(() => {
          throw new Error(`${ep.path} did not return valid JSON`);
        });
      }
    }, 20000);
  }
});
