import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { MemStorage } from '../storage';
import type { InsertAiIntervention, AiIntervention, InsertAiModel, AiModel } from '@shared/schema';

// Mock AI Learning Engine based on the Python implementation
class MockAILearningEngine {
  private config: any;
  private modelDir: string;
  private interventions: AiIntervention[];
  private models: Map<string, AiModel>;
  private patternSuccessRates: Map<string, number>;
  private patternConfidenceScores: Map<string, number[]>;
  
  // Learning parameters
  private minConfidence: number;
  private maxRiskScore: number;
  private minSuccessProbability: number;
  private learningRate: number;
  private retrainFrequency: number;
  
  constructor(config: any = {}) {
    this.config = config.ai_learning || {};
    this.modelDir = this.config.model_dir || './test_ai_models';
    
    // Learning parameters
    this.minConfidence = this.config.min_confidence || 0.75;
    this.maxRiskScore = this.config.max_risk_score || 0.3;
    this.minSuccessProbability = this.config.min_success_probability || 0.8;
    this.learningRate = this.config.learning_rate || 0.1;
    this.retrainFrequency = this.config.retrain_frequency || 50;
    
    // Storage
    this.interventions = [];
    this.models = new Map();
    this.patternSuccessRates = new Map();
    this.patternConfidenceScores = new Map();
  }
  
  async recordIntervention(intervention: InsertAiIntervention): Promise<void> {
    const fullIntervention: AiIntervention = {
      id: `intervention_${Date.now()}_${Math.random()}`,
      ...intervention,
      timestamp: intervention.timestamp || new Date()
    };
    
    this.interventions.push(fullIntervention);
    await this.updateLearningPatterns();
    
    // Check if we need to retrain (only if we have enough data for this problem type)
    if (this.interventions.length % this.retrainFrequency === 0) {
      await this.retrainModels();
    }
  }
  
  private async updateLearningPatterns(): Promise<void> {
    const patternOutcomes = new Map<string, number[]>();
    const patternConfidences = new Map<string, number[]>();
    
    for (const intervention of this.interventions) {
      const key = intervention.problemType;
      
      // Track outcomes (success = 1, failure = 0, partial = 0.5)
      const outcomeValue = intervention.outcome === 'success' ? 1.0 :
                          intervention.outcome === 'partial' ? 0.5 : 0.0;
      
      if (!patternOutcomes.has(key)) {
        patternOutcomes.set(key, []);
        patternConfidences.set(key, []);
      }
      
      patternOutcomes.get(key)!.push(outcomeValue);
      patternConfidences.get(key)!.push(intervention.confidence);
    }
    
    // Calculate success rates
    for (const [pattern, outcomes] of patternOutcomes) {
      const successRate = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
      this.patternSuccessRates.set(pattern, successRate);
      this.patternConfidenceScores.set(pattern, patternConfidences.get(pattern) || []);
    }
  }
  
  async predictInterventionSuccess(problemType: string, confidence: number, riskScore: number): Promise<number> {
    try {
      // Clamp inputs to valid ranges
      confidence = Math.max(0.0, Math.min(1.0, confidence));
      riskScore = Math.max(0.0, Math.min(1.0, riskScore));
      
      // Use learned patterns
      if (this.patternSuccessRates.has(problemType)) {
        const baseSuccessRate = this.patternSuccessRates.get(problemType)!;
        
        // Adjust based on confidence and risk
        const confidenceFactor = (confidence - 0.5) * 2; // Scale to -1 to 1
        const riskFactor = (0.5 - riskScore) * 2; // Scale to -1 to 1
        
        // Combined adjustment
        const adjustment = (confidenceFactor + riskFactor) * 0.2; // Max 20% adjustment
        const predictedSuccess = Math.max(0.0, Math.min(1.0, baseSuccessRate + adjustment));
        
        return predictedSuccess;
      }
      
      // Fallback: conservative estimate based on confidence and risk
      return Math.max(0.0, confidence - riskScore);
      
    } catch (error) {
      console.error('Error predicting intervention success:', error);
      return 0.5; // Neutral fallback
    }
  }
  
