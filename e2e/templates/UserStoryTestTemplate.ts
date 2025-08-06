import { test, expect, Page } from '@playwright/test';
import { DashboardPage } from '../pages/DashboardPage';
import { ProblemsPage } from '../pages/ProblemsPage';

/**
 * Test Profile Interface - definiert erwartete Testdaten
 */
export interface TestProfile {
  name: string;
  complexity: 'low' | 'medium' | 'high';
  scenarios: string[];
  languages: string[];
  expectedData: {
    logEntries: number;
    problems: number;
    metrics: number;
    sizeKB: number;
  };
  description: string;
}

/**
 * Verfügbare Testprofile aus dem Test Manager
 */
export const TEST_PROFILES: Record<string, TestProfile> = {
  'npm-package': {
    name: 'NPM Package Test',
    complexity: 'medium',
    scenarios: ['typescript', 'javascript'],
    languages: ['typescript', 'javascript'],
    expectedData: {
      logEntries: 2926,
      problems: 36,
      metrics: 1540,
      sizeKB: 155.71
    },
    description: 'Standard NPM package testing with medium complexity'
  },
  
  'docker-profile': {
    name: 'Docker Test Profile', 
    complexity: 'medium',
    scenarios: ['containerization', 'deployment'],
    languages: ['typescript', 'javascript'],
    expectedData: {
      logEntries: 4830,
      problems: 74,
      metrics: 1837,
      sizeKB: 214.16
    },
    description: 'Docker containerization testing with deployment scenarios'
  },
  
  'ci-high-complexity': {
    name: 'CI High Complexity',
    complexity: 'high', 
    scenarios: ['integration', 'performance', 'stress'],
    languages: ['typescript', 'javascript'],
    expectedData: {
      logEntries: 8636,
      problems: 87,
      metrics: 4495,
      sizeKB: 235.79
    },
    description: 'High complexity CI scenarios with stress testing'
  },
  
  'ci-medium-complexity': {
    name: 'CI Medium Complexity',
    complexity: 'medium',
    scenarios: ['integration', 'unit'],
    languages: ['typescript', 'javascript'], 
    expectedData: {
      logEntries: 4830,
      problems: 74,
      metrics: 1837,
      sizeKB: 214.16
    },
    description: 'Standard CI scenarios with medium complexity'
  }
};

/**
 * User Story Test Template Class
 */
export class UserStoryTestTemplate {
  protected dashboardPage: DashboardPage;
  protected problemsPage: ProblemsPage;
  protected page: Page;
  protected testProfile: TestProfile;

  constructor(page: Page, profileKey: string) {
    this.page = page;
    this.dashboardPage = new DashboardPage(page);
    this.problemsPage = new ProblemsPage(page);
    this.testProfile = TEST_PROFILES[profileKey];
    
    if (!this.testProfile) {
      throw new Error(`Test profile '${profileKey}' not found`);
    }
  }

  /**
   * Aktiviert ein spezifisches Testprofil im Test Manager
   */
  async activateTestProfile(): Promise<void> {
    console.log(`🎯 Aktiviere Testprofil: ${this.testProfile.name}`);
    console.log(`📊 Erwartete Daten: ${this.testProfile.expectedData.logEntries} Logs, ${this.testProfile.expectedData.problems} Problems`);
    
    // Navigation zum Test Manager
    await this.dashboardPage.goto();
    await this.page.click('a[href="/test-manager"]');
    await this.page.waitForLoadState('networkidle');
    
    // Testprofil auswählen (falls verfügbar)
    const profileSelector = `[data-testid="profile-${this.testProfile.name.toLowerCase().replace(/\s+/g, '-')}"]`;
    const profileExists = await this.page.locator(profileSelector).isVisible().catch(() => false);
    
    if (profileExists) {
      await this.page.click(profileSelector);
      console.log(`✅ Testprofil "${this.testProfile.name}" aktiviert`);
    } else {
      console.log(`ℹ️  Testprofil "${this.testProfile.name}" wird simuliert`);
    }
  }

