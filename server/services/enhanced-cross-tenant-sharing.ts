/**
 * Enhanced Cross-Tenant Sharing Implementation
 * Fixes and improvements for reliable model sharing between tenants
 */

import {
  TenantAwareAIStorage,
  TenantContext,
  TenantAIProgress,
} from './tenant-aware-ai-storage.js';
import { AIProgress } from './ai-progress-storage.js';

// Enhanced permission system
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

export class EnhancedCrossTenantSharing extends TenantAwareAIStorage {
  private sharingAuditLog: SharingAuditLog[] = [];

  // Enhanced sharing with detailed permission control
  async shareModelEnhanced(
    modelName: string,
    sharingRequests: SharingRequest[],
  ): Promise<{ success: boolean; shared: number; failed: number; auditLogs: SharingAuditLog[] }> {
    const results = {
      success: true,
      shared: 0,
      failed: 0,
      auditLogs: [] as SharingAuditLog[],
    };

    // 1. Validate source model exists and access
    const sourceModel = await this.getModelProgress(modelName);
    if (!sourceModel) {
      throw new Error(`Model '${modelName}' not found or access denied`);
    }

    // 2. Process each sharing request
    for (const request of sharingRequests) {
      try {
        const auditLog = await this.processSharingRequest(sourceModel, request);
        results.auditLogs.push(auditLog);

        if (auditLog.success) {
          results.shared++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.success = false;

        const failureLog: SharingAuditLog = {
          id: this.generateAuditId(),
          timestamp: new Date(),
          action: 'share',
          sourceIsolationKey: this.currentTenant.serverId, // Simplified for demo
          targetIsolationKey: request.targetTenant.serverId || 'unknown',
          modelName,
          userId: request.requestedBy,
          success: false,
          reason: error instanceof Error ? error.message : 'Unknown error',
        };

        results.auditLogs.push(failureLog);
        this.sharingAuditLog.push(failureLog);
      }
    }

    return results;
  }

  private async processSharingRequest(
    sourceModel: TenantAIProgress,
    request: SharingRequest,
  ): Promise<SharingAuditLog> {
    const targetIsolationKey = this.generateIsolationKey({
      serverId: request.targetTenant.serverId || this.currentTenant.serverId,
      projectId: request.targetTenant.projectId || this.currentTenant.projectId,
      codebaseHash: request.targetTenant.codebaseHash || this.currentTenant.codebaseHash,
      environment: request.targetTenant.environment || this.currentTenant.environment,
      organizationId: request.targetTenant.organizationId || this.currentTenant.organizationId,
    } as TenantContext);

    // Create shared model with proper permissions
    const sharedModel: TenantAIProgress = {
      ...sourceModel,
      model_name: `shared_${sourceModel.model_name}`, // Prefix to avoid conflicts
      tenant_context: {
        ...sourceModel.tenant_context,
        // Keep original context but add sharing metadata
        shared_from: this.currentTenant,
        shared_to: request.targetTenant,
        sharing_timestamp: new Date().toISOString(),
      },
      isolation_key: targetIsolationKey,
      access_permissions: [
        // Target tenant gets full access to their isolation key
        `${targetIsolationKey}:*`,
        // Add specific permissions from request
        ...request.permissions.map((p) => `${targetIsolationKey}:${p.action}`),
      ],
      created_by: request.requestedBy,
      last_accessed: new Date().toISOString(),
      sharing_metadata: {
        original_model: sourceModel.model_name,
        original_isolation_key: sourceModel.isolation_key,
        shared_by: request.requestedBy,
        shared_at: new Date().toISOString(),
        permissions: request.permissions,
        expires_at: request.expiresAt?.toISOString(),
        sharing_reason: request.reason,
      },
    };

    // Save shared model
    await this.baseStorage.saveAIProgress(sharedModel);

    const auditLog: SharingAuditLog = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'share',
      sourceIsolationKey: sourceModel.isolation_key,
      targetIsolationKey,
      modelName: request.modelName,
      userId: request.requestedBy,
      success: true,
      reason: request.reason,
    };

    this.sharingAuditLog.push(auditLog);
    return auditLog;
  }

  // Enhanced loading with proper shared model handling
  async loadAIProgressEnhanced(): Promise<{
    ownModels: TenantAIProgress[];
    sharedModels: TenantAIProgress[];
    totalModels: TenantAIProgress[];
  }> {
    const allProgress = (await this.baseStorage.loadAIProgress()) as TenantAIProgress[];
    const currentKey = this.generateIsolationKey(this.currentTenant);

    const ownModels: TenantAIProgress[] = [];
    const sharedModels: TenantAIProgress[] = [];

    for (const progress of allProgress) {
      if (!progress.tenant_context || !progress.isolation_key) {
        continue; // Skip legacy data
      }

      if (progress.isolation_key === currentKey) {
        // Direct ownership
        if (progress.model_name.startsWith('shared_')) {
          sharedModels.push(progress);
        } else {
          ownModels.push(progress);
        }
      } else if (this.validateAccess(progress)) {
        // Shared access through permissions
        sharedModels.push(progress);
      }
    }

    // Clean model names for display (remove shared_ prefix)
    const cleanedSharedModels = sharedModels.map((model) => ({
      ...model,
      model_name: model.model_name.replace(/^shared_/, ''),
      is_shared: true,
      sharing_metadata: model.sharing_metadata,
    }));

    const cleanedOwnModels = ownModels.map((model) => ({
      ...model,
      model_name: model.model_name.replace(/^shared_/, ''),
      is_shared: false,
    }));

    return {
      ownModels: cleanedOwnModels,
      sharedModels: cleanedSharedModels,
      totalModels: [...cleanedOwnModels, ...cleanedSharedModels],
    };
  }