  async shouldAutoApplyFix(problemType: string, confidence: number, riskScore: number): Promise<boolean> {
    try {
      // Check basic thresholds
      if (confidence < this.minConfidence || riskScore > this.maxRiskScore) {
        return false;
      }
      
      // Check predicted success
      const predictedSuccess = await this.predictInterventionSuccess(problemType, confidence, riskScore);
      if (predictedSuccess < this.minSuccessProbability) {
        return false;
      }
      
      // Check deployment limits
      const recentDeployments = await this.countRecentDeployments();
      const maxPerHour = this.config.max_deployments_per_hour || 2;
      
      if (recentDeployments >= maxPerHour) {
        return false;
      }
      
      // Check if approval is required
      if (this.config.require_approval !== false) {
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error determining auto-apply decision:', error);
      return false;
    }
  }
  
  private async countRecentDeployments(): Promise<number> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentInterventions = this.interventions.filter(
      i => i.timestamp > oneHourAgo && i.deploymentId
    );
    return recentInterventions.length;
  }
  
  async retrainModels(): Promise<void> {
    try {
      // Group interventions by problem type
      const trainingData = new Map<string, AiIntervention[]>();
      
      for (const intervention of this.interventions) {
        const problemType = intervention.problemType;
        if (!trainingData.has(problemType)) {
          trainingData.set(problemType, []);
        }
        trainingData.get(problemType)!.push(intervention);
      }
      
      // Create/update models for each problem type (lowered threshold for testing)
      for (const [problemType, interventions] of trainingData) {
        if (interventions.length >= 3) { // Lower minimum for testing
          const model = await this.trainProblemTypeModel(problemType, interventions);
          if (model) {
            this.models.set(`${problemType}_v${Date.now()}`, model);
          }
        }
      }
      
    } catch (error) {
      console.error('Error retraining models:', error);
    }
  }
  
  private async trainProblemTypeModel(problemType: string, interventions: AiIntervention[]): Promise<AiModel | null> {
    try {
      // Simple learning: calculate average success rates and confidence patterns
      const successfulInterventions = interventions.filter(i => i.outcome === 'success');
      const successRate = successfulInterventions.length / interventions.length;
      
      // Calculate confidence patterns
      const confidenceScores = successfulInterventions.map(i => i.confidence);
      const avgConfidence = confidenceScores.length > 0 ? 
        confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0.5;
      
      const model: AiModel = {
        id: `model_${Date.now()}_${Math.random()}`,
        name: `${problemType}_model`,
        version: `v${Date.now()}`,
        problemType,
        modelPath: `${this.modelDir}/${problemType}_model.json`,
        accuracy: Math.round(successRate * 100),
        trainingDataSize: interventions.length,
        lastTrained: new Date(),
        isActive: true,
        metadata: {
          success_rate: successRate,
          avg_confidence: avgConfidence,
          pattern_features: this.extractPatternFeatures(interventions)
        }
      };
      
      return model;
      
    } catch (error) {
      console.error(`Error training model for ${problemType}:`, error);
      return null;
    }
  }
  
  private extractPatternFeatures(interventions: AiIntervention[]): any {
    const features = {
      common_solutions: new Map<string, number>(),
      risk_patterns: [] as number[],
      confidence_patterns: [] as number[],
      timing_patterns: [] as number[]
    };
    
    for (const intervention of interventions) {
      // Count common solutions
      const solution = intervention.solutionApplied;
      features.common_solutions.set(solution, (features.common_solutions.get(solution) || 0) + 1);
      
      features.risk_patterns.push(intervention.riskScore);
      features.confidence_patterns.push(intervention.confidence);
      features.timing_patterns.push(intervention.timestamp.getHours());
    }
    
    // Convert to frequencies
    const total = interventions.length;
    const solutionFrequencies: Record<string, number> = {};
    for (const [solution, count] of features.common_solutions) {
      solutionFrequencies[solution] = count / total;
    }
    
    return {
      common_solutions: solutionFrequencies,
      risk_patterns: features.risk_patterns,
      confidence_patterns: features.confidence_patterns,
      timing_patterns: features.timing_patterns
    };
  }
  
