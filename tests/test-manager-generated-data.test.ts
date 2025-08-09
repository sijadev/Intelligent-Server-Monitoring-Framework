import { describe, it, expect, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'child_process';

const TEST_PORT = process.env.TEST_PORT || '3071';
const BASE = `http://127.0.0.1:${TEST_PORT}`;

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

let server: ChildProcess | null = null;
let serverKilled = false;

async function waitForHealth(timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      // Use lightweight liveness endpoint; it's ready earlier than full health aggregation
      const res = await fetch(`${BASE}/api/health/live`);
      if (res.ok) return true;
    } catch (_) {
      // ignore until timeout
    }
    await sleep(500);
  }
  return false;
}

async function startServer() {
  if (server) return;
  // Use direct node invocation to avoid extra tooling layers / vite overhead
  server = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: process.cwd(),
    stdio: 'pipe',
    env: {
      ...process.env,
      PORT: TEST_PORT,
      NODE_ENV: 'test', // force test mode
      TEST_MANAGER_ENABLE_IN_TEST: 'true',
    },
  });

  let stdoutBuf = '';
  let stderrBuf = '';
  server.stdout?.on('data', (d) => {
    stdoutBuf += d.toString();
  });
  server.stderr?.on('data', (d) => {
    stderrBuf += d.toString();
  });

  // If the process exits early, fail fast
  server.on('exit', (code, signal) => {
    if (!serverKilled && code !== 0) {
      console.error(
        `[test-manager-generated-data] server exited early code=${code} signal=${signal}\nSTDOUT:\n${stdoutBuf}\nSTDERR:\n${stderrBuf}`,
      );
    }
  });

  const healthy = await waitForHealth();
  if (!healthy) {
    console.error('[test-manager-generated-data] Health check failed before timeout');
    console.error('--- PARTIAL STDOUT ---\n' + stdoutBuf.slice(-800));
    console.error('--- PARTIAL STDERR ---\n' + stderrBuf.slice(-800));
    throw new Error('Server did not become healthy before timeout');
  }
}

describe('Test Manager Generated Data API', () => {
  it('returns normalized generation results with rich statistics', async () => {
    if (process.env.TEST_VERBOSE === 'true') console.log('[test] starting server');
    await startServer();
    if (process.env.TEST_VERBOSE === 'true')
      console.log('[test] server started, beginning API calls');

    // Create a profile first
    const createRes = await fetch(`${BASE}/api/test-manager/profiles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'API Test Profile' }),
    });
    if (process.env.TEST_VERBOSE === 'true')
      console.log('[test] profile create status', createRes.status);
    expect([200, 201]).toContain(createRes.status);
    const createBody: any = await createRes.json();
    if (process.env.TEST_VERBOSE === 'true')
      console.log('[test] create body keys', Object.keys(createBody || {}));
    const profileId = createBody?.profile?.id;
    expect(profileId).toBeTruthy();

    // Trigger generation
    const genRes = await fetch(`${BASE}/api/test-manager/profiles/${profileId}/generate`, {
      method: 'POST',
    });
    if (process.env.TEST_VERBOSE === 'true') console.log('[test] generate status', genRes.status);
    expect(genRes.status).toBe(200);

    // Fetch generated data with small retry loop (persistence async)
    let entry: any = null;
    for (let i = 0; i < 5 && !entry; i++) {
      const dataRes = await fetch(`${BASE}/api/test-manager/generated-data?limit=20`);
      expect(dataRes.status).toBe(200);
      const body: any = await dataRes.json();
      if (i === 0 && process.env.TEST_VERBOSE === 'true')
        console.log('[test] first data fetch keys', Object.keys(body || {}));
      const list = body.data || body || [];
      entry = list.find((d: any) => d.profileId === profileId);
      if (!entry) await sleep(500);
    }
    if (process.env.TEST_VERBOSE === 'true') console.log('[test] final entry found?', !!entry);
    expect(entry).toBeTruthy();
    expect(entry.statistics.totalLogEntries).toBeTypeOf('number');
    expect(entry.statistics.totalMetricPoints).toBeTypeOf('number');
    expect(entry.statistics.totalCodeProblems).toBeTypeOf('number');
    expect(entry.statistics.dataSize).toBeTypeOf('number');
    expect(entry.metadata.generatorVersion).toBeTruthy();
    expect(entry.metadata.totalSamples).toBeTypeOf('number');
  }, 30000);
});

afterAll(async () => {
  if (server) {
    server.kill('SIGTERM');
    await sleep(500);
  }
});
