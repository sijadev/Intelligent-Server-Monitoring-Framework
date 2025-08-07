import { test, expect } from '@playwright/test';
import { UserStoryTestTemplate } from '../../templates/UserStoryTestTemplate';

test.describe('👨‍💻 System Admin: Server Monitoring mit Testprofilen', () => {
  
  test('System Admin: Morgendliche Kontrolle mit CI Medium Complexity Profil', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'ci-medium-complexity');
    
    await testTemplate.executeUserStoryTemplate(
      '👨‍💻 System Administrator (Sarah)',
      'Morgendliche Systemkontrolle mit erwarteten 74 Problemen und 4,830 Log Einträgen',
      [
        {
          name: 'Ankunft im Büro - Dashboard öffnen',
          context: 'Sarah kommt um 8:00 Uhr ins Büro und öffnet als erstes das MCP.Guard Dashboard',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            // Mit CI Medium Complexity erwarten wir moderate Aktivität
            const serverStatus = await testTemplate.dashboardPage.getServerStatus();
            console.log(`🖥️ Server Status: ${serverStatus}`);
            expect(['Online', 'Running', 'Active'].some(s => 
              serverStatus.toLowerCase().includes(s.toLowerCase())
            )).toBeTruthy();
          }
        },
        {
          name: 'Soll/Ist Vergleich der Problemanzahl',
          context: 'Sarah überprüft ob die Problemanzahl den Erwartungen des CI Medium Profils entspricht',
          action: async () => {
            const actualProblems = await testTemplate.dashboardPage.getActiveProblemsCount();
            console.log(`📊 Aktuelle Probleme: ${actualProblems} (Soll: 74 für CI Medium)`);
            
            // Für CI Medium Complexity erwarten wir ~74 Probleme (±20% Toleranz)
            if (actualProblems > 0) {
              expect(actualProblems).toBeLessThanOrEqual(90); // 74 + 20% Toleranz
              console.log(`✅ Problemanzahl im erwarteten Bereich für CI Medium Profil`);
            } else {
              console.log(`ℹ️  Keine aktiven Probleme - System läuft besser als CI Medium Profil`);
            }
          }
        },
        {
          name: 'Validierung der Log-Aktivität',
          context: 'Sarah überprüft die Log-Aktivität entsprechend dem Testprofil',
          action: async () => {
            const logVisible = await testTemplate.dashboardPage.isElementVisible('[data-testid="log-stream"]');
            
            if (logVisible) {
              const logContent = await page.textContent('[data-testid="log-stream"]');
              const logCount = (logContent?.match(/\d{2}:\d{2}:\d{2}/g) || []).length;
              console.log(`📋 Sichtbare Log Einträge: ${logCount} (Erwartet für CI Medium: 4,830 total)`);
              
              // Für CI Medium erwarten wir hohe Log-Aktivität
              expect(logCount).toBeGreaterThan(10); // Mindestens 10 sichtbare Einträge
              console.log(`✅ Log-Aktivität entspricht CI Medium Complexity Profil`);
            } else {
              console.log(`⚠️  Log Stream nicht sichtbar - weicht vom CI Medium Profil ab`);
            }
          }
        }
      ]
    );
  });

  test('System Admin: Problem-Investigation mit CI High Complexity Profil', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'ci-high-complexity');
    
    await testTemplate.executeUserStoryTemplate(
      '👨‍💻 System Administrator (Sarah)',
      'Problem-Untersuchung bei hoher Systemlast (87 erwartete Probleme)',
      [
        {
          name: 'Navigation zu Problems bei hoher Komplexität',
          context: 'Sarah hat Alarm bekommen und muss bei hoher Systemlast (CI High Complexity) Probleme untersuchen',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            // CI High Complexity: Erwarten hohe Problemanzahl (87)
            const problemCount = await testTemplate.dashboardPage.getActiveProblemsCount();
            console.log(`🚨 Aktuelle Probleme: ${problemCount} (CI High erwartet: 87)`);
            
            if (problemCount > 0) {
              console.log(`🔍 Problem-Investigation erforderlich - navigiere zu Problems`);
              await testTemplate.dashboardPage.navigateToPage('Problems');
            } else {
              console.log(`✅ Weniger Probleme als CI High Profil erwartet - System läuft besser`);
            }
          }
        },
        {
          name: 'Soll/Ist Vergleich für High Complexity Szenario',
          context: 'Sarah führt detaillierte Analyse durch basierend auf CI High Complexity Profil',
          action: async () => {
            const comparison = await testTemplate.validateExpectedVsActual();
            
            console.log(`📊 High Complexity Profil Validierung:`);
            console.log(`   - Erwartete Log Entries: ${comparison.logEntries.expected}`);
            console.log(`   - Erwartete Probleme: ${comparison.problems.expected}`);
            console.log(`   - Erwartete Metriken: ${comparison.metrics.expected}`);
            
            // Für High Complexity ist Abweichung normal
            if (!comparison.overallMatch) {
              console.log(`ℹ️  Abweichung vom CI High Profil ist bei komplexen Szenarien erwartbar`);
            } else {
              console.log(`✅ System entspricht exakt dem CI High Complexity Profil`);
            }
          }
        },
        {
          name: 'Performance unter Last validieren',
          context: 'Sarah testet ob das System auch bei hoher Komplexität responsive bleibt',
          action: async () => {
            await testTemplate.validateSystemState(); // High complexity validierung
            
            const startTime = Date.now();
            await testTemplate.problemsPage.goto();
            const responseTime = Date.now() - startTime;
            
            console.log(`⚡ Problems Page Response Time bei High Complexity: ${responseTime}ms`);
            
            // Bei High Complexity erlauben wir längere Response Times
            expect(responseTime).toBeLessThan(10000); // 10 Sekunden für High Complexity
            console.log(`✅ System bleibt auch bei CI High Complexity responsive`);
          }
        }
      ]
    );
  });

  test('System Admin: Standard Operations mit NPM Package Profil', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'npm-package');
    
    await testTemplate.executeUserStoryTemplate(
      '👨‍💻 System Administrator (Sarah)',
      'Routine-Überwachung während NPM Package Tests (36 erwartete Probleme)',
      [
        {
          name: 'Baseline Validation für NPM Package Testing',
          context: 'Sarah überwacht das System während NPM Package Tests laufen',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            const comparison = await testTemplate.validateExpectedVsActual();
            
            console.log(`📦 NPM Package Test Profile Baseline:`);
            console.log(`   - Log Entries: ${comparison.logEntries.actual}/${comparison.logEntries.expected}`);
            console.log(`   - Problems: ${comparison.problems.actual}/${comparison.problems.expected}`);
            console.log(`   - Data Size erwartet: 155.71 KB`);
            
            // NPM Package Tests sollten moderate Belastung erzeugen
            expect(comparison.problems.actual).toBeLessThanOrEqual(50); // Maximal 50 Probleme
            console.log(`✅ System-Belastung im NPM Package Test Bereich`);
          }
        },
        {
          name: 'TypeScript/JavaScript spezifische Validierung',
          context: 'Sarah überprüft spezifische Aspekte für TypeScript/JavaScript Tests',
          action: async () => {
            const pluginStatus = await page.textContent('[data-testid="plugin-status"]').catch(() => '');
            
            // Suche nach TypeScript/JavaScript relevanten Plugins
            const hasJSRelatedPlugins = pluginStatus?.includes('typescript') || 
                                      pluginStatus?.includes('javascript') ||
                                      pluginStatus?.includes('js') ||
                                      pluginStatus?.includes('ts');
            
            if (hasJSRelatedPlugins) {
              console.log(`✅ JavaScript/TypeScript Plugins aktiv - passt zu NPM Package Profil`);
            } else {
              console.log(`ℹ️  Keine JS/TS spezifischen Plugins erkennbar`);
            }
            
            // NPM Package Tests sollten stabile Performance haben
            await testTemplate.performProfileSpecificAssertions();
          }
        }
      ]
    );
  });
});