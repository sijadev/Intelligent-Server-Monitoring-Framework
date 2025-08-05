/**
 * Tenant-Aware AI Storage with Server/Code Separation
 * Ensures secure isolation between different servers, projects, and code bases
 */

import { AIProgress, AIProgressStorage } from './ai-progress-storage.js';
import { ProductionAIStorage } from './production-ai-storage.js';

// Tenant Context Interface
export interface TenantContext {
  serverId: string;          // MCP Server ID
  projectId: string;         // Project/Organization ID  
  codebaseHash: string;      // Hash of the codebase version
  environment: string;       // dev/staging/prod
  userId?: string;           // User who initiated training
  organizationId?: string;   // Organization/Team ID
}

// Extended AI Progress with Tenant Information
export interface TenantAIProgress extends AIProgress {
  tenant_context: TenantContext;
  isolation_key: string;     // Computed isolation key
  access_permissions: string[];
  created_by: string;
  last_accessed: string;
  sharing_metadata?: {
    original_model?: string;
    original_isolation_key?: string;
    shared_by?: string;
    shared_at?: string;
    permissions?: SharingPermission[];
    expires_at?: string;
    sharing_reason?: string;
    is_shared?: boolean;
  };
}

// Enhanced Sharing Interfaces
export interface SharingPermission {
  action: 'read' | 'execute' | 'modify' | 'share' | 'delete';
  expiresAt?: Date;
  conditions?: {
    maxExecutions?: number;
    allowedEnvironments?: string[];
    requiresApproval?: boolean;
  };
}

export interface SharingRequest {
  modelName: string;
  targetTenant: Partial<TenantContext>;
  permissions: SharingPermission[];
  reason?: string;
  requestedBy: string;
  expiresAt?: Date;
}

export interface SharingResult {
  success: boolean;
  shared: number;
  failed: number;
  auditLogs: SharingAuditLog[];
}

export interface SharingAuditLog {
  id: string;
  timestamp: Date;
  action: 'share' | 'revoke' | 'access' | 'modify';
  sourceIsolationKey: string;
  targetIsolationKey: string;
  modelName: string;
  userId: string;
  success: boolean;
  reason?: string;
}

export class TenantAwareAIStorage {
  private baseStorage: ProductionAIStorage;
  private currentTenant: TenantContext;
  
  constructor(baseStorage: ProductionAIStorage, tenantContext: TenantContext) {
    this.baseStorage = baseStorage;
    this.currentTenant = tenantContext;
  }
  
  // Generate unique isolation key for tenant
  private generateIsolationKey(context: TenantContext): string {
    const keyComponents = [
      context.organizationId || 'default',
      context.serverId,
      context.projectId,
      context.environment,
      context.codebaseHash.substring(0, Math.min(8, context.codebaseHash.length)) // Short hash for version
    ];
    
    return keyComponents.join(':');
  }
  
  // Validate access permissions
  private validateAccess(progress: TenantAIProgress): boolean {
    const currentKey = this.generateIsolationKey(this.currentTenant);
    
    // Exact match required
    if (progress.isolation_key === currentKey) {
      return true;
    }
    
    // Check if user has cross-tenant permissions
    const userPermissions = progress.access_permissions || [];
    const hasAccess = userPermissions.some(permission => {
      return permission === `${this.currentTenant.organizationId}:*` ||
             permission === `${this.currentTenant.serverId}:read` ||
             permission === `${currentKey}:*` ||
             permission === `${currentKey}:read` ||
             permission === '*:read';
    });
    
    return hasAccess;
  }
  
  // Save AI progress with tenant isolation
  async saveAIProgress(progress: AIProgress, permissions: string[] = []): Promise<void> {
    const tenantProgress: TenantAIProgress = {
      ...progress,
      tenant_context: { ...this.currentTenant },
      isolation_key: this.generateIsolationKey(this.currentTenant),
      access_permissions: [
        `${this.currentTenant.organizationId}:*`,
        `${this.currentTenant.serverId}:read`,
        ...permissions
      ],
      created_by: this.currentTenant.userId || 'system',
      last_accessed: new Date().toISOString(),
      // Prefix model name with isolation key to ensure uniqueness
      model_name: `${this.generateIsolationKey(this.currentTenant)}::${progress.model_name}`
    };
    
    console.log(`🔒 Saving AI progress for tenant: ${tenantProgress.isolation_key}`);
    await this.baseStorage.saveAIProgress(tenantProgress);
  }
  
  // Load AI progress filtered by tenant
  async loadAIProgress(): Promise<TenantAIProgress[]> {
    const allProgress = await this.baseStorage.loadAIProgress() as TenantAIProgress[];
    const currentKey = this.generateIsolationKey(this.currentTenant);
    
    // Filter by isolation key and permissions
    const accessibleProgress = allProgress.filter(progress => {
      // Skip if no tenant context (legacy data)
      if (!progress.tenant_context || !progress.isolation_key) {
        return false;
      }
      
      return this.validateAccess(progress);
    });
    
    // Remove isolation prefix from model names for display
    const cleanedProgress = accessibleProgress.map(progress => ({
      ...progress,
      model_name: progress.model_name.split('::').pop() || progress.model_name
    }));
    
    console.log(`🔍 Loaded ${cleanedProgress.length} AI models for tenant: ${currentKey}`);
    return cleanedProgress;
  }
  
