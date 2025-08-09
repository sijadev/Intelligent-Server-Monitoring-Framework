/**
 * Production-Ready AI Progress Storage Solutions
 * Alternatives to file-based storage for production environments
 */

import { readFile, writeFile } from 'fs/promises';
import path from 'path';

// Interface for AI Progress Data
export interface AIProgress {
  model_name: string;
  training_start: string;
  training_end: string;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1_score?: number;
  mse: number;
  training_samples: number;
  validation_samples: number;
  feature_count: number;
  training_time_seconds: number;
  cross_validation_score: number;
  model_size_mb: number;
  learning_curve_data: number[];
  [key: string]: any; // For extended properties
}

// Abstract base class for AI Progress Storage
export abstract class AIProgressStorage {
  abstract saveProgress(progress: AIProgress): Promise<void>;
  abstract loadProgress(): Promise<AIProgress[]>;
  abstract getLatestProgress(modelName: string): Promise<AIProgress | null>;
  abstract clearProgress(): Promise<void>;
}

// 1. IN-MEMORY STORAGE (Development/Testing)
export class InMemoryAIProgressStorage extends AIProgressStorage {
  private progress: AIProgress[] = [];

  async saveProgress(progress: AIProgress): Promise<void> {
    // Remove old versions of the same model
    this.progress = this.progress.filter((p) => p.model_name !== progress.model_name);
    this.progress.push({ ...progress, updated_at: new Date().toISOString() });
    console.log(`💾 In-Memory: Saved ${progress.model_name}`);
  }

  async loadProgress(): Promise<AIProgress[]> {
    return [...this.progress];
  }

  async getLatestProgress(modelName: string): Promise<AIProgress | null> {
    return this.progress.find((p) => p.model_name === modelName) || null;
  }

  async clearProgress(): Promise<void> {
    this.progress = [];
  }
}

// 2. DATABASE STORAGE (Production Recommended)
export class DatabaseAIProgressStorage extends AIProgressStorage {
  constructor(private db: any) {} // Database connection

  async saveProgress(progress: AIProgress): Promise<void> {
    const query = `
      INSERT INTO ai_progress (
        model_name, training_start, training_end, accuracy, precision, recall,
        f1_score, mse, training_samples, validation_samples, feature_count,
        training_time_seconds, cross_validation_score, model_size_mb,
        learning_curve_data, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(model_name) DO UPDATE SET
        training_end = excluded.training_end,
        accuracy = excluded.accuracy,
        mse = excluded.mse,
        training_samples = excluded.training_samples,
        metadata = excluded.metadata,
        updated_at = CURRENT_TIMESTAMP
    `;

    await this.db.run(query, [
      progress.model_name,
      progress.training_start,
      progress.training_end,
      progress.accuracy,
      progress.precision,
      progress.recall,
      progress.f1_score,
      progress.mse,
      progress.training_samples,
      progress.validation_samples,
      progress.feature_count,
      progress.training_time_seconds,
      progress.cross_validation_score,
      progress.model_size_mb,
      JSON.stringify(progress.learning_curve_data),
      JSON.stringify(progress),
      new Date().toISOString(),
    ]);

    console.log(`🗄️  Database: Saved ${progress.model_name}`);
  }

  async loadProgress(): Promise<AIProgress[]> {
    const rows = await this.db.all('SELECT metadata FROM ai_progress ORDER BY created_at DESC');
    return rows.map((row: any) => JSON.parse(row.metadata));
  }

  async getLatestProgress(modelName: string): Promise<AIProgress | null> {
    const row = await this.db.get(
      'SELECT metadata FROM ai_progress WHERE model_name = ? ORDER BY created_at DESC LIMIT 1',
      [modelName],
    );
    return row ? JSON.parse(row.metadata) : null;
  }

  async clearProgress(): Promise<void> {
    await this.db.run('DELETE FROM ai_progress');
  }
}

// 3. REDIS STORAGE (High Performance, Distributed)
export class RedisAIProgressStorage extends AIProgressStorage {
  constructor(private redis: any) {} // Redis client

  private getKey(modelName: string): string {
    return `ai_progress:${modelName}`;
  }

  private getAllKey(): string {
    return 'ai_progress:all';
  }

  async saveProgress(progress: AIProgress): Promise<void> {
    const key = this.getKey(progress.model_name);
    const allKey = this.getAllKey();

    // Use Redis transaction for atomicity
    const multi = this.redis.multi();
    multi.hset(key, {
      data: JSON.stringify(progress),
      updated_at: new Date().toISOString(),
      model_name: progress.model_name,
    });
    multi.sadd(allKey, progress.model_name);
    multi.expire(key, 86400 * 30); // 30 days TTL

    await multi.exec();
    console.log(`⚡ Redis: Saved ${progress.model_name}`);
  }

