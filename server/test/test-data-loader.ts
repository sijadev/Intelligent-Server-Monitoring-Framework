import { promises as fs } from 'fs';
import path from 'path';

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
    outputPath: string;
    totalSamples: number;
  };
}

export interface TestProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  sourceConfig: {
    complexity: 'low' | 'medium' | 'high';
    directories: string[];
    languages: string[];
    excludePatterns: string[];
  };
  scenarios: Array<{
    id: string;
    name: string;
    type: string;
    duration: number;
    problemTypes: string[];
    codeInjection: {
      errorTypes: string[];
      frequency: number;
      complexity: string;
    };
  }>;
  expectations: {
    detectionRate: number;
    fixSuccessRate: number;
    falsePositiveRate: number;
    mlAccuracy: number;
  };
  generationRules: {
    sampleCount: number;
    varianceLevel: string;
    timespan: string;
    errorDistribution: Record<string, number>;
  };
}

export class TestDataLoader {
  private testWorkspacePath: string;
  private cachedData: Map<string, GeneratedTestData> = new Map();

  constructor(testWorkspacePath: string = '/Users/simonjanke/Projects/IMF/test-workspace') {
    this.testWorkspacePath = testWorkspacePath;
  }

  async loadAllGeneratedData(): Promise<GeneratedTestData[]> {
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
          
          // Cache the data
          this.cachedData.set(file, data);
          allData.push(data);
        } catch (error) {
          console.warn(`Failed to load test data file ${file}:`, error);
        }
      }
      
      return allData.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    } catch (error) {
      console.error('Failed to load generated test data:', error);
      return [];
    }
  }

  async loadLatestDataForProfile(profileId: string): Promise<GeneratedTestData | null> {
    const allData = await this.loadAllGeneratedData();
    const profileData = allData.filter(d => d.profileId === profileId);
    
    return profileData.length > 0 ? profileData[0] : null;
  }

  async loadDataByComplexity(complexity: 'low' | 'medium' | 'high'): Promise<GeneratedTestData[]> {
    const allData = await this.loadAllGeneratedData();
    return allData.filter(d => d.metadata.profile.sourceConfig.complexity === complexity);
  }

  async getTestDataSummary(): Promise<{
    totalDatasets: number;
    totalLogEntries: number;
    totalMetricPoints: number;
    totalCodeProblems: number;
    averageSuccessRate: number;
    complexityDistribution: Record<string, number>;
    profileStats: Array<{
      profileId: string;
      name: string;
      complexity: string;
      datasetsCount: number;
      avgSuccessRate: number;
      totalProblems: number;
    }>;
  }> {
    const allData = await this.loadAllGeneratedData();
    
    const summary = {
      totalDatasets: allData.length,
      totalLogEntries: allData.reduce((sum, d) => sum + d.statistics.totalLogEntries, 0),
      totalMetricPoints: allData.reduce((sum, d) => sum + d.statistics.totalMetricPoints, 0),
      totalCodeProblems: allData.reduce((sum, d) => sum + d.statistics.totalCodeProblems, 0),
      averageSuccessRate: 0,
      complexityDistribution: {} as Record<string, number>,
      profileStats: [] as any[]
    };

    // Calculate average success rate
    const totalScenarios = allData.reduce((sum, d) => sum + d.data.scenarios.length, 0);
    const totalSuccessRate = allData.reduce((sum, d) => 
      sum + d.data.scenarios.reduce((scenarioSum, s) => scenarioSum + s.statistics.successRate, 0), 0
    );
    summary.averageSuccessRate = totalScenarios > 0 ? totalSuccessRate / totalScenarios : 0;

    // Calculate complexity distribution
    allData.forEach(d => {
      const complexity = d.metadata.profile.sourceConfig.complexity;
      summary.complexityDistribution[complexity] = (summary.complexityDistribution[complexity] || 0) + 1;
    });

    // Calculate profile stats
    const profileGroups = new Map<string, GeneratedTestData[]>();
    allData.forEach(d => {
      const profileId = d.profileId;
      if (!profileGroups.has(profileId)) {
        profileGroups.set(profileId, []);
      }
      profileGroups.get(profileId)!.push(d);
    });

    for (const [profileId, datasets] of profileGroups) {
      const firstDataset = datasets[0];
      const avgSuccessRate = datasets.reduce((sum, d) => 
        sum + d.data.scenarios.reduce((scenarioSum, s) => scenarioSum + s.statistics.successRate, 0) / d.data.scenarios.length, 0
      ) / datasets.length;
      
      summary.profileStats.push({
        profileId,
        name: firstDataset.metadata.profile.name,
        complexity: firstDataset.metadata.profile.sourceConfig.complexity,
        datasetsCount: datasets.length,
        avgSuccessRate,
        totalProblems: datasets.reduce((sum, d) => sum + d.statistics.totalCodeProblems, 0)
      });
    }

    return summary;
  }

  // Generate synthetic AI intervention data based on the test data
  generateMockInterventions(data: GeneratedTestData): Array<{
    problemType: string;
    confidence: number;
    riskScore: number;
    action: string;
    success: boolean;
    timestamp: Date;
  }> {
    const interventions: any[] = [];
    const problemTypes = data.metadata.profile.scenarios[0]?.problemTypes || ['null_pointer', 'memory_leak', 'api_timeout'];
    
    // Generate interventions based on code problems
    for (let i = 0; i < Math.min(data.statistics.totalCodeProblems, 20); i++) {
      const problemType = problemTypes[i % problemTypes.length];
      const baseConfidence = data.metadata.profile.expectations.mlAccuracy / 100;
      const variance = (Math.random() - 0.5) * 0.3; // ±15% variance
      const confidence = Math.max(0, Math.min(1, baseConfidence + variance));
      
      const riskScore = Math.random() * 0.5; // 0-50% risk
      const success = confidence > 0.7 && riskScore < 0.3;
      
      interventions.push({
        problemType,
        confidence,
        riskScore,
        action: success ? 'auto_fix' : 'manual_review',
        success,
        timestamp: new Date(new Date(data.generatedAt).getTime() + i * 1000)
      });
    }
    
    return interventions;
  }

  // Generate realistic metrics based on test data
  generateRealisticMetrics(data: GeneratedTestData): Array<{
    timestamp: Date;
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    errorRate: number;
  }> {
    const metrics: any[] = [];
    const scenario = data.data.scenarios[0];
    
    if (!scenario) return metrics;
    
    const baseTime = new Date(scenario.executedAt).getTime();
    const duration = scenario.duration;
    const points = Math.min(data.statistics.totalMetricPoints, 100); // Limit for test performance
    
    for (let i = 0; i < points; i++) {
      const timestamp = new Date(baseTime + (i * duration / points));
      const successRate = scenario.statistics.successRate;
      
      // Generate realistic metrics based on success rate and complexity
      const complexity = data.metadata.profile.sourceConfig.complexity;
      const complexityMultiplier = { low: 1, medium: 1.5, high: 2 }[complexity] || 1;
      
      metrics.push({
        timestamp,
        cpuUsage: Math.random() * 50 * complexityMultiplier + (1 - successRate) * 30,
        memoryUsage: Math.random() * 40 * complexityMultiplier + (1 - successRate) * 25,
        diskUsage: Math.random() * 20 + 60,
        networkLatency: Math.random() * 100 * complexityMultiplier + (1 - successRate) * 50,
        errorRate: (1 - successRate) * 0.1 + Math.random() * 0.05
      });
    }
    
    return metrics;
  }
}

// Export singleton instance for easy use in tests
export const testDataLoader = new TestDataLoader();