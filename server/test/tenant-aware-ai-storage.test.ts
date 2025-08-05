/**
 * Tenant-Aware AI Storage Tests
 * Demonstrates secure isolation between servers, projects, and codebases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TenantAwareAIStorage, TenantAwareStorageFactory, TenantContext } from '../services/tenant-aware-ai-storage.js';
import type { AIProgress } from '../services/ai-progress-storage.js';

describe('Tenant-Aware AI Storage', () => {
  
  it('should isolate AI progress by server ID', async () => {
    // Create two different MCP servers
    const server1Storage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1', 
      'project-alpha', 
      'abc123def456',
      'memory'
    );
    
    const server2Storage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-2', 
      'project-alpha', 
      'abc123def456',
      'memory'
    );
    
    // Save AI progress from each server
    const progress1: AIProgress = {
      model_name: 'code_analyzer',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.05,
      training_samples: 1000,
      validation_samples: 200,
      feature_count: 20,
      training_time_seconds: 120,
      cross_validation_score: 0.95,
      model_size_mb: 1.5,
      learning_curve_data: [0.7, 0.8, 0.9, 0.95]
    };
    
    const progress2: AIProgress = {
      model_name: 'code_analyzer', // Same name, different server
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.08,
      training_samples: 800,
      validation_samples: 160,
      feature_count: 15,
      training_time_seconds: 100,
      cross_validation_score: 0.92,
      model_size_mb: 1.2,
      learning_curve_data: [0.6, 0.7, 0.8, 0.92]
    };
    
    await server1Storage.saveAIProgress(progress1);
    await server2Storage.saveAIProgress(progress2);
    
    // Each server should only see their own progress
    const server1Models = await server1Storage.loadAIProgress();
    const server2Models = await server2Storage.loadAIProgress();
    
    expect(server1Models).toHaveLength(1);
    expect(server2Models).toHaveLength(1);
    
    expect(server1Models[0].mse).toBe(0.05);
    expect(server2Models[0].mse).toBe(0.08);
    
    // Verify isolation keys are different
    expect(server1Models[0].isolation_key).not.toBe(server2Models[0].isolation_key);
  });
  
  it('should isolate by project and codebase version', async () => {
    // Same server, different projects
    const projectAlphaStorage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1', 
      'project-alpha', 
      'version-1.0.0',
      'memory'
    );
    
    const projectBetaStorage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1', 
      'project-beta', 
      'version-1.0.0',
      'memory'
    );
    
    // Same project, different codebase versions
    const alphaV2Storage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1', 
      'project-alpha', 
      'version-2.0.0',
      'memory'
    );
    
    const testProgress: AIProgress = {
      model_name: 'universal_model',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.1,
      training_samples: 500,
      validation_samples: 100,
      feature_count: 10,
      training_time_seconds: 60,
      cross_validation_score: 0.9,
      model_size_mb: 0.8,
      learning_curve_data: []
    };
    
    await projectAlphaStorage.saveAIProgress(testProgress);
    await projectBetaStorage.saveAIProgress(testProgress);
    await alphaV2Storage.saveAIProgress(testProgress);
    
    // Each should be isolated
    const alphaV1Models = await projectAlphaStorage.loadAIProgress();
    const betaModels = await projectBetaStorage.loadAIProgress();
    const alphaV2Models = await alphaV2Storage.loadAIProgress();
    
    expect(alphaV1Models).toHaveLength(1);
    expect(betaModels).toHaveLength(1);
    expect(alphaV2Models).toHaveLength(1);
    
    // Get tenant stats
    const alphaStats = await projectAlphaStorage.getTenantStats();
    expect(alphaStats.totalModels).toBe(1);
    expect(alphaStats.ownModels).toBe(1);
    expect(alphaStats.sharedModels).toBe(0);
    expect(alphaStats.codebaseVersion).toBe('version-');
  });
  
  it('should support cross-tenant model sharing', async () => {
    const orgAServer1 = TenantAwareStorageFactory.create('memory', {
      serverId: 'server-1',
      projectId: 'shared-project',
      codebaseHash: 'abc123',
      environment: 'production',
      organizationId: 'org-a',
      userId: 'user-1'
    });
    
    const orgBServer1 = TenantAwareStorageFactory.create('memory', {
      serverId: 'server-1',
      projectId: 'shared-project',
      codebaseHash: 'abc123',
      environment: 'production',
      organizationId: 'org-b',
      userId: 'user-2'
    });
    
    // Org A creates a model
    const sharedProgress: AIProgress = {
      model_name: 'shared_classifier',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.03,
      training_samples: 2000,
      validation_samples: 400,
      feature_count: 50,
      training_time_seconds: 300,
      cross_validation_score: 0.97,
      model_size_mb: 5.0,
      learning_curve_data: [0.8, 0.9, 0.95, 0.97]
    };
    
    await orgAServer1.saveAIProgress(sharedProgress);
    
    // Initially, Org B cannot see the model
    const orgBModelsInitial = await orgBServer1.loadAIProgress();
    expect(orgBModelsInitial).toHaveLength(0);
    
    // Org A shares the model with Org B
    await orgAServer1.shareModel('shared_classifier', [
      { organizationId: 'org-b', serverId: 'server-1', projectId: 'shared-project', codebaseHash: 'abc123', environment: 'production' }
    ], ['read', 'execute']);
    
    // Now Org B can see the shared model
    const orgBModelsShared = await orgBServer1.loadAIProgress();
    expect(orgBModelsShared).toHaveLength(1);
    expect(orgBModelsShared[0].model_name).toBe('shared_classifier');
    expect(orgBModelsShared[0].mse).toBe(0.03);
    
    // Check stats
    const orgBStats = await orgBServer1.getTenantStats();
    expect(orgBStats.totalModels).toBe(1);
    expect(orgBStats.ownModels).toBe(0);
    expect(orgBStats.sharedModels).toBe(1);
  });
  
  it('should enforce environment isolation', async () => {
    const prodStorage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1',
      'project-alpha',
      'abc123',
      'memory',
      { environment: 'production' }
    );
    
    const stagingStorage = TenantAwareStorageFactory.fromMcpServer(
      'mcp-server-1',
      'project-alpha',
      'abc123',
      'memory',
      { environment: 'staging' }
    );
    
    const testProgress: AIProgress = {
      model_name: 'env_test_model',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.05,
      training_samples: 1000,
      validation_samples: 200,
      feature_count: 20,
      training_time_seconds: 120,
      cross_validation_score: 0.95,
      model_size_mb: 1.5,
      learning_curve_data: []
    };
    
    await prodStorage.saveAIProgress(testProgress);
    await stagingStorage.saveAIProgress(testProgress);
    
    // Each environment should be isolated
    const prodModels = await prodStorage.loadAIProgress();
    const stagingModels = await stagingStorage.loadAIProgress();
    
    expect(prodModels).toHaveLength(1);
    expect(stagingModels).toHaveLength(1);
    
    // Verify different isolation keys
    expect(prodModels[0].isolation_key).toContain('production');
    expect(stagingModels[0].isolation_key).toContain('staging');
    expect(prodModels[0].isolation_key).not.toBe(stagingModels[0].isolation_key);
  });
  
  it('should create storage from request context', async () => {
    // Mock Express request
    const mockRequest = {
      headers: {
        'x-server-id': 'web-server-1',
        'x-project-id': 'web-project',
        'x-codebase-hash': 'web123abc',
        'x-environment': 'production',
        'x-org-id': 'web-org'
      },
      user: {
        id: 'user-123',
        organizationId: 'web-org'
      }
    };
    
    const requestStorage = TenantAwareStorageFactory.fromRequest(mockRequest, 'memory');
    
    const webProgress: AIProgress = {
      model_name: 'web_request_model',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.07,
      training_samples: 750,
      validation_samples: 150,
      feature_count: 12,
      training_time_seconds: 90,
      cross_validation_score: 0.93,
      model_size_mb: 1.1,
      learning_curve_data: []
    };
    
    await requestStorage.saveAIProgress(webProgress);
    
    const webModels = await requestStorage.loadAIProgress();
    expect(webModels).toHaveLength(1);
    expect(webModels[0].model_name).toBe('web_request_model');
    expect(webModels[0].tenant_context.serverId).toBe('web-server-1');
    expect(webModels[0].tenant_context.userId).toBe('user-123');
  });
  
  it('should handle model access validation', async () => {
    const authorizedStorage = TenantAwareStorageFactory.create('memory', {
      serverId: 'secure-server',
      projectId: 'secure-project',
      codebaseHash: 'secure123',
      environment: 'production',
      organizationId: 'secure-org',
      userId: 'authorized-user'
    });
    
    const unauthorizedStorage = TenantAwareStorageFactory.create('memory', {
      serverId: 'other-server',
      projectId: 'other-project',
      codebaseHash: 'other123',
      environment: 'production',
      organizationId: 'other-org',
      userId: 'unauthorized-user'
    });
    
    const secureProgress: AIProgress = {
      model_name: 'secure_model',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.02,
      training_samples: 1500,
      validation_samples: 300,
      feature_count: 30,
      training_time_seconds: 200,
      cross_validation_score: 0.98,
      model_size_mb: 3.0,
      learning_curve_data: []
    };
    
    await authorizedStorage.saveAIProgress(secureProgress);
    
    // Authorized access should work
    const authorizedModel = await authorizedStorage.getModelProgress('secure_model');
    expect(authorizedModel).toBeDefined();
    expect(authorizedModel?.mse).toBe(0.02);
    
    // Unauthorized access should be blocked
    const unauthorizedModel = await unauthorizedStorage.getModelProgress('secure_model');
    expect(unauthorizedModel).toBeNull();
    
    const unauthorizedModels = await unauthorizedStorage.loadAIProgress();
    expect(unauthorizedModels).toHaveLength(0);
  });
});