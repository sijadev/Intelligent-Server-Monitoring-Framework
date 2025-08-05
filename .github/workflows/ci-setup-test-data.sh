#!/bin/bash

# IMF CI Test Data Setup Script
# Generates test profiles and data for GitHub Actions CI environment

set -e  # Exit on error

echo "🚀 Setting up IMF Test Manager data for CI environment..."

# Check if Test Manager CLI is available  
if ! command -v imf-test-manager &> /dev/null; then
    echo "📦 IMF Test Manager CLI not available - using CI mock data generation"
    echo "    This is expected in CI environment - profiles will be generated directly"
fi

# Create test workspace directory
TEST_WORKSPACE_DIR="./test-workspace"
mkdir -p "$TEST_WORKSPACE_DIR"/{profiles,output,logs}

echo "📁 Created test workspace: $TEST_WORKSPACE_DIR"

# Generate CI test profiles
echo "🔧 Generating CI test profiles..."

# Profile 1: Low complexity TypeScript/JavaScript
cat > "$TEST_WORKSPACE_DIR/profiles/ci-profile-low.json" << 'EOF'
{
  "id": "ci-profile-low",
  "name": "CI Low Complexity",
  "version": "1.0.0",
  "description": "CI test profile for low complexity scenarios",
  "createdAt": "2025-08-05T20:00:00.000Z",
  "updatedAt": "2025-08-05T20:00:00.000Z",
  "sourceConfig": {
    "directories": ["./src", "./server"],
    "languages": ["typescript", "javascript"],
    "complexity": "low",
    "excludePatterns": ["node_modules", "dist", "*.log"]
  },
  "scenarios": [
    {
      "id": "main-scenario",
      "name": "Main Test Scenario",
      "type": "integration",
      "duration": 300,
      "enabled": true,
      "problemTypes": ["null_pointer", "memory_leak", "api_timeout"],
      "codeInjection": {
        "errorTypes": ["null_pointer", "memory_leak", "api_timeout"],
        "frequency": 0.1,
        "complexity": "low"
      },
      "metrics": {
        "cpuPattern": "stable",
        "memoryPattern": "stable", 
        "logPattern": "normal"
      }
    }
  ],
  "expectations": {
    "detectionRate": 85,
    "fixSuccessRate": 70,
    "falsePositiveRate": 15,
    "mlAccuracy": 80
  },
  "generationRules": {
    "sampleCount": 500,
    "varianceLevel": "low",
    "timespan": "30m",
    "errorDistribution": {
      "null_pointer": 0.4,
      "memory_leak": 0.3,
      "api_timeout": 0.3
    }
  }
}
EOF

# Profile 2: Medium complexity
cat > "$TEST_WORKSPACE_DIR/profiles/ci-profile-medium.json" << 'EOF'
{
  "id": "ci-profile-medium",
  "name": "CI Medium Complexity",
  "version": "1.0.0", 
  "description": "CI test profile for medium complexity scenarios",
  "createdAt": "2025-08-05T20:00:00.000Z",
  "updatedAt": "2025-08-05T20:00:00.000Z",
  "sourceConfig": {
    "directories": ["./src", "./server"],
    "languages": ["typescript", "javascript"],
    "complexity": "medium",
    "excludePatterns": ["node_modules", "dist", "*.log"]
  },
  "scenarios": [
    {
      "id": "main-scenario", 
      "name": "Main Test Scenario",
      "type": "performance",
      "duration": 300,
      "enabled": true,
      "problemTypes": ["type_mismatch", "syntax_error", "null_pointer"],
      "codeInjection": {
        "errorTypes": ["type_mismatch", "syntax_error", "null_pointer"],
        "frequency": 0.15,
        "complexity": "medium"
      },
      "metrics": {
        "cpuPattern": "variable",
        "memoryPattern": "stable",
        "logPattern": "verbose"
      }
    }
  ],
  "expectations": {
    "detectionRate": 80,
    "fixSuccessRate": 65,
    "falsePositiveRate": 20,
    "mlAccuracy": 75
  },
  "generationRules": {
    "sampleCount": 750,
    "varianceLevel": "medium",
    "timespan": "45m",
    "errorDistribution": {
      "type_mismatch": 0.4,
      "syntax_error": 0.3,
      "null_pointer": 0.3
    }
  }
}
EOF

