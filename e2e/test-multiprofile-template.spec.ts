import { test, expect } from '@playwright/test';
import { MultiProfileTestTemplate, COMBINED_PROFILES } from './templates/MultiProfileTestTemplate';

test.describe('Multi-Profile Test Template', () => {
  test('Memory Leak Debugging Workflow', async ({ page }) => {
    console.log('🧪 Starting Multi-Profile Template Test: Memory Leak Debugging');

    // Initialize the Multi-Profile Test Template
    const template = new MultiProfileTestTemplate(page, 'memory-leak-scenario');

    // Execute the Memory Leak Debugging Workflow
    await template.executeMemoryLeakDebuggingWorkflow();

    // Generate final report
    const report = template.generateMultiProfileReport();

    // Verify the scenario completed
    expect(report.scenario).toBe('Memory Leak Debugging Scenario');
    expect(report.profileChain).toEqual(['npm-package', 'ci-high-complexity', 'docker-profile']);

    console.log('✅ Multi-Profile Template Test completed successfully');
  });

  test('Deployment Cascade Failure Scenario', async ({ page }) => {
    console.log('🧪 Starting Multi-Profile Template Test: Deployment Cascade Failure');

    // Initialize the Multi-Profile Test Template
    const template = new MultiProfileTestTemplate(page, 'deployment-cascade-failure');

    // Simulate the problem chain
    const chainResult = await template.simulateProblemChain();

    // Verify results
    expect(chainResult.overallSuccess).toBeDefined();
    expect(chainResult.triggerPhase).toBeDefined();
    expect(chainResult.impactPhase).toBeDefined();
    expect(chainResult.resolutionPhase).toBeDefined();

    console.log('📊 Chain Results:', {
      trigger: chainResult.triggerPhase.problems.actual,
      impact: chainResult.impactPhase.problems.actual,
      resolution: chainResult.resolutionPhase.problems.actual,
    });

    // Generate report
    const report = template.generateMultiProfileReport();
    expect(report.scenario).toBe('Deployment Cascade Failure');

    console.log('✅ Deployment Cascade Failure test completed');
  });

  test('Code Quality Degradation Scenario', async ({ page }) => {
    console.log('🧪 Starting Multi-Profile Template Test: Code Quality Degradation');

    // Initialize the Multi-Profile Test Template
    const template = new MultiProfileTestTemplate(page, 'code-quality-degradation');

    // Simulate the problem chain
    const chainResult = await template.simulateProblemChain();

    // Verify all phases completed
    expect(chainResult.triggerPhase).toBeDefined();
    expect(chainResult.impactPhase).toBeDefined();
    expect(chainResult.resolutionPhase).toBeDefined();

    // Verify profile chain is correct
    const report = template.generateMultiProfileReport();
    expect(report.profileChain).toEqual([
      'npm-package',
      'ci-medium-complexity',
      'ci-high-complexity',
    ]);

    console.log('✅ Code Quality Degradation test completed');
  });

  test('All Combined Profiles Validation', async ({ page }) => {
    console.log('🧪 Validating all Combined Profiles');

    const profileKeys = Object.keys(COMBINED_PROFILES);
    console.log('📋 Available Combined Profiles:', profileKeys);

    for (const profileKey of profileKeys) {
      console.log(`\n🔍 Testing Combined Profile: ${profileKey}`);

      const template = new MultiProfileTestTemplate(page, profileKey);
      const profile = COMBINED_PROFILES[profileKey];

      // Validate profile structure
      expect(profile.name).toBeTruthy();
      expect(profile.description).toBeTruthy();
      expect(profile.profiles).toHaveLength(3);
      expect(profile.expectedChain).toBeDefined();
      expect(profile.problemChain).toBeDefined();

      console.log(`✅ Profile ${profileKey} structure valid`);

      // Generate report to verify template works
      const report = template.generateMultiProfileReport();
      expect(report.scenario).toBe(profile.name);
      expect(report.profileChain).toEqual(profile.profiles);
    }

    console.log('✅ All Combined Profiles validated successfully');
  });
});
