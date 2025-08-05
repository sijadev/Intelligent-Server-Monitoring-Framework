import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export interface GeneratedTestData {
  profileId: string;
  generatedAt: string;
  generationDuration: number;
  data: {
    logFiles: any[];
    metricStreams: any[];
    codeProblems: any[];
    scenarios: Array<{
      scenarioId: string;
      name: string;
      executedAt: string;
      duration: number;
      statistics: {
        problemsInjected: number;
        metricsGenerated: number;
        logsGenerated: number;
        successRate: number;
      };
    }>;
  };
  statistics: {
    totalLogEntries: number;
    totalMetricPoints: number;
    totalCodeProblems: number;
    dataSize: number;
  };
  metadata: {
    generatorVersion: string;
    profile: any;
    outputPath?: string;
    totalSamples?: number;
  };
}

export interface TestDataSummary {
  totalDatasets: number;
  averageSuccessRate: number;
  complexityDistribution: Record<string, number>;
  problemTypes: string[];
  totalLogEntries: number;
  totalMetricPoints: number;
  totalCodeProblems: number;
}

export class GitHubAwareTestDataLoader {
  private testWorkspacePath: string;
  private usedProfiles: Set<string> = new Set();
  private cachedData: Map<string, GeneratedTestData> = new Map();
  private isGitHubCI: boolean;
  
  constructor(testWorkspacePath?: string) {
    // Auto-detect GitHub CI environment
    this.isGitHubCI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true';
    
    // Use environment-appropriate workspace path
    this.testWorkspacePath = testWorkspacePath || 
      (this.isGitHubCI ? './test-workspace' : '/Users/simonjanke/Projects/IMF/test-workspace');
  }

  async ensureTestDataExists(requiredProfiles: number = 3): Promise<void> {
    const outputDir = path.join(this.testWorkspacePath, 'output');
    
    try {
      await fs.access(outputDir);
      const files = await fs.readdir(outputDir);
      const testDataFiles = files.filter(f => f.startsWith('testdata-') && f.endsWith('.json'));
      
      if (testDataFiles.length >= requiredProfiles) {
        console.log(`✅ Found ${testDataFiles.length} existing test data files`);
        return;
      }
    } catch (error) {
      console.log('🔍 Test workspace not found, creating...');
    }

    // Generate test data if not enough exists
    await this.generateTestDataForCI(requiredProfiles);
  }

  private async generateTestDataForCI(requiredProfiles: number): Promise<void> {
    console.log(`🚀 Generating ${requiredProfiles} test profiles for CI environment...`);
    
    try {
      // Try to use the CI setup script
      const setupScriptPath = path.join(process.cwd(), '.github/workflows/ci-setup-test-data.sh');
      await fs.access(setupScriptPath);
      
      console.log('📦 Using CI setup script to generate test data...');
      await this.runCISetupScript();
    } catch (error) {
      console.log('⚠️ CI setup script not found, generating inline...');
      await this.generateInlineTestData(requiredProfiles);
    }
  }