  // Get specific model with tenant validation
  async getModelProgress(modelName: string): Promise<TenantAIProgress | null> {
    const fullModelName = `${this.generateIsolationKey(this.currentTenant)}::${modelName}`;
    const progress = await this.baseStorage.getModelProgress(fullModelName) as TenantAIProgress;
    
    if (!progress || !this.validateAccess(progress)) {
      return null;
    }
    
    // Clean model name for return
    progress.model_name = modelName;
    return progress;
  }
  
  // Enhanced cross-tenant model sharing with physical replication
  async shareModel(modelName: string, targetTenants: Partial<TenantContext>[], permissions: string[] = ['read']): Promise<void> {
    // Convert to new enhanced sharing format
    const sharingRequests = targetTenants.map(tenant => ({
      modelName,
      targetTenant: tenant,
      permissions: permissions.map(perm => ({ action: perm as any })),
      requestedBy: this.currentTenant.userId || 'system',
      reason: 'Legacy sharing compatibility'
    }));
    
    const result = await this.shareModelEnhanced(sharingRequests);
    if (!result.success) {
      throw new Error(`Sharing failed: ${result.failed}/${result.shared + result.failed} targets failed`);
    }
    
    console.log(`🤝 Shared model ${modelName} with ${targetTenants.length} tenants`);
  }

  // New enhanced sharing with physical model replication
  async shareModelEnhanced(sharingRequests: SharingRequest[]): Promise<SharingResult> {
    const results = {
      success: true,
      shared: 0,
      failed: 0,
      auditLogs: [] as SharingAuditLog[]
    };
    
    for (const request of sharingRequests) {
      try {
        await this.processSharingRequest(request);
        results.shared++;
        
        const auditLog = this.createAuditLog('share', request, true);
        results.auditLogs.push(auditLog);
        
      } catch (error) {
        results.failed++;
        results.success = false;
        
        const auditLog = this.createAuditLog('share', request, false, 
          error instanceof Error ? error.message : 'Unknown error');
        results.auditLogs.push(auditLog);
      }
    }
    
    return results;
  }
  
  private async processSharingRequest(request: SharingRequest): Promise<void> {
    // 1. Get source model
    const sourceModel = await this.getModelProgress(request.modelName);
    if (!sourceModel) {
      throw new Error(`Model '${request.modelName}' not found or access denied`);
    }
    
    // 2. Create target isolation key
    const targetContext: TenantContext = {
      serverId: request.targetTenant.serverId || this.currentTenant.serverId,
      projectId: request.targetTenant.projectId || this.currentTenant.projectId,
      codebaseHash: request.targetTenant.codebaseHash || this.currentTenant.codebaseHash,
      environment: request.targetTenant.environment || this.currentTenant.environment,
      organizationId: request.targetTenant.organizationId || this.currentTenant.organizationId,
      userId: request.targetTenant.userId
    };
    
    const targetIsolationKey = this.generateIsolationKey(targetContext);
    
    // 3. Create shared model copy with proper isolation
    const sharedModel: TenantAIProgress = {
      ...sourceModel,
      model_name: `${targetIsolationKey}::${request.modelName}`,
      tenant_context: {
        ...targetContext,
        shared_from: this.currentTenant,
        shared_to: request.targetTenant,
        sharing_timestamp: new Date().toISOString()
      },
      isolation_key: targetIsolationKey,
      access_permissions: [
        `${targetIsolationKey}:*`,
        ...request.permissions.map(p => `${targetIsolationKey}:${p.action}`)
      ],
      created_by: request.requestedBy,
      last_accessed: new Date().toISOString(),
      sharing_metadata: {
        original_model: request.modelName,
        original_isolation_key: sourceModel.isolation_key,
        shared_by: request.requestedBy,
        shared_at: new Date().toISOString(),
        permissions: request.permissions,
        expires_at: request.expiresAt?.toISOString(),
        sharing_reason: request.reason,
        is_shared: true
      }
    };
    
    // 4. Save shared model to storage
    await this.baseStorage.saveAIProgress(sharedModel);
    
    console.log(`📤 Created shared copy: ${request.modelName} -> ${targetContext.serverId}`);
  }
  
  private createAuditLog(action: string, request: SharingRequest, success: boolean, reason?: string): SharingAuditLog {
    return {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      action: action as any,
      sourceIsolationKey: this.generateIsolationKey(this.currentTenant),
      targetIsolationKey: this.generateIsolationKey({
        serverId: request.targetTenant.serverId || this.currentTenant.serverId,
        projectId: request.targetTenant.projectId || this.currentTenant.projectId,
        codebaseHash: request.targetTenant.codebaseHash || this.currentTenant.codebaseHash,
        environment: request.targetTenant.environment || this.currentTenant.environment,
        organizationId: request.targetTenant.organizationId || this.currentTenant.organizationId
      } as TenantContext),
      modelName: request.modelName,
      userId: request.requestedBy,
      success,
      reason
    };
  }
  
