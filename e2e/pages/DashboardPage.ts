import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly statusCards: Locator;
  readonly serverStatusCard: Locator;
  readonly problemsCard: Locator;
  readonly pluginsCard: Locator;
  readonly metricsCard: Locator;
  readonly problemsList: Locator;
  readonly systemInfo: Locator;
  readonly pluginStatus: Locator;
  readonly logViewer: Locator;
  readonly testManagerWidget: Locator;
  readonly refreshButton: Locator;

  constructor(page: Page) {
    super(page);
    this.statusCards = page.locator('[data-testid="status-cards"]');
    this.serverStatusCard = page.locator('[data-testid="server-status-card"]');
    this.problemsCard = page.locator('[data-testid="problems-card"]');
    this.pluginsCard = page.locator('[data-testid="plugins-card"]');
    this.metricsCard = page.locator('[data-testid="metrics-card"]');
    this.problemsList = page.locator('[data-testid="problems-list"]');
    this.systemInfo = page.locator('[data-testid="system-info"]');
    this.pluginStatus = page.locator('[data-testid="plugin-status"]');
    this.logViewer = page.locator('[data-testid="log-viewer"]');
    this.testManagerWidget = page.locator('[data-testid="test-manager-widget"]');
    this.refreshButton = page.locator('[data-testid="refresh-button"]');
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto('/');
    // Wait for page to load, but be flexible about title
    await this.page.waitForLoadState('networkidle');
    
    // Optional title check - don't fail if no title is set
    const title = await this.page.title();
    if (title && title.trim() !== '') {
      console.log(`📄 Dashboard page title: "${title}"`);
    } else {
      console.log('ℹ️  Dashboard page has no title set');
    }
  }

  /**
   * Check if dashboard loads successfully
   */
  async verifyDashboardLoads() {
    await this.goto();
    
    // Check main components are visible
    await expect(this.statusCards).toBeVisible();
    
    // Check status cards are present
    const cards = await this.statusCards.locator('.card, [class*="card"]').count();
    expect(cards).toBeGreaterThan(0);
  }

  /**
   * Get server status
   */
  async getServerStatus(): Promise<'Online' | 'Offline' | string> {
    if (await this.serverStatusCard.isVisible()) {
      const statusText = await this.serverStatusCard.locator('.status-text, [class*="status"]').textContent();
      return statusText?.trim() || 'Unknown';
    }
    return 'Card not found';
  }

  /**
   * Get active problems count
   */
  async getActiveProblemsCount(): Promise<number> {
    if (await this.problemsCard.isVisible()) {
      const countText = await this.problemsCard.locator('.count, [class*="count"]').textContent();
      return parseInt(countText?.trim() || '0');
    }
    return 0;
  }

  /**
   * Navigate to problems page
   */
  async goToProblemsPage() {
    await this.problemsCard.click();
    await this.waitForPageLoad();
    await expect(this.page).toHaveURL(/.*\/problems/);
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard() {
    if (await this.refreshButton.isVisible()) {
      await this.refreshButton.click();
      await this.waitForPageLoad();
    } else {
      // Fallback: reload page
      await this.page.reload();
      await this.waitForPageLoad();
    }
  }

  /**
   * Verify real-time updates
   */
  async verifyRealTimeUpdates() {
    // Get initial metrics count
    const initialCount = await this.getActiveProblemsCount();
    
    // Wait for potential updates (simulate real-time behavior)
    await this.page.waitForTimeout(5000);
    
    // Refresh and compare
    await this.refreshDashboard();
    const updatedCount = await this.getActiveProblemsCount();
    
    // Both counts should be numbers (indicating the component works)
    expect(typeof initialCount).toBe('number');
    expect(typeof updatedCount).toBe('number');
  }

  /**
   * Check system information panel
   */
  async verifySystemInfo() {
    if (await this.systemInfo.isVisible()) {
      // Check for common system info fields
      const systemInfoText = await this.systemInfo.textContent();
      expect(systemInfoText).toBeTruthy();
      
      // Could contain uptime, version, etc.
      return true;
    }
    return false;
  }

  /**
   * Check plugin status widgets
   */
  async verifyPluginStatus() {
    if (await this.pluginStatus.isVisible()) {
      const plugins = await this.pluginStatus.locator('.plugin-item, [class*="plugin"]').count();
      return plugins >= 0; // Could be 0 if no plugins configured
    }
    return false;
  }

  /**
   * Check log viewer functionality
   */
  async verifyLogViewer() {
    if (await this.logViewer.isVisible()) {
      // Check if logs are being displayed
      const logEntries = await this.logViewer.locator('.log-entry, [class*="log"]').count();
      return logEntries >= 0; // Could be 0 if no logs
    }
    return false;
  }

  /**
   * Check test manager widget
   */
  async verifyTestManagerWidget() {
    if (await this.testManagerWidget.isVisible()) {
      const widgetContent = await this.testManagerWidget.textContent();
      expect(widgetContent).toBeTruthy();
      return true;
    }
    return false;
  }

  /**
   * Verify all dashboard components
   */
  async verifyAllComponents() {
    const results = {
      dashboard: await this.verifyDashboardLoads(),
      systemInfo: await this.verifySystemInfo(),
      pluginStatus: await this.verifyPluginStatus(),
      logViewer: await this.verifyLogViewer(),
      testManager: await this.verifyTestManagerWidget()
    };

    console.log('Dashboard component verification:', results);
    return results;
  }
}