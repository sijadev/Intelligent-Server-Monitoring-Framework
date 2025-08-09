import { describe, expect, test, beforeAll } from 'vitest';
import { createTestManagerService } from '../server/services/test-manager.service';

describe('Test Manager Smoke', () => {
  beforeAll(() => {
    process.env.TEST_MANAGER_ENABLE_IN_TEST = 'true';
  });

  test('initializes and exposes basic profile/generation', async () => {
    const svc = createTestManagerService({ workspacePath: './test-workspace' });
    await svc.initialize();

    const status = svc.getStatus();
    expect(status.initialized).toBe(true);

    const profiles = await svc.getProfiles();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThan(0);

    const profileId = profiles[0].id;
    const result = await svc.generateTestData(profileId);
    expect(result.success).toBe(true);
    expect(result.profileId).toBe(profileId);
  });
});
