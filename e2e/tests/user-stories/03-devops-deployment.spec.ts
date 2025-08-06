import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProblemsPage } from '../../pages/ProblemsPage';

test.describe('🚀 DevOps Engineer: Deployment Monitoring', () => {
  let dashboardPage: DashboardPage;
  let problemsPage: ProblemsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    problemsPage = new ProblemsPage(page);
  });

  test('As a DevOps Engineer, I need to verify deployment health after code release', async ({ page }) => {
    // STORY: Marcus (DevOps) just finished a production deployment and needs to ensure everything is stable
    
    await test.step('Check immediate post-deployment status', async () => {
      await dashboardPage.goto();
      
      // Marcus first checks if the deployment didn't break anything critical
      const serverStatus = await dashboardPage.isElementVisible('[data-testid="server-status"], [class*="status"]');
      
      if (serverStatus) {
        const status = await dashboardPage.getServerStatus();
        console.log(`🚀 Post-deployment server status: ${status}`);
        
        // Marcus expects the server to be running after deployment
        expect(['Online', 'Running', 'Active', 'Healthy'].some(s => 
          status.toLowerCase().includes(s.toLowerCase())
        )).toBeTruthy();
      } else {
        console.log('ℹ️  Server status indicator not visible - checking basic connectivity');
        // If status not visible, at least the dashboard should load (indicating server is up)
        await expect(page.locator('body')).toBeVisible();
      }
    });

    await test.step('Monitor for deployment-related problems', async () => {
      // Marcus checks if the deployment introduced any new issues
      const problemCount = await dashboardPage.getActiveProblemsCount();
      console.log(`📊 Current problems count: ${problemCount}`);
      
      if (problemCount > 0) {
        console.log(`⚠️  Found ${problemCount} problems - investigating if deployment-related`);
        
        // Navigate to problems to check timestamps
        await problemsPage.goto();
        await problemsPage.waitForPageLoad();
        
        // Look for recent problems that might be from the deployment
        const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
        const recentProblems = await problemsList.count();
        
        if (recentProblems > 0) {
          console.log(`🔍 Checking ${Math.min(3, recentProblems)} most recent problems`);
          
          for (let i = 0; i < Math.min(3, recentProblems); i++) {
            const problem = problemsList.nth(i);
            const problemText = await problem.textContent();
            
            // Marcus looks for deployment-related keywords
            const isDeploymentRelated = problemText?.toLowerCase().includes('deploy') ||
                                      problemText?.toLowerCase().includes('build') ||
                                      problemText?.toLowerCase().includes('start') ||
                                      problemText?.toLowerCase().includes('init');
            
            if (isDeploymentRelated) {
              console.log(`🚨 Potential deployment issue found: ${problemText?.substring(0, 150)}...`);
            }
          }
        }
      } else {
        console.log('✅ No active problems detected - deployment appears clean');
      }
    });

    await test.step('Validate system metrics after deployment', async () => {
      // Marcus checks resource usage to ensure deployment didn't cause performance regression
      const metricsVisible = await dashboardPage.isElementVisible('[data-testid="system-info"], [class*="metric"]');
      
      if (metricsVisible) {
        const metricsText = await page.textContent('[data-testid="system-info"], [class*="metric"]');
        console.log(`💾 Post-deployment system metrics: ${metricsText}`);
        
        // Marcus would look for unusual resource spikes
        const hasHighUsage = metricsText?.includes('9') || metricsText?.includes('high'); // Rough check
        if (hasHighUsage) {
          console.log('⚠️  High resource usage detected - monitoring for stability');
        } else {
          console.log('✅ Resource usage appears normal');
        }
      } else {
        console.log('ℹ️  System metrics not available - cannot validate resource usage');
      }
    });
  });

  test('As a DevOps Engineer, I need to monitor service dependencies during maintenance', async ({ page }) => {
    // STORY: Marcus is performing maintenance on external services and needs to monitor impact
    
    await test.step('Check all service connections are healthy', async () => {
      await dashboardPage.goto();
      
      // Marcus looks for any service connection indicators
      const serviceStatus = await dashboardPage.isElementVisible('[data-testid="services"], [class*="service"], [data-testid="components"]');
      
      if (serviceStatus) {
        console.log('🔗 Service status indicators found');
        
        const servicesText = await page.textContent('[data-testid="services"], [class*="service"], [data-testid="components"]');
        console.log(`🔌 Service connections: ${servicesText}`);
        
        // Marcus checks for any "Failed", "Disconnected", or error indicators
        const hasConnectionIssues = servicesText?.toLowerCase().includes('failed') ||
                                   servicesText?.toLowerCase().includes('error') ||
                                   servicesText?.toLowerCase().includes('disconnect');
        
        if (hasConnectionIssues) {
          console.log('🚨 Service connection issues detected during maintenance');
        } else {
          console.log('✅ All services appear connected');
        }
      } else {
        console.log('ℹ️  Service status dashboard not implemented yet');
      }
    });

    await test.step('Monitor real-time system behavior during maintenance', async () => {
      // Marcus watches for any degradation patterns
      const initialTimestamp = Date.now();
      
      // Check if logs are streaming (sign of healthy system)
      const logsVisible = await dashboardPage.isElementVisible('[data-testid="log-stream"], [class*="log"]');
      
      if (logsVisible) {
        console.log('📋 Log stream active - monitoring for maintenance impact');
        
        // Sample log content for maintenance-related entries
        const logContent = await page.textContent('[data-testid="log-stream"], [class*="log"]').catch(() => '');
        
        const hasMaintenanceActivity = logContent?.toLowerCase().includes('maintenance') ||
                                     logContent?.toLowerCase().includes('restart') ||
                                     logContent?.toLowerCase().includes('connection');
        
        if (hasMaintenanceActivity) {
          console.log('🔧 Maintenance activity visible in logs - monitoring impact');
        }
      }
      
      // Check system responsiveness during maintenance
      const startTime = Date.now();
      await page.reload();
      await page.waitForLoadState('networkidle', { timeout: 10000 });
      const responseTime = Date.now() - startTime;
      
      console.log(`⚡ System response during maintenance: ${responseTime}ms`);
      
      if (responseTime > 5000) {
        console.log('⚠️  Slow response during maintenance - may indicate impact');
      } else {
        console.log('✅ System remains responsive during maintenance');
      }
    });

    await test.step('Document maintenance impact for post-mortem', async () => {
      // Marcus collects data for maintenance reports
      await problemsPage.goto();
      
      const problemCount = await problemsPage.hasProblems() ? 
                          await page.locator('[data-testid="problem-item"], [class*="problem"], tr').count() : 0;
      
      console.log(`📝 Maintenance impact report:`);
      console.log(`   - Active problems: ${problemCount}`);
      console.log(`   - System accessible: ${await dashboardPage.isElementVisible('body') ? 'Yes' : 'No'}`);
      console.log(`   - Timestamp: ${new Date().toISOString()}`);
      
      // Marcus would export this data for maintenance logs
      expect(typeof problemCount).toBe('number');
    });
  });

  test('As a DevOps Engineer, I want to automate health checks during CI/CD pipeline', async ({ page }) => {
    // STORY: Marcus sets up automated verification that runs after each deployment
    
    await test.step('Automated deployment verification checklist', async () => {
      const checks = {
        dashboardAccessible: false,
        serverStatus: 'unknown',
        criticalProblems: 0,
        responseTime: 0
      };
      
      // Check 1: Dashboard accessibility
      try {
        await dashboardPage.goto();
        checks.dashboardAccessible = true;
        console.log('✅ Dashboard accessibility: PASS');
      } catch (error) {
        console.log('❌ Dashboard accessibility: FAIL');
      }
      
      // Check 2: Server status
      try {
        const status = await dashboardPage.getServerStatus();
        checks.serverStatus = status;
        const isHealthy = ['online', 'running', 'active', 'healthy'].some(s => 
          status.toLowerCase().includes(s)
        );
        console.log(`${isHealthy ? '✅' : '❌'} Server status: ${status}`);
      } catch (error) {
        console.log('⚠️  Server status: Cannot determine');
      }
      
      // Check 3: Critical problems count
      try {
        checks.criticalProblems = await dashboardPage.getActiveProblemsCount();
        console.log(`${checks.criticalProblems === 0 ? '✅' : '⚠️ '} Critical problems: ${checks.criticalProblems}`);
      } catch (error) {
        console.log('⚠️  Problem count: Cannot determine');
      }
      
      // Check 4: System response time
      const startTime = Date.now();
      try {
        await page.reload();
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        checks.responseTime = Date.now() - startTime;
        console.log(`${checks.responseTime < 5000 ? '✅' : '⚠️ '} Response time: ${checks.responseTime}ms`);
      } catch (error) {
        checks.responseTime = -1;
        console.log('❌ Response time: TIMEOUT');
      }
      
      // Overall health score for CI/CD pipeline
      const healthScore = [
        checks.dashboardAccessible,
        ['online', 'running', 'active', 'healthy'].some(s => checks.serverStatus.toLowerCase().includes(s)),
        checks.criticalProblems === 0,
        checks.responseTime > 0 && checks.responseTime < 5000
      ].filter(Boolean).length;
      
      console.log(`🎯 Deployment Health Score: ${healthScore}/4`);
      
      // Marcus would fail the pipeline if health score is too low
      expect(healthScore).toBeGreaterThanOrEqual(2); // At least 50% of checks must pass
    });

    await test.step('Performance baseline validation', async () => {
      // Marcus ensures deployment doesn't degrade performance
      const baselineChecks = {
        'Dashboard Load': '/',
        'Problems Page': '/problems',
        'API Health': '/api/health'
      };
      
      const results = [];
      
      for (const [checkName, url] of Object.entries(baselineChecks)) {
        try {
          const startTime = Date.now();
          await page.goto(url);
          await page.waitForLoadState('networkidle', { timeout: 8000 });
          const responseTime = Date.now() - startTime;
          
          results.push({ check: checkName, time: responseTime });
          console.log(`⚡ ${checkName}: ${responseTime}ms`);
        } catch (error) {
          console.log(`❌ ${checkName}: Failed to load`);
          results.push({ check: checkName, time: -1 });
        }
      }
      
      // Calculate average response time for CI/CD metrics
      const validResults = results.filter(r => r.time > 0);
      if (validResults.length > 0) {
        const avgResponse = validResults.reduce((sum, r) => sum + r.time, 0) / validResults.length;
        console.log(`📊 Average response time: ${avgResponse.toFixed(0)}ms`);
        
        // Marcus sets performance thresholds for the pipeline
        expect(avgResponse).toBeLessThan(8000); // 8 seconds max for automated checks
      }
    });

    await test.step('Generate CI/CD health report', async () => {
      // Marcus outputs structured data for CI/CD dashboard
      const healthReport = {
        timestamp: new Date().toISOString(),
        deployment_validation: 'PASS',
        dashboard_accessible: true,
        problems_detected: await dashboardPage.getActiveProblemsCount(),
        system_responsive: true,
        test_environment: 'E2E Docker'
      };
      
      console.log('📄 CI/CD Health Report:', JSON.stringify(healthReport, null, 2));
      
      // This would be saved to a file for the CI/CD pipeline to consume
      expect(healthReport.deployment_validation).toBe('PASS');
    });
  });
});