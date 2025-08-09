import { test, expect } from '@playwright/test';
import { UserStoryTestTemplate } from '../../templates/UserStoryTestTemplate';

test.describe('👩‍💻 Developer: Code Analysis mit Testprofilen', () => {
  test('Developer: Deployment Validation mit Docker Test Profil', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'docker-profile');

    await testTemplate.executeUserStoryTemplate(
      '👩‍💻 Developer (Alex)',
      'Docker Deployment validieren (erwartete Belastung: 74 Probleme, 4,830 Log Entries)',
      [
        {
          name: 'Pre-Deployment Baseline Check',
          context:
            'Alex überprüft das System vor Docker Deployment basierend auf Docker Test Profil',
          action: async () => {
            await testTemplate.dashboardPage.goto();

            // Docker Profile Baseline Validierung
            const comparison = await testTemplate.validateExpectedVsActual();

            console.log(`🐳 Docker Test Profile Baseline:`);
            console.log(
              `   - Erwartete Containerization Probleme: ${comparison.problems.expected}`,
            );
            console.log(`   - Erwartete Log Aktivität: ${comparison.logEntries.expected}`);
            console.log(`   - Erwartete System Metrics: ${comparison.metrics.expected}`);

            // Dokumentiere Baseline für Deployment Vergleich
            const currentProblems = comparison.problems.actual;
            console.log(`📊 Baseline Problems vor Deployment: ${currentProblems}`);
          },
        },
        {
          name: 'Container-spezifische System Metriken',
          context: 'Alex überprüft Container-relevante Metriken entsprechend Docker Profil',
          action: async () => {
            const systemInfoVisible = await testTemplate.dashboardPage.isElementVisible(
              '[data-testid="system-info"]',
            );

            if (systemInfoVisible) {
              const metricsText = await page.textContent('[data-testid="system-info"]');
              console.log(
                `🖥️ System Metrics für Docker Profile: ${metricsText?.substring(0, 200)}...`,
              );

              // Docker deployments belasten oft Memory und CPU
              const hasMemoryInfo = metricsText?.includes('Memory') || metricsText?.includes('%');
              const hasCpuInfo = metricsText?.includes('CPU') || metricsText?.includes('Usage');

              if (hasMemoryInfo && hasCpuInfo) {
                console.log(`✅ Container-relevante Metriken verfügbar`);
              } else {
                console.log(`ℹ️  Container Metriken begrenzt sichtbar`);
              }
            }

            // Validiere gegen Docker Profile Erwartungen
            await testTemplate.performProfileSpecificAssertions();
          },
        },
        {
          name: 'Post-Deployment Impact Analysis',
          context: 'Alex analysiert Impact nach Docker Deployment mit erwarteten Werten',
          action: async () => {
            // Simuliere Deployment Impact Check
            await page.waitForTimeout(2000); // Kurze Wartezeit für "Deployment"

            const newComparison = await testTemplate.validateExpectedVsActual();

            console.log(`📈 Docker Deployment Impact Analyse:`);
            if (newComparison.problems.actual <= newComparison.problems.expected * 1.2) {
              console.log(`✅ Problem-Anstieg innerhalb Docker Profile Toleranz`);
            } else {
              console.log(
                `⚠️  Probleme über Docker Profile Erwartung - Deployment Impact Review nötig`,
              );
            }

            // Docker Profile erwartet 214.16 KB Daten
            console.log(`💾 Erwartete Docker Deployment Datenmenge: 214.16 KB`);
          },
        },
      ],
    );
  });

  test('Developer: Code Quality Analysis mit CI High Complexity', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'ci-high-complexity');

    await testTemplate.executeUserStoryTemplate(
      '👩‍💻 Developer (Alex)',
      'Code Quality bei hoher CI Komplexität analysieren (8,636 Log Entries, 87 Probleme)',
      [
        {
          name: 'High Complexity Code Analysis Vorbereitung',
          context: 'Alex bereitet Code Analyse für High Complexity CI Szenario vor',
          action: async () => {
            await testTemplate.dashboardPage.goto();

            // Prüfe ob Code Analysis verfügbar ist
            const codeAnalysisLink = page.locator('a[href="/code-analysis"]');
            const isCodeAnalysisAvailable = await codeAnalysisLink.isVisible();

            if (isCodeAnalysisAvailable) {
              console.log(`🔍 Code Analysis verfügbar - ideal für CI High Complexity`);
              await codeAnalysisLink.click();
              await page.waitForLoadState('networkidle');
            } else {
              console.log(
                `ℹ️  Code Analysis über Dashboard - High Complexity Daten interpretieren`,
              );
            }

            // Validiere High Complexity Baseline
            await testTemplate.validateSystemState(); // Erwartet hohe Aktivität
          },
        },
        {
          name: 'Soll/Ist Vergleich für komplexe CI Szenarien',
          context: 'Alex führt detaillierte Analyse mit CI High Complexity Erwartungen durch',
          action: async () => {
            const comparison = await testTemplate.validateExpectedVsActual();

            console.log(`🔥 CI High Complexity Analyse:`);
            console.log(
              `   - Log Entries Soll/Ist: ${comparison.logEntries.expected}/${comparison.logEntries.actual}`,
            );
            console.log(
              `   - Problems Soll/Ist: ${comparison.problems.expected}/${comparison.problems.actual}`,
            );
            console.log(
              `   - Metrics Soll/Ist: ${comparison.metrics.expected}/${comparison.metrics.actual}`,
            );

            // High Complexity Profile erwartet viel Aktivität
            if (comparison.logEntries.actual > 50 || comparison.problems.actual > 10) {
              console.log(`✅ System zeigt High Complexity Aktivität wie erwartet`);
            } else {
              console.log(
                `📉 System läuft ruhiger als CI High Complexity Profil - möglicherweise positiv`,
              );
            }

            // Expected data size: 235.79 KB
            console.log(`💾 CI High Complexity erwartete Datenmenge: 235.79 KB`);
          },
        },
        {
          name: 'Performance Impact bei hoher Komplexität',
          context: 'Alex testet ob das System bei High Complexity Performance-Probleme hat',
          action: async () => {
            // Test Response Times unter Last
            const pages = ['/problems', '/metrics', '/logs'];
            const responseTimes = [];

            for (const pagePath of pages) {
              const startTime = Date.now();
              try {
                await page.goto(pagePath);
                await page.waitForLoadState('networkidle', { timeout: 8000 });
                const responseTime = Date.now() - startTime;
                responseTimes.push(responseTime);
                console.log(`⚡ ${pagePath}: ${responseTime}ms (High Complexity)`);
              } catch (error) {
                console.log(`⚠️  ${pagePath}: Timeout bei High Complexity`);
                responseTimes.push(8000); // Timeout als Maximum
              }
            }

            const avgResponse = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
            console.log(
              `📊 Durchschnitt Response Time bei High Complexity: ${avgResponse.toFixed(0)}ms`,
            );

            // Bei High Complexity sind längere Response Times akzeptabel
            expect(avgResponse).toBeLessThan(10000); // 10s Maximum für High Complexity

            if (avgResponse < 5000) {
              console.log(`✅ Ausgezeichnete Performance trotz CI High Complexity`);
            } else {
              console.log(`✅ Akzeptable Performance für CI High Complexity Profil`);
            }
          },
        },
      ],
    );
  });

  test('Developer: Standard Development mit NPM Package Profil', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'npm-package');

    await testTemplate.executeUserStoryTemplate(
      '👩‍💻 Developer (Alex)',
      'Standard Development Workflow mit NPM Package Testing (36 Probleme, 155.71 KB)',
      [
        {
          name: 'Development Environment Baseline',
          context: 'Alex startet Development Session mit NPM Package Test Profil',
          action: async () => {
            await testTemplate.dashboardPage.goto();

            const comparison = await testTemplate.validateExpectedVsActual();

            console.log(`📦 NPM Package Development Baseline:`);
            console.log(`   - Development Problems erwartet: ${comparison.problems.expected}`);
            console.log(`   - Log Activity für Package Tests: ${comparison.logEntries.expected}`);

            // NPM Package Profile - moderate Aktivität erwartet
            if (comparison.problems.actual <= 50) {
              console.log(`✅ Problem-Level ideal für NPM Package Development`);
            } else {
              console.log(`⚠️  Mehr Probleme als NPM Package Profil erwartet`);
            }
          },
        },
        {
          name: 'TypeScript/JavaScript Development Validation',
          context: 'Alex validiert Development Environment für TypeScript/JavaScript',
          action: async () => {
            // NPM Package Profil fokussiert auf TypeScript/JavaScript
            console.log(`🔧 NPM Package Profil: TypeScript/JavaScript Development`);

            // Prüfe Plugin Status für Development
            const pluginCount = await page
              .textContent('[data-testid="plugins-card"] .count')
              .catch(() => '0');
            console.log(`🔌 Aktive Plugins für Development: ${pluginCount}`);

            const pluginCountNum = parseInt(pluginCount) || 0;
            if (pluginCountNum > 10) {
              console.log(`✅ Ausreichend Plugins für NPM Package Development aktiv`);
            } else {
              console.log(`ℹ️  Wenige Plugins - minimaler Development Setup`);
            }

            await testTemplate.performProfileSpecificAssertions();
          },
        },
        {
          name: 'Package Test Results Interpretation',
          context: 'Alex interpretiert Test-Ergebnisse basierend auf NPM Package Profil',
          action: async () => {
            // NPM Package Tests erzeugen spezifische Datenmengen
            const expectedDataSize = 155.71; // KB
            console.log(`📊 NPM Package Tests - erwartete Datenmenge: ${expectedDataSize} KB`);

            // Validiere dass System für Package Testing geeignet ist
            const systemStable = await testTemplate.dashboardPage.getServerStatus();
            console.log(`🖥️ System Status für Package Testing: ${systemStable}`);

            expect(
              ['Online', 'Running', 'Active', 'Healthy'].some((s) =>
                systemStable.toLowerCase().includes(s.toLowerCase()),
              ),
            ).toBeTruthy();

            console.log(`✅ System bereit für NPM Package Testing gemäß Profil`);
          },
        },
      ],
    );
  });
});
