/* eslint-disable */
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';

// Use factory to avoid referencing variables before initialization (Vitest hoists vi.mock)
// @ts-expect-error intentional mock of module
vi.mock('../server/storage-init', () => {
  const stub = {
    isOffline: () => true,
    getOfflineQueueLength: () => 2,
    getMirrorPrimed: () => true,
    getOfflineOpsSnapshot: () => [
      {
        entity: 'test_profile',
        type: 'create',
        id: 'a',
        timestamp: new Date(),
        baseTimestamp: null,
      },
      { entity: 'plugin', type: 'update', id: 'b', timestamp: new Date(), baseTimestamp: null },
    ],
    getOfflineConflictsSnapshot: () => [
      {
        entity: 'test_profile',
        id: 'a',
        conflictType: 'updatedAt',
        baseTimestamp: '2024-01-01T00:00:00.000Z',
        remoteTimestamp: '2024-01-01T00:00:01.000Z',
        resolvedAt: new Date(),
      },
    ],
    triggerResyncCalled: false,
    triggerResync: async function () {
      this.triggerResyncCalled = true;
    },
  } as unknown as { [k: string]: any };
  return { storage: stub };
});

import { frameworkRoutes } from '../server/routes/framework.routes';

describe('Framework offline diagnostics endpoints', () => {
  let app: express.Express;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/framework', frameworkRoutes);
  });

  it('GET /framework/offline-queue returns queued operations', async () => {
    const res = await request(app).get('/framework/offline-queue');
    expect(res.status).toBe(200);
    expect(res.body.offline).toBe(true);
    expect(res.body.queueLength).toBe(2);
    expect(Array.isArray(res.body.operations)).toBe(true);
    expect(res.body.operations.length).toBe(2);
  });

  it('GET /framework/offline-conflicts returns conflicts', async () => {
    const res = await request(app).get('/framework/offline-conflicts');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.conflicts[0].conflictType).toBe('updatedAt');
  });

  it('POST /framework/offline-queue/replay triggers manual resync', async () => {
    const res = await request(app).post('/framework/offline-queue/replay');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/Replay triggered/);
    // We re-import the mocked module to access stub state
    const mod = (await import('../server/storage-init')) as unknown as {
      storage: { triggerResyncCalled: boolean };
    };
    expect(mod.storage.triggerResyncCalled).toBe(true);
  });
});