  async loadProgress(): Promise<AIProgress[]> {
    const modelNames = await this.redis.smembers(this.getAllKey());
    const progress: AIProgress[] = [];

    for (const modelName of modelNames) {
      const data = await this.redis.hget(this.getKey(modelName), 'data');
      if (data) {
        progress.push(JSON.parse(data));
      }
    }

    return progress;
  }

  async getLatestProgress(modelName: string): Promise<AIProgress | null> {
    const data = await this.redis.hget(this.getKey(modelName), 'data');
    return data ? JSON.parse(data) : null;
  }

  async clearProgress(): Promise<void> {
    const modelNames = await this.redis.smembers(this.getAllKey());
    if (modelNames.length > 0) {
      const keys = modelNames.map((name: string) => this.getKey(name));
      await this.redis.del(...keys, this.getAllKey());
    }
  }
}

// 4. HYBRID STORAGE (Database + Cache)
export class HybridAIProgressStorage extends AIProgressStorage {
  constructor(
    private database: DatabaseAIProgressStorage,
    private cache: RedisAIProgressStorage,
  ) {}

  async saveProgress(progress: AIProgress): Promise<void> {
    // Save to both database and cache
    await Promise.all([this.database.saveProgress(progress), this.cache.saveProgress(progress)]);
    console.log(`🔄 Hybrid: Saved ${progress.model_name} to DB + Cache`);
  }

  async loadProgress(): Promise<AIProgress[]> {
    // Try cache first, fallback to database
    try {
      const cached = await this.cache.loadProgress();
      if (cached.length > 0) {
        console.log('📊 Hybrid: Loaded from cache');
        return cached;
      }
    } catch (error) {
      console.warn('⚠️ Cache unavailable, using database');
    }

    const dbData = await this.database.loadProgress();

    // Populate cache asynchronously
    dbData.forEach((progress) => {
      this.cache.saveProgress(progress).catch(console.warn);
    });

    return dbData;
  }

  async getLatestProgress(modelName: string): Promise<AIProgress | null> {
    // Try cache first
    try {
      const cached = await this.cache.getLatestProgress(modelName);
      if (cached) return cached;
    } catch (error) {
      console.warn('⚠️ Cache miss, querying database');
    }

    return await this.database.getLatestProgress(modelName);
  }

  async clearProgress(): Promise<void> {
    await Promise.all([this.database.clearProgress(), this.cache.clearProgress()]);
  }
}

// 5. FILE STORAGE (Current Implementation - for comparison)
export class FileAIProgressStorage extends AIProgressStorage {
  private filePath: string;

  constructor(filePath?: string) {
    super();
    this.filePath =
      filePath || path.join(process.cwd(), 'python-framework/ai_models/training_metrics.json');
  }

  async saveProgress(progress: AIProgress): Promise<void> {
    try {
      const existing = await this.loadProgress();
      const updated = existing.filter((p) => p.model_name !== progress.model_name);
      updated.push(progress);

      await writeFile(this.filePath, JSON.stringify(updated, null, 2));
      console.log(`📁 File: Saved ${progress.model_name}`);
    } catch (error) {
      console.error('❌ File save failed:', error);
      throw error;
    }
  }

  async loadProgress(): Promise<AIProgress[]> {
    try {
      const data = await readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('⚠️ No existing progress file, starting fresh');
      return [];
    }
  }

  async getLatestProgress(modelName: string): Promise<AIProgress | null> {
    const all = await this.loadProgress();
    return all.find((p) => p.model_name === modelName) || null;
  }

  async clearProgress(): Promise<void> {
    await writeFile(this.filePath, '[]');
  }
}

// FACTORY PATTERN - Choose storage based on environment
export class AIProgressStorageFactory {
  static create(
    type: 'memory' | 'database' | 'redis' | 'hybrid' | 'file' = 'file',
    options?: any,
  ): AIProgressStorage {
    switch (type) {
      case 'memory':
        return new InMemoryAIProgressStorage();

      case 'database':
        if (!options?.db) throw new Error('Database connection required');
        return new DatabaseAIProgressStorage(options.db);

      case 'redis':
        if (!options?.redis) throw new Error('Redis client required');
        return new RedisAIProgressStorage(options.redis);

      case 'hybrid':
        if (!options?.db || !options?.redis) throw new Error('Both database and Redis required');
        return new HybridAIProgressStorage(
          new DatabaseAIProgressStorage(options.db),
          new RedisAIProgressStorage(options.redis),
        );

      case 'file':
      default:
        return new FileAIProgressStorage(options?.filePath);
    }
  }
}

// USAGE EXAMPLES:

// Development
// const storage = AIProgressStorageFactory.create('memory');

// Production with Database
// const storage = AIProgressStorageFactory.create('database', { db: dbConnection });

// High Performance
// const storage = AIProgressStorageFactory.create('hybrid', { db: dbConnection, redis: redisClient });

export { AIProgressStorageFactory as default };
