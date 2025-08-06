import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly title: Locator;
  readonly navigation: Locator;
  readonly sidebar: Locator;
  readonly loadingIndicator: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('h1');
    this.navigation = page.locator('[data-testid="navigation"]');
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.loadingIndicator = page.locator('[data-testid="loading"]');
  }

  /**
   * Navigate to a specific path
   */
  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }

  /**
   * Wait for page to load completely
   */
  async waitForPageLoad() {
    // Wait for DOM content to load first
    await this.page.waitForLoadState('domcontentloaded');
    
    // Then wait for network to be idle with a shorter timeout
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
    } catch {
      // If networkidle times out, wait for load state instead
      await this.page.waitForLoadState('load');
    }
    
    // Wait for any loading indicators to disappear
    await this.loadingIndicator.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {
      // Loading indicator might not be present, that's ok
    });
  }

  /**
   * Navigate using sidebar menu
   */
  async navigateToPage(pageName: string) {
    const menuItem = this.sidebar.locator(`text="${pageName}"`);
    await menuItem.click();
    await this.waitForPageLoad();
  }

  /**
   * Get page title
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      await element.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Take screenshot with custom name
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for toast notification
   */
  async waitForToast(message?: string, timeout: number = 10000) {
    const toast = this.page.locator('[data-testid="toast"]');
    await toast.waitFor({ state: 'visible', timeout });
    
    if (message) {
      await expect(toast).toContainText(message);
    }
    
    return toast;
  }

  /**
   * Check if application is responsive on mobile
   */
  async checkMobileLayout() {
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.waitForTimeout(1000); // Allow layout to settle
  }

  /**
   * Check if application is responsive on tablet
   */
  async checkTabletLayout() {
    await this.page.setViewportSize({ width: 768, height: 1024 });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if application is responsive on desktop
   */
  async checkDesktopLayout() {
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    await this.page.waitForTimeout(1000);
  }
}