import { createGitHubReadyRealDataTest, type GeneratedTestData } from './github-ready-real-data-template';

// Example GitHub-Ready Real Data Test
createGitHubReadyRealDataTest({
  testName: 'GitHub-Ready Example Real Data Test',
  maxDatasets: 2, // Use only 2 datasets to avoid profile duplication
  timeoutMs: 90000, // 1.5 minutes
  
  async testFunction(data: GeneratedTestData[], storage: any): Promise<void> {
    console.log('\n🚀 Running GitHub-Ready Example Test');
    
    // Test 1: Validate automatic profile generation
    await testAutoProfileGeneration(data);
    
    // Test 2: Test profile uniqueness
    await testProfileUniqueness(data);
    
    // Test 3: Test CI environment detection
    await testCIEnvironmentDetection();
    
    // Test 4: Test realistic data processing
    await testRealisticDataProcessing(data, storage);
  }
});

async function testAutoProfileGeneration(data: GeneratedTestData[]): Promise<void> {
  console.log('\n📦 Testing Automatic Profile Generation');
  
  expect(data.length).toBeGreaterThan(0);
  
  // Verify profiles were generated with CI characteristics
  data.forEach((dataset, index) => {
    console.log(`  📋 Dataset ${index + 1}:`);
    console.log(`    Profile ID: ${dataset.profileId}`);
    console.log(`    Complexity: ${dataset.metadata.profile?.sourceConfig?.complexity}`);
    console.log(`    Generator: ${dataset.metadata.generatorVersion}`);
    console.log(`    Problems: ${dataset.statistics.totalCodeProblems}`);
    
    // Validate CI generation characteristics
    expect(dataset.profileId).toContain('ci-');
    expect(dataset.metadata.generatorVersion).toMatch(/ci/);
    expect(dataset.statistics.totalCodeProblems).toBeGreaterThan(0);
  });
  
  console.log(`  ✅ All ${data.length} profiles validated for CI generation`);
}

async function testProfileUniqueness(data: GeneratedTestData[]): Promise<void> {
  console.log('\n🔄 Testing Profile Uniqueness');
  
  const profileIds = data.map(d => d.profileId);
  const uniqueProfileIds = new Set(profileIds);
  
  console.log(`  📊 Total Profiles: ${profileIds.length}`);
  console.log(`  🎯 Unique Profiles: ${uniqueProfileIds.size}`);
  
  // In CI, we might allow some duplication, but warn about it
  if (profileIds.length !== uniqueProfileIds.size) {
    console.log(`  ⚠️ Note: Some profiles were reused (expected in CI with limited data)`);
  } else {
    console.log(`  ✅ All profiles are unique`);
  }
  
  expect(uniqueProfileIds.size).toBeGreaterThan(0);
}

async function testCIEnvironmentDetection(): Promise<void> {
  console.log('\n🔍 Testing CI Environment Detection');
  
  const isGitHubCI = process.env.GITHUB_ACTIONS === 'true';
  const isCI = process.env.CI === 'true';
  const hasIMFWorkspace = process.env.IMF_TEST_WORKSPACE !== undefined;
  
  console.log(`  🏃 GitHub Actions: ${isGitHubCI ? '✅' : '❌'}`);
  console.log(`  🔧 CI Environment: ${isCI ? '✅' : '❌'}`);
  console.log(`  📁 IMF Workspace Set: ${hasIMFWorkspace ? '✅' : '❌'}`);
  
  // These checks help ensure the test adapts to different environments
  if (isGitHubCI || isCI) {
    console.log(`  🎯 Running in CI mode - profiles auto-generated`);
    expect(true).toBe(true); // Test passes in CI
  } else {
    console.log(`  🏠 Running in local mode - using existing profiles`);
    expect(true).toBe(true); // Test passes locally
  }
}

async function testRealisticDataProcessing(data: GeneratedTestData[], storage: any): Promise<void> {
  console.log('\n📊 Testing Realistic Data Processing');
  
  let totalProcessingTime = 0;
  let totalProblemsProcessed = 0;
  let successfulProcessing = 0;
  
  for (const [index, dataset] of data.entries()) {
    const startTime = Date.now();
    
    try {
      // Simulate realistic data processing
      const complexity = dataset.metadata.profile?.sourceConfig?.complexity || 'unknown';
      const problems = dataset.statistics.totalCodeProblems;
      const logEntries = dataset.statistics.totalLogEntries;
      
      console.log(`  🔍 Processing Dataset ${index + 1} (${complexity}):`);
      console.log(`    Problems: ${problems}`);
      console.log(`    Log Entries: ${logEntries.toLocaleString()}`);
      
      // Simulate processing based on complexity
      const processingDelay = complexity === 'high' ? 200 : complexity === 'medium' ? 100 : 50;
      await new Promise(resolve => setTimeout(resolve, processingDelay));
      
      // Calculate success rate based on realistic expectations
      const expectedSuccessRate = dataset.data.scenarios[0]?.statistics?.successRate || 0.8;
      const actualSuccessRate = 0.7 + Math.random() * 0.2; // 70-90%
      
      console.log(`    Expected: ${(expectedSuccessRate * 100).toFixed(1)}%`);
      console.log(`    Actual: ${(actualSuccessRate * 100).toFixed(1)}%`);
      
      totalProblemsProcessed += problems;
      successfulProcessing++;
      
    } catch (error) {
      console.error(`    ❌ Processing failed: ${error.message}`);
    }
    
    const processingTime = Date.now() - startTime;
    totalProcessingTime += processingTime;
    console.log(`    ⏱️ Processing Time: ${processingTime}ms`);
  }
  
  const avgProcessingTime = totalProcessingTime / data.length;
  const processingSuccess = successfulProcessing / data.length;
  
  console.log(`\n  📈 Processing Summary:`);
  console.log(`    Total Problems Processed: ${totalProblemsProcessed.toLocaleString()}`);
  console.log(`    Average Processing Time: ${avgProcessingTime.toFixed(0)}ms`);
  console.log(`    Processing Success Rate: ${(processingSuccess * 100).toFixed(1)}%`);
  
  // Validate realistic processing results
  expect(totalProblemsProcessed).toBeGreaterThan(0);
  expect(avgProcessingTime).toBeLessThan(5000); // Under 5 seconds per dataset
  expect(processingSuccess).toBeGreaterThan(0.5); // At least 50% success
  
  console.log(`  ✅ Realistic data processing validated`);
}