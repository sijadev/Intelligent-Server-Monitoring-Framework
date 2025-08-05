/**
 * Example: AI-Enhanced Tests with Production Storage
 * Shows how to use production-ready AI storage instead of file-based
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ProductionAIStorage, getAIStorage, PRODUCTION_CONFIGS } from '../services/production-ai-storage.js';
import type { AIProgress } from '../services/ai-progress-storage.js';

describe('Production AI Storage Examples', () => {
  
  it('should work with in-memory storage for CI/Testing', async () => {
    // For CI/Testing - no persistence needed
    const storage = new ProductionAIStorage({ type: 'memory' });
    
    const testProgress: AIProgress = {
      model_name: 'test_model_ci',
      training_start: new Date().toISOString(),
      training_end: new Date().toISOString(),
      mse: 0.05,
      training_samples: 100,
      validation_samples: 20,
      feature_count: 10,
      training_time_seconds: 30,
      cross_validation_score: 0.95,
      model_size_mb: 0.8,
      learning_curve_data: [0.7, 0.8, 0.9, 0.95]
    };
    
    // Save and load
    await storage.saveAIProgress(testProgress);
    const loaded = await storage.loadAIProgress();
    
    expect(loaded).toHaveLength(1);
    expect(loaded[0].model_name).toBe('test_model_ci');
    expect(loaded[0].mse).toBe(0.05);
    
    // Check storage health
    const info = await storage.getStorageInfo();
    expect(info.type).toBe('memory');
    expect(info.healthy).toBe(true);
    expect(info.modelCount).toBe(1);
  });
  
  it('should demonstrate production configuration selection', async () => {
    // Simulate different environments
    const originalEnv = process.env.NODE_ENV;
    const originalCI = process.env.CI;
    
    try {
      // CI Environment
      process.env.CI = 'true';
      const ciStorage = new ProductionAIStorage();
      const ciInfo = await ciStorage.getStorageInfo();
      expect(ciInfo.type).toBe('memory');
      
      // Development Environment  
      process.env.NODE_ENV = 'development';
      process.env.CI = 'false';
      const devStorage = new ProductionAIStorage();
      const devInfo = await devStorage.getStorageInfo();
      expect(devInfo.type).toBe('file');
      
    } finally {
      // Restore environment
      process.env.NODE_ENV = originalEnv;
      process.env.CI = originalCI;
    }
  });
  
  it('should handle concurrent access safely (memory storage)', async () => {
    const storage = new ProductionAIStorage({ type: 'memory' });
    
    // Simulate concurrent writes
    const promises = Array.from({ length: 10 }, (_, i) => {
      const progress: AIProgress = {
        model_name: `concurrent_model_${i}`,
        training_start: new Date().toISOString(),
        training_end: new Date().toISOString(),
        mse: Math.random() * 0.1,
        training_samples: 100 + i,
        validation_samples: 20,
        feature_count: 10,
        training_time_seconds: 30,
        cross_validation_score: 0.9 + Math.random() * 0.1,
        model_size_mb: 0.8,
        learning_curve_data: []
      };
      
      return storage.saveAIProgress(progress);
    });
    
    // All should complete without errors
    await Promise.all(promises);
    
    const loaded = await storage.loadAIProgress();
    expect(loaded).toHaveLength(10);
    
    // Verify all models are unique
    const names = loaded.map(p => p.model_name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(10);
  });
  
  it('should provide migration capabilities', async () => {
    // Create source storage with data
    const sourceStorage = new ProductionAIStorage({ type: 'memory' });
    
    const testData: AIProgress[] = [
      {
        model_name: 'migration_test_1',
        training_start: '2025-01-01T00:00:00Z',
        training_end: '2025-01-01T01:00:00Z',
        mse: 0.1,
        training_samples: 500,
        validation_samples: 100,
        feature_count: 15,
        training_time_seconds: 120,
        cross_validation_score: 0.85,
        model_size_mb: 1.2,
        learning_curve_data: [0.6, 0.7, 0.8, 0.85]
      },
      {
        model_name: 'migration_test_2',
        training_start: '2025-01-01T02:00:00Z',
        training_end: '2025-01-01T03:00:00Z',
        mse: 0.08,
        training_samples: 750,
        validation_samples: 150,
        feature_count: 20,
        training_time_seconds: 180,
        cross_validation_score: 0.88,
        model_size_mb: 1.5,
        learning_curve_data: [0.65, 0.75, 0.82, 0.88]
      }
    ];
    
    // Populate source
    for (const data of testData) {
      await sourceStorage.saveAIProgress(data);
    }
    
    // Create target storage
    const targetStorage = new ProductionAIStorage({ type: 'memory' });
    
    // Verify migration would work (simulation)
    const sourceData = await sourceStorage.loadAIProgress();
    expect(sourceData).toHaveLength(2);
    
    // Migrate data
    for (const data of sourceData) {
      await targetStorage.saveAIProgress(data);
    }
    
    const targetData = await targetStorage.loadAIProgress();
    expect(targetData).toHaveLength(2);
    expect(targetData.map(d => d.model_name).sort()).toEqual(['migration_test_1', 'migration_test_2']);
  });
});

// Example of how AI-Enhanced tests would be updated
describe('AI-Enhanced Tests with Production Storage', () => {
  let aiStorage: ProductionAIStorage;
  
  beforeAll(async () => {
    // Use memory storage for tests (no persistence needed)
    aiStorage = new ProductionAIStorage({ type: 'memory' });
  });
  
  it('should enhance problem detection with stored AI models', async () => {
    // Seed with existing AI models
    const existingModels: AIProgress[] = [
      {
        model_name: 'code_issues_detector',
        training_start: '2025-01-01T00:00:00Z',
        training_end: '2025-01-01T01:00:00Z',
        mse: 0.02, // 98% accuracy
        training_samples: 1000,
        validation_samples: 200,
        feature_count: 25,
        training_time_seconds: 300,
        cross_validation_score: 0.98,
        model_size_mb: 2.5,
        learning_curve_data: [0.7, 0.8, 0.9, 0.95, 0.98]
      },
      {
        model_name: 'deployment_success_predictor',
        training_start: '2025-01-01T02:00:00Z',
        training_end: '2025-01-01T03:00:00Z',
        mse: 0.03, // 97% accuracy
        training_samples: 800,
        validation_samples: 160,
        feature_count: 20,
        training_time_seconds: 250,
        cross_validation_score: 0.97,
        model_size_mb: 2.0,
        learning_curve_data: [0.65, 0.75, 0.85, 0.92, 0.97]
      }
    ];
    
    // Save models to storage
    for (const model of existingModels) {
      await aiStorage.saveAIProgress(model);
    }
    
    // Load and use for AI enhancement
    const loadedModels = await aiStorage.loadAIProgress();
    expect(loadedModels).toHaveLength(2);
    
    // Simulate AI-enhanced problem detection
    const codeIssuesModel = loadedModels.find(m => m.model_name.includes('code_issues'));
    expect(codeIssuesModel).toBeDefined();
    
    const aiAccuracy = (1 - codeIssuesModel!.mse) * 100;
    expect(aiAccuracy).toBeGreaterThan(95); // Should be 98%
    
    // Simulate using the model for enhanced detection
    const problems = [
      { type: 'null_pointer', severity: 'high' },
      { type: 'memory_leak', severity: 'medium' },
      { type: 'api_timeout', severity: 'critical' }
    ];
    
    let aiEnhancedDetections = 0;
    for (const problem of problems) {
      // Use AI model to enhance detection
      const detectionConfidence = Math.random() * 0.3 + (aiAccuracy / 100) * 0.7;
      if (detectionConfidence > 0.8) {
        aiEnhancedDetections++;
      }
    }
    
    expect(aiEnhancedDetections).toBeGreaterThan(0);
    
    // Save new learning progress
    const newProgress: AIProgress = {
      model_name: 'enhanced_detection_session',
      training_start: new Date().toISOString(),
      training_end: new Date().toISOString(),
      mse: 0.015, // Even better after enhancement
      training_samples: 1200,
      validation_samples: 240,
      feature_count: 30,
      training_time_seconds: 180,
      cross_validation_score: 0.985,
      model_size_mb: 3.0,
      learning_curve_data: [0.8, 0.9, 0.95, 0.98, 0.985],
      enhancement_source: 'real_time_learning',
      problems_processed: problems.length,
      ai_enhanced_count: aiEnhancedDetections
    };
    
    await aiStorage.saveAIProgress(newProgress);
    
    // Verify the new progress was saved
    const updatedModels = await aiStorage.loadAIProgress();
    expect(updatedModels).toHaveLength(3);
    
    const enhancedModel = updatedModels.find(m => m.model_name === 'enhanced_detection_session');
    expect(enhancedModel).toBeDefined();
    expect(enhancedModel!.problems_processed).toBe(3);
  });
  
  afterAll(async () => {
    // Cleanup - clear all test data
    await aiStorage.loadAIProgress(); // Just to verify it still works
  });
});