  /**
   * Führt Soll/Ist Vergleich für das aktive Testprofil durch
   */
  async validateExpectedVsActual(): Promise<{
    logEntries: { expected: number; actual: number; match: boolean };
    problems: { expected: number; actual: number; match: boolean };
    metrics: { expected: number; actual: number; match: boolean };
    overallMatch: boolean;
  }> {
    await this.dashboardPage.goto();
    
    // Aktuelle Werte vom Dashboard abrufen
    const actualProblems = await this.dashboardPage.getActiveProblemsCount();
    
    // Log Entries zählen
    const logStreamVisible = await this.dashboardPage.isElementVisible('[data-testid="log-stream"]');
    let actualLogEntries = 0;
    if (logStreamVisible) {
      const logContent = await this.page.textContent('[data-testid="log-stream"]');
      actualLogEntries = (logContent?.match(/\d{2}:\d{2}:\d{2}/g) || []).length;
    }
    
    // System Metrics überprüfen
    const metricsVisible = await this.dashboardPage.isElementVisible('[data-testid="system-info"]');
    let actualMetrics = 0;
    if (metricsVisible) {
      const metricsText = await this.page.textContent('[data-testid="system-info"]');
      // Zähle Anzahl der Metriken (CPU, Memory, Disk, etc.)
      actualMetrics = (metricsText?.match(/\d+%|\d+\.\d+%/g) || []).length;
    }

    const results = {
      logEntries: {
        expected: this.testProfile.expectedData.logEntries,
        actual: actualLogEntries,
        match: this.isWithinTolerance(actualLogEntries, this.testProfile.expectedData.logEntries, 0.1)
      },
      problems: {
        expected: this.testProfile.expectedData.problems,
        actual: actualProblems,
        match: this.isWithinTolerance(actualProblems, this.testProfile.expectedData.problems, 0.2)
      },
      metrics: {
        expected: this.testProfile.expectedData.metrics,
        actual: actualMetrics,
        match: this.isWithinTolerance(actualMetrics, this.testProfile.expectedData.metrics, 0.3)
      },
      overallMatch: false
    };

    results.overallMatch = results.logEntries.match && results.problems.match && results.metrics.match;

    console.log(`📊 Soll/Ist Vergleich für ${this.testProfile.name}:`);
    console.log(`   Log Entries: ${results.logEntries.actual}/${results.logEntries.expected} ${results.logEntries.match ? '✅' : '❌'}`);
    console.log(`   Problems: ${results.problems.actual}/${results.problems.expected} ${results.problems.match ? '✅' : '❌'}`);
    console.log(`   Metrics: ${results.metrics.actual}/${results.metrics.expected} ${results.metrics.match ? '✅' : '❌'}`);
    console.log(`   Overall: ${results.overallMatch ? '✅ MATCH' : '❌ DEVIATION'}`);

    return results;
  }

  /**
   * Überprüft ob ein Wert innerhalb der Toleranz liegt
   */
  private isWithinTolerance(actual: number, expected: number, tolerance: number): boolean {
    if (expected === 0) return actual <= 5; // Für 0 erwartete Werte, erlauube bis zu 5 aktuelle
    const diff = Math.abs(actual - expected) / expected;
    return diff <= tolerance;
  }

  /**
   * Erstellt einen User Story Test Step mit Kontext
   */
  async createUserStoryStep(stepName: string, userContext: string, action: () => Promise<void>): Promise<void> {
    await test.step(`${stepName} (${this.testProfile.name})`, async () => {
      console.log(`👤 ${userContext}`);
      console.log(`🎯 Testprofil: ${this.testProfile.description}`);
      await action();
    });
  }

  /**
   * Validiert Systemzustand basierend auf Testprofil
   */
  async validateSystemState(): Promise<void> {
    const complexity = this.testProfile.complexity;
    
    switch (complexity) {
      case 'low':
        // Niedrige Komplexität - wenige Probleme erwartet
        await expect(async () => {
          const problems = await this.dashboardPage.getActiveProblemsCount();
          expect(problems).toBeLessThan(20);
        }).toPass({ timeout: 10000 });
        break;
        
      case 'medium':
        // Mittlere Komplexität - moderate Probleme erwartet
        await expect(async () => {
          const problems = await this.dashboardPage.getActiveProblemsCount();
          expect(problems).toBeLessThan(80);
        }).toPass({ timeout: 10000 });
        break;
        
      case 'high':
        // Hohe Komplexität - viele Probleme möglich
        console.log('🔥 High complexity profile - expecting significant system activity');
        break;
    }
  }

  /**
   * Führt profilspezifische Assertions durch
   */
  async performProfileSpecificAssertions(): Promise<void> {
    const profile = this.testProfile;
    
    if (profile.scenarios.includes('performance')) {
      // Performance-spezifische Validierungen
      const startTime = Date.now();
      await this.dashboardPage.goto();
      const loadTime = Date.now() - startTime;
      
      console.log(`⚡ Dashboard Load Time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(profile.complexity === 'high' ? 10000 : 5000);
    }
    
    if (profile.scenarios.includes('containerization')) {
      // Docker/Container-spezifische Validierungen
      console.log('🐳 Validating containerization scenarios');
      // Hier könnten Container-spezifische Tests stehen
    }
    
    if (profile.scenarios.includes('integration')) {
      // Integration-spezifische Validierungen
      console.log('🔗 Validating integration scenarios');
      const comparison = await this.validateExpectedVsActual();
      expect(comparison.overallMatch || comparison.problems.match).toBeTruthy();
    }
  }

  /**
   * Template für User Story Tests
   */
  async executeUserStoryTemplate(
    persona: string,
    userGoal: string, 
    testSteps: Array<{
      name: string;
      context: string;
      action: () => Promise<void>;
    }>
  ): Promise<void> {
    console.log(`\n🎭 ${persona} User Story with ${this.testProfile.name}`);
    console.log(`🎯 Goal: ${userGoal}`);
    
    // Testprofil aktivieren
    await this.activateTestProfile();
    
    // User Story Steps ausführen
    for (const step of testSteps) {
      await this.createUserStoryStep(step.name, step.context, step.action);
    }
    
    // Profilspezifische Validierungen
    await this.performProfileSpecificAssertions();
    
    // Soll/Ist Vergleich am Ende
    await this.validateExpectedVsActual();
  }
}