  getLearningStats(): any {
    const totalInterventions = this.interventions.length;
    const avgConfidence = totalInterventions > 0 ? 
      this.interventions.reduce((sum, i) => sum + i.confidence, 0) / totalInterventions : 0;
    
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDeployments = this.interventions.filter(i => i.timestamp > sevenDaysAgo);
    
    return {
      total_interventions: totalInterventions,
      problem_types_learned: this.patternSuccessRates.size,
      success_rates: Object.fromEntries(this.patternSuccessRates),
      models_trained: this.models.size,
      average_confidence: avgConfidence,
      recent_deployments: recentDeployments.length
    };
  }
  
  // Helper methods for testing
  getInterventions(): AiIntervention[] {
    return [...this.interventions];
  }
  
  getModels(): Map<string, AiModel> {
    return new Map(this.models);
  }
  
  getPatternSuccessRates(): Map<string, number> {
    return new Map(this.patternSuccessRates);
  }
  
  // Simulate learning from specific outcomes
  async simulateLearningScenario(problemType: string, scenarios: Array<{
    solution: string;
    confidence: number;
    riskScore: number;
    outcome: 'success' | 'failure' | 'partial';
  }>): Promise<void> {
    for (const scenario of scenarios) {
      const intervention: InsertAiIntervention = {
        problemType,
        issueDescription: `Test issue for ${problemType}`,
        solutionApplied: scenario.solution,
        confidence: scenario.confidence,
        riskScore: scenario.riskScore,
        outcome: scenario.outcome,
        timestamp: new Date(),
        metadata: { test: true }
      };
      
      await this.recordIntervention(intervention);
    }
  }
}

