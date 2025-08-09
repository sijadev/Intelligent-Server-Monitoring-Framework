import { storage } from './storage-init';

async function ensureDefaultConfig() {
  try {
    console.log('🔧 Checking for framework configuration...');

    const existingConfig = await storage.getFrameworkConfig();

    if (!existingConfig) {
      console.log('📝 Creating default framework configuration...');

      const defaultConfig = {
        serverType: 'generic',
        monitoringInterval: 30,
        learningEnabled: true,
        autoRemediation: false,
        logLevel: 'INFO',
        dataDir: '/tmp/imf',
        logFiles: [
          { path: '/var/log/system.log', type: 'system' },
          { path: '/var/log/app.log', type: 'application' },
        ],
        sourceDirectories: [
          '/Users/simonjanke/Projects/IMF',
          '/Users/simonjanke/Projects/IMF/server',
          '/Users/simonjanke/Projects/IMF/client',
        ],
        codeAnalysisEnabled: true,
        autoFixEnabled: false,
        confidenceThreshold: 80,
        backupDirectory: '/tmp/imf-backups',
        updatedAt: new Date(),
      };

      await storage.updateFrameworkConfig(defaultConfig);
      console.log('✅ Default framework configuration created');
    } else {
      console.log('✅ Framework configuration already exists');
    }
  } catch (error) {
    console.error('❌ Error ensuring default config:', error);
  }
}

// Auto-run when imported
ensureDefaultConfig();

export { ensureDefaultConfig };
