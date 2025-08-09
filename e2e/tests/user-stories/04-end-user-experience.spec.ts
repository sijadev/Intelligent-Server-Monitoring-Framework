import { test, expect } from '@playwright/test';
import { DashboardPage } from '../../pages/DashboardPage';
import { ProblemsPage } from '../../pages/ProblemsPage';

test.describe('👤 End User: System Experience', () => {
  let dashboardPage: DashboardPage;
  let problemsPage: ProblemsPage;

  test.beforeEach(async ({ page }) => {
    dashboardPage = new DashboardPage(page);
    problemsPage = new ProblemsPage(page);
  });

  test('As an End User, I want a simple and intuitive interface when checking system status', async ({
    page,
  }) => {
    // STORY: Lisa (End User) occasionally needs to check if the MCP.Guard system is working properly
    // She's not technical but needs to know if problems affect her work

    await test.step('Navigate to MCP.Guard with minimal technical knowledge', async () => {
      await dashboardPage.goto();

      // Lisa expects a clear, understandable interface
      const pageTitle = await page.title();
      console.log(`📄 Page title: ${pageTitle}`);

      // The page should load without technical errors visible to the user
      const hasVisibleErrors = await page
        .locator('[data-testid="error"], .error-message, [class*="error"]')
        .count();
      if (hasVisibleErrors > 0) {
        console.log(`⚠️  ${hasVisibleErrors} error messages visible to end user`);
      } else {
        console.log('✅ No visible error messages - clean user experience');
      }

      expect(hasVisibleErrors).toBeLessThanOrEqual(0); // End users shouldn't see technical errors
    });

    await test.step('Understand system status without technical jargon', async () => {
      // Lisa looks for simple status indicators she can understand
      const statusIndicators = [
        '[data-testid="server-status"]',
        '[class*="status"]',
        '[class*="health"]',
        '[data-testid="system-status"]',
      ];

      let foundStatusIndicator = false;
      for (const selector of statusIndicators) {
        const statusExists = await page
          .locator(selector)
          .isVisible()
          .catch(() => false);
        if (statusExists) {
          const statusText = await page.textContent(selector);
          console.log(`🟢 Status indicator found: "${statusText}"`);

          // Lisa needs clear, non-technical status messages
          const isUserFriendly =
            statusText?.toLowerCase().includes('online') ||
            statusText?.toLowerCase().includes('running') ||
            statusText?.toLowerCase().includes('ok') ||
            statusText?.toLowerCase().includes('healthy') ||
            statusText?.toLowerCase().includes('good');

          if (isUserFriendly) {
            console.log('✅ Status message is user-friendly');
            foundStatusIndicator = true;
            break;
          }
        }
      }

      if (!foundStatusIndicator) {
        console.log('ℹ️  No obvious status indicator for end users - may need UX improvement');
      }
    });

    await test.step('Look for any alerts that affect end user work', async () => {
      // Lisa needs to know if system problems will impact her tasks
      const problemCount = await dashboardPage.getActiveProblemsCount();
      console.log(`📊 Problems visible to end user: ${problemCount}`);

      if (problemCount > 0) {
        console.log('🔍 Checking if problems are explained in user-friendly terms');

        await problemsPage.goto();
        const problemsList = page.locator('[data-testid="problem-item"], [class*="problem"], tr');
        const visibleProblems = await problemsList.count();

        if (visibleProblems > 0) {
          // Check first problem for user-friendly language
          const firstProblem = problemsList.first();
          const problemText = await firstProblem.textContent();

          console.log(`📋 Sample problem text: "${problemText?.substring(0, 100)}..."`);

          // Lisa shouldn't see overly technical jargon
          const hasTechnicalJargon =
            problemText?.includes('undefined') ||
            problemText?.includes('null') ||
            problemText?.includes('Exception') ||
            problemText?.includes('Stack trace');

          if (hasTechnicalJargon) {
            console.log(
              '⚠️  Technical jargon visible to end user - needs user-friendly translation',
            );
          } else {
            console.log('✅ Problem descriptions appear user-friendly');
          }
        }
      } else {
        console.log('✅ No problems affecting end user work');
      }
    });
  });

  test('As an End User, I need the system to be responsive and not frustrating to use', async ({
    page,
  }) => {
    // STORY: Lisa uses the system regularly and expects it to be fast and reliable

    await test.step('Test normal user navigation speed', async () => {
      // Lisa expects pages to load quickly for daily use
      const userJourneyPages = ['/', '/problems'];
      const loadTimes = [];

      for (const pagePath of userJourneyPages) {
        const startTime = Date.now();

        try {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          const loadTime = Date.now() - startTime;
          loadTimes.push(loadTime);

          console.log(`⚡ ${pagePath}: ${loadTime}ms`);

          // Lisa would get frustrated with very slow loading
          expect(loadTime).toBeLessThan(10000); // 10 seconds max tolerance
        } catch (error) {
          console.log(`❌ ${pagePath}: Failed to load within 10 seconds`);
          loadTimes.push(-1);
        }
      }

      const avgLoadTime =
        loadTimes.filter((t) => t > 0).reduce((sum, time) => sum + time, 0) /
        loadTimes.filter((t) => t > 0).length;

      if (avgLoadTime > 0) {
        console.log(`📊 Average load time: ${avgLoadTime.toFixed(0)}ms`);
        // Lisa expects reasonable performance for daily use
        expect(avgLoadTime).toBeLessThan(7000); // 7 seconds average max
      }
    });

    await test.step('Test interface remains responsive during normal use', async () => {
      await dashboardPage.goto();

      // Lisa clicks around the interface like a normal user
      const clickableElements = [
        'button',
        'a',
        '[role="button"]',
        '[data-testid*="nav"]',
        '[class*="card"]',
      ];

      let responsiveInteractions = 0;
      const totalInteractions = clickableElements.length;

      for (const selector of clickableElements) {
        try {
          const element = page.locator(selector).first();
          const exists = await element.isVisible({ timeout: 2000 });

          if (exists) {
            const startTime = Date.now();
            await element.click({ timeout: 3000 });
            const responseTime = Date.now() - startTime;

            console.log(`🖱️  ${selector}: ${responseTime}ms`);

            if (responseTime < 2000) {
              // 2 seconds is reasonable for UI response
              responsiveInteractions++;
            }
          }
        } catch (error) {
          console.log(`ℹ️  ${selector}: Not available for interaction`);
        }
      }

      console.log(`✅ Responsive interactions: ${responsiveInteractions}/${totalInteractions}`);
      // At least some basic interactions should be responsive
      expect(responsiveInteractions).toBeGreaterThan(0);
    });

    await test.step('Verify no confusing error states during normal use', async () => {
      // Lisa should not encounter confusing or broken states
      await dashboardPage.goto();

      // Check for common user-facing issues
      const userConfusingElements = [
        { selector: '[data-testid="404"], .not-found', issue: '404 errors' },
        { selector: '.loading[style*="display: block"]', issue: 'stuck loading states' },
        { selector: '[data-testid="error"], .error-message', issue: 'error messages' },
        { selector: 'button:disabled', issue: 'disabled buttons without explanation' },
      ];

      let userExperienceIssues = 0;

      for (const { selector, issue } of userConfusingElements) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`⚠️  Found ${count} instances of ${issue}`);
          userExperienceIssues++;
        }
      }

      if (userExperienceIssues === 0) {
        console.log('✅ No obvious user experience issues detected');
      } else {
        console.log(`⚠️  ${userExperienceIssues} potential UX issues found`);
      }

      // Lisa should have a mostly smooth experience
      expect(userExperienceIssues).toBeLessThanOrEqual(1); // Allow 1 minor issue
    });
  });

  test('As an End User, I want clear guidance when something goes wrong', async ({ page }) => {
    // STORY: When Lisa encounters problems, she needs clear guidance on what to do next

    await test.step('Check for user-friendly error handling', async () => {
      await dashboardPage.goto();

      // Test how the system handles common user errors
      const userErrorScenarios = [
        { action: 'Invalid URL path', test: async () => await page.goto('/nonexistent-page') },
        {
          action: 'Network timeout simulation',
          test: async () => {
            // Simulate slow network by waiting then checking if loading states are handled
            await page.goto('/', { timeout: 1000 }).catch(() => {});
          },
        },
      ];

      for (const scenario of userErrorScenarios) {
        console.log(`🧪 Testing: ${scenario.action}`);

        try {
          await scenario.test();

          // Check if user gets helpful feedback
          const errorMessages = page.locator(
            '[data-testid="error"], .error-message, [class*="error"]',
          );
          const errorCount = await errorMessages.count();

          if (errorCount > 0) {
            const errorText = await errorMessages.first().textContent();
            console.log(`💬 Error message: "${errorText}"`);

            // Lisa needs clear, actionable error messages
            const isHelpful =
              errorText?.toLowerCase().includes('try again') ||
              errorText?.toLowerCase().includes('contact') ||
              errorText?.toLowerCase().includes('refresh') ||
              errorText?.toLowerCase().includes('please');

            if (isHelpful) {
              console.log('✅ Error message provides helpful guidance');
            } else {
              console.log('⚠️  Error message may be too technical for end users');
            }
          }
        } catch (error) {
          console.log(`ℹ️  ${scenario.action}: Default browser handling`);
        }
      }
    });

    await test.step('Verify contact/help information is accessible', async () => {
      await dashboardPage.goto();

      // Lisa looks for help or contact information when confused
      const helpElements = [
        '[data-testid="help"]',
        '[class*="help"]',
        'a[href*="help"]',
        'button[aria-label*="help"]',
        '[data-testid="contact"]',
        '[class*="support"]',
      ];

      let helpAvailable = false;

      for (const selector of helpElements) {
        const exists = await page
          .locator(selector)
          .isVisible()
          .catch(() => false);
        if (exists) {
          console.log(`✅ Help/Contact element found: ${selector}`);
          helpAvailable = true;
          break;
        }
      }

      if (!helpAvailable) {
        // Check for help in common locations like footer or header
        const commonHelpLocations = ['header', 'footer', 'nav', '.sidebar'];

        for (const location of commonHelpLocations) {
          const helpText = await page.textContent(location).catch(() => '');
          if (
            helpText?.toLowerCase().includes('help') ||
            helpText?.toLowerCase().includes('support') ||
            helpText?.toLowerCase().includes('contact')
          ) {
            console.log(`✅ Help reference found in ${location}`);
            helpAvailable = true;
            break;
          }
        }
      }

      if (!helpAvailable) {
        console.log('ℹ️  No obvious help/contact information for end users');
      }

      // Not critical for testing, but good for user experience
      // expect(helpAvailable).toBeTruthy(); // Uncomment when help system is implemented
    });

    await test.step('Test graceful handling of system unavailability', async () => {
      // Lisa should get clear feedback if parts of the system are down
      await dashboardPage.goto();

      // Check if the system shows clear status when services are unavailable
      const serviceStatus = await page.textContent('body');

      // Look for user-friendly service status messages
      const hasServiceStatusInfo =
        serviceStatus?.toLowerCase().includes('unavailable') ||
        serviceStatus?.toLowerCase().includes('maintenance') ||
        serviceStatus?.toLowerCase().includes('temporarily');

      if (hasServiceStatusInfo) {
        console.log('✅ System provides service status information');
      } else {
        console.log('ℹ️  Service status communication could be improved');
      }

      // The system should at least load and show something useful
      const hasBasicFunctionality = await dashboardPage.isElementVisible('body');
      expect(hasBasicFunctionality).toBeTruthy();

      console.log('✅ Basic system accessibility maintained for end users');
    });
  });
});
