import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { testDataLoader, type GeneratedTestData } from './test-data-loader';
import { setupTestEnvironment } from './test-setup';

/**
 * Real Data Test Template - Base class for creating tests that use generated test data
 * 
 * Usage:
 * ```typescript
 * export class MyFeatureRealDataTest extends RealDataTestTemplate {
 *   testName = 'My Feature with Real Data';
 *   
 *   async runFeatureTests(data: GeneratedTestData[], storage: any) {
 *     // Your specific test logic here
 *   }
 * }
 * 
 * new MyFeatureRealDataTest().createTestSuite();
 * ```
 */
export abstract class RealDataTestTemplate {
  protected storage: any;
  protected generatedTestData: GeneratedTestData[] = [];
  protected testSummary: any;

  // Abstract properties - must be implemented by subclasses
  abstract testName: string;
  
  // Optional configuration
  protected useAllData: boolean = true;
  protected maxDatasets: number = 10;
  protected timeoutMs: number = 60000;
  protected requiredComplexities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];

  // Abstract methods - must be implemented by subclasses
  abstract runFeatureTests(data: GeneratedTestData[], storage: any): Promise<void>;

  // Optional hooks - can be overridden by subclasses
  protected async beforeFeatureTests(data: GeneratedTestData[], storage: any): Promise<void> {
    // Default: no additional setup
  }

  protected async afterFeatureTests(data: GeneratedTestData[], storage: any): Promise<void> {
    // Default: no additional cleanup
  }

  protected validateDataRequirements(data: GeneratedTestData[]): void {
    // Default validations
    expect(data.length).toBeGreaterThan(0);
    
    // Check required complexities are present
    for (const complexity of this.requiredComplexities) {
      const hasComplexity = data.some(d => d.metadata.profile.sourceConfig.complexity === complexity);
      if (!hasComplexity) {
        console.warn(`⚠️ No ${complexity} complexity data found, some tests may be skipped`);
      }
    }
  }

  // Helper methods available to subclasses
  protected getDataByComplexity(data: GeneratedTestData[], complexity: 'low' | 'medium' | 'high'): GeneratedTestData[] {
    return data.filter(d => d.metadata.profile.sourceConfig.complexity === complexity);
  }

  protected getDataByProfile(data: GeneratedTestData[], profileId: string): GeneratedTestData[] {
    return data.filter(d => d.profileId === profileId);
  }

  protected calculateAverageSuccessRate(data: GeneratedTestData[]): number {
    if (data.length === 0) return 0;
    
    const totalSuccessRate = data.reduce((sum, d) => 
      sum + d.data.scenarios.reduce((scenarioSum, s) => scenarioSum + s.statistics.successRate, 0) / d.data.scenarios.length, 0
    );
    
    return totalSuccessRate / data.length;
  }

  protected getTotalProblems(data: GeneratedTestData[]): number {
    return data.reduce((sum, d) => sum + d.statistics.totalCodeProblems, 0);
  }

  protected getUniqueProblemTypes(data: GeneratedTestData[]): string[] {
    const problemTypes = new Set<string>();
    
    data.forEach(d => {
      d.metadata.profile.scenarios.forEach((scenario: any) => {
        (scenario.problemTypes || []).forEach((type: string) => problemTypes.add(type));
      });
    });
    
    return Array.from(problemTypes);
  }

  protected logDatasetSummary(data: GeneratedTestData[]): void {
    console.log(`\n📊 ${this.testName} - Dataset Summary:`);
    console.log(`📈 Total Datasets: ${data.length}`);
    console.log(`🐛 Total Problems: ${this.getTotalProblems(data)}`);
    console.log(`✅ Average Success Rate: ${(this.calculateAverageSuccessRate(data) * 100).toFixed(1)}%`);
    
    const complexityBreakdown = {
      low: this.getDataByComplexity(data, 'low').length,
      medium: this.getDataByComplexity(data, 'medium').length,
      high: this.getDataByComplexity(data, 'high').length
    };
    console.log(`⚖️  Complexity: Low=${complexityBreakdown.low}, Medium=${complexityBreakdown.medium}, High=${complexityBreakdown.high}`);
    console.log(`🔍 Problem Types: ${this.getUniqueProblemTypes(data).join(', ')}`);
  }

  // Main method to create the test suite
  createTestSuite(): void {
    describe(this.testName, () => {
      beforeAll(async () => {
        // Setup test environment
        const testEnv = setupTestEnvironment();
        this.storage = testEnv.getStorage();
        
        // Load real generated test data
        this.generatedTestData = await testDataLoader.loadAllGeneratedData();
        this.testSummary = await testDataLoader.getTestDataSummary();
        
        // Limit data if configured
        if (!this.useAllData && this.generatedTestData.length > this.maxDatasets) {
          this.generatedTestData = this.generatedTestData.slice(0, this.maxDatasets);
        }
        
        console.log(`\n🔍 ${this.testName}: Loaded ${this.generatedTestData.length} real test datasets`);
        this.logDatasetSummary(this.generatedTestData);
      });

      afterAll(async () => {
        if (this.storage?.cleanup) {
          await this.storage.cleanup();
        }
      });

      // Standard validation test - always included
      it('should validate generated test data structure and requirements', async () => {
        this.validateDataRequirements(this.generatedTestData);
        
        // Validate each dataset structure
        for (const data of this.generatedTestData) {
          expect(data).toHaveProperty('profileId');
          expect(data).toHaveProperty('generatedAt');
          expect(data).toHaveProperty('statistics');
          expect(data.statistics).toHaveProperty('totalLogEntries');
          expect(data.statistics).toHaveProperty('totalCodeProblems');
          expect(data.statistics.totalLogEntries).toBeGreaterThan(0);
          expect(data.data.scenarios).toBeDefined();
          expect(data.data.scenarios.length).toBeGreaterThan(0);
        }
      });

      // Main feature test - implemented by subclass
      it(`should run ${this.testName.toLowerCase()} with real generated data`, async () => {
        if (this.generatedTestData.length === 0) {
          console.log(`⚠️ No real test data available for ${this.testName}, skipping feature tests`);
          return;
        }

        // Run pre-test hook
        await this.beforeFeatureTests(this.generatedTestData, this.storage);

        // Run the actual feature tests
        await this.runFeatureTests(this.generatedTestData, this.storage);

        // Run post-test hook
        await this.afterFeatureTests(this.generatedTestData, this.storage);

        console.log(`✅ ${this.testName} completed successfully with real data!`);
      }, this.timeoutMs);

      // Summary test - always included
      it('should generate feature-specific summary report', async () => {
        console.log(`\n=== ${this.testName.toUpperCase()} SUMMARY REPORT ===`);
        console.log(`📊 Total Datasets Processed: ${this.generatedTestData.length}`);
        console.log(`📝 Total Log Entries: ${this.testSummary.totalLogEntries.toLocaleString()}`);
        console.log(`📈 Total Metric Points: ${this.testSummary.totalMetricPoints.toLocaleString()}`);
        console.log(`🐛 Total Code Problems: ${this.testSummary.totalCodeProblems}`);
        console.log(`✅ Overall Success Rate: ${(this.testSummary.averageSuccessRate * 100).toFixed(1)}%`);
        
        // Validate summary data
        expect(this.testSummary.totalDatasets).toBe(this.generatedTestData.length);
        expect(this.testSummary.averageSuccessRate).toBeGreaterThan(0);
        expect(this.testSummary.averageSuccessRate).toBeLessThanOrEqual(1);
      });
    });
  }
}

// Utility function to create a simple test without subclassing
export function createRealDataTest(config: {
  testName: string;
  testFunction: (data: GeneratedTestData[], storage: any) => Promise<void>;
  maxDatasets?: number;
  timeoutMs?: number;
  requiredComplexities?: Array<'low' | 'medium' | 'high'>;
}): void {
  class SimpleRealDataTest extends RealDataTestTemplate {
    testName = config.testName;
    protected maxDatasets = config.maxDatasets || 10;
    protected timeoutMs = config.timeoutMs || 60000;
    protected requiredComplexities = config.requiredComplexities || ['low', 'medium', 'high'];

    async runFeatureTests(data: GeneratedTestData[], storage: any): Promise<void> {
      await config.testFunction(data, storage);
    }
  }

  new SimpleRealDataTest().createTestSuite();
}