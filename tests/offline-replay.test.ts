import { describe, it, expect, beforeAll } from 'vitest';
import { DatabaseStorage } from '../server/db-storage';
import { InsertProblem, InsertLogEntry } from '../shared/schema';
import { randomUUID } from 'crypto';

// NOTE: We intentionally point to an invalid DB host to force offline fallback.
const INVALID_DB_URL = 'postgres://invalid:5432/imf_database';

describe('Offline replay queue (mirror fallback)', () => {
  let storage: DatabaseStorage;

  beforeAll(() => {
    // Create storage with invalid URL to push operations into offline queue
    storage = new DatabaseStorage(INVALID_DB_URL);
  });

  it('queues operations when database unreachable', async () => {
    const id = randomUUID();
    await storage.createTestProfile({
      id,
      name: 'offline-profile',
      version: '1.0.0',
      description: 'test',
      sourceConfig: {},
      scenarios: [],
      expectations: {},
      generationRules: {},
      expectedData: null,
    });

    // Expect offline mode true and queue length >= 1
    expect(storage.isOffline()).toBe(true);
    const ops = storage.getOfflineOpsSnapshot();
    expect(ops.length).toBeGreaterThan(0);
    expect(ops.some((o) => o.entity === 'test_profile' && o.type === 'create')).toBe(true);
  });

  it('records multiple entity operations', async () => {
    const problem: InsertProblem = {
      description: 'offline-problem',
      type: 'TEST',
      severity: 'LOW',
      timestamp: new Date(),
      metadata: {},
    };
    await storage.createProblem(problem);

    const logEntry: InsertLogEntry = {
      level: 'info',
      source: 'test',
      message: 'offline log',
      timestamp: new Date(),
      metadata: {},
    };
    await storage.createLogEntry(logEntry);

    const ops = storage.getOfflineOpsSnapshot();
    const entities = ops.map((o) => o.entity);
    expect(entities).toContain('problem');
    expect(entities).toContain('log_entry');
  });
});
