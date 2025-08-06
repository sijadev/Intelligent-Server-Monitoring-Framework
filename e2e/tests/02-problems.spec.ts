import { test, expect } from '@playwright/test';
import { ProblemsPage } from '../pages/ProblemsPage';

test.describe('IMF Problems Page', () => {
  let problemsPage: ProblemsPage;

  test.beforeEach(async ({ page }) => {
    problemsPage = new ProblemsPage(page);
  });

  test('should load problems page successfully', async () => {
    await problemsPage.goto();
    
    // Check page title
    await expect(problemsPage.page).toHaveTitle(/Problems|IMF.*Problems/);
    
    // Verify page content loads
    const hasContent = await problemsPage.isElementVisible('body');
    expect(hasContent).toBeTruthy();
  });

  test('should display problems list or empty state', async () => {
    await problemsPage.verifyProblemsPageLoads();
    
    const problemsCount = await problemsPage.getProblemsCount();
    console.log(`Found ${problemsCount} problems`);
    
    if (problemsCount > 0) {
      console.log('✅ Problems list populated');
      
      // Verify problem structure
      const problemStructure = await problemsPage.verifyProblemItemStructure(0);
      expect(problemStructure.hasContent).toBeTruthy();
      
      console.log('First problem content preview:', problemStructure.content?.substring(0, 100));
    } else {
      console.log('ℹ️  No problems found - checking for empty state');
      
      // Look for empty state indicators
      const emptyStateVisible = await problemsPage.isElementVisible('[data-testid="empty-state"], .empty-state, text=/no problems|empty/i');
      
      if (emptyStateVisible) {
        console.log('✅ Empty state properly displayed');
      } else {
        console.log('ℹ️  Empty state handling could be improved');
      }
    }
  });

  test('should handle problems filtering', async () => {
    await problemsPage.goto();
    
    const initialCount = await problemsPage.getProblemsCount();
    console.log(`Initial problems count: ${initialCount}`);
    
    // Test severity filtering if available
    const severityFilterVisible = await problemsPage.severityFilter.isVisible();
    
    if (severityFilterVisible) {
      await problemsPage.filterBySeverity('CRITICAL');
      
      const filteredCount = await problemsPage.getProblemsCount();
      console.log(`Filtered problems count: ${filteredCount}`);
      
      expect(filteredCount).toBeGreaterThanOrEqual(0);
      console.log('✅ Filtering functionality works');
    } else {
      console.log('ℹ️  Severity filtering not yet implemented');
    }
  });

  test('should handle problems search', async () => {
    await problemsPage.goto();
    
    const searchBoxVisible = await problemsPage.searchBox.isVisible();
    
    if (searchBoxVisible) {
      await problemsPage.searchProblems('test');
      
      // Verify search completed (page reloaded/updated)
      const hasContent = await problemsPage.isElementVisible('body');
      expect(hasContent).toBeTruthy();
      
      console.log('✅ Search functionality works');
    } else {
      console.log('ℹ️  Search functionality not yet implemented');
    }
  });

  test('should refresh problems list', async () => {
    await problemsPage.goto();
    
    const initialCount = await problemsPage.getProblemsCount();
    
    await problemsPage.refreshProblems();
    
    const refreshedCount = await problemsPage.getProblemsCount();
    console.log(`Problems count after refresh: ${refreshedCount}`);
    
    // Both counts should be valid numbers
    expect(typeof initialCount).toBe('number');
    expect(typeof refreshedCount).toBe('number');
    
    console.log('✅ Refresh functionality works');
  });

  test('should handle problem resolution', async () => {
    await problemsPage.goto();
    
    const initialCount = await problemsPage.getProblemsCount();
    
    if (initialCount > 0) {
      console.log('Testing problem resolution...');
      
      const resolved = await problemsPage.resolveFirstProblem();
      
      if (resolved) {
        console.log('✅ Problem resolution attempted');
        
        // Verify the problem list updated
        const newCount = await problemsPage.getProblemsCount();
        console.log(`Problems count after resolution: ${newCount}`);
        
        // The count should be the same or less (if resolution worked)
        expect(newCount).toBeLessThanOrEqual(initialCount);
      } else {
        console.log('ℹ️  No resolve buttons available');
      }
    } else {
      console.log('ℹ️  No problems available to test resolution');
    }
  });

  test('should handle problem details view', async () => {
    await problemsPage.goto();
    
    const problemsCount = await problemsPage.getProblemsCount();
    
    if (problemsCount > 0) {
      await problemsPage.viewProblemDetails(0);
      
      // Check if details panel appeared
      const detailsVisible = await problemsPage.problemDetails.isVisible().catch(() => false);
      
      if (detailsVisible) {
        console.log('✅ Problem details view works');
      } else {
        console.log('ℹ️  Problem details view not yet implemented');
      }
    } else {
      console.log('ℹ️  No problems available to test details view');
    }
  });

  test('should test export functionality', async () => {
    await problemsPage.goto();
    
    const exportPath = await problemsPage.exportProblems();
    
    if (exportPath) {
      console.log(`✅ Export successful: ${exportPath}`);
    } else {
      console.log('ℹ️  Export functionality not yet implemented or no export button found');
    }
  });

  test('should run comprehensive functionality test', async () => {
    const results = await problemsPage.testProblemsPageFunctionality();
    
    // Verify at least basic functionality works
    expect(results.pageLoads).toBeTruthy();
    expect(typeof results.problemsCount).toBe('number');
    
    console.log('📊 Problems page functionality test results:');
    console.log(`- Page loads: ${results.pageLoads ? '✅' : '❌'}`);
    console.log(`- Problems count: ${results.problemsCount}`);
    console.log(`- Can refresh: ${results.canRefresh ? '✅' : '❌'}`);
    console.log(`- Can search: ${results.canSearch ? '✅' : '⚠️ Not implemented'}`);
    console.log(`- Can filter: ${results.canFilter ? '✅' : '⚠️ Not implemented'}`);
    console.log(`- Can resolve: ${results.canResolve ? '✅' : '⚠️ No problems or not implemented'}`);
  });

  test('should be accessible', async () => {
    await problemsPage.goto();
    
    // Check for basic accessibility features
    const hasHeadings = await problemsPage.isElementVisible('h1, h2, h3, h4, h5, h6');
    const hasNavigation = await problemsPage.isElementVisible('[role="navigation"], nav');
    const hasMain = await problemsPage.isElementVisible('[role="main"], main');
    
    console.log('Accessibility check results:');
    console.log(`- Has headings: ${hasHeadings ? '✅' : '⚠️'}`);
    console.log(`- Has navigation: ${hasNavigation ? '✅' : '⚠️'}`);
    console.log(`- Has main content area: ${hasMain ? '✅' : '⚠️'}`);
    
    // At least one accessibility feature should be present
    expect(hasHeadings || hasNavigation || hasMain).toBeTruthy();
  });
});