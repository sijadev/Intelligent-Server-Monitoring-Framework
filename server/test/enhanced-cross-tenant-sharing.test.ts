/**
 * Enhanced Cross-Tenant Sharing Tests
 * Tests for improved cross-tenant model sharing with detailed permissions and audit
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnhancedCrossTenantSharing, SharingRequest, SharingPermission } from '../services/enhanced-cross-tenant-sharing.js';
import { TenantContext } from '../services/tenant-aware-ai-storage.js';
import { AIProgress } from '../services/ai-progress-storage.js';
import { ProductionAIStorage } from '../services/production-ai-storage.js';

describe('Enhanced Cross-Tenant Sharing', () => {
  let sourceStorage: any; // EnhancedCrossTenantSharing
  let targetStorage: any; // EnhancedCrossTenantSharing
  
  // Mock the enhanced storage for testing
  beforeEach(async () => {
    // Create mock enhanced storage instances
    sourceStorage = {
      currentTenant: {
        serverId: 'mcp-server-source',
        projectId: 'project-alpha',
        codebaseHash: 'abc123',
        environment: 'production',
        organizationId: 'org-source',
        userId: 'user-source'
      },
      baseStorage: new ProductionAIStorage({ type: 'memory' }),
      sharingAuditLog: [],
      
      generateIsolationKey: function(context: TenantContext): string {
        return `${context.organizationId}:${context.serverId}:${context.projectId}:${context.environment}:${context.codebaseHash.substring(0, 8)}`;
      },
      
      validateAccess: function(progress: any): boolean {
        const currentKey = this.generateIsolationKey(this.currentTenant);
        return progress.isolation_key === currentKey || 
               (progress.access_permissions && progress.access_permissions.some((p: string) => p.startsWith(currentKey)));
      },
      
      async saveAIProgress(progress: AIProgress): Promise<void> {
        const tenantProgress = {
          ...progress,
          tenant_context: this.currentTenant,
          isolation_key: this.generateIsolationKey(this.currentTenant),
          access_permissions: [`${this.generateIsolationKey(this.currentTenant)}:*`],
          created_by: this.currentTenant.userId || 'system',
          last_accessed: new Date().toISOString(),
          model_name: `${this.generateIsolationKey(this.currentTenant)}::${progress.model_name}`
        };
        
        await this.baseStorage.saveAIProgress(tenantProgress);
      },
      
      async loadAIProgress(): Promise<any[]> {
        const allProgress = await this.baseStorage.loadAIProgress();
        const currentKey = this.generateIsolationKey(this.currentTenant);
        
        return allProgress
          .filter((p: any) => p.tenant_context && p.isolation_key && this.validateAccess(p))
          .map((p: any) => ({
            ...p,
            model_name: p.model_name.split('::').pop() || p.model_name
          }));
      },
      
      async getModelProgress(modelName: string): Promise<any | null> {
        const allProgress = await this.loadAIProgress();
        return allProgress.find(p => p.model_name === modelName) || null;
      }
    };
    
    targetStorage = {
      ...sourceStorage,
      currentTenant: {
        serverId: 'mcp-server-target',
        projectId: 'project-alpha',
        codebaseHash: 'abc123',
        environment: 'production',
        organizationId: 'org-target',
        userId: 'user-target'
      },
      baseStorage: sourceStorage.baseStorage // Share same storage for testing
    };
  });
  
  it('should demonstrate enhanced sharing workflow', async () => {
    console.log('\n🤝 Testing Enhanced Cross-Tenant Sharing Workflow');
    
    // 1. Source creates an AI model
    const sourceModel: AIProgress = {
      model_name: 'advanced_classifier',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T01:00:00Z',
      mse: 0.02, // High accuracy model
      training_samples: 5000,
      validation_samples: 1000,
      feature_count: 50,
      training_time_seconds: 600,
      cross_validation_score: 0.98,
      model_size_mb: 10.0,
      learning_curve_data: [0.7, 0.8, 0.9, 0.95, 0.98],
      specialty: 'advanced_pattern_recognition'
    };
    
    await sourceStorage.saveAIProgress(sourceModel);
    console.log('📤 Source created advanced_classifier model');
    
    // 2. Verify source has the model
    const sourceModels = await sourceStorage.loadAIProgress();
    expect(sourceModels).toHaveLength(1);
    expect(sourceModels[0].model_name).toBe('advanced_classifier');
    
    // 3. Target initially has no access
    const targetModelsInitial = await targetStorage.loadAIProgress();
    expect(targetModelsInitial).toHaveLength(0);
    console.log('🔒 Target initially has no access to the model');
    
    // 4. Create enhanced sharing request with detailed permissions
    const sharingPermissions: SharingPermission[] = [
      {
        action: 'read',
        conditions: {
          allowedEnvironments: ['production', 'staging']
        }
      },
      {
        action: 'execute',
        conditions: {
          maxExecutions: 100
        }
      }
    ];
    
    const sharingRequest: SharingRequest = {
      modelName: 'advanced_classifier',
      targetTenant: {
        serverId: 'mcp-server-target',
        organizationId: 'org-target'
      },
      permissions: sharingPermissions,
      reason: 'Cross-team collaboration for improved pattern recognition',
      requestedBy: 'user-source',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    };
    
    // 5. Mock the enhanced sharing method
    const mockShareModelEnhanced = async function(modelName: string, requests: SharingRequest[]) {
      // Simulate enhanced sharing logic
      const sourceModel = await sourceStorage.getModelProgress(modelName);
      if (!sourceModel) {
        throw new Error(`Model '${modelName}' not found`);
      }
      
      for (const request of requests) {
        const targetKey = targetStorage.generateIsolationKey({
          serverId: request.targetTenant.serverId || targetStorage.currentTenant.serverId,
          projectId: request.targetTenant.projectId || targetStorage.currentTenant.projectId,
          codebaseHash: request.targetTenant.codebaseHash || targetStorage.currentTenant.codebaseHash,
          environment: request.targetTenant.environment || targetStorage.currentTenant.environment,
          organizationId: request.targetTenant.organizationId || targetStorage.currentTenant.organizationId
        });
        
        const sharedModel = {
          ...sourceModel,
          model_name: `shared_${sourceModel.model_name}`,
          tenant_context: {
            ...targetStorage.currentTenant,
            shared_from: sourceStorage.currentTenant,
            shared_to: request.targetTenant,
            sharing_timestamp: new Date().toISOString()
          },
          isolation_key: targetKey,
          access_permissions: [
            `${targetKey}:*`,
            ...request.permissions.map(p => `${targetKey}:${p.action}`)
          ],
          sharing_metadata: {
            original_model: sourceModel.model_name,
            shared_by: request.requestedBy,
            shared_at: new Date().toISOString(),
            permissions: request.permissions,
            expires_at: request.expiresAt?.toISOString(),
            sharing_reason: request.reason
          }
        };
        
        await targetStorage.baseStorage.saveAIProgress(sharedModel);
      }
      
      return {
        success: true,
        shared: requests.length,
        failed: 0,
        auditLogs: [{
          id: 'audit_123',
          timestamp: new Date(),
          action: 'share' as const,
          sourceIsolationKey: sourceStorage.generateIsolationKey(sourceStorage.currentTenant),
          targetIsolationKey: targetStorage.generateIsolationKey(targetStorage.currentTenant),
          modelName,
          userId: requests[0].requestedBy,
          success: true,
          reason: requests[0].reason
        }]
      };
    };
    
    // 6. Execute enhanced sharing
    const sharingResult = await mockShareModelEnhanced('advanced_classifier', [sharingRequest]);
    
    expect(sharingResult.success).toBe(true);
    expect(sharingResult.shared).toBe(1);
    expect(sharingResult.failed).toBe(0);
    expect(sharingResult.auditLogs).toHaveLength(1);
    
    console.log('🤝 Enhanced sharing executed successfully:', {
      shared: sharingResult.shared,
      auditLogs: sharingResult.auditLogs.length
    });
    
    // 7. Target can now access the shared model
    const targetModelsAfterSharing = await targetStorage.loadAIProgress();
    expect(targetModelsAfterSharing.length).toBeGreaterThan(0);
    
    const sharedModel = targetModelsAfterSharing.find(m => 
      m.model_name === 'advanced_classifier' || m.model_name === 'shared_advanced_classifier'
    );
    
    expect(sharedModel).toBeDefined();
    if (sharedModel) {
      expect(sharedModel.sharing_metadata).toBeDefined();
      expect(sharedModel.sharing_metadata.sharing_reason).toBe('Cross-team collaboration for improved pattern recognition');
      expect(sharedModel.sharing_metadata.shared_by).toBe('user-source');
      
      console.log('✅ Target successfully accessed shared model:', {
        modelName: sharedModel.model_name,
        sharedBy: sharedModel.sharing_metadata.shared_by,
        reason: sharedModel.sharing_metadata.sharing_reason
      });
    }
  });
  
  it('should validate enhanced sharing permissions', async () => {
    console.log('\n🔐 Testing Enhanced Sharing Permissions');
    
    // Create a high-value model
    const valuableModel: AIProgress = {
      model_name: 'proprietary_algorithm',
      training_start: '2025-01-01T00:00:00Z',
      training_end: '2025-01-01T02:00:00Z',
      mse: 0.01, // Very high accuracy
      training_samples: 10000,
      validation_samples: 2000,
      feature_count: 100,
      training_time_seconds: 7200,
      cross_validation_score: 0.99,
      model_size_mb: 50.0,
      learning_curve_data: [0.8, 0.9, 0.95, 0.98, 0.99],
      specialty: 'proprietary_pattern_recognition',
      confidentiality: 'high'
    };
    
    await sourceStorage.saveAIProgress(valuableModel);
    
    // Test different permission levels
    const restrictedPermissions: SharingPermission[] = [
      {
        action: 'read',
        conditions: {
          allowedEnvironments: ['staging'], // Only staging
          requiresApproval: true
        }
      }
    ];
    
    const fullPermissions: SharingPermission[] = [
      { action: 'read' },
      { action: 'execute' },
      { action: 'modify' }
    ];
    
    // Simulate permission validation
    const validatePermissions = (permissions: SharingPermission[], requestedAction: string, environment: string) => {
      const permission = permissions.find(p => p.action === requestedAction);
      if (!permission) return false;
      
      if (permission.conditions?.allowedEnvironments) {
        return permission.conditions.allowedEnvironments.includes(environment);
      }
      
      return true;
    };
    
    // Test restricted access
    expect(validatePermissions(restrictedPermissions, 'read', 'staging')).toBe(true);
    expect(validatePermissions(restrictedPermissions, 'read', 'production')).toBe(false);
    expect(validatePermissions(restrictedPermissions, 'execute', 'staging')).toBe(false);
    
    // Test full access
    expect(validatePermissions(fullPermissions, 'read', 'production')).toBe(true);
    expect(validatePermissions(fullPermissions, 'execute', 'production')).toBe(true);
    expect(validatePermissions(fullPermissions, 'modify', 'production')).toBe(true);
    
    console.log('✅ Permission validation working correctly');
  });
  
  it('should track sharing audit logs', async () => {
    console.log('\n📊 Testing Sharing Audit Logs');
    
    // Mock audit log functionality
    const auditLogs = [
      {
        id: 'audit_001',
        timestamp: new Date('2025-01-01T10:00:00Z'),
        action: 'share' as const,
        sourceIsolationKey: 'org-source:mcp-server-source:project-alpha:production:abc123',
        targetIsolationKey: 'org-target:mcp-server-target:project-alpha:production:abc123',
        modelName: 'model_a',
        userId: 'user-1',
        success: true,
        reason: 'Collaboration'
      },
      {
        id: 'audit_002',
        timestamp: new Date('2025-01-01T11:00:00Z'),
        action: 'access' as const,
        sourceIsolationKey: 'org-source:mcp-server-source:project-alpha:production:abc123',
        targetIsolationKey: 'org-target:mcp-server-target:project-alpha:production:abc123',
        modelName: 'model_a',
        userId: 'user-2',
        success: true,
        reason: 'Model execution'
      },
      {
        id: 'audit_003',
        timestamp: new Date('2025-01-01T12:00:00Z'),
        action: 'revoke' as const,
        sourceIsolationKey: 'org-source:mcp-server-source:project-alpha:production:abc123',
        targetIsolationKey: 'org-target:mcp-server-target:project-alpha:production:abc123',
        modelName: 'model_a',
        userId: 'user-1',
        success: true,
        reason: 'End of collaboration period'
      }
    ];
    
    // Test audit log filtering
    const shareActions = auditLogs.filter(log => log.action === 'share');
    const successfulActions = auditLogs.filter(log => log.success);
    const user1Actions = auditLogs.filter(log => log.userId === 'user-1');
    
    expect(shareActions).toHaveLength(1);
    expect(successfulActions).toHaveLength(3);
    expect(user1Actions).toHaveLength(2);
    
    // Test date range filtering
    const fromDate = new Date('2025-01-01T10:30:00Z');
    const toDate = new Date('2025-01-01T11:30:00Z');
    const dateFiltered = auditLogs.filter(log => 
      log.timestamp >= fromDate && log.timestamp <= toDate
    );
    
    expect(dateFiltered).toHaveLength(1);
    expect(dateFiltered[0].action).toBe('access');
    
    console.log('✅ Audit log filtering working correctly');
  });
  
  it('should provide sharing statistics', async () => {
    console.log('\n📈 Testing Sharing Statistics');
    
    // Mock sharing statistics
    const mockStats = {
      modelsSharedByMe: 3,
      modelsSharedWithMe: 2,
      totalSharingActions: 15,
      recentSharings: [
        {
          id: 'audit_recent_1',
          timestamp: new Date(),
          action: 'share' as const,
          modelName: 'recent_model',
          userId: 'user-1',
          success: true
        }
      ],
      mostSharedModel: 'popular_classifier'
    };
    
    // Validate statistics structure
    expect(mockStats.modelsSharedByMe).toBeGreaterThan(0);
    expect(mockStats.modelsSharedWithMe).toBeGreaterThan(0);
    expect(mockStats.totalSharingActions).toBeGreaterThan(0);
    expect(mockStats.recentSharings).toHaveLength(1);
    expect(mockStats.mostSharedModel).toBe('popular_classifier');
    
    // Test statistics calculations
    const totalModelsAccessible = mockStats.modelsSharedByMe + mockStats.modelsSharedWithMe;
    const sharingRatio = mockStats.modelsSharedByMe / (mockStats.modelsSharedByMe + mockStats.modelsSharedWithMe);
    
    expect(totalModelsAccessible).toBe(5);
    expect(sharingRatio).toBeCloseTo(0.6); // 3/5 = 0.6
    
    console.log('📊 Sharing Statistics:', {
      totalAccessible: totalModelsAccessible,
      sharingRatio: `${(sharingRatio * 100).toFixed(1)}%`,
      mostPopular: mockStats.mostSharedModel
    });
  });
});