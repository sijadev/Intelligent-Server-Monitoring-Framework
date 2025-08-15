#!/usr/bin/env node
/* eslint-disable no-undef, @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars */

/**
 * Test Manager CLI
 *
 * Simple CLI interface for test data generation and profile management
 * Replaces the external @mcp-guard/test-manager package
 */

const fs = require('fs-extra');
const path = require('path');

// Command line argument parsing
const [, , command, ...args] = process.argv;

async function generateTestData(profileId, options = {}) {
  try {
    const profilesDir = options.profiles || './test-workspace/profiles';
    const outputDir = options.output || './test-workspace/output';

    console.log(`🔧 Generating test data for profile: ${profileId}`);
    console.log(`📁 Profiles directory: ${profilesDir}`);
    console.log(`📤 Output directory: ${outputDir}`);

    // Find profile file
    const profilePath = path.join(profilesDir, `${profileId}.json`);

    if (!(await fs.pathExists(profilePath))) {
      console.error(`❌ Profile not found: ${profilePath}`);
      process.exit(1);
    }

    // Load profile
    const profile = await fs.readJSON(profilePath);
    console.log(`📋 Loaded profile: ${profile.name}`);

    // Create output directory
    await fs.ensureDir(outputDir);

    // Generate test data based on profile
    const testData = await generateRealTestData(profile);

    // Save test data
    const outputPath = path.join(outputDir, `testdata-${profileId}-${Date.now()}.json`);
    await fs.writeJSON(outputPath, testData, { spaces: 2 });

    console.log(`✅ Test data generated: ${outputPath}`);
    console.log(
      `📊 Generated ${testData.data.logEntries.length} log entries, ${testData.data.problems.length} problems, ${testData.data.metrics.length} metrics`,
    );

    // Output success result
    const result = {
      success: true,
      profileId,
      outputPath,
      dataGenerated: {
        logEntries: testData.data.logEntries.length,
        problems: testData.data.problems.length,
        metrics: testData.data.metrics.length,
        sizeKB: Buffer.byteLength(JSON.stringify(testData)) / 1024,
      },
      executionTime: Date.now() - parseInt(profileId.split('-').pop()) || 0,
    };

    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`❌ Generation failed: ${error.message}`);
    const result = {
      success: false,
      profileId,
      error: error.message,
      dataGenerated: { logEntries: 0, problems: 0, metrics: 0, sizeKB: 0 },
      executionTime: 0,
    };
    console.log(JSON.stringify(result));
    process.exit(1);
  }
}

