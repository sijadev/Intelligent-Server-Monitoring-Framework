import { EventEmitter } from 'events';
import fs from 'fs-extra';
import * as path from 'path';
import { spawn } from 'child_process';
import { TestProfile, TestScenario, TestDataGenerationResult } from '@mcp-guard/test-manager';
import { getWorkspacePath, isCI, config } from '../config';
import { 
  loadDevelopmentConfig,
  isServiceEnabled,
  isServiceMockMode,
  isExternalServiceRequired,
  useGracefulFallback 
} from '../config/development-config';

// Types are now imported from @imf/test-manager package

interface TestManagerConfig {
  testManagerPath: string;
  workspacePath: string;
  profilesDir: string;
  outputDir: string;
  logsDir: string;
  maxConcurrentGeneration: number;
  defaultTimeout: number;
}

export class TestManagerService extends EventEmitter {
  private config: TestManagerConfig;
  private isInitialized: boolean = false;
  private activeGenerations: Map<string, Promise<TestDataGenerationResult>> = new Map();

  constructor(config?: Partial<TestManagerConfig>) {
    super();
    
    // Test Manager is now an npm package - no separate path needed
    const workspacePath = getWorkspacePath();
    
    this.config = {
      testManagerPath: workspacePath,
      workspacePath: workspacePath,
      profilesDir: 'profiles',
      outputDir: 'output',
      logsDir: 'logs',
      maxConcurrentGeneration: 3,
      defaultTimeout: 60000,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load development configuration
    await loadDevelopmentConfig();

    console.log('🔧 Initializing Test Manager Service...');

    // Check if service should be enabled
    if (!isServiceEnabled('testManager')) {
      console.log('📋 Test Manager Service disabled by development configuration');
      this.isInitialized = true;
      this.emit('initialized');
      return;
    }

    // Check if running in mock mode
    if (isServiceMockMode('testManager')) {
      console.log('🎭 Test Manager Service running in mock mode (development configuration)');
      await this.createWorkspaceStructure();
      this.isInitialized = true;
      this.emit('initialized');
      return;
    }

    try {
      // Create workspace structure
      await this.createWorkspaceStructure();

      // Test connection to npm package
      await this.testConnection();

      this.isInitialized = true;
      console.log('✅ Test Manager Service initialized successfully (npm package)');
      this.emit('initialized');

    } catch (error) {
      if (isCI()) {
        console.log('ℹ️  Test Manager Service not available in CI environment (expected)');
        this.isInitialized = true; // Mark as initialized in CI even if CLI fails
      } else if (useGracefulFallback()) {
        console.log('⚠️ Test Manager Service CLI not available, using graceful fallback');
        this.isInitialized = true; // Allow continuation with graceful fallback
      } else {
        console.error('❌ Failed to initialize Test Manager Service:', error);
        throw error; // Only throw when graceful fallback is disabled
      }
    }
  }

  private async createWorkspaceStructure(): Promise<void> {
    const workspacePath = this.config.workspacePath;
    
    await fs.ensureDir(path.join(workspacePath, this.config.profilesDir));
    await fs.ensureDir(path.join(workspacePath, this.config.outputDir));
    await fs.ensureDir(path.join(workspacePath, this.config.logsDir));

    // Create workspace config if it doesn't exist
    const configPath = path.join(workspacePath, 'mcp-guard-config.json');
    if (!await fs.pathExists(configPath)) {
      const config = {
        version: '1.0.0',
        created: new Date().toISOString(),
        profilesDir: `./${this.config.profilesDir}`,
        outputDir: `./${this.config.outputDir}`,
        logsDir: `./${this.config.logsDir}`
      };
      
      await fs.writeJson(configPath, config, { spaces: 2 });
    }
  }

  private async testConnection(): Promise<void> {
    // Check if the CLI exists first
    const cliPath = path.join(process.cwd(), 'node_modules/@mcp-guard/test-manager/dist/cli/simple-cli.js');
    
    if (!await fs.pathExists(cliPath)) {
      console.log('⚠️ Test Manager CLI not found, running in mock mode for development');
      // In development, we can run without the full CLI
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('⚠️ Test manager connection timeout, continuing in mock mode');
        resolve(); // Don't fail, just continue without CLI
      }, 5000); // Shorter timeout

      const testProcess = spawn('node', [cliPath, '--version'], {
        cwd: this.config.workspacePath,
        stdio: 'pipe'
      });

      testProcess.on('close', (code) => {
        clearTimeout(timeout);
        if (code === 0) {
          resolve();
        } else {
          if (config.NODE_ENV === 'development') {
            console.log(`⚠️ Test manager CLI returned code: ${code}, continuing in mock mode`);
            resolve(); // Don't fail in development
          } else {
            const errorMessage = isCI() ? 
              `Test manager CLI not available in CI (code: ${code})` :
              `Test manager CLI returned code: ${code}`;
            reject(new Error(errorMessage));
          }
        }
      });

      testProcess.on('error', (error) => {
        clearTimeout(timeout);
        if (config.NODE_ENV === 'development') {
          console.log(`⚠️ Test manager CLI error: ${error.message}, continuing in mock mode`);
          resolve(); // Don't fail in development
        } else {
          reject(error);
        }
      });
    });
  }

  // Profile Management
  async createProfile(profileData: Partial<TestProfile>): Promise<TestProfile> {
    if (!this.isInitialized) {
      throw new Error('Test Manager Service not initialized');
    }

    const profile: TestProfile = {
      id: `profile-${Date.now()}`,
      name: profileData.name || `Test Profile ${Date.now()}`,
      version: '1.0.0',
      description: profileData.description || 'Generated via MCP.Guard Test Manager Service',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceConfig: {
        directories: profileData.sourceConfig?.directories || ['./src'],
        languages: profileData.sourceConfig?.languages || ['typescript', 'javascript'],
        complexity: profileData.sourceConfig?.complexity || 'medium',
        excludePatterns: profileData.sourceConfig?.excludePatterns || ['node_modules', 'dist', '*.log']
      },
      scenarios: profileData.scenarios || [{
        id: 'main-scenario',  
        name: 'Main Test Scenario',
        type: 'performance',
        duration: 300,
        enabled: true,
        problemTypes: ['null_pointer', 'memory_leak', 'api_timeout'],
        codeInjection: {
          errorTypes: ['null_pointer', 'memory_leak', 'api_timeout'],
          frequency: 0.1,
          complexity: 'medium'
        },
        metrics: {
          cpuPattern: 'stable',
          memoryPattern: 'stable',
          logPattern: 'normal'
        }
      }],
      expectations: profileData.expectations || {
        detectionRate: 85,
        fixSuccessRate: 70,
        falsePositiveRate: 15,
        mlAccuracy: 80
      },
      generationRules: profileData.generationRules || {
        sampleCount: 1000,
        varianceLevel: 'medium',
        timespan: '1h',
        errorDistribution: {
          'null_pointer': 0.25,
          'memory_leak': 0.2,
          'api_timeout': 0.15,
          'logic_error': 0.4
        }
      }
    };

    // Save profile to workspace
    const profilePath = path.join(
      this.config.workspacePath,
      this.config.profilesDir,
      `${profile.id}.json`
    );

    await fs.writeJson(profilePath, profile, { spaces: 2 });

    this.emit('profile:created', profile);
    return profile;
  }

  async getProfiles(): Promise<TestProfile[]> {
    if (!this.isInitialized) {
      throw new Error('Test Manager Service not initialized');
    }

    const profilesDir = path.join(this.config.workspacePath, this.config.profilesDir);
    
    if (!await fs.pathExists(profilesDir)) {
      return [];
    }

    const files = await fs.readdir(profilesDir);
    const profileFiles = files.filter(f => f.endsWith('.json'));
    
    const profiles: TestProfile[] = [];
    
    for (const file of profileFiles) {
      try {
        const profilePath = path.join(profilesDir, file);
        const profile = await fs.readJson(profilePath);
        profiles.push(profile);
      } catch (error) {
        console.warn(`Failed to load profile ${file}:`, error.message);
      }
    }

    return profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getProfile(profileId: string): Promise<TestProfile | null> {
    if (!this.isInitialized) {
      throw new Error('Test Manager Service not initialized');
    }

    const profilePath = path.join(
      this.config.workspacePath,
      this.config.profilesDir,
      `${profileId}.json`
    );

    if (!await fs.pathExists(profilePath)) {
      return null;
    }

    return await fs.readJson(profilePath);
  }

  async updateProfile(profileId: string, updates: Partial<TestProfile>): Promise<TestProfile> {
    const existingProfile = await this.getProfile(profileId);
    if (!existingProfile) {
      throw new Error(`Profile ${profileId} not found`);
    }

    const updatedProfile = {
      ...existingProfile,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    const profilePath = path.join(
      this.config.workspacePath,
      this.config.profilesDir,
      `${profileId}.json`
    );

    await fs.writeJson(profilePath, updatedProfile, { spaces: 2 });

    this.emit('profile:updated', updatedProfile);
    return updatedProfile;
  }

  async deleteProfile(profileId: string): Promise<boolean> {
    const profilePath = path.join(
      this.config.workspacePath,
      this.config.profilesDir,
      `${profileId}.json`
    );

    if (!await fs.pathExists(profilePath)) {
      return false;
    }

    await fs.remove(profilePath);
    this.emit('profile:deleted', profileId);
    return true;
  }

  // Test Data Generation
  async generateTestData(profileId: string): Promise<TestDataGenerationResult> {
    if (!this.isInitialized) {
      throw new Error('Test Manager Service not initialized');
    }

    // Check if generation is already in progress
    if (this.activeGenerations.has(profileId)) {
      return await this.activeGenerations.get(profileId)!;
    }

    // Check concurrent generation limit
    if (this.activeGenerations.size >= this.config.maxConcurrentGeneration) {
      throw new Error('Maximum concurrent generations reached. Please try again later.');
    }

    const generationPromise = this.performGeneration(profileId);
    this.activeGenerations.set(profileId, generationPromise);

    try {
      const result = await generationPromise;
      return result;
    } finally {
      this.activeGenerations.delete(profileId);
    }
  }

  private async performGeneration(profileId: string): Promise<TestDataGenerationResult> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Test data generation timeout'));
      }, this.config.defaultTimeout);

      this.emit('generation:started', profileId);

      // Use absolute paths for CLI
      const profilesPath = path.resolve(this.config.workspacePath, this.config.profilesDir);
      const outputPath = path.resolve(this.config.workspacePath, this.config.outputDir);
      
      console.log(`🚀 Starting test data generation for ${profileId} using npm package`);
      console.log(`📁 Profiles path: ${profilesPath}`);
      console.log(`📤 Output path: ${outputPath}`);
      
      const generateProcess = spawn('node', [
        path.join(process.cwd(), 'node_modules/@mcp-guard/test-manager/dist/cli/simple-cli.js'),
        'generate', profileId,
        '--profiles', profilesPath,
        '--output', outputPath
      ], {
        cwd: this.config.workspacePath,
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      generateProcess.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      generateProcess.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      generateProcess.on('close', async (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          try {
            // Find the generated file
            const outputDir = path.join(this.config.workspacePath, this.config.outputDir);
            const files = await fs.readdir(outputDir);
            const generatedFile = files
              .filter(f => f.startsWith(`testdata-${profileId}-`))
              .sort()
              .pop();

            if (!generatedFile) {
              throw new Error('Generated test data file not found');
            }

            const resultPath = path.join(outputDir, generatedFile);
            const result = await fs.readJson(resultPath);

            this.emit('generation:completed', profileId, result);
            resolve(result);
          } catch (error) {
            this.emit('generation:failed', profileId, error);
            reject(error);
          }
        } else {
          const error = new Error(`Test data generation failed: ${stderr || stdout}`);
          this.emit('generation:failed', profileId, error);
          reject(error);
        }
      });

      generateProcess.on('error', (error) => {
        clearTimeout(timeout);
        this.emit('generation:failed', profileId, error);
        reject(error);
      });
    });
  }

  async getGeneratedData(profileId?: string): Promise<TestDataGenerationResult[]> {
    const outputDir = path.join(this.config.workspacePath, this.config.outputDir);
    
    if (!await fs.pathExists(outputDir)) {
      return [];
    }

    const files = await fs.readdir(outputDir);
    let dataFiles = files.filter(f => f.startsWith('testdata-') && f.endsWith('.json'));

    if (profileId) {
      dataFiles = dataFiles.filter(f => f.includes(profileId));
    }

    const results: TestDataGenerationResult[] = [];
    
    for (const file of dataFiles) {
      try {
        const filePath = path.join(outputDir, file);
        const data = await fs.readJson(filePath);
        results.push(data);
      } catch (error) {
        console.warn(`Failed to load generated data ${file}:`, error.message);
      }
    }

    return results.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  }

  // Status and Health
  getHealthStatus(): { healthy: boolean; details: any } {
    return {
      healthy: this.isInitialized,
      details: {
        initialized: this.isInitialized,
        activeGenerations: this.activeGenerations.size,
        maxConcurrentGeneration: this.config.maxConcurrentGeneration,
        workspacePath: this.config.workspacePath,
        testManagerPath: this.config.testManagerPath
      }
    };
  }

  getStatus() {
    const status = {
      initialized: this.isInitialized,
      active: this.isInitialized,
      activeGenerations: Array.from(this.activeGenerations.keys()),
      generationCapacity: this.config.maxConcurrentGeneration - this.activeGenerations.size,
      config: {
        workspacePath: this.config.workspacePath,
        profilesDir: this.config.profilesDir,
        outputDir: this.config.outputDir
      }
    };
    
    console.log('📊 Test Manager Status:', JSON.stringify(status, null, 2));
    return status;
  }

  async cleanup(): Promise<void> {
    // Cancel active generations (if possible)
    this.activeGenerations.clear();
    console.log('🧹 Test Manager Service cleaned up');
    this.emit('cleanup');
  }
}

// Singleton instance
let testManagerService: TestManagerService | null = null;

export function createTestManagerService(config?: Partial<TestManagerConfig>): TestManagerService {
  if (!testManagerService) {
    testManagerService = new TestManagerService(config);
  }
  return testManagerService;
}

export function getTestManagerService(): TestManagerService {
  if (!testManagerService) {
    throw new Error('Test Manager Service not initialized. Call createTestManagerService first.');
  }
  return testManagerService;
}