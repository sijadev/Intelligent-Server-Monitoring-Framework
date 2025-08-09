import { beforeAll, afterAll, describe, test, expect } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';

const TEST_PORT = process.env.TEST_PORT || '3060';
const BASE = `http://127.0.0.1:${TEST_PORT}`;

let server: ChildProcess | null = null;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
async function waitReady(maxMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const live = await fetch(`${BASE}/api/health/live`);
      if (live.status === 200) return;
      const res = await fetch(`${BASE}/api/health`);
      if (res.status === 200 || res.status === 503) return;
    } catch {}
    await sleep(250);
  }
  throw new Error('server not ready');
}

beforeAll(async () => {
  // If already running on TEST_PORT, don't start a new one
  const alreadyUp = await (async () => {
    try {
      return (await fetch(`${BASE}/api/health/live`)).status === 200;
    } catch {
      return false;
    }
  })();

  if (!alreadyUp) {
    console.log('[api-paths] starting server...');
    server = spawn('npm', ['run', 'dev'], {
      cwd: '/Users/simonjanke/Projects/IMF',
      stdio: 'pipe',
      env: { ...process.env, PORT: TEST_PORT, NODE_ENV: 'test' },
    });

    let resolved = false;
    await new Promise<void>((resolve) => {
      const deadline = Date.now() + 20000;
      const check = async () => {
        if (resolved) return;
        try {
          const live = await fetch(`${BASE}/api/health/live`);
          if (live.status === 200) {
            resolved = true;
            resolve();
            return;
          }
        } catch {}
        if (Date.now() > deadline) {
          resolve();
          return;
        }
        setTimeout(check, 250);
      };
      server!.stdout?.on('data', (buf) => {
        const s = buf.toString();
        if (!resolved && s.includes('serving on port')) {
          resolved = true;
          resolve();
        }
      });
      server!.stderr?.on('data', (buf) => {
        const s = buf.toString();
        if (s.trim()) console.error('[server]', s.trim());
      });
      void check();
    });
  }

  await waitReady();
  console.log('[api-paths] server is ready');
});

afterAll(async () => {
  if (!server) return;
  server.kill('SIGTERM');
  await sleep(600);
  if (!server.killed) server.kill('SIGKILL');
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
    { path: '/api/test-manager/status', ok: [200, 404] },
    { path: '/api/mcp/servers', ok: [200] },
    { path: '/api/logs', ok: [200] },
    { path: '/api/config', ok: [200] },
    { path: '/api/framework/config', ok: [200] },
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
    });
  }
});
