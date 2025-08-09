import { describe, test, expect, beforeAll } from 'vitest';
import { createTestManagerService } from '../server/services/test-manager.service';
import { createProfileFromTemplate, listProfileTemplates } from './utils/profile-factory';

/**
 * Integration test: ensure template driven profile creation persists expected fields
 */
describe('Profile Factory Integration', () => {
  let svc: ReturnType<typeof createTestManagerService>;

  beforeAll(async () => {
    process.env.TEST_MANAGER_ENABLE_IN_TEST = 'true';
    svc = createTestManagerService({ workspacePath: './test-workspace' });
    await svc.initialize();
  });

  test('creates profile from template with mapped generation fields', async () => {
    const templates = await listProfileTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const tpl = templates[0];

    const input = await createProfileFromTemplate(tpl.id, { name: 'Factory Test Profile' });
    const created = await svc.createProfile({
      name: input.name,
      description: input.description,
      complexity: input.complexity,
      sampleCount: input.sampleCount,
      varianceLevel: input.varianceLevel,
      duration: input.duration,
      errorDistribution: input.errorDistribution,
    } as any);

    expect(created.name).toBe(input.name);
    expect(created.sourceConfig.complexity).toBe(input.complexity);
    expect(created.generationRules.sampleCount).toBe(input.sampleCount);
    expect(created.generationRules.varianceLevel).toBe(input.varianceLevel);
    expect(created.scenarios[0].duration).toBe(input.duration);
    expect(created.generationRules.errorDistribution).toEqual(input.errorDistribution);
  });
});