  // Revoke sharing
  async revokeSharing(
    modelName: string,
    targetTenant: Partial<TenantContext>,
    revokedBy: string,
    reason?: string,
  ): Promise<boolean> {
    const targetKey = this.generateIsolationKey({
      serverId: targetTenant.serverId || this.currentTenant.serverId,
      projectId: targetTenant.projectId || this.currentTenant.projectId,
      codebaseHash: targetTenant.codebaseHash || this.currentTenant.codebaseHash,
      environment: targetTenant.environment || this.currentTenant.environment,
      organizationId: targetTenant.organizationId || this.currentTenant.organizationId,
    } as TenantContext);

    const allProgress = (await this.baseStorage.loadAIProgress()) as TenantAIProgress[];
    const sharedModel = allProgress.find(
      (p) =>
        p.isolation_key === targetKey &&
        (p.model_name === `shared_${modelName}` || p.model_name === modelName),
    );

    if (!sharedModel) {
      return false;
    }

    // Note: In real implementation, you'd delete from storage
    // For this demo, we'll mark as revoked
    sharedModel.sharing_metadata = {
      ...sharedModel.sharing_metadata,
      revoked: true,
      revoked_by: revokedBy,
      revoked_at: new Date().toISOString(),
      revocation_reason: reason,
    };

    await this.baseStorage.saveAIProgress(sharedModel);

    const auditLog: SharingAuditLog = {
      id: this.generateAuditId(),
      timestamp: new Date(),
      action: 'revoke',
      sourceIsolationKey: this.generateIsolationKey(this.currentTenant),
      targetIsolationKey: targetKey,
      modelName,
      userId: revokedBy,
      success: true,
      reason,
    };

    this.sharingAuditLog.push(auditLog);
    return true;
  }

  // Get sharing audit logs
  async getSharingAuditLogs(filters?: {
    modelName?: string;
    action?: string;
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<SharingAuditLog[]> {
    let logs = [...this.sharingAuditLog];

    if (filters) {
      if (filters.modelName) {
        logs = logs.filter((log) => log.modelName === filters.modelName);
      }
      if (filters.action) {
        logs = logs.filter((log) => log.action === filters.action);
      }
      if (filters.userId) {
        logs = logs.filter((log) => log.userId === filters.userId);
      }
      if (filters.fromDate) {
        logs = logs.filter((log) => log.timestamp >= filters.fromDate!);
      }
      if (filters.toDate) {
        logs = logs.filter((log) => log.timestamp <= filters.toDate!);
      }
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get sharing statistics
  async getSharingStats(): Promise<{
    modelsSharedByMe: number;
    modelsSharedWithMe: number;
    totalSharingActions: number;
    recentSharings: SharingAuditLog[];
    mostSharedModel?: string;
  }> {
    const allProgress = (await this.baseStorage.loadAIProgress()) as TenantAIProgress[];
    const currentKey = this.generateIsolationKey(this.currentTenant);

    // Count models shared by me (models with my key that are shared)
    const modelsSharedByMe = allProgress.filter(
      (p) =>
        p.tenant_context?.shared_from && p.sharing_metadata?.original_isolation_key === currentKey,
    ).length;

    // Count models shared with me (models I can access but don't own)
    const modelsSharedWithMe = allProgress.filter(
      (p) => p.isolation_key === currentKey && p.model_name.startsWith('shared_'),
    ).length;

    const recentSharings = this.sharingAuditLog
      .slice(-10)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Find most shared model
    const sharingCounts = new Map<string, number>();
    this.sharingAuditLog
      .filter((log) => log.action === 'share' && log.success)
      .forEach((log) => {
        const count = sharingCounts.get(log.modelName) || 0;
        sharingCounts.set(log.modelName, count + 1);
      });

    const mostSharedModel = Array.from(sharingCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      modelsSharedByMe,
      modelsSharedWithMe,
      totalSharingActions: this.sharingAuditLog.length,
      recentSharings,
      mostSharedModel,
    };
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Factory for creating enhanced sharing storage
export class EnhancedSharingStorageFactory {
  static create(
    storageType: 'memory' | 'database' | 'redis' | 'hybrid' | 'file',
    tenantContext: TenantContext,
    storageOptions?: any,
  ): EnhancedCrossTenantSharing {
    // This would extend the base factory
    const baseStorage = new (EnhancedCrossTenantSharing as any)(
      // Base storage creation logic here
      null, // baseStorage placeholder
      tenantContext,
    );

    return baseStorage;
  }

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
    },
  ): EnhancedCrossTenantSharing {
    const tenantContext: TenantContext = {
      serverId,
      projectId,
      codebaseHash,
      environment: options?.environment || process.env.NODE_ENV || 'development',
      userId: options?.userId,
      organizationId: options?.organizationId || 'default',
    };

    return this.create(storageType, tenantContext, options?.storageOptions);
  }
}

export default EnhancedCrossTenantSharing;
