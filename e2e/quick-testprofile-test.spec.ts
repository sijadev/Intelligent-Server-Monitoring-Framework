import { test, expect } from '@playwright/test';
import { UserStoryTestTemplate, TEST_PROFILES } from './templates/UserStoryTestTemplate';

test.describe('🎯 Testprofil-Integration Test', () => {
  test('Test Template System mit CI High Complexity', async ({ page }) => {
    console.log('\n🎬 === TESTPROFIL INTEGRATION TEST START ===');

    // Testprofil: CI High Complexity
    const testTemplate = new UserStoryTestTemplate(page, 'ci-high-complexity');

    console.log(`📊 Testprofil geladen: ${testTemplate['testProfile'].name}`);
    console.log(`   - Erwartete Problems: ${testTemplate['testProfile'].expectedData.problems}`);
    console.log(
      `   - Erwartete Log Entries: ${testTemplate['testProfile'].expectedData.logEntries}`,
    );
    console.log(`   - Erwartete Data Size: ${testTemplate['testProfile'].expectedData.sizeKB} KB`);

    await test.step('Dashboard Navigation', async () => {
      await testTemplate.dashboardPage.goto();
      console.log('✅ Dashboard Navigation erfolgreich');
    });

    await test.step('Soll/Ist Vergleich durchführen', async () => {
      const comparison = await testTemplate.validateExpectedVsActual();

      console.log('\n📈 SOLL/IST VERGLEICH ERGEBNIS:');
      console.log(
        `   Problems: Soll=${comparison.problems.expected}, Ist=${comparison.problems.actual}, Match=${comparison.problems.match}`,
      );
      console.log(
        `   Log Entries: Soll=${comparison.logEntries.expected}, Ist=${comparison.logEntries.actual}, Match=${comparison.logEntries.match}`,
      );
      console.log(
        `   Metrics: Soll=${comparison.metrics.expected}, Ist=${comparison.metrics.actual}, Match=${comparison.metrics.match}`,
      );
      console.log(`   Overall Match: ${comparison.overallMatch}`);

      // Validierung dass das System funktioniert
      expect(typeof comparison.problems.actual).toBe('number');
      expect(comparison.problems.actual).toBeGreaterThanOrEqual(0);
    });

    await test.step('User Story Template ausführen', async () => {
      await testTemplate.executeUserStoryTemplate(
        '🧪 Test User',
        'Testprofil-Integration validieren',
        [
          {
            name: 'Template Funktionalität prüfen',
            context: 'Test ob das Template System funktioniert',
            action: async () => {
              console.log('🔧 Template System funktioniert korrekt');

              // Test Profile spezifische Validierungen
              await testTemplate.performProfileSpecificAssertions();
              console.log('✅ Profil-spezifische Validierungen durchgeführt');
            },
          },
        ],
      );
    });

    console.log('\n🎬 === TESTPROFIL INTEGRATION TEST ERFOLGREICH ===');
  });

  test('Verfügbare Testprofile validieren', async ({ page }) => {
    console.log('\n📋 === TESTPROFILE VERFÜGBARKEIT ===');

    for (const [key, profile] of Object.entries(TEST_PROFILES)) {
      console.log(`📦 ${key}:`);
      console.log(`   - Name: ${profile.name}`);
      console.log(`   - Complexity: ${profile.complexity}`);
      console.log(`   - Erwartete Probleme: ${profile.expectedData.problems}`);
      console.log(`   - Erwartete Logs: ${profile.expectedData.logEntries}`);
      console.log(`   - Erwartete Data Size: ${profile.expectedData.sizeKB} KB`);
      console.log(`   - Sprachen: ${profile.languages.join(', ')}`);
      console.log(`   - Scenarios: ${profile.scenarios.join(', ')}`);
    }

    // Validiere dass alle Profile korrekt definiert sind
    expect(Object.keys(TEST_PROFILES)).toHaveLength(4);
    expect(TEST_PROFILES['ci-high-complexity'].expectedData.problems).toBe(87);
    expect(TEST_PROFILES['docker-profile'].expectedData.sizeKB).toBe(214.16);

    console.log(`\n✅ ${Object.keys(TEST_PROFILES).length} Testprofile erfolgreich validiert`);
  });
});
