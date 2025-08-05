#!/usr/bin/env node

/**
 * Robust JSON Test Data Generator for IMF CI
 * Ensures proper JSON formatting and prevents parsing errors
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const TEST_WORKSPACE_DIR = './test-workspace';
const PROFILES = [
  {
    id: 'ci-profile-low',
    name: 'CI Low Complexity',
    complexity: 'low',
    problemTypes: ['null_pointer', 'memory_leak', 'api_timeout'],
    expectations: { detectionRate: 85, fixSuccessRate: 70, falsePositiveRate: 15, mlAccuracy: 80 }
  },
  {
    id: 'ci-profile-medium', 
    name: 'CI Medium Complexity',
    complexity: 'medium',
    problemTypes: ['type_mismatch', 'syntax_error', 'null_pointer'],
    expectations: { detectionRate: 80, fixSuccessRate: 65, falsePositiveRate: 20, mlAccuracy: 75 }
  },
  {
    id: 'ci-profile-high',
    name: 'CI High Complexity', 
    complexity: 'high',
    problemTypes: ['type_mismatch', 'syntax_error', 'memory_leak', 'api_timeout'],
    expectations: { detectionRate: 75, fixSuccessRate: 60, falsePositiveRate: 25, mlAccuracy: 70 }
  }
];

function generateRandomFloat(min, max, decimals = 3) {
  const value = Math.random() * (max - min) + min;
  return parseFloat(value.toFixed(decimals));
}

function generateRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createProfile(profileConfig) {
  const timestamp = new Date().toISOString();
  
  return {
    id: profileConfig.id,
    name: profileConfig.name,
    version: "1.0.0",
    description: `CI test profile for ${profileConfig.complexity} complexity scenarios`,
    createdAt: timestamp,
    updatedAt: timestamp,
    sourceConfig: {
      directories: ["./src", "./server"],
      languages: ["typescript", "javascript"],
      complexity: profileConfig.complexity,
      excludePatterns: ["node_modules", "dist", "*.log"]
    },
    scenarios: [
      {
        id: "main-scenario",
        name: "Main Test Scenario",
        type: profileConfig.complexity === 'high' ? 'stress' : 
              profileConfig.complexity === 'medium' ? 'performance' : 'integration',
        duration: 300,
        enabled: true,
        problemTypes: profileConfig.problemTypes,
        codeInjection: {
          errorTypes: profileConfig.problemTypes,
          frequency: profileConfig.complexity === 'high' ? 0.2 : 
                    profileConfig.complexity === 'medium' ? 0.15 : 0.1,
          complexity: profileConfig.complexity
        },
        metrics: {
          cpuPattern: profileConfig.complexity === 'high' ? 'spike' : 
                     profileConfig.complexity === 'medium' ? 'variable' : 'stable',
          memoryPattern: profileConfig.complexity === 'high' ? 'growing' : 'stable',
          logPattern: profileConfig.complexity === 'low' ? 'normal' : 'verbose'
        }
      }
    ],
    expectations: profileConfig.expectations,
    generationRules: {
      sampleCount: profileConfig.complexity === 'high' ? 1000 : 
                  profileConfig.complexity === 'medium' ? 750 : 500,
      varianceLevel: profileConfig.complexity,
      timespan: profileConfig.complexity === 'high' ? '1h' : 
               profileConfig.complexity === 'medium' ? '45m' : '30m',
      errorDistribution: profileConfig.problemTypes.reduce((dist, type, index, arr) => {
        dist[type] = parseFloat((1.0 / arr.length).toFixed(3));
        return dist;
      }, {})
    }
  };
}

function createTestData(profileConfig) {
  const timestamp = new Date().toISOString();
  const profile = createProfile(profileConfig);
  
  // Generate realistic success rate based on complexity
  const baseRate = profileConfig.complexity === 'high' ? 0.65 : 
                   profileConfig.complexity === 'medium' ? 0.75 : 0.85;
  const successRate = generateRandomFloat(baseRate - 0.1, baseRate + 0.1);
  
  return {
    profileId: profileConfig.id,
    generatedAt: timestamp,
    generationDuration: generateRandomInt(1000, 5000),
    data: {
      logFiles: [],
      metricStreams: [],
      codeProblems: [],
      scenarios: [
        {
          scenarioId: "main-scenario",
          name: "Main Test Scenario",
          executedAt: timestamp,
          duration: 300000,
          statistics: {
            problemsInjected: generateRandomInt(10, 50),
            metricsGenerated: generateRandomInt(200, 500),
            logsGenerated: generateRandomInt(1000, 2000),
            successRate: successRate // Guaranteed proper float formatting
          }
        }
      ]
    },
    statistics: {
      totalLogEntries: generateRandomInt(2000, 6000),
      totalMetricPoints: generateRandomInt(1500, 3000),
      totalCodeProblems: generateRandomInt(20, 100),
      dataSize: generateRandomInt(100000, 250000)
    },
    metadata: {
      generatorVersion: "1.0.0-ci",
      profile: profile
    }
  };
}

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function generateAllTestData() {
  console.log('🚀 Starting robust JSON test data generation...');
  
  // Create directories
  const directories = ['profiles', 'output', 'logs'];
  directories.forEach(dir => {
    ensureDirectoryExists(path.join(TEST_WORKSPACE_DIR, dir));
  });
  
  // Generate profiles and test data
  const generatedFiles = [];
  
  PROFILES.forEach(profileConfig => {
    try {
      // Generate profile
      const profile = createProfile(profileConfig);
      const profilePath = path.join(TEST_WORKSPACE_DIR, 'profiles', `${profileConfig.id}.json`);
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      console.log(`✅ Generated profile: ${profileConfig.id}`);
      
      // Generate test data
      const testData = createTestData(profileConfig);
      const timestamp = Date.now();
      const testDataPath = path.join(TEST_WORKSPACE_DIR, 'output', `testdata-${profileConfig.id}-${timestamp}-ci.json`);
      fs.writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
      console.log(`✅ Generated test data: ${profileConfig.id} (${testData.data.scenarios[0].statistics.successRate})`);
      
      generatedFiles.push({
        profile: profilePath,
        testData: testDataPath,
        successRate: testData.data.scenarios[0].statistics.successRate
      });
      
    } catch (error) {
      console.error(`❌ Failed to generate ${profileConfig.id}:`, error.message);
      process.exit(1);
    }
  });
  
  // Generate CI configuration
  const config = {
    version: "1.0.0",
    workspace: {
      profilesDir: "./profiles",
      outputDir: "./output",
      logsDir: "./logs"
    },
    generation: {
      defaultSampleCount: 500,
      defaultDuration: "30m",
      parallelGeneration: false
    },
    ci: {
      mode: true,
      fastGeneration: true,
      limitedOutput: true
    }
  };
  
  const configPath = path.join(TEST_WORKSPACE_DIR, 'imf-config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('⚙️ Generated CI configuration');
  
  // Validate all generated JSON files
  console.log('\n🔍 Validating generated JSON files...');
  generatedFiles.forEach(file => {
    try {
      JSON.parse(fs.readFileSync(file.profile, 'utf8'));
      JSON.parse(fs.readFileSync(file.testData, 'utf8'));
      console.log(`✅ Valid JSON: ${path.basename(file.profile)} & ${path.basename(file.testData)}`);
    } catch (error) {
      console.error(`❌ Invalid JSON in ${file.profile} or ${file.testData}:`, error.message);
      process.exit(1);
    }
  });
  
  console.log('\n🎯 Summary:');
  console.log(`📁 Workspace: ${TEST_WORKSPACE_DIR}`);
  console.log(`📋 Profiles: ${PROFILES.length}`);
  console.log(`📊 Test Data Files: ${generatedFiles.length}`);
  console.log(`✅ Success Rates: ${generatedFiles.map(f => f.successRate.toFixed(3)).join(', ')}`);
  console.log('🚀 Ready for CI tests!');
}

// Run the generator
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAllTestData();
}

export { generateAllTestData, createProfile, createTestData };