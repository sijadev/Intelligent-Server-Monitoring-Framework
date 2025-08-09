import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProblemsPage } from '../../pages/ProblemsPage';

test.describe('👩‍💻 Developer: Code Issue Troubleshooting', () => {
  let dashboardPage: DashboardPage;
  let problemsPage: ProblemsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    problemsPage = new ProblemsPage(page);
  });

  test('As a Developer, I want to quickly find code issues when my deployment fails', async ({
    page,
  }) => {
    // STORY: Alex (Developer) gets a notification that their latest deployment has issues
    // They need to quickly identify and understand the problems

    await test.step('Rush to check what went wrong', async () => {
      await dashboardPage.goto();

      // Alex first looks at the dashboard for any red flags
      const problemsCount = await dashboardPage.getActiveProblemsCount();
      console.log(`🚨 Found ${problemsCount} active problems`);

      if (problemsCount > 0) {
        console.log('💥 Something is definitely wrong - investigating...');
      } else {
        console.log('🤔 Dashboard shows no problems, but deployment failed - diving deeper...');
      }
    });

    await test.step('Navigate to detailed problem analysis', async () => {
      // Alex clicks on problems to get more details
      await dashboardPage.navigateToProblems();
      await problemsPage.waitForPageLoad();

      const hasProblems = await problemsPage.hasProblems();

      if (hasProblems) {
        console.log('📋 Found problems list - scanning for deployment-related issues');

        // Alex would look for recent problems (within deployment timeframe)
        const recentProblems = await problemsPage.getRecentProblems();
        console.log(`📅 Found ${recentProblems} recent problems`);
      } else {
        console.log('🤷‍♀️ No problems shown in UI - might be a data sync issue');
      }
    });

    await test.step('Search for specific error patterns', async () => {
      // Alex knows their code area and searches for related issues
      const canSearch = await problemsPage.hasSearchCapability();

      if (canSearch) {
        console.log('🔍 Search functionality available');

        // Try searching for common deployment-related terms
        const searchTerms = ['deploy', 'build', 'error', 'failed', 'exception'];

        for (const term of searchTerms) {
          try {
            await problemsPage.searchForTerm(term);
            await page.waitForTimeout(1000); // Allow search to complete

            const results = await problemsPage.getSearchResultsCount();
            if (results > 0) {
              console.log(`🎯 Found ${results} results for "${term}"`);
              break; // Found something relevant
            }
          } catch (error) {
            console.log(`ℹ️  Search for "${term}" not successful - continuing...`);
          }
        }
      } else {
        console.log('ℹ️  Search functionality not yet implemented');
      }
    });

    await test.step('Look for code-specific error details', async () => {
      // Alex needs file paths, line numbers, stack traces - the technical details
      const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
      const problemCount = await problemsList.count();

      if (problemCount > 0) {
        // Check first few problems for technical details
        for (let i = 0; i < Math.min(3, problemCount); i++) {
          const problem = problemsList.nth(i);
          const problemText = await problem.textContent();

          console.log(`🔍 Problem ${i + 1}: ${problemText?.substring(0, 200)}...`);

          // Alex looks for file paths, line numbers, function names
          const hasFilePath =
            problemText?.includes('.js') ||
            problemText?.includes('.ts') ||
            problemText?.includes('/');
          const hasLineNumber = /line\s*\d+|:\d+/.test(problemText || '');

          if (hasFilePath || hasLineNumber) {
            console.log('✅ Found technical details - this helps pinpoint the issue');
            break;
          }
        }
      }
    });
  });

  test('As a Developer, I need to understand the impact of my code changes', async ({ page }) => {
    // STORY: Alex deployed a fix and wants to verify it worked and didn't break anything else

    await test.step('Check if recent issues have decreased', async () => {
      await problemsPage.goto();
      await problemsPage.waitForPageLoad();

      // Alex looks for timestamp information to see recent vs old issues
      const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
      const problemCount = await problemsList.count();

      console.log(`📊 Currently seeing ${problemCount} total problems`);

      if (problemCount > 0) {
        // Look for timestamp indicators
        const hasTimestamps = await problemsPage.hasTimestampInfo();

        if (hasTimestamps) {
          console.log('⏰ Timestamp information available - can track recent changes');
        } else {
          console.log('ℹ️  No timestamp info visible - hard to track recent changes');
        }
      }
    });

    await test.step('Monitor live changes after deployment', async () => {
      // Alex wants to see if new problems appear (indicating their fix broke something)
      await dashboardPage.goto();

      // Initial state
      const initialProblems = await dashboardPage.getActiveProblemsCount();
      console.log(`📈 Baseline: ${initialProblems} active problems`);

      // Wait a bit to see if problems change (simulating monitoring after deployment)
      await page.waitForTimeout(3000);

      const currentProblems = await dashboardPage.getActiveProblemsCount();
      console.log(`📈 After monitoring: ${currentProblems} active problems`);

      if (currentProblems < initialProblems) {
        console.log('✅ Problem count decreased - fix appears to be working!');
      } else if (currentProblems > initialProblems) {
        console.log('🚨 Problem count increased - fix may have introduced new issues');
      } else {
        console.log('➡️  Problem count stable - monitoring continues...');
      }
    });

    await test.step('Check system logs for deployment-related entries', async () => {
      // Alex looks at logs to see deployment activity and any related errors
      const logsVisible = await dashboardPage.isElementVisible(
        '[data-testid="log-stream"], [class*="log"]',
      );

      if (logsVisible) {
        console.log('📋 Log stream is visible');

        const logContent = await page.textContent('[data-testid="log-stream"], [class*="log"]');

        // Look for deployment-related log entries
        const hasDeploymentLogs =
          logContent?.includes('deploy') ||
          logContent?.includes('build') ||
          logContent?.includes('start');

        if (hasDeploymentLogs) {
          console.log('🚀 Found deployment-related log entries');
        }

        // Look for error indicators in logs
        const hasErrors =
          logContent?.includes('ERROR') ||
          logContent?.includes('Failed') ||
          logContent?.includes('Exception');

        if (hasErrors) {
          console.log('🚨 Found error entries in logs - needs investigation');
        } else {
          console.log('✅ No obvious errors in recent logs');
        }
      } else {
        console.log('ℹ️  Log stream not visible - cannot monitor deployment activity');
      }
    });
  });

  test('As a Developer, I want to understand system patterns before making changes', async ({
    page,
  }) => {
    // STORY: Before implementing a new feature, Alex studies current system behavior

    await test.step('Analyze current system load and patterns', async () => {
      await dashboardPage.goto();

      // Alex looks for metrics to understand normal system behavior
      const hasMetrics = await dashboardPage.isElementVisible(
        '[data-testid="system-info"], [class*="metric"]',
      );

      if (hasMetrics) {
        const metricsContent = await page.textContent(
          '[data-testid="system-info"], [class*="metric"]',
        );
        console.log(`📊 Current system metrics: ${metricsContent}`);

        // Alex notes baseline performance before their changes
        console.log('📝 Recording baseline metrics before implementing changes');
      } else {
        console.log('ℹ️  System metrics not available - implementing blind');
      }
    });

    await test.step('Study historical problem patterns', async () => {
      await problemsPage.goto();

      const hasProblems = await problemsPage.hasProblems();

      if (hasProblems) {
        // Alex looks for patterns in existing problems to avoid similar issues
        const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
        const problemCount = await problemsList.count();

        console.log(`🔍 Analyzing ${problemCount} existing problems for patterns`);

        // Look for common problem types
        const allProblemsText = await page.textContent(
          '[data-testid="problems-list"], table, .problems',
        );

        if (allProblemsText) {
          const commonTerms = ['memory', 'timeout', 'connection', 'database', 'null'];
          const foundPatterns = commonTerms.filter((term) =>
            allProblemsText.toLowerCase().includes(term),
          );

          if (foundPatterns.length > 0) {
            console.log(`🎯 Common problem patterns: ${foundPatterns.join(', ')}`);
            console.log('💡 Alex notes these patterns to avoid in new implementation');
          }
        }
      } else {
        console.log('✅ No existing problems - clean slate for new implementation');
      }
    });

    await test.step('Test current system responsiveness baseline', async () => {
      // Alex tests how responsive the system currently is
      const testPages = ['/problems', '/', '/plugins', '/logs'];
      const responseTimes = [];

      for (const testPage of testPages) {
        try {
          const startTime = Date.now();
          await page.goto(testPage);
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          responseTimes.push(responseTime);
          console.log(`⚡ ${testPage}: ${responseTime}ms`);
        } catch (error) {
          console.log(`⚠️  ${testPage}: not accessible or timeout`);
        }
      }

      if (responseTimes.length > 0) {
        const avgResponse = responseTimes.reduce((a, b) => a + b) / responseTimes.length;
        console.log(`📊 Average response time: ${avgResponse.toFixed(0)}ms`);
        console.log('📝 Alex records this as baseline before implementing changes');
      }
    });
  });
});
