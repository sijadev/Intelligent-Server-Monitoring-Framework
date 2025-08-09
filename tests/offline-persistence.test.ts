/* eslint-disable */
import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DatabaseStorage } from '../server/db-storage';

// Verifies that queued offline operations & conflicts persist across restarts via OFFLINE_QUEUE_FILE.

const INVALID_DB_URL = 'postgres://invalid-host:5432/imf_database';
const tempFile = path.join(os.tmpdir(), `imf-offline-state-${Date.now()}.json`);

describe('Offline queue persistence', () => {
  let storage1: DatabaseStorage;

  beforeAll(() => {
    process.env.OFFLINE_QUEUE_FILE = tempFile;
    storage1 = new DatabaseStorage(INVALID_DB_URL);
  });

  it('persists offline operations to disk and restores them', async () => {
    const id = randomUUID();
    const profile: unknown = {
      id,
      name: 'persist-profile',
      version: '1.0.0',
      description: 'persist',
      sourceConfig: {},
      scenarios: [],
      expectations: {},
      generationRules: {},
      expectedData: null,
    };
    await storage1.createTestProfile(profile as any);

    // Wait a tick for async save
    await new Promise((r) => setTimeout(r, 50));
    expect(fs.existsSync(tempFile)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    expect(Array.isArray(raw.offlineOps)).toBe(true);
    expect(raw.offlineOps.length).toBeGreaterThan(0);

    // Create second instance which should load state
    const storage2 = new DatabaseStorage(INVALID_DB_URL);
    // Allow loadOfflineState promise to resolve
    await new Promise((r) => setTimeout(r, 100));
    expect(storage2.getOfflineOpsSnapshot().length).toBeGreaterThan(0);
  });
});
