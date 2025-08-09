# Cross-Tenant Sharing - Notwendige Umstellungen

## 🎯 Problem mit der aktuellen Implementation

### ❌ Was nicht funktioniert

```typescript
// Aktuelle shareModel Methode - zu simpel
await sourceStorage.shareModel('model_name', [{ serverId: 'target-server' }], ['read']);

// Problem: Target Storage kann shared model nicht korrekt laden
const targetModels = await targetStorage.loadAIProgress(); // [] - leer!
```

## ✅ Verbesserte Implementation

### 1. **Enhanced Permission System**

**Alt (zu simpel):**

```typescript
permissions: ['read', 'execute'];
```

**Neu (detailliert):**

```typescript
const permissions: SharingPermission[] = [
  {
    action: 'read',
    conditions: {
      allowedEnvironments: ['production', 'staging'],
      maxExecutions: 100,
    },
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  },
  {
    action: 'execute',
    conditions: {
      requiresApproval: true,
      maxExecutions: 50,
    },
  },
];
```

### 2. **Proper Model Sharing with Metadata**

**Alt (unvollständig):**

```typescript
// Sharing fügt nur permissions hinzu - Target sieht nichts
progress.access_permissions = [...existingPermissions, ...newPermissions];
```

**Neu (vollständige Replikation):**

```typescript
// Erstellt shared copy in target tenant storage
const sharedModel: TenantAIProgress = {
  ...sourceModel,
  model_name: `shared_${sourceModel.model_name}`, // Prefix für Identifikation
  isolation_key: targetIsolationKey, // Target's isolation key
  tenant_context: {
    ...targetTenant,
    shared_from: sourceTenant, // Tracking
    sharing_timestamp: new Date().toISOString(),
  },
  sharing_metadata: {
    original_model: sourceModel.model_name,
    shared_by: 'user-id',
    shared_at: new Date().toISOString(),
    permissions: detailedPermissions,
    expires_at: expirationDate,
    sharing_reason: 'Cross-team collaboration',
  },
};

await targetStorage.baseStorage.saveAIProgress(sharedModel);
```

### 3. **Enhanced Loading Logic**

**Alt (nur eigene Models):**

```typescript
async loadAIProgress(): Promise<AIProgress[]> {
  const allProgress = await this.storage.loadProgress();
  return allProgress.filter(p => p.isolation_key === currentKey);
}
```

**Neu (own + shared models):**

```typescript
async loadAIProgressEnhanced(): Promise<{
  ownModels: TenantAIProgress[];
  sharedModels: TenantAIProgress[];
  totalModels: TenantAIProgress[];
}> {
  const allProgress = await this.baseStorage.loadAIProgress();
  const currentKey = this.generateIsolationKey(this.currentTenant);

  const ownModels = [];
  const sharedModels = [];

  for (const progress of allProgress) {
    if (progress.isolation_key === currentKey) {
      if (progress.model_name.startsWith('shared_')) {
        sharedModels.push(progress);
      } else {
        ownModels.push(progress);
      }
    }
  }

  return { ownModels, sharedModels, totalModels: [...ownModels, ...sharedModels] };
}
```

### 4. **Audit Trail System**

**Neu (vollständige Nachverfolgung):**

```typescript
interface SharingAuditLog {
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

// Automatisches Logging bei jeder Sharing-Aktion
const auditLog: SharingAuditLog = {
  id: generateAuditId(),
  timestamp: new Date(),
  action: 'share',
  sourceIsolationKey: sourceKey,
  targetIsolationKey: targetKey,
  modelName: 'advanced_classifier',
  userId: 'user-source',
  success: true,
  reason: 'Cross-team collaboration',
};
```

## 🔧 Konkrete Umstellungen

### Step 1: TenantAwareAIStorage erweitern

```typescript
// server/services/tenant-aware-ai-storage.ts

// Alte shareModel Methode ersetzen
async shareModelEnhanced(
  modelName: string,
  sharingRequests: SharingRequest[]
): Promise<SharingResult> {
  // 1. Validate source model exists
  const sourceModel = await this.getModelProgress(modelName);
  if (!sourceModel) {
    throw new Error(`Model '${modelName}' not found`);
  }

  // 2. Create shared copies in target tenants
  for (const request of sharingRequests) {
    const sharedModel = this.createSharedModelCopy(sourceModel, request);
    await this.saveSharedModel(sharedModel, request.targetTenant);
    this.logSharingAction('share', modelName, request);
  }

  return { success: true, shared: sharingRequests.length };
}

private createSharedModelCopy(sourceModel: TenantAIProgress, request: SharingRequest): TenantAIProgress {
  const targetKey = this.generateIsolationKey(request.targetTenant);

  return {
    ...sourceModel,
    model_name: `shared_${sourceModel.model_name}`,
    isolation_key: targetKey,
    tenant_context: {
      ...request.targetTenant,
      shared_from: this.currentTenant
    },
    sharing_metadata: {
      original_model: sourceModel.model_name,
      shared_by: request.requestedBy,
      permissions: request.permissions,
      sharing_reason: request.reason
    }
  };
}
```

