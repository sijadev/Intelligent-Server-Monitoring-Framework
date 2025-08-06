import { test, expect } from '@playwright/test';
import { UserStoryTestTemplate } from '../../templates/UserStoryTestTemplate';

test.describe('🚀 DevOps Engineer: Deployment & CI/CD mit Testprofilen', () => {

  test('DevOps: CI/CD Pipeline Validation mit CI High Complexity', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'ci-high-complexity');
    
    await testTemplate.executeUserStoryTemplate(
      '🚀 DevOps Engineer (Marcus)',
      'CI/CD Pipeline unter Maximallast validieren (8,636 Logs, 87 Probleme, 4,495 Metriken)',
      [
        {
          name: 'Pre-Deployment CI High Complexity Baseline',
          context: 'Marcus führt Pre-Deployment Check für High Complexity CI Pipeline durch',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            console.log(`🏗️ CI/CD High Complexity Pipeline Check`);
            console.log(`   - Erwartete System Belastung: Hoch (87 Probleme)`);
            console.log(`   - Erwartete Log Aktivität: Sehr hoch (8,636 Einträge)`);
            console.log(`   - Erwartete Datenmenge: 235.79 KB`);
            
            // Baseline für CI/CD Pipeline dokumentieren
            const comparison = await testTemplate.validateExpectedVsActual();
            
            // CI High Complexity - Hohe Belastung ist normal
            if (comparison.problems.actual < comparison.problems.expected * 0.5) {
              console.log(`📉 System läuft deutlich besser als CI High Complexity erwartet`);
            } else {
              console.log(`🔥 System zeigt CI High Complexity Belastung`);
            }
          }
        },
        {
          name: 'Pipeline Health Check unter Last',
          context: 'Marcus überprüft Pipeline Gesundheit bei maximaler CI Komplexität',
          action: async () => {
            // Test alle kritischen Pipeline Endpoints
            const pipelineEndpoints = [
              { name: 'Dashboard', path: '/' },
              { name: 'Problems', path: '/problems' },
              { name: 'Metrics', path: '/metrics' },
              { name: 'Logs', path: '/logs' }
            ];
            
            const healthResults = [];
            
            for (const endpoint of pipelineEndpoints) {
              const startTime = Date.now();
              try {
                await page.goto(endpoint.path);
                await page.waitForLoadState('networkidle', { timeout: 15000 });
                const responseTime = Date.now() - startTime;
                healthResults.push({ 
                  name: endpoint.name, 
                  responseTime, 
                  status: 'OK' 
                });
                console.log(`✅ ${endpoint.name}: ${responseTime}ms (CI High)`);
              } catch (error) {
                healthResults.push({ 
                  name: endpoint.name, 
                  responseTime: -1, 
                  status: 'TIMEOUT' 
                });
                console.log(`❌ ${endpoint.name}: Timeout bei CI High Complexity`);
              }
            }
            
            // Pipeline Health Score berechnen
            const healthyEndpoints = healthResults.filter(r => r.status === 'OK').length;
            const healthScore = (healthyEndpoints / pipelineEndpoints.length) * 100;
            
            console.log(`🎯 Pipeline Health Score: ${healthScore}% (${healthyEndpoints}/${pipelineEndpoints.length})`);
            
            // Für CI High Complexity erwarten wir mindestens 75% Verfügbarkeit
            expect(healthScore).toBeGreaterThanOrEqual(75);
          }
        },
        {
          name: 'Load Impact Assessment',
          context: 'Marcus bewertet Load Impact für CI High Complexity Deployment Entscheidung',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            // System Load Metrics für Deployment Entscheidung
            const systemInfoVisible = await testTemplate.dashboardPage.isElementVisible('[data-testid="system-info"]');
            
            if (systemInfoVisible) {
              const metricsText = await page.textContent('[data-testid="system-info"]');
              console.log(`📊 System Metrics für Deployment Entscheidung:`);
              console.log(`${metricsText}`);
              
              // Parse metrics für Deployment Ampel
              const cpuMatch = metricsText?.match(/CPU.*?(\d+(?:\.\d+)?)/);
              const memoryMatch = metricsText?.match(/Memory.*?(\d+)/);
              
              if (cpuMatch || memoryMatch) {
                const cpuUsage = cpuMatch ? parseFloat(cpuMatch[1]) : 0;
                const memoryUsage = memoryMatch ? parseInt(memoryMatch[1]) : 0;
                
                console.log(`🖥️ CPU: ${cpuUsage}%, Memory: ${memoryUsage}%`);
                
                // Deployment Ampel für CI High Complexity
                if (memoryUsage > 90) {
                  console.log(`🔴 DEPLOYMENT STOPP - Memory zu hoch für CI High Complexity`);
                } else if (memoryUsage > 70) {
                  console.log(`🟡 DEPLOYMENT VORSICHT - Überwachung bei CI High Complexity nötig`);
                } else {
                  console.log(`🟢 DEPLOYMENT OK - System kann CI High Complexity verarbeiten`);
                }
              }
            }
            
            await testTemplate.validateSystemState(); // High complexity validation
          }
        },
        {
          name: 'Post-Deployment Monitoring Setup',
          context: 'Marcus richtet Monitoring für CI High Complexity Deployment ein',
          action: async () => {
            // Generiere CI/CD Report für High Complexity
            const finalComparison = await testTemplate.validateExpectedVsActual();
            
            const deploymentReport = {
              timestamp: new Date().toISOString(),
              profile: 'CI High Complexity',
              expectedLoad: {
                logEntries: finalComparison.logEntries.expected,
                problems: finalComparison.problems.expected,
                metrics: finalComparison.metrics.expected,
                dataSizeKB: 235.79
              },
              actualLoad: {
                logEntries: finalComparison.logEntries.actual,
                problems: finalComparison.problems.actual,
                metrics: finalComparison.metrics.actual
              },
              variance: {
                logEntriesMatch: finalComparison.logEntries.match,
                problemsMatch: finalComparison.problems.match,
                metricsMatch: finalComparison.metrics.match
              },
              deploymentRecommendation: finalComparison.overallMatch ? 'PROCEED' : 'MONITOR_CLOSELY'
            };
            
            console.log(`📄 CI High Complexity Deployment Report:`);
            console.log(JSON.stringify(deploymentReport, null, 2));
            
            // Entscheidung für Deployment
            if (deploymentReport.deploymentRecommendation === 'PROCEED') {
              console.log(`✅ Deployment FREIGEGEBEN für CI High Complexity`);
            } else {
              console.log(`⚠️  Deployment mit ENGMASCHIGEM MONITORING bei CI High Complexity`);
            }
          }
        }
      ]
    );
  });

  test('DevOps: Container Orchestration mit Docker Profile', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'docker-profile');
    
    await testTemplate.executeUserStoryTemplate(
      '🚀 DevOps Engineer (Marcus)',
      'Container Deployment und Orchestration (Docker Profil: 74 Probleme, 214.16 KB)',
      [
        {
          name: 'Container Infrastructure Assessment',
          context: 'Marcus bewertet Container-Infrastructure basierend auf Docker Test Profil',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            console.log(`🐳 Docker Profile Infrastructure Check:`);
            console.log(`   - Erwartete Container-Probleme: 74`);
            console.log(`   - Erwartete Deployment-Logs: 4,830`);
            console.log(`   - Container Deployment Size: 214.16 KB`);
            
            const comparison = await testTemplate.validateExpectedVsActual();
            
            // Docker-spezifische Bewertung
            if (comparison.problems.actual <= comparison.problems.expected * 1.1) {
              console.log(`✅ Container Infrastructure im Docker Profil Bereich`);
            } else {
              console.log(`⚠️  Container Probleme über Docker Profil - Review nötig`);
            }
            
            // Validiere Container-readiness
            await testTemplate.performProfileSpecificAssertions();
          }
        },
        {
          name: 'Multi-Container Deployment Validation',
          context: 'Marcus validiert Multi-Container Setup entsprechend Docker Profil Erwartungen',
          action: async () => {
            // Test verschiedene Container-relevante Bereiche
            const containerAreas = [
              { name: 'Main App', path: '/' },
              { name: 'Metrics Collection', path: '/metrics' },
              { name: 'Log Aggregation', path: '/logs' },
              { name: 'Plugin Services', path: '/plugins' }
            ];
            
            const containerHealth = [];
            
            for (const area of containerAreas) {
              const startTime = Date.now();
              await page.goto(area.path);
              
              try {
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                const responseTime = Date.now() - startTime;
                containerHealth.push({
                  service: area.name,
                  responseTime,
                  status: responseTime < 8000 ? 'HEALTHY' : 'SLOW'
                });
                console.log(`🐳 ${area.name}: ${responseTime}ms (${responseTime < 8000 ? 'HEALTHY' : 'SLOW'})`);
              } catch (error) {
                containerHealth.push({
                  service: area.name,
                  responseTime: -1,
                  status: 'UNHEALTHY'
                });
                console.log(`❌ ${area.name}: Container Service nicht erreichbar`);
              }
            }
            
            // Container Health Summary
            const healthyContainers = containerHealth.filter(c => c.status === 'HEALTHY').length;
            const containerScore = (healthyContainers / containerAreas.length) * 100;
            
            console.log(`🐳 Container Health Score: ${containerScore}% (${healthyContainers}/${containerAreas.length})`);
            
            // Docker Profile erwartet solide Container Performance
            expect(containerScore).toBeGreaterThanOrEqual(75); // 75% Container müssen healthy sein
          }
        },
        {
          name: 'Docker Profile Resource Optimization',
          context: 'Marcus optimiert Resources basierend auf Docker Profil Erkenntnissen',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            // Resource usage für Container Optimization
            const systemInfoVisible = await testTemplate.dashboardPage.isElementVisible('[data-testid="system-info"]');
            
            if (systemInfoVisible) {
              const resourceText = await page.textContent('[data-testid="system-info"]');
              console.log(`📊 Container Resource Usage:`);
              
              // Docker-spezifische Resource Analyse
              const memoryUsage = resourceText?.match(/Memory.*?(\d+)/)?.[1];
              const diskUsage = resourceText?.match(/Disk.*?(\d+(?:\.\d+)?)/)?.[1];
              
              if (memoryUsage) {
                const memoryNum = parseInt(memoryUsage);
                console.log(`💾 Container Memory Usage: ${memoryNum}%`);
                
                if (memoryNum > 80) {
                  console.log(`🔴 Container Memory Optimization empfohlen`);
                } else if (memoryNum > 60) {
                  console.log(`🟡 Container Memory Monitoring erhöhen`);
                } else {
                  console.log(`🟢 Container Memory Usage optimal`);
                }
              }
              
              if (diskUsage) {
                console.log(`💾 Container Disk Usage: ${diskUsage}%`);
              }
            }
            
            // Docker Profile Final Assessment
            const finalCheck = await testTemplate.validateExpectedVsActual();
            console.log(`🐳 Docker Profile Final Assessment:`);
            console.log(`   - Problems Match: ${finalCheck.problems.match ? '✅' : '❌'}`);
            console.log(`   - Log Activity Match: ${finalCheck.logEntries.match ? '✅' : '❌'}`);
            console.log(`   - Overall Container Health: ${finalCheck.overallMatch ? '✅' : '⚠️'}`);
          }
        }
      ]
    );
  });

  test('DevOps: Standard Release mit CI Medium Complexity', async ({ page }) => {
    const testTemplate = new UserStoryTestTemplate(page, 'ci-medium-complexity');
    
    await testTemplate.executeUserStoryTemplate(
      '🚀 DevOps Engineer (Marcus)',
      'Standard Release Pipeline (CI Medium: 74 Probleme, 4,830 Logs, 214.16 KB)',
      [
        {
          name: 'Standard Release Readiness Check',
          context: 'Marcus führt Standard Release Check mit CI Medium Complexity Profil durch',
          action: async () => {
            await testTemplate.dashboardPage.goto();
            
            const comparison = await testTemplate.validateExpectedVsActual();
            
            console.log(`🚀 Standard Release Pipeline Check (CI Medium):`);
            console.log(`   - Expected Problems: ${comparison.problems.expected}`);
            console.log(`   - Actual Problems: ${comparison.problems.actual}`);
            console.log(`   - Problem Status: ${comparison.problems.match ? '✅ WITHIN PROFILE' : '⚠️ DEVIATION'}`);
            
            // CI Medium - Balancierte Belastung erwartet
            const releaseGo = comparison.problems.actual <= comparison.problems.expected * 1.3;
            console.log(`🎯 Release Decision: ${releaseGo ? '🟢 GO' : '🔴 NO-GO'}`);
            
            if (!releaseGo) {
              console.log(`⚠️  Problem-Level über CI Medium Profil Toleranz - Release verschieben`);
            }
          }
        },
        {
          name: 'Release Pipeline Performance Validation',
          context: 'Marcus validiert Pipeline Performance für Standard Release',
          action: async () => {
            // Standard Release Pipeline Test
            const releaseSteps = [
              { name: 'Health Check', action: () => testTemplate.dashboardPage.goto() },
              { name: 'Problem Scan', action: () => page.goto('/problems') },
              { name: 'Metrics Review', action: () => page.goto('/metrics') },
              { name: 'Final Validation', action: () => testTemplate.dashboardPage.goto() }
            ];
            
            const pipelineResults = [];
            
            for (const step of releaseSteps) {
              const stepStart = Date.now();
              try {
                await step.action();
                await page.waitForLoadState('networkidle', { timeout: 8000 });
                const stepTime = Date.now() - stepStart;
                pipelineResults.push({ step: step.name, duration: stepTime, status: 'SUCCESS' });
                console.log(`✅ ${step.name}: ${stepTime}ms`);
              } catch (error) {
                pipelineResults.push({ step: step.name, duration: -1, status: 'FAILED' });
                console.log(`❌ ${step.name}: Pipeline Step Failed`);
              }
            }
            
            // Pipeline Performance Assessment
            const successfulSteps = pipelineResults.filter(r => r.status === 'SUCCESS').length;
            const pipelineSuccess = (successfulSteps / releaseSteps.length) * 100;
            
            console.log(`🚀 Release Pipeline Success Rate: ${pipelineSuccess}%`);
            expect(pipelineSuccess).toBeGreaterThanOrEqual(75); // 75% Pipeline Steps müssen erfolgreich sein
          }
        },
        {
          name: 'Post-Release Monitoring Setup',
          context: 'Marcus richtet Post-Release Monitoring für CI Medium Profile ein',
          action: async () => {
            // CI Medium Profile Post-Release Setup
            const postReleaseMetrics = await testTemplate.validateExpectedVsActual();
            
            const releaseReport = {
              releaseProfile: 'CI Medium Complexity',
              releaseTime: new Date().toISOString(),
              expectedMetrics: {
                problems: postReleaseMetrics.problems.expected,
                logActivity: postReleaseMetrics.logEntries.expected,
                dataVolume: '214.16 KB'
              },
              actualMetrics: {
                problems: postReleaseMetrics.problems.actual,
                logActivity: postReleaseMetrics.logEntries.actual
              },
              profileCompliance: {
                problemsCompliant: postReleaseMetrics.problems.match,
                logActivityCompliant: postReleaseMetrics.logEntries.match,
                overallCompliant: postReleaseMetrics.overallMatch
              },
              monitoringRecommendation: postReleaseMetrics.overallMatch ? 'STANDARD_MONITORING' : 'ENHANCED_MONITORING'
            };
            
            console.log(`📊 Post-Release Report (CI Medium):`);
            console.log(JSON.stringify(releaseReport, null, 2));
            
            // Monitoring Empfehlung
            if (releaseReport.monitoringRecommendation === 'STANDARD_MONITORING') {
              console.log(`✅ Standard Post-Release Monitoring ausreichend`);
            } else {
              console.log(`⚠️  Enhanced Monitoring empfohlen - Abweichung vom CI Medium Profil`);
            }
          }
        }
      ]
    );
  });
});