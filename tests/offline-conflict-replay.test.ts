/* eslint-disable */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../shared/schema';
import { DatabaseStorage } from '../server/db-storage';

// This test exercises conflict resolution logic for test_profile & plugin offline replay.
// It requires a real DATABASE_URL; if missing, the suite is skipped.

const REAL_DB_URL = process.env.DATABASE_URL || '';
const INVALID_DB_URL = 'postgres://invalid-host:5432/imf_database';

// Skip helper
const skip = !REAL_DB_URL;

describe('Offline replay conflict resolution', () => {
  if (skip) {
    it.skip('skipped because DATABASE_URL not set', () => {});
    return;
  }

  let online: DatabaseStorage;
  let offline: DatabaseStorage;

  beforeAll(() => {
    online = new DatabaseStorage(REAL_DB_URL);
    // Force an offline instance with invalid URL (will queue ops)
    offline = new DatabaseStorage(INVALID_DB_URL);
  });

  afterAll(async () => {
    await online.close();
    await offline.close();
  });

  it('resolves conflicts for test_profile updates on replay', async () => {
    // 1. Create a profile online
    const id = randomUUID();
    const created = await online.createTestProfile({
      id,
      name: 'conflict-profile',
      version: '1.0.0',
      description: 'base',
      sourceConfig: { a: 1 },
      scenarios: [{ s: 1 }],
      expectations: { x: 1 },
      generationRules: { r: 1 },
      expectedData: null,
    } as unknown as any);

    // 2. Queue an offline update referencing the original updatedAt as baseTimestamp
    await offline.updateTestProfile(id, {
      description: 'offline-change',
      // Provide previous updatedAt so baseTimestamp captured
      updatedAt: created.updatedAt,
      scenarios: [{ s: 2 }],
      expectations: { y: 2 },
      sourceConfig: { b: 2 },
      generationRules: { r: 2 },
    } as unknown as any);
    const queued = offline.getOfflineOpsSnapshot();
    expect(queued.some((o) => o.entity === 'test_profile' && o.type === 'update')).toBe(true);

    // 3. Modify the remote record to create a conflict (new updatedAt)
    await online.updateTestProfile(id, {
      description: 'remote-change',
      scenarios: [{ s: 3 }],
      expectations: { z: 3 },
      sourceConfig: { c: 3 },
    } as unknown as any);

    // 4. Rewire offline storage to real DB (simulate connectivity restoration)
    // Cast to any to override private fields (TS private is compile-time only)
    const anyOffline: any = offline;
    anyOffline.connection = postgres(REAL_DB_URL, { max: 1 });
    anyOffline.db = drizzle(anyOffline.connection, { schema });

    // Mark still offline to force replay
    (anyOffline as any).offlineMode = true;

    await offline.triggerResync();

    // 5. Verify conflict recorded
    const conflicts = offline.getOfflineConflictsSnapshot();
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some((c) => c.entity === 'test_profile' && c.id === id)).toBe(true);

    // 6. Verify merged record contains union of scenarios & merged expectation/sourceConfig fields
    const merged = await online.getTestProfile(id);
    expect(merged).toBeDefined();
    // Contains scenario entries from both remote (s:3) and offline (s:2) & original (s:1)
    const rawScenarios: unknown =
      (merged as unknown as { scenarios?: Array<Record<string, number>> }).scenarios || [];
    const scenarioKeys = Array.isArray(rawScenarios)
      ? rawScenarios.map((s) => (s as Record<string, number>).s).sort()
      : [];
    expect(new Set(scenarioKeys)).toEqual(new Set([1, 2, 3]));
    // Merged expectations include x, y, z
    expect(merged!.expectations).toMatchObject({ x: 1, y: 2, z: 3 });
    // sourceConfig merged
    expect(merged!.sourceConfig).toMatchObject({ a: 1, b: 2, c: 3 });
  }, 30000);

  it('resolves conflicts for plugin updates (config merge)', async () => {
    const pluginName = 'offline-plugin-' + Date.now();
    // Create plugin online
    const created = await online.createPlugin({
      name: pluginName,
      version: '1',
      type: 'test',
      status: 'inactive',
      config: { a: 1 },
    } as unknown as any);

    // Queue offline update with base timestamp
    await offline.updatePlugin(created.id, {
      config: { b: 2 },
      lastUpdate: created.lastUpdate,
    } as unknown as any);

    // Remote change to create conflict
    await online.updatePlugin(created.id, { config: { c: 3 } } as unknown as any);

    // Rewire offline storage to real DB & resync
    const anyOffline: any = offline;
    anyOffline.connection = postgres(REAL_DB_URL, { max: 1 });
    anyOffline.db = drizzle(anyOffline.connection, { schema });
    (anyOffline as any).offlineMode = true;

    await offline.triggerResync();

    const conflicts = offline.getOfflineConflictsSnapshot();
    expect(conflicts.some((c) => c.entity === 'plugin')).toBe(true);
    const plugin = await online.getPlugin(pluginName);
    expect(plugin?.config).toMatchObject({ a: 1, b: 2, c: 3 });
  }, 20000);
});