describe('AI Learning Engine Tests', () => {
  let aiEngine: MockAILearningEngine;
  let storage: MemStorage;
  let tempDir: string;
  
  beforeEach(async () => {
    tempDir = '/tmp/ai-learning-test';
    
    const config = {
      ai_learning: {
        model_dir: tempDir,
        min_confidence: 0.75,
        max_risk_score: 0.3,
        min_success_probability: 0.8,
        learning_rate: 0.1,
        retrain_frequency: 5, // Lower for testing
        max_deployments_per_hour: 3,
        require_approval: false
      }
    };
    
    aiEngine = new MockAILearningEngine(config);
    storage = new MemStorage();
    
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Cleanup temp files
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });
  
  describe('Pattern Recognition & Learning', () => {
    it('should learn successful fix patterns and increase confidence', async () => {
      // Simulate multiple successful fixes for HIGH_CPU_USAGE
      await aiEngine.simulateLearningScenario('HIGH_CPU_USAGE', [
        { solution: 'restart_service', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'restart_service', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'restart_service', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'kill_process', confidence: 0.7, riskScore: 0.4, outcome: 'failure' },
        { solution: 'kill_process', confidence: 0.75, riskScore: 0.35, outcome: 'failure' }
      ]);
      
      // Check that the engine learned the successful pattern
      const successRates = aiEngine.getPatternSuccessRates();
      expect(successRates.has('HIGH_CPU_USAGE')).toBe(true);
      
      const successRate = successRates.get('HIGH_CPU_USAGE')!;
      expect(successRate).toBeGreaterThan(0.5); // Should be 3/5 = 0.6
      expect(successRate).toBeCloseTo(0.6, 1);
    });
    
    it('should predict higher success for patterns with good historical performance', async () => {
      // Create a pattern with high success rate
      await aiEngine.simulateLearningScenario('MEMORY_LEAK', [
        { solution: 'garbage_collect', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'garbage_collect', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'garbage_collect', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'garbage_collect', confidence: 0.9, riskScore: 0.1, outcome: 'success' }
      ]);
      
      // Test prediction for similar scenario
      const prediction = await aiEngine.predictInterventionSuccess('MEMORY_LEAK', 0.85, 0.15);
      
      expect(prediction).toBeGreaterThan(0.8); // Should be high due to good historical performance
      expect(prediction).toBeLessThanOrEqual(1.0);
    });
    
    it('should predict lower success for patterns with poor historical performance', async () => {
      // Create a pattern with low success rate
      await aiEngine.simulateLearningScenario('DISK_FULL', [
        { solution: 'delete_temp_files', confidence: 0.7, riskScore: 0.3, outcome: 'failure' },
        { solution: 'delete_temp_files', confidence: 0.75, riskScore: 0.25, outcome: 'failure' },
        { solution: 'delete_temp_files', confidence: 0.8, riskScore: 0.2, outcome: 'partial' },
        { solution: 'delete_temp_files', confidence: 0.85, riskScore: 0.15, outcome: 'failure' }
      ]);
      
      // Test prediction for similar scenario
      const prediction = await aiEngine.predictInterventionSuccess('DISK_FULL', 0.8, 0.2);
      
      expect(prediction).toBeLessThan(0.6); // Should be low due to poor historical performance
      expect(prediction).toBeGreaterThanOrEqual(0.0);
    });
    
    it('should provide conservative estimates for unknown problem types', async () => {
      // Test prediction for unknown problem type
      const prediction = await aiEngine.predictInterventionSuccess('UNKNOWN_PROBLEM', 0.8, 0.2);
      
      // Should fall back to confidence - risk_score
      expect(prediction).toBeCloseTo(0.6, 1); // 0.8 - 0.2 = 0.6
    });
  });
  
  describe('Confidence Score Calculation', () => {
    it('should adjust confidence based on historical data', async () => {
      // Create interventions with varying confidence and outcomes
      await aiEngine.simulateLearningScenario('SERVICE_DOWN', [
        { solution: 'restart_service', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'restart_service', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'restart_service', confidence: 0.7, riskScore: 0.3, outcome: 'failure' },
        { solution: 'restart_service', confidence: 0.75, riskScore: 0.25, outcome: 'failure' }
      ]);
      
      // High confidence, low risk should predict better success
      const highConfidencePrediction = await aiEngine.predictInterventionSuccess('SERVICE_DOWN', 0.9, 0.1);
      
      // Low confidence, high risk should predict lower success  
      const lowConfidencePrediction = await aiEngine.predictInterventionSuccess('SERVICE_DOWN', 0.7, 0.3);
      
      expect(highConfidencePrediction).toBeGreaterThan(lowConfidencePrediction);
    });
    
    it('should factor in risk score when calculating confidence', async () => {
      // Test with unknown problem type to ensure we get fallback behavior
      // This should use confidence - risk_score calculation
      
      const highConfidenceLowRisk = await aiEngine.predictInterventionSuccess('RISK_TEST', 0.9, 0.1);
      const lowConfidenceHighRisk = await aiEngine.predictInterventionSuccess('RISK_TEST', 0.6, 0.4);
      
      // High confidence low risk: 0.9 - 0.1 = 0.8
      // Low confidence high risk: 0.6 - 0.4 = 0.2
      expect(highConfidenceLowRisk).toBeCloseTo(0.8, 1);
      expect(lowConfidenceHighRisk).toBeCloseTo(0.2, 1);
      expect(highConfidenceLowRisk).toBeGreaterThan(lowConfidenceHighRisk);
      
      // Test edge case where risk > confidence should give 0
      const riskExceedsConfidence = await aiEngine.predictInterventionSuccess('RISK_TEST', 0.3, 0.7);
      expect(riskExceedsConfidence).toBe(0.0);
    });
  });
  
  describe('Model Training & Updates', () => {
    it('should trigger retraining after sufficient interventions', async () => {
      const initialModelCount = aiEngine.getModels().size;
      
      // Add enough interventions to trigger retraining (retrain_frequency = 5)
      await aiEngine.simulateLearningScenario('AUTO_RETRAIN_TEST', [
        { solution: 'fix_1', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'fix_1', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'fix_1', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'fix_1', confidence: 0.75, riskScore: 0.25, outcome: 'success' },
        { solution: 'fix_1', confidence: 0.8, riskScore: 0.2, outcome: 'success' }
      ]);
      
      // Should have triggered retraining and created new models
      const finalModelCount = aiEngine.getModels().size;
      expect(finalModelCount).toBeGreaterThan(initialModelCount);
    });
    
    it('should create models with appropriate accuracy based on training data', async () => {
      // Create training data with known success rate
      await aiEngine.simulateLearningScenario('MODEL_ACCURACY_TEST', [
        { solution: 'solution_a', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'solution_a', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'solution_a', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'solution_a', confidence: 0.75, riskScore: 0.25, outcome: 'success' },
        { solution: 'solution_a', confidence: 0.7, riskScore: 0.3, outcome: 'failure' }
      ]);
      
      // Force retraining
      await aiEngine.retrainModels();
      
      const models = aiEngine.getModels();
      const modelArray = Array.from(models.values());
      const testModel = modelArray.find(m => m.problemType === 'MODEL_ACCURACY_TEST');
      
      expect(testModel).toBeDefined();
      expect(testModel!.accuracy).toBe(80); // 4/5 = 0.8 = 80%
      expect(testModel!.trainingDataSize).toBe(5);
    });
    
    it('should update pattern success rates as new data arrives', async () => {
      // Start with some successful interventions
      await aiEngine.simulateLearningScenario('PATTERN_UPDATE_TEST', [
        { solution: 'good_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'good_fix', confidence: 0.85, riskScore: 0.15, outcome: 'success' }
      ]);
      
      let successRates = aiEngine.getPatternSuccessRates();
      let initialRate = successRates.get('PATTERN_UPDATE_TEST')!;
      expect(initialRate).toBe(1.0); // 100% success initially
      
      // Add some failures
      await aiEngine.simulateLearningScenario('PATTERN_UPDATE_TEST', [
        { solution: 'good_fix', confidence: 0.7, riskScore: 0.3, outcome: 'failure' },
        { solution: 'good_fix', confidence: 0.75, riskScore: 0.25, outcome: 'failure' }
      ]);
      
      successRates = aiEngine.getPatternSuccessRates();
      let updatedRate = successRates.get('PATTERN_UPDATE_TEST')!;
      expect(updatedRate).toBe(0.5); // Now 50% success (2 success, 2 failure)
    });
  });
  
  describe('Auto-Apply Decision Logic', () => {
    it('should approve fixes with high confidence and low risk', async () => {
      // Create a successful pattern
      await aiEngine.simulateLearningScenario('HIGH_CONFIDENCE_TEST', [
        { solution: 'safe_fix', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'safe_fix', confidence: 0.95, riskScore: 0.05, outcome: 'success' },
        { solution: 'safe_fix', confidence: 0.85, riskScore: 0.15, outcome: 'success' }
      ]);
      
      const shouldApply = await aiEngine.shouldAutoApplyFix('HIGH_CONFIDENCE_TEST', 0.9, 0.1);
      expect(shouldApply).toBe(true);
    });
    
    it('should reject fixes with low confidence', async () => {
      const shouldApply = await aiEngine.shouldAutoApplyFix('LOW_CONFIDENCE_TEST', 0.6, 0.2);
      expect(shouldApply).toBe(false); // Below min_confidence threshold (0.75)
    });
    
    it('should reject fixes with high risk', async () => {
      const shouldApply = await aiEngine.shouldAutoApplyFix('HIGH_RISK_TEST', 0.9, 0.5);
      expect(shouldApply).toBe(false); // Above max_risk_score threshold (0.3)
    });
    
    it('should respect deployment rate limits', async () => {
      // Create recent deployments to hit the limit
      const recentTime = new Date();
      for (let i = 0; i < 3; i++) {
        const intervention: InsertAiIntervention = {
          problemType: 'RATE_LIMIT_TEST',
          issueDescription: 'Test deployment',
          solutionApplied: 'test_fix',
          confidence: 0.9,
          riskScore: 0.1,
          outcome: 'success',
          timestamp: recentTime,
          deploymentId: `deploy_${i}`,
          metadata: {}
        };
        await aiEngine.recordIntervention(intervention);
      }
      
      // Should reject due to rate limit (max 3 per hour, we have 3)
      const shouldApply = await aiEngine.shouldAutoApplyFix('RATE_LIMIT_TEST', 0.9, 0.1);
      expect(shouldApply).toBe(false);
    });
    
    it('should consider predicted success probability', async () => {
      // Create a pattern with low success rate
      await aiEngine.simulateLearningScenario('LOW_SUCCESS_TEST', [
        { solution: 'unreliable_fix', confidence: 0.8, riskScore: 0.2, outcome: 'failure' },
        { solution: 'unreliable_fix', confidence: 0.85, riskScore: 0.15, outcome: 'failure' },
        { solution: 'unreliable_fix', confidence: 0.9, riskScore: 0.1, outcome: 'failure' },
        { solution: 'unreliable_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' }
      ]);
      
      // Should reject due to low predicted success (25% < 80% threshold)
      const shouldApply = await aiEngine.shouldAutoApplyFix('LOW_SUCCESS_TEST', 0.85, 0.15);
      expect(shouldApply).toBe(false);
    });
  });
  
  describe('Learning from Fix Outcomes', () => {
    it('should improve success prediction after successful fixes', async () => {
      const problemType = 'LEARNING_IMPROVEMENT_TEST';
      
      // Initial prediction with no history
      const initialPrediction = await aiEngine.predictInterventionSuccess(problemType, 0.8, 0.2);
      
      // Add successful interventions
      await aiEngine.simulateLearningScenario(problemType, [
        { solution: 'effective_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'effective_fix', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'effective_fix', confidence: 0.9, riskScore: 0.1, outcome: 'success' }
      ]);
      
      // Prediction should improve
      const improvedPrediction = await aiEngine.predictInterventionSuccess(problemType, 0.8, 0.2);
      expect(improvedPrediction).toBeGreaterThan(initialPrediction);
    });
    
    it('should reduce confidence after failed fixes', async () => {
      const problemType = 'LEARNING_REDUCTION_TEST';
      
      // Add some successful interventions first
      await aiEngine.simulateLearningScenario(problemType, [
        { solution: 'initially_good_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'initially_good_fix', confidence: 0.85, riskScore: 0.15, outcome: 'success' }
      ]);
      
      const initialPrediction = await aiEngine.predictInterventionSuccess(problemType, 0.8, 0.2);
      
      // Add failed interventions
      await aiEngine.simulateLearningScenario(problemType, [
        { solution: 'initially_good_fix', confidence: 0.8, riskScore: 0.2, outcome: 'failure' },
        { solution: 'initially_good_fix', confidence: 0.85, riskScore: 0.15, outcome: 'failure' },
        { solution: 'initially_good_fix', confidence: 0.9, riskScore: 0.1, outcome: 'failure' }
      ]);
      
      // Prediction should decrease
      const reducedPrediction = await aiEngine.predictInterventionSuccess(problemType, 0.8, 0.2);
      expect(reducedPrediction).toBeLessThan(initialPrediction);
    });
    
    it('should handle partial outcomes appropriately', async () => {
      await aiEngine.simulateLearningScenario('PARTIAL_OUTCOME_TEST', [
        { solution: 'partial_fix', confidence: 0.8, riskScore: 0.2, outcome: 'partial' },
        { solution: 'partial_fix', confidence: 0.8, riskScore: 0.2, outcome: 'partial' },
        { solution: 'partial_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'partial_fix', confidence: 0.8, riskScore: 0.2, outcome: 'failure' }
      ]);
      
      const successRates = aiEngine.getPatternSuccessRates();
      const partialRate = successRates.get('PARTIAL_OUTCOME_TEST')!;
      
      // Should be (0.5 + 0.5 + 1.0 + 0.0) / 4 = 0.5
      expect(partialRate).toBeCloseTo(0.5, 1);
    });
  });
  
  describe('Learning Statistics & Insights', () => {
    it('should provide comprehensive learning statistics', async () => {
      // Add diverse intervention data
      await aiEngine.simulateLearningScenario('STATS_TEST_1', [
        { solution: 'fix_a', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'fix_b', confidence: 0.85, riskScore: 0.15, outcome: 'success' }
      ]);
      
      await aiEngine.simulateLearningScenario('STATS_TEST_2', [
        { solution: 'fix_c', confidence: 0.7, riskScore: 0.3, outcome: 'failure' },
        { solution: 'fix_d', confidence: 0.9, riskScore: 0.1, outcome: 'success' }
      ]);
      
      const stats = aiEngine.getLearningStats();
      
      expect(stats.total_interventions).toBe(4);
      expect(stats.problem_types_learned).toBe(2);
      expect(stats.success_rates).toBeDefined();
      expect(stats.success_rates['STATS_TEST_1']).toBe(1.0); // 100% success
      expect(stats.success_rates['STATS_TEST_2']).toBe(0.5); // 50% success
      expect(stats.average_confidence).toBeCloseTo(0.8125, 2); // (0.8+0.85+0.7+0.9)/4
    });
    
    it('should track model training progress', async () => {
      const initialStats = aiEngine.getLearningStats();
      expect(initialStats.models_trained).toBe(0);
      
      // Add enough data to trigger model training
      await aiEngine.simulateLearningScenario('MODEL_TRAINING_STATS', [
        { solution: 'training_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'training_fix', confidence: 0.85, riskScore: 0.15, outcome: 'success' },
        { solution: 'training_fix', confidence: 0.9, riskScore: 0.1, outcome: 'success' },
        { solution: 'training_fix', confidence: 0.75, riskScore: 0.25, outcome: 'success' },
        { solution: 'training_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' }
      ]);
      
      const finalStats = aiEngine.getLearningStats();
      expect(finalStats.models_trained).toBeGreaterThan(initialStats.models_trained);
    });
  });
  
  describe('Integration with Storage', () => {
    it('should store and retrieve AI interventions', async () => {
      const intervention: InsertAiIntervention = {
        problemType: 'STORAGE_TEST',
        issueDescription: 'Test integration with storage',
        solutionApplied: 'test_solution',
        confidence: 85,
        riskScore: 20,
        outcome: 'success',
        timestamp: new Date(),
        metadata: { test: true }
      };
      
      await storage.createAiIntervention(intervention);
      const interventions = await storage.getAiInterventions(10);
      
      expect(interventions.length).toBe(1);
      expect(interventions[0].problemType).toBe('STORAGE_TEST');
      expect(interventions[0].outcome).toBe('success');
    });
    
    it('should store and retrieve AI models', async () => {
      const model: InsertAiModel = {
        name: 'test_model',
        version: 'v1.0',
        problemType: 'TEST_PROBLEM',
        modelPath: '/tmp/test_model.json',
        accuracy: 85,
        trainingDataSize: 100,
        lastTrained: new Date(),
        isActive: true,
        metadata: { test: true }
      };
      
      await storage.createAiModel(model);
      const models = await storage.getAiModels();
      
      expect(models.length).toBe(1);
      expect(models[0].name).toBe('test_model');
      expect(models[0].accuracy).toBe(85);
    });
  });
  
  describe('Error Handling & Edge Cases', () => {
    it('should handle empty intervention history gracefully', async () => {
      const prediction = await aiEngine.predictInterventionSuccess('EMPTY_HISTORY', 0.8, 0.2);
      expect(prediction).toBeCloseTo(0.6, 1); // Should fall back to confidence - risk
      
      const shouldApply = await aiEngine.shouldAutoApplyFix('EMPTY_HISTORY', 0.9, 0.1);
      // Should still work based on thresholds, even without history
      expect(typeof shouldApply).toBe('boolean');
    });
    
    it('should handle invalid confidence and risk values', async () => {
      // Test with values outside normal range
      const prediction1 = await aiEngine.predictInterventionSuccess('EDGE_CASE', 1.5, -0.1);
      expect(prediction1).toBeGreaterThanOrEqual(0.0);
      expect(prediction1).toBeLessThanOrEqual(1.0);
      
      const prediction2 = await aiEngine.predictInterventionSuccess('EDGE_CASE', -0.5, 1.2);
      expect(prediction2).toBeGreaterThanOrEqual(0.0);
      expect(prediction2).toBeLessThanOrEqual(1.0);
    });
    
    it('should handle model training with insufficient data', async () => {
      // Add only a few interventions (below minimum threshold of 10)
      await aiEngine.simulateLearningScenario('INSUFFICIENT_DATA', [
        { solution: 'sparse_fix', confidence: 0.8, riskScore: 0.2, outcome: 'success' },
        { solution: 'sparse_fix', confidence: 0.85, riskScore: 0.15, outcome: 'failure' }
      ]);
      
      const initialModelCount = aiEngine.getModels().size;
      await aiEngine.retrainModels();
      const finalModelCount = aiEngine.getModels().size;
      
      // Should not create new models due to insufficient data
      expect(finalModelCount).toBe(initialModelCount);
    });
  });
});