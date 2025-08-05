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

# Use robust Node.js JSON generator instead of shell scripting
echo "🔧 Using robust Node.js JSON generator for guaranteed valid JSON..."

if command -v node &> /dev/null; then
    echo "✅ Node.js found - using robust JSON generator"
    node .github/workflows/generate-test-data.js
else
    echo "⚠️  Node.js not found - falling back to manual JSON generation"
    
    # Fallback: Generate with explicit JSON validation
    echo "📊 Generating profiles and test data with validation..."
    
    # Use Python for guaranteed JSON formatting as fallback
    python3 << 'PYTHON_SCRIPT'
import json
import os
import random
from datetime import datetime

TEST_WORKSPACE_DIR = "./test-workspace"
os.makedirs(f"{TEST_WORKSPACE_DIR}/profiles", exist_ok=True)
os.makedirs(f"{TEST_WORKSPACE_DIR}/output", exist_ok=True)
os.makedirs(f"{TEST_WORKSPACE_DIR}/logs", exist_ok=True)

profiles = [
    {"id": "ci-profile-low", "complexity": "low", "problemTypes": ["null_pointer", "memory_leak", "api_timeout"]},
    {"id": "ci-profile-medium", "complexity": "medium", "problemTypes": ["type_mismatch", "syntax_error", "null_pointer"]},
    {"id": "ci-profile-high", "complexity": "high", "problemTypes": ["type_mismatch", "syntax_error", "memory_leak", "api_timeout"]}
]

for profile_config in profiles:
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Create profile
    profile = {
        "id": profile_config["id"],
        "name": f"CI {profile_config['complexity'].title()} Complexity",
        "version": "1.0.0",
        "description": f"CI test profile for {profile_config['complexity']} complexity scenarios",
        "createdAt": timestamp,
        "updatedAt": timestamp,
        "sourceConfig": {
            "directories": ["./src", "./server"],
            "languages": ["typescript", "javascript"],
            "complexity": profile_config["complexity"],
            "excludePatterns": ["node_modules", "dist", "*.log"]
        },
        "scenarios": [{
            "id": "main-scenario",
            "name": "Main Test Scenario",
            "type": "stress" if profile_config["complexity"] == "high" else "performance" if profile_config["complexity"] == "medium" else "integration",
            "duration": 300,
            "enabled": True,
            "problemTypes": profile_config["problemTypes"],
            "codeInjection": {
                "errorTypes": profile_config["problemTypes"],
                "frequency": 0.2 if profile_config["complexity"] == "high" else 0.15 if profile_config["complexity"] == "medium" else 0.1,
                "complexity": profile_config["complexity"]
            },
            "metrics": {
                "cpuPattern": "spike" if profile_config["complexity"] == "high" else "variable" if profile_config["complexity"] == "medium" else "stable",
                "memoryPattern": "growing" if profile_config["complexity"] == "high" else "stable",
                "logPattern": "normal" if profile_config["complexity"] == "low" else "verbose"
            }
        }],
        "expectations": {
            "detectionRate": 75 if profile_config["complexity"] == "high" else 80 if profile_config["complexity"] == "medium" else 85,
            "fixSuccessRate": 60 if profile_config["complexity"] == "high" else 65 if profile_config["complexity"] == "medium" else 70,
            "falsePositiveRate": 25 if profile_config["complexity"] == "high" else 20 if profile_config["complexity"] == "medium" else 15,
            "mlAccuracy": 70 if profile_config["complexity"] == "high" else 75 if profile_config["complexity"] == "medium" else 80
        },
        "generationRules": {
            "sampleCount": 1000 if profile_config["complexity"] == "high" else 750 if profile_config["complexity"] == "medium" else 500,
            "varianceLevel": profile_config["complexity"],
            "timespan": "1h" if profile_config["complexity"] == "high" else "45m" if profile_config["complexity"] == "medium" else "30m",
            "errorDistribution": {ptype: round(1.0/len(profile_config["problemTypes"]), 3) for ptype in profile_config["problemTypes"]}
        }
    }
    
    # Write profile with guaranteed valid JSON
    with open(f"{TEST_WORKSPACE_DIR}/profiles/{profile_config['id']}.json", 'w') as f:
        json.dump(profile, f, indent=2)
    
    # Create test data with proper float formatting
    success_rate = round(random.uniform(0.65 if profile_config["complexity"] == "high" else 0.7 if profile_config["complexity"] == "medium" else 0.8, 0.9), 3)
    
    test_data = {
        "profileId": profile_config["id"],
        "generatedAt": timestamp,
        "generationDuration": random.randint(1000, 5000),
        "data": {
            "logFiles": [],
            "metricStreams": [],
            "codeProblems": [],
            "scenarios": [{
                "scenarioId": "main-scenario",
                "name": "Main Test Scenario",
                "executedAt": timestamp,
                "duration": 300000,
                "statistics": {
                    "problemsInjected": random.randint(10, 50),
                    "metricsGenerated": random.randint(200, 500),
                    "logsGenerated": random.randint(1000, 2000),
                    "successRate": success_rate
                }
            }]
        },
        "statistics": {
            "totalLogEntries": random.randint(2000, 6000),
            "totalMetricPoints": random.randint(1500, 3000),
            "totalCodeProblems": random.randint(20, 100),
            "dataSize": random.randint(100000, 250000)
        },
        "metadata": {
            "generatorVersion": "1.0.0-ci",
            "profile": profile
        }
    }
    
    # Write test data with guaranteed valid JSON
    import time
    timestamp_suffix = int(time.time())
    with open(f"{TEST_WORKSPACE_DIR}/output/testdata-{profile_config['id']}-{timestamp_suffix}-ci.json", 'w') as f:
        json.dump(test_data, f, indent=2)
    
    print(f"✅ Generated {profile_config['id']} (success rate: {success_rate})")

# Create config
config = {
    "version": "1.0.0",
    "workspace": {
        "profilesDir": "./profiles",
        "outputDir": "./output",
        "logsDir": "./logs"
    },
    "generation": {
        "defaultSampleCount": 500,
        "defaultDuration": "30m",
        "parallelGeneration": False
    },
    "ci": {
        "mode": True,
        "fastGeneration": True,
        "limitedOutput": True
    }
}

with open(f"{TEST_WORKSPACE_DIR}/imf-config.json", 'w') as f:
    json.dump(config, f, indent=2)

print("⚙️ Generated CI configuration")
PYTHON_SCRIPT
fi

# Summary
echo ""
echo "✅ CI Test Data Setup Complete!"
echo "📁 Workspace: $TEST_WORKSPACE_DIR"
echo "📋 Profiles: 3 profiles (low, medium, high complexity)"
echo "📊 Test Data: Generated for all profiles"
echo "⚙️ Configuration: CI-optimized settings"
echo ""
echo "🎯 Ready for CI Real-Data Tests!"