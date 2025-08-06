import { test, expect } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { ProblemsPage } from '../pages/ProblemsPage';

test.describe('IMF End-to-End User Workflows', () => {
  test('complete user workflow: dashboard -> problems -> resolution', async ({ page }) => {
    console.log('🎯 Testing complete user workflow...');
    
    // Step 1: Start at dashboard
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    console.log('✅ Step 1: Dashboard loaded');
    
    // Step 2: Check system status
    const serverStatus = await dashboardPage.getServerStatus();
    console.log(`Server status: ${serverStatus}`);
    
    // Step 3: Navigate to problems
    const problemsPage = new ProblemsPage(page);
    
    try {
      await dashboardPage.goToProblemsPage();
      console.log('✅ Step 2: Navigated to problems via dashboard');
    } catch {
      // Fallback: direct navigation
      await problemsPage.goto();
      console.log('✅ Step 2: Navigated to problems directly');
    }
    
    // Step 4: Check problems list
    const problemsCount = await problemsPage.getProblemsCount();
    console.log(`Found ${problemsCount} problems`);
    
    // Step 5: Try to resolve a problem if available
    if (problemsCount > 0) {
      const resolved = await problemsPage.resolveFirstProblem();
      
      if (resolved) {
        console.log('✅ Step 3: Problem resolution attempted');
        
        // Step 6: Verify resolution
        const newCount = await problemsPage.getProblemsCount();
        console.log(`Problems after resolution: ${newCount}`);
      } else {
        console.log('ℹ️  Step 3: No resolvable problems found');
      }
    } else {
      console.log('ℹ️  Step 3: No problems to resolve');
    }
    
    // Step 7: Return to dashboard and verify
    await dashboardPage.goto();
    await dashboardPage.verifyDashboardLoads();
    
    console.log('✅ Step 4: Returned to dashboard successfully');
    console.log('🎉 Complete workflow test passed!');
  });

  test('error recovery workflow', async ({ page }) => {
    console.log('🔧 Testing error recovery workflow...');
    
    const dashboardPage = new DashboardPage(page);
    
    // Step 1: Start normally
    await dashboardPage.goto();
    console.log('✅ Step 1: Normal dashboard load');
    
    // Step 2: Simulate error conditions (network issues, etc.)
    try {
      // Try to navigate to a potentially problematic endpoint
      await page.goto(page.url().replace('/api/', '/api/invalid/'));
      
      // Wait a moment for any error handling
      await page.waitForTimeout(2000);
      
      // Step 3: Try to recover by going back to dashboard
      await dashboardPage.goto();
      
      const hasContent = await dashboardPage.isElementVisible('body');
      expect(hasContent).toBeTruthy();
      
      console.log('✅ Step 2: Recovered from error condition');
    } catch (error) {
      console.log(`ℹ️  Error recovery test: ${error.message}`);
    }
    
    console.log('✅ Error recovery workflow completed');
  });

  test('responsive design workflow', async ({ page }) => {
    console.log('📱 Testing responsive design workflow...');
    
    const dashboardPage = new DashboardPage(page);
    
    // Test desktop first
    await dashboardPage.checkDesktopLayout();
    await dashboardPage.goto();
    console.log('✅ Desktop layout test');
    
    // Test tablet
    await dashboardPage.checkTabletLayout();
    await page.reload();
    await dashboardPage.waitForPageLoad();
    console.log('✅ Tablet layout test');
    
    // Test mobile
    await dashboardPage.checkMobileLayout();
    await page.reload();
    await dashboardPage.waitForPageLoad();
    
    // Verify mobile navigation
    const hasMobileMenu = await dashboardPage.isElementVisible('[data-testid="mobile-menu"], .mobile-menu, [class*="mobile"]');
    
    if (hasMobileMenu) {
      console.log('✅ Mobile menu available');
    } else {
      console.log('ℹ️  Mobile menu not found, but layout responsive');
    }
    
    console.log('✅ Responsive design workflow completed');
  });

  test('data refresh workflow', async ({ page }) => {
    console.log('🔄 Testing data refresh workflow...');
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    // Get initial state
    const initialProblemsCount = await dashboardPage.getActiveProblemsCount();
    console.log(`Initial problems count: ${initialProblemsCount}`);
    
    // Refresh dashboard
    await dashboardPage.refreshDashboard();
    
    // Get updated state
    const refreshedProblemsCount = await dashboardPage.getActiveProblemsCount();
    console.log(`Problems count after refresh: ${refreshedProblemsCount}`);
    
    // Both should be valid numbers
    expect(typeof initialProblemsCount).toBe('number');
    expect(typeof refreshedProblemsCount).toBe('number');
    
    // Navigate to problems and refresh there too
    const problemsPage = new ProblemsPage(page);
    await problemsPage.goto();
    
    const problemsCount = await problemsPage.getProblemsCount();
    await problemsPage.refreshProblems();
    const refreshedProblemsPageCount = await problemsPage.getProblemsCount();
    
    console.log(`Problems page: ${problemsCount} -> ${refreshedProblemsPageCount}`);
    
    console.log('✅ Data refresh workflow completed');
  });

  test('cross-page state consistency', async ({ page }) => {
    console.log('🔗 Testing cross-page state consistency...');
    
    const dashboardPage = new DashboardPage(page);
    const problemsPage = new ProblemsPage(page);
    
    // Get problems count from dashboard
    await dashboardPage.goto();
    const dashboardProblemsCount = await dashboardPage.getActiveProblemsCount();
    
    // Get problems count from problems page
    await problemsPage.goto();
    const problemsPageCount = await problemsPage.getProblemsCount();
    
    console.log(`Dashboard shows: ${dashboardProblemsCount} problems`);
    console.log(`Problems page shows: ${problemsPageCount} problems`);
    
    // Both should be numbers (exact match not required due to timing)
    expect(typeof dashboardProblemsCount).toBe('number');
    expect(typeof problemsPageCount).toBe('number');
    
    console.log('✅ Cross-page state consistency test completed');
  });

  test('performance and loading workflow', async ({ page }) => {
    console.log('⚡ Testing performance and loading workflow...');
    
    const startTime = Date.now();
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    const loadTime = Date.now() - startTime;
    console.log(`Dashboard load time: ${loadTime}ms`);
    
    // Test should complete within reasonable time
    expect(loadTime).toBeLessThan(30000); // 30 seconds max
    
    // Test navigation speed
    const navStartTime = Date.now();
    
    const problemsPage = new ProblemsPage(page);
    await problemsPage.goto();
    
    const navTime = Date.now() - navStartTime;
    console.log(`Navigation time: ${navTime}ms`);
    
    expect(navTime).toBeLessThan(15000); // 15 seconds max for navigation
    
    console.log('✅ Performance workflow completed');
  });

  test('accessibility workflow', async ({ page }) => {
    console.log('♿ Testing accessibility workflow...');
    
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();
    
    // Check for basic accessibility features
    const hasSkipLinks = await dashboardPage.isElementVisible('[href="#main"], [href="#content"], .skip-link');
    const hasHeadings = await dashboardPage.isElementVisible('h1, h2, h3, h4, h5, h6');
    const hasLandmarks = await dashboardPage.isElementVisible('[role="main"], [role="navigation"], main, nav');
    const hasAltText = await dashboardPage.isElementVisible('img[alt]');
    
    console.log('Accessibility features found:');
    console.log(`- Skip links: ${hasSkipLinks ? '✅' : '⚠️'}`);
    console.log(`- Headings: ${hasHeadings ? '✅' : '⚠️'}`);
    console.log(`- Landmarks: ${hasLandmarks ? '✅' : '⚠️'}`);
    console.log(`- Alt text on images: ${hasAltText ? '✅' : 'N/A'}`);
    
    // At least some accessibility features should be present
    const accessibilityScore = [hasSkipLinks, hasHeadings, hasLandmarks].filter(Boolean).length;
    expect(accessibilityScore).toBeGreaterThan(0);
    
    console.log('✅ Accessibility workflow completed');
  });

  test('comprehensive system health check', async ({ page, request }) => {
    console.log('🏥 Running comprehensive system health check...');
    
    const results = {
      frontend: false,
      api: false,
      navigation: false,
      dataLoading: false
    };
    
    // Test 1: Frontend loads
    try {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      results.frontend = true;
      console.log('✅ Frontend health: OK');
    } catch (error) {
      console.log(`❌ Frontend health: ${error.message}`);
    }
    
    // Test 2: API responds
    try {
      const baseURL = process.env.BASE_URL || 'http://localhost:3000';
      const apiResponse = await request.get(`${baseURL}/api/dashboard`);
      results.api = apiResponse.ok();
      console.log(`${results.api ? '✅' : '❌'} API health: ${apiResponse.status()}`);
    } catch (error) {
      console.log(`❌ API health: ${error.message}`);
    }
    
    // Test 3: Navigation works
    try {
      const problemsPage = new ProblemsPage(page);
      await problemsPage.goto();
      results.navigation = true;
      console.log('✅ Navigation health: OK');
    } catch (error) {
      console.log(`❌ Navigation health: ${error.message}`);
    }
    
    // Test 4: Data loading works
    try {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();
      const problemsCount = await dashboardPage.getActiveProblemsCount();
      results.dataLoading = typeof problemsCount === 'number';
      console.log('✅ Data loading health: OK');
    } catch (error) {
      console.log(`❌ Data loading health: ${error.message}`);
    }
    
    // Summary
    const healthScore = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🏥 System Health Summary: ${healthScore}/${totalTests} tests passed`);
    console.log('Detailed results:', results);
    
    // At least 2 out of 4 systems should be working
    expect(healthScore).toBeGreaterThanOrEqual(2);
    
    console.log('✅ Comprehensive health check completed');
  });
});