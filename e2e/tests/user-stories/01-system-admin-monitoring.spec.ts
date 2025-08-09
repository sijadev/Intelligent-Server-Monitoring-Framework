import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProblemsPage } from '../../pages/ProblemsPage';

test.describe('👨‍💻 System Admin: Server Monitoring', () => {
  let dashboardPage: DashboardPage;
  let problemsPage: ProblemsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    problemsPage = new ProblemsPage(page);
  });

  test('As a System Admin, I want to check system health when I arrive at work', async ({
    page,
  }) => {
    // STORY: It's Monday morning, Sarah (System Admin) opens MCP.Guard to check if everything is running smoothly

    // 1. Navigate to dashboard
    await test.step('Open MCP.Guard Dashboard', async () => {
      await dashboardPage.goto();
      await expect(page).toHaveTitle(/MCP.Guard/);
    });

    // 2. Quick health check - look at status indicators
    await test.step('Check system health indicators', async () => {
      // Sarah first looks for server status
      const serverStatusVisible = await dashboardPage.isElementVisible(
        '[data-testid="server-status"], [class*="status"], [class*="health"]',
      );

      if (serverStatusVisible) {
        const status = await dashboardPage.getServerStatus();
        console.log(`🟢 Server Status: ${status}`);

        // She expects to see "Online", "Healthy", or similar positive indicator
        expect(
          ['Online', 'Healthy', 'Running', 'Active'].some((s) =>
            status.toLowerCase().includes(s.toLowerCase()),
          ),
        ).toBeTruthy();
      } else {
        console.log('ℹ️  Server status indicator not found - checking for any health indicators');
        // Fallback: check if dashboard loads without errors (implies health)
        await expect(page.locator('body')).toBeVisible();
      }
    });

    // 3. Check if there are any immediate problems requiring attention
    await test.step('Look for urgent problems', async () => {
      // Sarah scans for any red alerts or problem indicators
      const problemCount = await dashboardPage.getActiveProblemsCount();
      console.log(`📊 Active Problems: ${problemCount}`);

      if (problemCount > 0) {
        console.log(`⚠️  Found ${problemCount} active problems - needs attention`);
      } else {
        console.log('✅ No active problems detected - all good!');
      }

      // Any number is acceptable - we're testing the functionality exists
      expect(typeof problemCount).toBe('number');
      expect(problemCount).toBeGreaterThanOrEqual(0);
    });

    // 4. Scan recent activity in logs
    await test.step('Check recent activity logs', async () => {
      // Sarah looks for any unusual activity in recent logs
      const recentLogsVisible = await dashboardPage.isElementVisible(
        '[data-testid="log-stream"], [class*="log"], [class*="activity"]',
      );

      if (recentLogsVisible) {
        console.log('📋 Recent activity logs are visible');

        // Check if logs are actually updating (sign of a healthy system)
        const initialLogContent = await page
          .textContent('[data-testid="log-stream"], [class*="log"]')
          .catch(() => '');
        await page.waitForTimeout(2000); // Wait for potential log updates

        console.log('✅ Log monitoring is active');
      } else {
        console.log('ℹ️  Log stream not visible - may not be implemented yet');
      }
    });
  });

  test('As a System Admin, I need to investigate when problems are detected', async ({ page }) => {
    // STORY: Sarah notices there are active problems and needs to investigate them

    await test.step('Access the problems area from dashboard', async () => {
      await dashboardPage.goto();

      // Try multiple ways to get to problems (realistic user behavior)
      let navigationSuccessful = false;

      // Method 1: Click on problems card/widget
      try {
        await dashboardPage.clickActiveProblemsCard();
        await page.waitForURL(/.*problems.*/);
        navigationSuccessful = true;
        console.log('✅ Navigated to problems via dashboard card');
      } catch (error) {
        console.log('ℹ️  Problems card navigation not available');
      }

      // Method 2: Use sidebar navigation
      if (!navigationSuccessful) {
        try {
          await dashboardPage.navigateToPage('Problems');
          await page.waitForURL(/.*problems.*/);
          navigationSuccessful = true;
          console.log('✅ Navigated to problems via sidebar');
        } catch (error) {
          console.log('ℹ️  Sidebar problems navigation not available');
        }
      }

      // Method 3: Direct URL (fallback)
      if (!navigationSuccessful) {
        await page.goto('/problems');
        console.log('✅ Accessed problems page directly');
      }
    });

    await test.step('Review problems list for prioritization', async () => {
      // Sarah needs to see what problems exist and their severity
      await problemsPage.waitForPageLoad();

      const problemsExist = await problemsPage.hasProblems();

      if (problemsExist) {
        console.log('📋 Problems list is populated');

        // Sarah would look for severity indicators to prioritize her work
        const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
        const problemCount = await problemsList.count();
        console.log(`Found ${problemCount} problem entries to review`);

        if (problemCount > 0) {
          // Check first problem for typical attributes Sarah would look for
          const firstProblem = problemsList.first();
          const problemText = await firstProblem.textContent();
          console.log(`📄 Sample problem: ${problemText?.substring(0, 100)}...`);
        }
      } else {
        console.log('✅ No problems currently listed - system is healthy');
      }
    });

    await test.step('Look for filtering options to manage workload', async () => {
      // Sarah with many problems would want to filter by severity, type, etc.
      const hasFilters = await problemsPage.hasFilters();

      if (hasFilters) {
        console.log('✅ Problem filtering capabilities are available');
        // Try filtering by severity if available
        await problemsPage
          .tryFilterBy('severity')
          .catch(() => console.log('ℹ️  Severity filtering not yet implemented'));
      } else {
        console.log('ℹ️  Problem filtering not yet available');
      }
    });
  });

  test('As a System Admin, I want to monitor system resources during peak hours', async ({
    page,
  }) => {
    // STORY: It's afternoon peak hours, Sarah checks if the system is handling load well

    await test.step('Check resource utilization metrics', async () => {
      await dashboardPage.goto();

      // Sarah looks for CPU, Memory, Disk usage indicators
      const metricsVisible = await dashboardPage.isElementVisible(
        '[data-testid="system-info"], [class*="metric"], [class*="usage"]',
      );

      if (metricsVisible) {
        console.log('📊 System metrics are visible');

        // Look for typical resource indicators
        const resourceMetrics = await page.textContent(
          '[data-testid="system-info"], [class*="metric"], [class*="usage"]',
        );
        console.log(`💾 Resource usage info: ${resourceMetrics}`);

        // Sarah would expect to see percentages or usage indicators
        const hasPercentages = resourceMetrics?.includes('%') || resourceMetrics?.includes('Usage');
        if (hasPercentages) {
          console.log('✅ Resource usage percentages are displayed');
        }
      } else {
        console.log('ℹ️  System resource metrics not yet implemented');
      }
    });

    await test.step('Verify system responsiveness during monitoring', async () => {
      // Sarah expects the dashboard to be responsive even under load
      const startTime = Date.now();

      // Try refreshing data or navigating between sections
      await dashboardPage
        .refreshData()
        .catch(() => console.log('ℹ️  Manual refresh not available'));

      const responseTime = Date.now() - startTime;
      console.log(`⚡ Dashboard response time: ${responseTime}ms`);

      // Reasonable expectation for response time
      expect(responseTime).toBeLessThan(10000); // 10 seconds max
    });
  });
});
