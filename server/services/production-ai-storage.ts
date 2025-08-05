/**
 * Production-Ready AI Storage Implementation
 * Replaces file-based storage with proper production solutions
 */

import { AIProgressStorageFactory, AIProgress } from './ai-progress-storage.js';

// Configuration based on environment
interface StorageConfig {
  type: 'memory' | 'database' | 'redis' | 'hybrid' | 'file';
  options?: {
    db?: any;
    redis?: any;
    filePath?: string;
    connectionString?: string;
  };
}

export class ProductionAIStorage {
  private storage: any;
  private config: StorageConfig;
  
  constructor(config?: StorageConfig) {
    this.config = config || this.getDefaultConfig();
    this.storage = AIProgressStorageFactory.create(this.config.type, this.config.options);
  }
  
  private getDefaultConfig(): StorageConfig {
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    if (isProduction) {
      // Production: Use hybrid storage (DB + Redis)
      return {
        type: 'hybrid',
        options: {
          // These would be injected in real production
          connectionString: process.env.DATABASE_URL,
        }
      };
    } else if (isCI) {
      // CI: Use in-memory storage (no persistence needed)
      return { type: 'memory' };
    } else {
      // Development: Use file storage (current behavior)
      return { type: 'file' };
    }
  }
  
  // Main API - matches current file-based API
  async saveAIProgress(progress: AIProgress): Promise<void> {
    try {
      await this.storage.saveProgress(progress);
      console.log(`✅ AI Progress saved: ${progress.model_name} (${this.config.type})`);
    } catch (error) {
      console.error(`❌ Failed to save AI progress:`, error);
      throw error;
    }
  }
  
  async loadAIProgress(): Promise<AIProgress[]> {
    try {
      const progress = await this.storage.loadProgress();
      console.log(`📊 Loaded ${progress.length} AI models (${this.config.type})`);
      return progress;
    } catch (error) {
      console.error(`❌ Failed to load AI progress:`, error);
      return []; // Graceful fallback
    }
  }
  
  async getModelProgress(modelName: string): Promise<AIProgress | null> {
    try {
      return await this.storage.getLatestProgress(modelName);
    } catch (error) {
      console.error(`❌ Failed to get model progress for ${modelName}:`, error);
      return null;
    }
  }
  
  // Production-specific methods
  async healthCheck(): Promise<boolean> {
    try {
      await this.storage.loadProgress();
      return true;
    } catch (error) {
      console.error('❌ AI Storage health check failed:', error);
      return false;
    }
  }
  
  async getStorageInfo(): Promise<{type: string, healthy: boolean, modelCount: number}> {
    const healthy = await this.healthCheck();
    const models = healthy ? await this.loadAIProgress() : [];
    
    return {
      type: this.config.type,
      healthy,
      modelCount: models.length
    };
  }
  
  // Migration helper (for moving from file to production storage)
  async migrateFromFile(filePath?: string): Promise<number> {
    const fileStorage = AIProgressStorageFactory.create('file', { filePath });
    const fileData = await fileStorage.loadProgress();
    
    let migrated = 0;
    for (const progress of fileData) {
      try {
        await this.saveAIProgress(progress);
        migrated++;
      } catch (error) {
        console.error(`Failed to migrate ${progress.model_name}:`, error);
      }
    }
    
    console.log(`📦 Migrated ${migrated}/${fileData.length} AI models from file`);
    return migrated;
  }
}

// Singleton instance for global access
let globalAIStorage: ProductionAIStorage | null = null;

export function getAIStorage(config?: StorageConfig): ProductionAIStorage {
  if (!globalAIStorage) {
    globalAIStorage = new ProductionAIStorage(config);
  }
  return globalAIStorage;
}

// Helper functions that match current API
export async function loadAIModels(): Promise<AIProgress[]> {
  const storage = getAIStorage();
  return await storage.loadAIProgress();
}

export async function saveAIModel(progress: AIProgress): Promise<void> {
  const storage = getAIStorage();
  await storage.saveAIProgress(progress);
}

// Production deployment configurations
export const PRODUCTION_CONFIGS = {
  // For Docker/Kubernetes with PostgreSQL + Redis
  kubernetes: {
    type: 'hybrid' as const,
    options: {
      connectionString: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
    }
  },
  
  // For serverless environments (no persistent storage)
  serverless: {
    type: 'database' as const,
    options: {
      connectionString: process.env.DATABASE_URL,
    }
  },
  
  // For high-performance scenarios
  performance: {
    type: 'redis' as const,
    options: {
      redisUrl: process.env.REDIS_URL,
    }
  },
  
  // For development/testing
  development: {
    type: 'file' as const,
    options: {
      filePath: './python-framework/ai_models/training_metrics.json'
    }
  }
};

export default ProductionAIStorage;