# Profile 3: High complexity
cat > "$TEST_WORKSPACE_DIR/profiles/ci-profile-high.json" << 'EOF'
{
  "id": "ci-profile-high",
  "name": "CI High Complexity",
  "version": "1.0.0",
  "description": "CI test profile for high complexity scenarios", 
  "createdAt": "2025-08-05T20:00:00.000Z",
  "updatedAt": "2025-08-05T20:00:00.000Z",
  "sourceConfig": {
    "directories": ["./src", "./server"],
    "languages": ["typescript", "javascript"],
    "complexity": "high",
    "excludePatterns": ["node_modules", "dist", "*.log"]
  },
  "scenarios": [
    {
      "id": "main-scenario",
      "name": "Main Test Scenario", 
      "type": "stress",
      "duration": 300,
      "enabled": true,
      "problemTypes": ["type_mismatch", "syntax_error", "memory_leak", "api_timeout"],
      "codeInjection": {
        "errorTypes": ["type_mismatch", "syntax_error", "memory_leak", "api_timeout"],
        "frequency": 0.2,
        "complexity": "high"
      },
      "metrics": {
        "cpuPattern": "spike",
        "memoryPattern": "growing",
        "logPattern": "verbose"
      }
    }
  ],
  "expectations": {
    "detectionRate": 75,
    "fixSuccessRate": 60,
    "falsePositiveRate": 25,
    "mlAccuracy": 70
  },
  "generationRules": {
    "sampleCount": 1000,
    "varianceLevel": "high",
    "timespan": "1h",
    "errorDistribution": {
      "type_mismatch": 0.3,
      "syntax_error": 0.3,
      "memory_leak": 0.2,
      "api_timeout": 0.2
    }
  }
}
EOF

echo "✅ Generated 3 CI test profiles"

# Generate test data for each profile
echo "📊 Generating test data for CI profiles..."

for profile in ci-profile-low ci-profile-medium ci-profile-high; do
    echo "🔄 Generating data for $profile..."
    
    # Create mock test data file  
    # Generate random success rate as proper decimal
    SUCCESS_RATE=$(echo "scale=3; ($((RANDOM % 200 + 700)))/1000" | bc -l)
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    
    cat > "$TEST_WORKSPACE_DIR/output/testdata-$profile-$(date +%s)-ci.json" << EOF
{
  "profileId": "$profile",
  "generatedAt": "$TIMESTAMP",
  "generationDuration": $((RANDOM % 5000 + 1000)),
  "data": {
    "logFiles": [],
    "metricStreams": [],
    "codeProblems": [],
    "scenarios": [
      {
        "scenarioId": "main-scenario",
        "name": "Main Test Scenario",
        "executedAt": "$TIMESTAMP",
        "duration": 300000,
        "statistics": {
          "problemsInjected": $((RANDOM % 30 + 10)),
          "metricsGenerated": $((RANDOM % 500 + 200)),
          "logsGenerated": $((RANDOM % 2000 + 1000)),
          "successRate": $SUCCESS_RATE
        }
      }
    ]
  },
  "statistics": {
    "totalLogEntries": $((RANDOM % 5000 + 2000)),
    "totalMetricPoints": $((RANDOM % 3000 + 1500)),
    "totalCodeProblems": $((RANDOM % 80 + 20)),
    "dataSize": $((RANDOM % 200000 + 100000))
  },
  "metadata": {
    "generatorVersion": "1.0.0-ci",
    "profile": $(cat "$TEST_WORKSPACE_DIR/profiles/$profile.json")
  }
}
EOF
    echo "  ✅ Generated test data for $profile"
done

echo "📊 Test data generation completed"

# Create configuration file for CI
cat > "$TEST_WORKSPACE_DIR/imf-config.json" << 'EOF'
{
  "version": "1.0.0",
  "workspace": {
    "profilesDir": "./profiles",
    "outputDir": "./output", 
    "logsDir": "./logs"
  },
  "generation": {
    "defaultSampleCount": 500,
    "defaultDuration": "30m",
    "parallelGeneration": false
  },
  "ci": {
    "mode": true,
    "fastGeneration": true,
    "limitedOutput": true
  }
}
EOF

echo "⚙️ Created CI configuration"

# Summary
echo ""
echo "✅ CI Test Data Setup Complete!"
echo "📁 Workspace: $TEST_WORKSPACE_DIR"
echo "📋 Profiles: 3 profiles (low, medium, high complexity)"
echo "📊 Test Data: Generated for all profiles"
echo "⚙️ Configuration: CI-optimized settings"
echo ""
echo "🎯 Ready for CI Real-Data Tests!"