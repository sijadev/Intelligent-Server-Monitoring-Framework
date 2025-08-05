import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment } from './test-setup';
import { githubAwareTestDataLoader, type GeneratedTestData, type TestDataSummary } from './github-aware-test-data-loader';

export interface RealDataTestConfig {
  testName: string;
  maxDatasets?: number;
  useAllData?: boolean;
  timeoutMs?: number;
  testFunction: (data: GeneratedTestData[], storage: any) => Promise<void>;
}

export class GitHubReadyRealDataTest {
  protected generatedTestData: GeneratedTestData[] = [];
  protected testSummary: TestDataSummary | null = null;
  protected storage: any;
  
  constructor(
    public testName: string,
    private maxDatasets: number = 3,
    private useAllData: boolean = false,
    private timeoutMs: number = 120000,
    private testFunction: (data: GeneratedTestData[]) => Promise<void>
  ) {}

  // Validation for generated test data
  protected validateDataRequirements(data: GeneratedTestData[]): void {
    // Default validations
    expect(data.length).toBeGreaterThan(0);
    
    // Check required complexities are present (flexible for CI)
    const complexities = new Set(data.map(d => d.metadata.profile?.sourceConfig?.complexity).filter(Boolean));
    if (data.length >= 3) {
      expect(complexities.size).toBeGreaterThanOrEqual(1); // At least one complexity level
    }
    
    // Validate data structure
    data.forEach((dataset, index) => {
      expect(dataset.profileId, `Dataset ${index} missing profileId`).toBeDefined();
      expect(dataset.statistics, `Dataset ${index} missing statistics`).toBeDefined();
      expect(dataset.metadata, `Dataset ${index} missing metadata`).toBeDefined();
      expect(dataset.metadata.profile, `Dataset ${index} missing profile`).toBeDefined();
      
      // Validate statistics are reasonable
      expect(dataset.statistics.totalCodeProblems).toBeGreaterThanOrEqual(0);
      expect(dataset.statistics.totalLogEntries).toBeGreaterThanOrEqual(0);
      expect(dataset.statistics.totalMetricPoints).toBeGreaterThanOrEqual(0);
    });
  }

  // Log dataset summary for visibility
  protected logDatasetSummary(data: GeneratedTestData[]): void {
    const complexityCount: Record<string, number> = {};
    const problemTypes = new Set<string>();
    let totalProblems = 0;
    let totalSuccessRate = 0;
    let totalLogEntries = 0;

    data.forEach(dataset => {
      const complexity = dataset.metadata.profile?.sourceConfig?.complexity || 'unknown';
      complexityCount[complexity] = (complexityCount[complexity] || 0) + 1;
      totalProblems += dataset.statistics.totalCodeProblems;
      totalLogEntries += dataset.statistics.totalLogEntries;
      
      // Extract problem types
      if (dataset.metadata.profile?.scenarios) {
        dataset.metadata.profile.scenarios.forEach((scenario: any) => {
          if (scenario.problemTypes) {
            scenario.problemTypes.forEach((type: string) => problemTypes.add(type));
          }
        });
      }
      
      // Calculate success rate
      if (dataset.data.scenarios && dataset.data.scenarios.length > 0) {
        totalSuccessRate += dataset.data.scenarios[0].statistics.successRate;
      }
    });

    const avgSuccessRate = data.length > 0 ? (totalSuccessRate / data.length) * 100 : 0;
    const complexityStr = Object.entries(complexityCount)
      .map(([comp, count]) => `${comp.charAt(0).toUpperCase()}=${count}`)
      .join(', ');

    console.log(`\n📊 ${this.testName} - Dataset Summary:`);
    console.log(`📈 Total Datasets: ${data.length}`);
    console.log(`🐛 Total Problems: ${totalProblems.toLocaleString()}`);
    console.log(`✅ Average Success Rate: ${avgSuccessRate.toFixed(1)}%`);
    console.log(`⚖️  Complexity: ${complexityStr}`);
    console.log(`🔍 Problem Types: ${Array.from(problemTypes).sort().join(', ')}`);
  }

  // Main method to run the feature tests
  async runFeatureTests(data: GeneratedTestData[], storage: any): Promise<void> {
    if (data.length === 0) {
      console.log(`⚠️ No real test data available for ${this.testName}, skipping feature tests`);
      return;
    }
    
    try {
      await this.testFunction(data, storage);
      console.log(`✅ ${this.testName} completed successfully with real data!`);
    } catch (error) {
      console.error(`❌ ${this.testName} failed:`, error.message);
      throw error;
    }
  }

  // Generate feature-specific summary report
  async generateSummaryReport(): Promise<void> {
    const summary = this.testSummary || await githubAwareTestDataLoader.getTestDataSummary();
    
    console.log(`\n=== ${this.testName.toUpperCase()} SUMMARY REPORT ===`);
    console.log(`📊 Total Datasets Processed: ${summary.totalDatasets}`);
    console.log(`📝 Total Log Entries: ${summary.totalLogEntries.toLocaleString()}`);
    console.log(`📈 Total Metric Points: ${summary.totalMetricPoints.toLocaleString()}`);
    console.log(`🐛 Total Code Problems: ${summary.totalCodeProblems}`);
    console.log(`✅ Overall Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`);

    // Validate summary data - more flexible for CI
    expect(summary.totalDatasets).toBe(this.generatedTestData.length);
    if (summary.totalDatasets > 0) {
      expect(summary.averageSuccessRate).toBeGreaterThanOrEqual(0);
      expect(summary.averageSuccessRate).toBeLessThanOrEqual(1);
    }
  }

  // Main method to create the test suite
  createTestSuite(): void {
    describe(this.testName, () => {
      beforeAll(async () => {
        // Setup test environment
        const testEnv = setupTestEnvironment();
        this.storage = testEnv.getStorage();
        
        // Reset used profiles at start of each test suite
        githubAwareTestDataLoader.resetUsedProfiles();
        
        // Load real generated test data with GitHub awareness
        this.generatedTestData = await githubAwareTestDataLoader.loadAllGeneratedData(this.maxDatasets);
        this.testSummary = await githubAwareTestDataLoader.getTestDataSummary();
        
        // Limit data if configured and not using all data
        if (!this.useAllData && this.generatedTestData.length > this.maxDatasets) {
          this.generatedTestData = this.generatedTestData.slice(0, this.maxDatasets);
        }
        
        console.log(`\n🔍 ${this.testName}: Loaded ${this.generatedTestData.length} real test datasets`);
        this.logDatasetSummary(this.generatedTestData);
      }, this.timeoutMs);

      afterAll(async () => {
        if (this.storage?.cleanup) {
          await this.storage.cleanup();
        }
      });

      // Standard validation test - always included
      it('should validate generated test data structure and requirements', async () => {
        this.validateDataRequirements(this.generatedTestData);
      }, this.timeoutMs);

      // Main feature test - where the actual testing happens
      it(`should run ${this.testName.toLowerCase()} with real generated data`, async () => {
        await this.runFeatureTests(this.generatedTestData, this.storage);
      }, this.timeoutMs);

      // Summary report test - always included
      it('should generate feature-specific summary report', async () => {
        await this.generateSummaryReport();
      }, this.timeoutMs);
    });
  }
}

// Helper function to create GitHub-ready real data tests
export function createGitHubReadyRealDataTest(config: RealDataTestConfig): void {
  const test = new GitHubReadyRealDataTest(
    config.testName,
    config.maxDatasets || 3,
    config.useAllData || false,
    config.timeoutMs || 120000,
    (data, storage) => config.testFunction(data, storage)
  );
  
  test.createTestSuite();
}