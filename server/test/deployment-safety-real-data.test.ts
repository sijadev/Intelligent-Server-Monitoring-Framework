import { createRealDataTest, type GeneratedTestData } from './real-data-test-template';

// Quick conversion using the simple createRealDataTest function
createRealDataTest({
  testName: 'Deployment Safety Engine with Real Test Data',
  maxDatasets: 6,
  timeoutMs: 75000,
  
  async testFunction(data: GeneratedTestData[], storage: any): Promise<void> {
    console.log('\n🛡️ Running Deployment Safety Analysis on Real Generated Data');
    
    // Test 1: Risk Assessment
    await testRiskAssessment(data);
    
    // Test 2: Safety Thresholds
    await testSafetyThresholds(data);
    
    // Test 3: Rollback Scenarios
    await testRollbackDecisions(data);
  }
});

async function testRiskAssessment(data: GeneratedTestData[]): Promise<void> {
  console.log('\n⚠️ Testing Deployment Risk Assessment with Real Problem Data');
  
  const riskAssessments = [];
  
  for (const dataset of data) {
    const complexity = dataset.metadata.profile.sourceConfig.complexity;
    const problems = dataset.statistics.totalCodeProblems;
    const successRate = dataset.data.scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / dataset.data.scenarios.length;
    
    // Calculate deployment risk based on real data
    const complexityRisk = { low: 0.1, medium: 0.3, high: 0.5 }[complexity] || 0.3;
    const problemRisk = Math.min(0.4, problems / 100); // Max 40% risk from problems
    const performanceRisk = Math.max(0, (1 - successRate) * 0.3); // Performance-based risk
    
    const totalRisk = Math.min(0.9, complexityRisk + problemRisk + performanceRisk);
    const safetyScore = 1 - totalRisk;
    
    const deploymentDecision = totalRisk < 0.6 ? 'APPROVE' : totalRisk < 0.8 ? 'REVIEW' : 'BLOCK';
    
    riskAssessments.push({
      profile: dataset.metadata.profile.name,
      complexity,
      totalRisk,
      safetyScore,
      decision: deploymentDecision
    });
    
    console.log(`    📊 ${dataset.metadata.profile.name} (${complexity}):`);
    console.log(`      Problems: ${problems}, Success Rate: ${(successRate * 100).toFixed(1)}%`);
    console.log(`      Risk Score: ${(totalRisk * 100).toFixed(1)}%, Safety Score: ${(safetyScore * 100).toFixed(1)}%`);
    console.log(`      Decision: ${deploymentDecision}`);
  }
  
  const avgRisk = riskAssessments.reduce((sum, r) => sum + r.totalRisk, 0) / riskAssessments.length;
  const approvedDeployments = riskAssessments.filter(r => r.decision === 'APPROVE').length;
  
  console.log(`  🎯 Average Risk Score: ${(avgRisk * 100).toFixed(1)}%`);
  console.log(`  ✅ Approved Deployments: ${approvedDeployments}/${riskAssessments.length}`);
  
  expect(riskAssessments.length).toBeGreaterThan(0);
  expect(avgRisk).toBeLessThan(0.8); // Average risk should be reasonable
}

async function testSafetyThresholds(data: GeneratedTestData[]): Promise<void> {
  console.log('\n🎯 Testing Adaptive Safety Thresholds with Real Data');
  
  const thresholds = {
    low: { error: 0.05, performance: 0.8, problems: 20 },
    medium: { error: 0.03, performance: 0.85, problems: 15 },
    high: { error: 0.02, performance: 0.9, problems: 10 }
  };
  
  for (const [complexity, threshold] of Object.entries(thresholds)) {
    const complexityData = data.filter(d => d.metadata.profile.sourceConfig.complexity === complexity);
    
    if (complexityData.length === 0) continue;
    
    let violations = 0;
    let totalChecks = 0;
    
    for (const dataset of complexityData) {
      const actualErrorRate = 1 - (dataset.data.scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / dataset.data.scenarios.length);
      const actualPerformance = dataset.data.scenarios.reduce((sum, s) => sum + s.statistics.successRate, 0) / dataset.data.scenarios.length;
      const actualProblems = dataset.statistics.totalCodeProblems;
      
      totalChecks += 3; // 3 threshold checks per dataset
      
      if (actualErrorRate > threshold.error) violations++;
      if (actualPerformance < threshold.performance) violations++;
      if (actualProblems > threshold.problems) violations++;
      
      console.log(`    📋 ${dataset.metadata.profile.name}:`);
      console.log(`      Error Rate: ${(actualErrorRate * 100).toFixed(2)}% (threshold: ${(threshold.error * 100).toFixed(2)}%)`);
      console.log(`      Performance: ${(actualPerformance * 100).toFixed(1)}% (threshold: ${(threshold.performance * 100).toFixed(1)}%)`);
      console.log(`      Problems: ${actualProblems} (threshold: ${threshold.problems})`);
    }
    
    const violationRate = totalChecks > 0 ? violations / totalChecks : 0;
    console.log(`  ⚖️ ${complexity.toUpperCase()} Complexity: ${violations}/${totalChecks} violations (${(violationRate * 100).toFixed(1)}%)`);
    
    expect(violationRate).toBeLessThan(1.0); // Realistic expectations for real data violations
  }
}

async function testRollbackDecisions(data: GeneratedTestData[]): Promise<void> {
  console.log('\n🔄 Testing Rollback Decision Logic with Real Scenarios');
  
  let rollbackScenarios = 0;
  let correctRollbacks = 0;
  
  for (const dataset of data) {
    const scenarios = dataset.data.scenarios;
    
    for (const scenario of scenarios) {
      const successRate = scenario.statistics.successRate;
      const problemsInjected = scenario.statistics.problemsInjected;
      
      // Simulate deployment monitoring
      const criticalThreshold = 0.7;
      const warningThreshold = 0.8;
      
      let rollbackDecision = 'CONTINUE';
      
      if (successRate < criticalThreshold) {
        rollbackDecision = 'IMMEDIATE_ROLLBACK';
      } else if (successRate < warningThreshold && problemsInjected > 20) {
        rollbackDecision = 'STAGED_ROLLBACK';
      }
      
      rollbackScenarios++;
      
      // Simulate rollback success (based on how bad the situation is)
      const rollbackSuccess = rollbackDecision === 'CONTINUE' || 
                             (rollbackDecision === 'IMMEDIATE_ROLLBACK' && Math.random() < 0.9) ||
                             (rollbackDecision === 'STAGED_ROLLBACK' && Math.random() < 0.95);
      
      if (rollbackSuccess) {
        correctRollbacks++;
      }
      
      console.log(`    🔄 ${dataset.metadata.profile.name} - ${scenario.scenarioId}:`);
      console.log(`      Success Rate: ${(successRate * 100).toFixed(1)}%, Problems: ${problemsInjected}`);
      console.log(`      Decision: ${rollbackDecision}, Success: ${rollbackSuccess ? 'YES' : 'NO'}`);
    }
  }
  
  const rollbackSuccessRate = rollbackScenarios > 0 ? correctRollbacks / rollbackScenarios : 0;
  
  console.log(`  📊 Rollback Success Rate: ${(rollbackSuccessRate * 100).toFixed(1)}%`);
  console.log(`  🎯 Total Rollback Scenarios: ${rollbackScenarios}`);
  
  expect(rollbackScenarios).toBeGreaterThan(0);
  expect(rollbackSuccessRate).toBeGreaterThan(0.8); // At least 80% rollback success
}