  private async runCISetupScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const setupScript = spawn('bash', ['.github/workflows/ci-setup-test-data.sh'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let output = '';
      setupScript.stdout?.on('data', (data) => {
        output += data.toString();
      });

      setupScript.stderr?.on('data', (data) => {
        console.error('CI setup error:', data.toString());
      });

      setupScript.on('close', (code) => {
        if (code === 0) {
          console.log('✅ CI setup script completed successfully');
          resolve();
        } else {
          console.log('⚠️ CI setup script failed, falling back to inline generation');
          this.generateInlineTestData(3).then(resolve).catch(reject);
        }
      });

      setupScript.on('error', (error) => {
        console.log('⚠️ Failed to run CI setup script, falling back to inline generation');
        this.generateInlineTestData(3).then(resolve).catch(reject);
      });
    });
  }

  private async generateInlineTestData(count: number): Promise<void> {
    console.log(`📊 Generating ${count} inline test profiles...`);
    
    // Ensure workspace directories exist
    await fs.mkdir(path.join(this.testWorkspacePath, 'profiles'), { recursive: true });
    await fs.mkdir(path.join(this.testWorkspacePath, 'output'), { recursive: true });

    const complexities = ['low', 'medium', 'high'];
    const profileTemplates = [
      {
        name: 'JavaScript Frontend Issues',
        languages: ['javascript', 'typescript'],
        problemTypes: ['null_pointer', 'type_mismatch', 'memory_leak']
      },
      {
        name: 'Backend API Issues', 
        languages: ['typescript', 'javascript'],
        problemTypes: ['api_timeout', 'syntax_error', 'null_pointer']
      },
      {
        name: 'Integration Issues',
        languages: ['typescript', 'javascript'], 
        problemTypes: ['type_mismatch', 'memory_leak', 'api_timeout']
      }
    ];

    for (let i = 0; i < count; i++) {
      const complexity = complexities[i % complexities.length];
      const template = profileTemplates[i % profileTemplates.length];
      const profileId = `ci-generated-${complexity}-${Date.now()}-${i}`;
      
      await this.createTestProfile(profileId, complexity, template);
      await this.createTestData(profileId, complexity);
    }

    console.log(`✅ Generated ${count} test profiles and data files`);
  }

  private async createTestProfile(profileId: string, complexity: string, template: any): Promise<void> {
    const profile = {
      id: profileId,
      name: `CI Generated ${template.name} (${complexity})`,
      version: '1.0.0-ci',
      description: `Auto-generated test profile for CI environment - ${complexity} complexity`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceConfig: {
        directories: ['./src', './server'],
        languages: template.languages,
        complexity: complexity,
        excludePatterns: ['node_modules', 'dist', '*.log']
      },
      scenarios: [
        {
          id: 'main-scenario',
          name: 'Main Test Scenario',
          type: complexity === 'high' ? 'stress' : complexity === 'medium' ? 'performance' : 'integration',
          duration: 300,
          enabled: true,
          problemTypes: template.problemTypes,
          codeInjection: {
            errorTypes: template.problemTypes,
            frequency: complexity === 'high' ? 0.2 : complexity === 'medium' ? 0.15 : 0.1,
            complexity: complexity
          },
          metrics: {
            cpuPattern: complexity === 'high' ? 'spike' : 'stable',
            memoryPattern: complexity === 'high' ? 'growing' : 'stable',
            logPattern: complexity === 'high' ? 'verbose' : 'normal'
          }
        }
      ],
      expectations: {
        detectionRate: complexity === 'high' ? 75 : complexity === 'medium' ? 80 : 85,
        fixSuccessRate: complexity === 'high' ? 60 : complexity === 'medium' ? 65 : 70,
        falsePositiveRate: complexity === 'high' ? 25 : complexity === 'medium' ? 20 : 15,
        mlAccuracy: complexity === 'high' ? 70 : complexity === 'medium' ? 75 : 80
      },
      generationRules: {
        sampleCount: complexity === 'high' ? 1000 : complexity === 'medium' ? 750 : 500,
        varianceLevel: complexity,
        timespan: complexity === 'high' ? '1h' : complexity === 'medium' ? '45m' : '30m',
        errorDistribution: this.getErrorDistribution(template.problemTypes)
      }
    };

    const profilePath = path.join(this.testWorkspacePath, 'profiles', `${profileId}.json`);
    await fs.writeFile(profilePath, JSON.stringify(profile, null, 2));
  }

  private getErrorDistribution(problemTypes: string[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const weight = 1.0 / problemTypes.length;
    
    problemTypes.forEach(type => {
      distribution[type] = weight;
    });
    
    return distribution;
  }

  private async createTestData(profileId: string, complexity: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const baseProblems = complexity === 'high' ? 80 : complexity === 'medium' ? 50 : 30;
    
    const testData: GeneratedTestData = {
      profileId: profileId,
      generatedAt: timestamp,
      generationDuration: 1000 + Math.random() * 3000,
      data: {
        logFiles: [],
        metricStreams: [],
        codeProblems: [],
        scenarios: [
          {
            scenarioId: 'main-scenario',
            name: 'Main Test Scenario',
            executedAt: timestamp,
            duration: 300000,
            statistics: {
              problemsInjected: Math.floor(baseProblems * (0.8 + Math.random() * 0.4)),
              metricsGenerated: Math.floor(300 + Math.random() * 400),
              logsGenerated: Math.floor(1500 + Math.random() * 1000),
              successRate: 0.7 + Math.random() * 0.2 // 70-90%
            }
          }
        ]
      },
      statistics: {
        totalLogEntries: Math.floor(3000 + Math.random() * 4000),
        totalMetricPoints: Math.floor(2000 + Math.random() * 2000),
        totalCodeProblems: Math.floor(baseProblems * (0.8 + Math.random() * 0.4)),
        dataSize: Math.floor(150000 + Math.random() * 100000)
      },
      metadata: {
        generatorVersion: '1.0.0-ci-inline',
        profile: await this.loadProfile(profileId)
      }
    };

    const dataPath = path.join(this.testWorkspacePath, 'output', `testdata-${profileId}-${Date.now()}-ci.json`);
    await fs.writeFile(dataPath, JSON.stringify(testData, null, 2));
    
    // Cache the data
    this.cachedData.set(profileId, testData);
  }

  private async loadProfile(profileId: string): Promise<any> {
    try {
      const profilePath = path.join(this.testWorkspacePath, 'profiles', `${profileId}.json`);
      const content = await fs.readFile(profilePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`Could not load profile ${profileId}:`, error);
      return null;
    }
  }

  async loadAllGeneratedData(maxDatasets?: number): Promise<GeneratedTestData[]> {
    // Ensure test data exists
    await this.ensureTestDataExists(maxDatasets || 3);
    
    const outputDir = path.join(this.testWorkspacePath, 'output');
    
    try {
      const files = await fs.readdir(outputDir);
      const testDataFiles = files.filter(f => f.startsWith('testdata-') && f.endsWith('.json'));
      
      const allData: GeneratedTestData[] = [];
      
      for (const file of testDataFiles) {
        try {
          const filePath = path.join(outputDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content) as GeneratedTestData;
          
          // Skip if this profile was already used (unless in CI where we might need duplicates)
          if (!this.isGitHubCI && this.usedProfiles.has(data.profileId)) {
            console.log(`⏭️ Skipping already used profile: ${data.profileId}`);
            continue;
          }
          
          // Mark profile as used
          this.usedProfiles.add(data.profileId);
          
          // Cache the data
          this.cachedData.set(data.profileId, data);
          allData.push(data);
          
          // Stop if we have enough data
          if (maxDatasets && allData.length >= maxDatasets) {
            break;
          }
          
        } catch (error) {
          console.error(`Failed to load test data file ${file}:`, error);
        }
      }
      
      console.log(`📊 Loaded ${allData.length} unique test datasets`);
      return allData;
      
    } catch (error) {
      console.error('Failed to load generated test data:', error);
      return [];
    }
  }

  async getTestDataSummary(): Promise<TestDataSummary> {
    const allData = Array.from(this.cachedData.values());
    
    if (allData.length === 0) {
      return {
        totalDatasets: 0,
        averageSuccessRate: 0,
        complexityDistribution: {},
        problemTypes: [],
        totalLogEntries: 0,
        totalMetricPoints: 0,
        totalCodeProblems: 0
      };
    }

    const complexityDistribution: Record<string, number> = {};
    const problemTypesSet = new Set<string>();
    let totalSuccessRate = 0;
    let totalLogEntries = 0;
    let totalMetricPoints = 0;
    let totalCodeProblems = 0;

    allData.forEach(data => {
      const complexity = data.metadata.profile?.sourceConfig?.complexity || 'unknown';
      complexityDistribution[complexity] = (complexityDistribution[complexity] || 0) + 1;
      
      // Extract problem types from profile
      if (data.metadata.profile?.scenarios) {
        data.metadata.profile.scenarios.forEach((scenario: any) => {
          if (scenario.problemTypes) {
            scenario.problemTypes.forEach((type: string) => problemTypesSet.add(type));
          }
        });
      }
      
      // Calculate averages
      if (data.data.scenarios && data.data.scenarios.length > 0) {
        totalSuccessRate += data.data.scenarios[0].statistics.successRate;
      }
      
      totalLogEntries += data.statistics.totalLogEntries;
      totalMetricPoints += data.statistics.totalMetricPoints;
      totalCodeProblems += data.statistics.totalCodeProblems;
    });

    return {
      totalDatasets: allData.length,
      averageSuccessRate: totalSuccessRate / allData.length,
      complexityDistribution,
      problemTypes: Array.from(problemTypesSet),
      totalLogEntries,
      totalMetricPoints,
      totalCodeProblems
    };
  }

  resetUsedProfiles(): void {
    console.log('🔄 Resetting used profiles tracker');
    this.usedProfiles.clear();
  }

  getUsedProfilesCount(): number {
    return this.usedProfiles.size;
  }
}

// Export singleton instance
export const githubAwareTestDataLoader = new GitHubAwareTestDataLoader();