async function generateRealTestData(profile) {
  const baseData = profile.testData || profile.generationRules || {};
  const complexity = profile.complexity || profile.sourceConfig?.complexity || 'medium';

  // Calculate data amounts based on complexity
  const multiplier = { low: 0.5, medium: 1.0, high: 2.0 }[complexity] || 1.0;

  const logEntriesCount = Math.floor(
    (baseData.expectedLogs || baseData.sampleCount || 1000) * multiplier,
  );
  const problemsCount = Math.floor((baseData.expectedProblems || 20) * multiplier);
  const metricsCount = Math.floor((baseData.expectedMetrics || 500) * multiplier);

  // Generate realistic log entries
  const logEntries = Array.from({ length: logEntriesCount }, (_, i) => ({
    id: `log-${i + 1}`,
    timestamp: new Date(Date.now() - (logEntriesCount - i) * 1000).toISOString(),
    level: ['INFO', 'WARN', 'ERROR', 'DEBUG'][Math.floor(Math.random() * 4)],
    source: ['app', 'system', 'database', 'api'][Math.floor(Math.random() * 4)],
    message: `Test log entry ${i + 1} - ${['Request processed', 'Connection established', 'Error occurred', 'Task completed'][Math.floor(Math.random() * 4)]}`,
    metadata: { requestId: `req-${i + 1}`, module: 'test' },
  }));

  // Generate realistic problems
  const problems = Array.from({ length: problemsCount }, (_, i) => ({
    id: `problem-${i + 1}`,
    type: ['connection_error', 'performance_issue', 'validation_error', 'timeout'][
      Math.floor(Math.random() * 4)
    ],
    severity: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
    description: `Mock problem ${i + 1} - ${['High response time detected', 'Connection timeout', 'Validation failed', 'Resource exhausted'][Math.floor(Math.random() * 4)]}`,
    timestamp: new Date(Date.now() - (problemsCount - i) * 60000).toISOString(),
    resolved: Math.random() > 0.3,
    metadata: { component: 'test-component', errorCode: 500 + i },
  }));

  // Generate realistic metrics
  const metrics = Array.from({ length: metricsCount }, (_, i) => ({
    id: `metric-${i + 1}`,
    timestamp: new Date(Date.now() - (metricsCount - i) * 30000).toISOString(),
    cpuUsage: Math.random() * 100,
    memoryUsage: Math.random() * 100,
    diskUsage: Math.random() * 100,
    loadAverage: Math.random() * 4,
    networkConnections: Math.floor(Math.random() * 1000),
    processes: Math.floor(Math.random() * 300) + 50,
    metadata: { host: 'test-host', region: 'local' },
  }));

  return {
    profileId: profile.id,
    generatedAt: new Date().toISOString(),
    metadata: {
      profile: {
        name: profile.name,
        complexity: complexity,
        description: profile.description,
      },
      generation: {
        method: 'mock',
        version: '1.0.0',
        duration: Math.floor(Math.random() * 5000) + 1000,
      },
    },
    data: {
      logEntries,
      problems,
      metrics,
    },
    summary: {
      totalLogEntries: logEntries.length,
      totalProblems: problems.length,
      totalMetrics: metrics.length,
      unresolvedProblems: problems.filter((p) => !p.resolved).length,
      criticalProblems: problems.filter((p) => p.severity === 'CRITICAL').length,
    },
  };
}

async function listProfiles(options = {}) {
  const profilesDir = options.profiles || './test-workspace/profiles';

  try {
    const files = await fs.readdir(profilesDir);
    const profileFiles = files.filter((f) => f.endsWith('.json'));

    console.log(`📋 Found ${profileFiles.length} profiles in ${profilesDir}:`);

    for (const file of profileFiles) {
      try {
        const profile = await fs.readJSON(path.join(profilesDir, file));
        console.log(`  • ${profile.name || file} (${profile.id || 'unknown'})`);
      } catch (error) {
        console.log(`  • ${file} (invalid profile)`);
      }
    }
  } catch (error) {
    console.error(`❌ Failed to list profiles: ${error.message}`);
    process.exit(1);
  }
}

async function showHelp() {
  console.log(`
🛠️  Test Manager CLI

Usage:
  test-manager-cli <command> [options]

Commands:
  generate <profileId>     Generate test data for a profile
  list                     List available profiles
  help                     Show this help message

Options:
  --profiles <path>        Profiles directory (default: ./test-workspace/profiles)
  --output <path>          Output directory (default: ./test-workspace/output)

Examples:
  test-manager-cli generate profile-123456789
  test-manager-cli generate my-profile --output ./custom-output
  test-manager-cli list --profiles ./my-profiles
`);
}

// Parse command line arguments
function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[i + 1];
      options[key] = value;
    }
  }
  return options;
}

// Main command dispatcher
async function main() {
  switch (command) {
    case 'generate': {
      const profileId = args[0];
      if (!profileId) {
        console.error('❌ Profile ID is required');
        process.exit(1);
      }
      const options = parseArgs(args.slice(1));
      await generateTestData(profileId, options);
      break;
    }

    case 'list': {
      const options = parseArgs(args);
      await listProfiles(options);
      break;
    }

    case 'help':
    case '--help':
    case '-h':
      await showHelp();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      await showHelp();
      process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error(`💥 Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error(`💥 Unhandled rejection: ${error.message}`);
  process.exit(1);
});

// Run the CLI
if (require.main === module) {
  main().catch((error) => {
    console.error(`💥 CLI failed: ${error.message}`);
    process.exit(1);
  });
}