  // Get tenant statistics
  async getTenantStats(): Promise<{
    totalModels: number;
    ownModels: number;
    sharedModels: number;
    isolationKey: string;
    codebaseVersion: string;
  }> {
    const allProgress = await this.loadAIProgress();
    const currentKey = this.generateIsolationKey(this.currentTenant);
    
    const ownModels = allProgress.filter(p => p.isolation_key === currentKey).length;
    const sharedModels = allProgress.length - ownModels;
    
    return {
      totalModels: allProgress.length,
      ownModels,
      sharedModels,
      isolationKey: currentKey,
      codebaseVersion: this.currentTenant.codebaseHash.substring(0, 8)
    };
  }
  
  // Cleanup old models for current tenant
  async cleanupOldModels(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const allProgress = await this.loadAIProgress();
    const cutoffDate = new Date(Date.now() - maxAge);
    let cleaned = 0;
    
    for (const progress of allProgress) {
      const createdDate = new Date(progress.training_start);
      if (createdDate < cutoffDate) {
        // This would need to be implemented in the base storage
        console.log(`🧹 Would cleanup old model: ${progress.model_name}`);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

// Factory for creating tenant-aware storage
export class TenantAwareStorageFactory {
  static create(
    storageType: 'memory' | 'database' | 'redis' | 'hybrid' | 'file',
    tenantContext: TenantContext,
    storageOptions?: any
  ): TenantAwareAIStorage {
    const baseStorage = new ProductionAIStorage({ 
      type: storageType, 
      options: storageOptions 
    });
    
    return new TenantAwareAIStorage(baseStorage, tenantContext);
  }
  
  // Create from MCP Server context
  static fromMcpServer(
    serverId: string,
    projectId: string,
    codebaseHash: string,
    storageType: 'memory' | 'database' | 'redis' | 'hybrid' | 'file' = 'database',
    options?: {
      environment?: string;
      userId?: string;
      organizationId?: string;
      storageOptions?: any;
    }
  ): TenantAwareAIStorage {
    const tenantContext: TenantContext = {
      serverId,
      projectId,
      codebaseHash,
      environment: options?.environment || process.env.NODE_ENV || 'development',
      userId: options?.userId,
      organizationId: options?.organizationId || 'default'
    };
    
    return this.create(storageType, tenantContext, options?.storageOptions);
  }
  
  // Create from request context (for web applications)
  static fromRequest(
    req: any, // Express request or similar
    storageType: 'memory' | 'database' | 'redis' | 'hybrid' | 'file' = 'database'
  ): TenantAwareAIStorage {
    const tenantContext: TenantContext = {
      serverId: req.headers['x-server-id'] || req.query.serverId || 'unknown',
      projectId: req.headers['x-project-id'] || req.user?.projectId || 'default',
      codebaseHash: req.headers['x-codebase-hash'] || 'unknown',
      environment: req.headers['x-environment'] || process.env.NODE_ENV || 'development',
      userId: req.user?.id,
      organizationId: req.user?.organizationId || req.headers['x-org-id'] || 'default'
    };
    
    return this.create(storageType, tenantContext);
  }
}

// Database Schema for tenant-aware storage
export const TENANT_AWARE_SCHEMA = `
CREATE TABLE ai_progress_tenant (
  id SERIAL PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  isolation_key VARCHAR(255) NOT NULL,
  tenant_context JSONB NOT NULL,
  access_permissions TEXT[],
  created_by VARCHAR(255),
  last_accessed TIMESTAMP,
  
  -- AI Progress fields
  training_start TIMESTAMP,
  training_end TIMESTAMP,
  accuracy FLOAT,
  mse FLOAT NOT NULL,
  training_samples INTEGER,
  cross_validation_score FLOAT,
  metadata JSONB,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure uniqueness per tenant
  UNIQUE(isolation_key, model_name)
);

-- Indexes for performance
CREATE INDEX idx_ai_progress_isolation_key ON ai_progress_tenant(isolation_key);
CREATE INDEX idx_ai_progress_server_id ON ai_progress_tenant((tenant_context->>'serverId'));
CREATE INDEX idx_ai_progress_project_id ON ai_progress_tenant((tenant_context->>'projectId'));
CREATE INDEX idx_ai_progress_organization ON ai_progress_tenant((tenant_context->>'organizationId'));
CREATE INDEX idx_ai_progress_created_at ON ai_progress_tenant(created_at DESC);

-- Row Level Security (RLS) for additional security
ALTER TABLE ai_progress_tenant ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_progress_tenant_isolation ON ai_progress_tenant
  FOR ALL TO PUBLIC
  USING (isolation_key = current_setting('app.current_tenant_key', true));
`;

export default TenantAwareAIStorage;