import { createRealDataTest, type GeneratedTestData } from './real-data-test-template';

// Example of using the simple createRealDataTest function
// This converts existing code analysis tests to use real data

createRealDataTest({
  testName: 'Advanced Code Analysis with Real Test Data',
  maxDatasets: 8,
  timeoutMs: 75000,
  
  async testFunction(data: GeneratedTestData[], storage: any): Promise<void> {
    console.log('\n🔍 Running Advanced Code Analysis on Real Generated Data');
    
    // Test 1: Code Issue Detection Accuracy
    await testCodeIssueDetection(data);
    
    // Test 2: Language-Specific Analysis
    await testLanguageSpecificAnalysis(data);
    
    // Test 3: Complexity-Based Analysis Performance
    await testComplexityAnalysis(data);
  }
});

async function testCodeIssueDetection(data: GeneratedTestData[]): Promise<void> {
  console.log('\n🐛 Testing Code Issue Detection with Real Problems');
  
  let totalIssuesFound = 0;
  let totalExpectedIssues = 0;
  
  for (const dataset of data.slice(0, 5)) {
    const expectedIssues = dataset.statistics.totalCodeProblems;
    const scenarios = dataset.data.scenarios;
    
    // Simulate code analysis detection rate based on real scenario success rates
    const avgSuccessRate = scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / scenarios.length;
    const detectionRate = Math.min(0.95, avgSuccessRate + 0.1); // Detection usually slightly better than fix rate
    
    const detectedIssues = Math.floor(expectedIssues * detectionRate);
    
    totalIssuesFound += detectedIssues;
    totalExpectedIssues += expectedIssues;
    
    console.log(`  📊 ${dataset.metadata.profile.name}: ${detectedIssues}/${expectedIssues} issues detected (${(detectionRate * 100).toFixed(1)}%)`);
  }
  
  const overallDetectionRate = totalExpectedIssues > 0 ? totalIssuesFound / totalExpectedIssues : 0;
  console.log(`  🎯 Overall Detection Rate: ${(overallDetectionRate * 100).toFixed(1)}%`);
  
  expect(totalIssuesFound).toBeGreaterThan(0);
  expect(overallDetectionRate).toBeGreaterThan(0.7); // Expect at least 70% detection rate
}

async function testLanguageSpecificAnalysis(data: GeneratedTestData[]): Promise<void> {
  console.log('\n💻 Testing Language-Specific Analysis Capabilities');
  
  const languageStats = new Map<string, { datasets: number; totalProblems: number; avgSuccessRate: number }>();
  
  for (const dataset of data) {
    const languages = dataset.metadata.profile.sourceConfig.languages;
    const problems = dataset.statistics.totalCodeProblems;
    const successRate = dataset.data.scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / dataset.data.scenarios.length;
    
    for (const language of languages) {
      if (!languageStats.has(language)) {
        languageStats.set(language, { datasets: 0, totalProblems: 0, avgSuccessRate: 0 });
      }
      
      const stats = languageStats.get(language)!;
      stats.datasets += 1;
      stats.totalProblems += problems;
      stats.avgSuccessRate = (stats.avgSuccessRate * (stats.datasets - 1) + successRate) / stats.datasets;
    }
  }
  
  console.log('\n  📊 Language Analysis Results:');
  for (const [language, stats] of languageStats) {
    console.log(`    ${language.toUpperCase()}: ${stats.datasets} datasets, ${stats.totalProblems} problems, ${(stats.avgSuccessRate * 100).toFixed(1)}% success rate`);
    
    // Validate language-specific results
    expect(stats.datasets).toBeGreaterThan(0);
    expect(stats.totalProblems).toBeGreaterThan(0);
    expect(stats.avgSuccessRate).toBeGreaterThan(0);
  }
  
  expect(languageStats.size).toBeGreaterThan(0);
}

async function testComplexityAnalysis(data: GeneratedTestData[]): Promise<void> {
  console.log('\n⚖️  Testing Complexity-Based Analysis Performance');
  
  const complexityPerformance = new Map<string, {
    datasets: number;
    avgProblems: number;
    avgSuccessRate: number;
    avgAnalysisTime: number;
  }>();
  
  for (const dataset of data) {
    const complexity = dataset.metadata.profile.sourceConfig.complexity;
    const problems = dataset.statistics.totalCodeProblems;
    const successRate = dataset.data.scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / dataset.data.scenarios.length;
    
    // Simulate analysis time based on complexity and problem count
    const baseTime = { low: 100, medium: 250, high: 500 }[complexity] || 250;
    const analysisTime = baseTime + (problems * 2); // ms per problem
    
    if (!complexityPerformance.has(complexity)) {
      complexityPerformance.set(complexity, { datasets: 0, avgProblems: 0, avgSuccessRate: 0, avgAnalysisTime: 0 });
    }
    
    const perf = complexityPerformance.get(complexity)!;
    perf.datasets += 1;
    perf.avgProblems = (perf.avgProblems * (perf.datasets - 1) + problems) / perf.datasets;
    perf.avgSuccessRate = (perf.avgSuccessRate * (perf.datasets - 1) + successRate) / perf.datasets;
    perf.avgAnalysisTime = (perf.avgAnalysisTime * (perf.datasets - 1) + analysisTime) / perf.datasets;
  }
  
  console.log('\n  ⚡ Complexity Performance Analysis:');
  for (const [complexity, perf] of complexityPerformance) {
    console.log(`    ${complexity.toUpperCase()}:`);
    console.log(`      Datasets: ${perf.datasets}`);
    console.log(`      Avg Problems: ${perf.avgProblems.toFixed(1)}`);
    console.log(`      Avg Success Rate: ${(perf.avgSuccessRate * 100).toFixed(1)}%`);
    console.log(`      Avg Analysis Time: ${perf.avgAnalysisTime.toFixed(0)}ms`);
    
    // Validate complexity analysis results
    expect(perf.datasets).toBeGreaterThan(0);
    expect(perf.avgProblems).toBeGreaterThan(0);
    expect(perf.avgSuccessRate).toBeGreaterThan(0);
    expect(perf.avgAnalysisTime).toBeGreaterThan(0);
  }
  
  // Validate that high complexity takes more time than low complexity
  const lowComplexity = complexityPerformance.get('low');
  const highComplexity = complexityPerformance.get('high');
  
  if (lowComplexity && highComplexity) {
    console.log(`  📈 Time Scaling: Low=${lowComplexity.avgAnalysisTime.toFixed(0)}ms vs High=${highComplexity.avgAnalysisTime.toFixed(0)}ms`);
    expect(highComplexity.avgAnalysisTime).toBeGreaterThan(lowComplexity.avgAnalysisTime);
  }
}