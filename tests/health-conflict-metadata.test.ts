/* eslint-disable */
import { describe, it, expect } from 'vitest';

// Mock storage-init via factory to avoid hoist issues
// @ts-expect-error intentional mock (match .js extension used in compiled imports)
vi.mock('../server/storage-init.js', () => ({
  storage: {
    isOffline: () => true,
    getOfflineQueueLength: () => 5,
    getMirrorPrimed: () => true,
    getOfflineConflictsSnapshot: () => [
      { conflictType: 'updatedAt', resolvedAt: new Date(Date.now() - 1000) },
      { conflictType: 'lastUpdate', resolvedAt: new Date() },
    ],
  },
}));

// Ensure DATABASE_URL set so health check includes DB metadata path
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://invalid-host:5432/testdb';

import { HealthCheckService } from '../server/services/health-check.service';

describe('Health check conflict metadata', () => {
  it('includes conflict statistics in database metadata', async () => {
    const service = new HealthCheckService();
    // @ts-expect-error accessing private for test override
    service.testTCPConnection = async () => true;
    const result = await service.checkSystemHealth();
    const db = result.services.find((s) => s.service === 'database');
    expect(db).toBeDefined();
    // If metadata missing, provide diagnostic output
    expect(db?.metadata).toBeDefined();
    expect(db?.metadata?.conflictCount).toBe(2);
    expect(db?.metadata?.lastConflictType).toBe('lastUpdate');
    expect(db?.metadata?.lastConflictResolvedAt).toBeTruthy();
  });
});