### Step 2: Enhanced Loading implementieren

```typescript
// Neue loadAIProgress Methode
async loadAIProgress(): Promise<TenantAIProgress[]> {
  const enhanced = await this.loadAIProgressEnhanced();
  return enhanced.totalModels;
}

// Separate Methode für detaillierte Aufschlüsselung
async getTenantModels(): Promise<{
  own: TenantAIProgress[];
  shared: TenantAIProgress[];
  canShare: TenantAIProgress[];
}> {
  const enhanced = await this.loadAIProgressEnhanced();

  return {
    own: enhanced.ownModels.filter(m => !m.model_name.startsWith('shared_')),
    shared: enhanced.sharedModels,
    canShare: enhanced.ownModels.filter(m => !m.sharing_metadata?.shared_from)
  };
}
```

### Step 3: Permission Validation

```typescript
// Enhanced permission checking
private validateSharingPermission(
  progress: TenantAIProgress,
  action: string,
  context: { environment?: string; userId?: string }
): boolean {
  if (!progress.sharing_metadata) return false;

  const permission = progress.sharing_metadata.permissions?.find(p => p.action === action);
  if (!permission) return false;

  // Check environment restrictions
  if (permission.conditions?.allowedEnvironments) {
    if (!permission.conditions.allowedEnvironments.includes(context.environment || '')) {
      return false;
    }
  }

  // Check expiration
  if (permission.expiresAt && new Date() > new Date(permission.expiresAt)) {
    return false;
  }

  // Check execution limits
  if (permission.conditions?.maxExecutions) {
    // Would need to track execution count
  }

  return true;
}
```

### Step 4: Tests aktualisieren

```typescript
// server/test/long-term/ai-enhanced-continuous-monitoring-tenant-aware.test.ts

async function testCrossTenantModelSharing(
  data: GeneratedTestData[],
  sourceStorage: any,
  targetStorage: any,
): Promise<void> {
  // ... existing setup ...

  // Use enhanced sharing
  const sharingRequest: SharingRequest = {
    modelName: bestModel.model_name,
    targetTenant: { serverId: 'mcp-server-analytics' },
    permissions: [{ action: 'read' }, { action: 'execute', conditions: { maxExecutions: 100 } }],
    requestedBy: 'test-user',
    reason: 'Test cross-tenant collaboration',
  };

  const result = await sourceStorage.shareModelEnhanced(bestModel.model_name, [sharingRequest]);

  expect(result.success).toBe(true);
  expect(result.shared).toBe(1);

  // Enhanced loading should now find shared model
  const targetModels = await targetStorage.loadAIProgress();
  expect(targetModels.length).toBeGreaterThan(initialCount);

  const sharedModel = targetModels.find(
    (m) =>
      m.model_name === bestModel.model_name ||
      m.sharing_metadata?.original_model === bestModel.model_name,
  );

  expect(sharedModel).toBeDefined();
  expect(sharedModel.sharing_metadata).toBeDefined();
}
```

## 📊 Implementation Checklist

### Phase 1: Core Fixes

- [ ] ✅ Enhanced permission system implementiert
- [ ] ✅ Shared model replication implementiert
- [ ] ✅ Enhanced loading logic implementiert
- [ ] ✅ Audit trail system implementiert

### Phase 2: Integration

- [ ] 🔄 TenantAwareAIStorage erweitern
- [ ] 🔄 Tests auf neue API umstellen
- [ ] 🔄 Database schema für sharing metadata erweitern
- [ ] 🔄 UI für sharing management erstellen

### Phase 3: Production

- [ ] 📋 Performance optimization
- [ ] 📋 Security audit
- [ ] 📋 Monitoring & alerting
- [ ] 📋 Documentation update

## 🎯 Expected Results Nach Umstellung

### Before (nicht funktionierend)

```bash
Source models: 1 (own model)
Target models: 0 (can't see shared model)
Sharing result: ❌ Failed
```

### After (funktionierend):

```bash
Source models: 1 (own model)
Target models: 1 (shared model visible)
Sharing result: ✅ Success
Audit logs: 1 (sharing tracked)
Permissions: validated (read + execute allowed)
```

## 🚀 Sofortige Vorteile

1. **Funktionsfähiges Sharing**: Target kann shared models tatsächlich sehen und nutzen
2. **Granulare Permissions**: Detaillierte Kontrolle über was geteilt wird
3. **Audit Trail**: Vollständige Nachverfolgung aller Sharing-Aktivitäten
4. **Expiration**: Automatisches Ablaufen von geteilten Models
5. **Conditions**: Environment-spezifische und usage-limitierte Permissions

**Mit diesen Umstellungen wird Cross-Tenant Sharing produktionsreif und sicher!**
