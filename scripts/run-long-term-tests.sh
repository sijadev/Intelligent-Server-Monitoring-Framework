#!/bin/bash

set -e

echo "🕰️  Starting IMF Long-Term Test Suite"
echo "======================================="

# Configuration
LONG_TERM_DURATION=${LONG_TERM_DURATION:-300}  # 5 minutes default
TEST_ENV=${TEST_ENV:-development}
PARALLEL_TESTS=${PARALLEL_TESTS:-false}
GENERATE_REPORT=${GENERATE_REPORT:-true}

echo "📋 Configuration:"
echo "  Duration: ${LONG_TERM_DURATION} seconds"
echo "  Environment: ${TEST_ENV}"
echo "  Parallel Tests: ${PARALLEL_TESTS}"
echo "  Generate Report: ${GENERATE_REPORT}"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed"
    exit 1
fi

# Ensure test MCP servers are running
echo "🚀 Starting Test MCP Servers..."
cd docker/test-mcp-server
if ! docker compose ps | grep -q "Up"; then
    docker compose up -d
    echo "⏳ Waiting for MCP servers to be ready..."
    sleep 10
fi
cd ../..

# Verify MCP servers are healthy
echo "🏥 Checking MCP server health..."
for port in 3001 3002 3003; do
    if ! curl -s -f "http://localhost:${port}/health" > /dev/null; then
        echo "❌ MCP server on port ${port} is not healthy"
        exit 1
    fi
done
echo "✅ All MCP servers are healthy"

# Set environment variables for long-term tests
export NODE_ENV=test
export LONG_TERM_TEST_DURATION=$LONG_TERM_DURATION
export TEST_TIMEOUT=$((LONG_TERM_DURATION * 2000)) # Double duration in ms for safety

# Create results directory
mkdir -p test-results/long-term
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="test-results/long-term/${TIMESTAMP}"
mkdir -p "$RESULTS_DIR"

echo "📁 Results will be saved to: $RESULTS_DIR"

# Function to run a single long-term test
run_long_term_test() {
    local test_name=$1
    local test_file=$2
    local output_file="$RESULTS_DIR/${test_name}.json"
    
    echo "🧪 Running ${test_name}..."
    
    # Run test with timeout and capture results
    timeout $((LONG_TERM_DURATION + 60)) npm test -- "$test_file" \
        --reporter=json \
        --outputFile="$output_file" \
        --testTimeout=$TEST_TIMEOUT \
        2>&1 | tee "$RESULTS_DIR/${test_name}.log"
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo "✅ ${test_name} completed successfully"
    elif [ $exit_code -eq 124 ]; then
        echo "⏰ ${test_name} timed out after $((LONG_TERM_DURATION + 60)) seconds"
    else
        echo "❌ ${test_name} failed with exit code $exit_code"
    fi
    
    return $exit_code
}

# Long-term test configurations
declare -A LONG_TERM_TESTS=(
    ["continuous-monitoring"]="server/test/long-term/continuous-monitoring.test.ts"
    ["ai-learning-validation"]="server/test/long-term/ai-learning-validation.test.ts"
    ["automated-intervention"]="server/test/long-term/automated-intervention.test.ts"
    ["metrics-collection"]="server/test/long-term/metrics-collection.test.ts"
)

# Track test results
declare -A TEST_RESULTS
TOTAL_TESTS=${#LONG_TERM_TESTS[@]}
PASSED_TESTS=0
FAILED_TESTS=0

echo ""
echo "🚀 Starting ${TOTAL_TESTS} long-term tests..."
echo ""

if [ "$PARALLEL_TESTS" = "true" ]; then
    echo "🔄 Running tests in parallel..."
    
    # Start all tests in background
    declare -A TEST_PIDS
    for test_name in "${!LONG_TERM_TESTS[@]}"; do
        test_file="${LONG_TERM_TESTS[$test_name]}"
        run_long_term_test "$test_name" "$test_file" &
        TEST_PIDS[$test_name]=$!
    done
    
    # Wait for all tests to complete
    for test_name in "${!TEST_PIDS[@]}"; do
        wait ${TEST_PIDS[$test_name]}
        TEST_RESULTS[$test_name]=$?
    done
else
    echo "📝 Running tests sequentially..."
    
    # Run tests one by one
    for test_name in "${!LONG_TERM_TESTS[@]}"; do
        test_file="${LONG_TERM_TESTS[$test_name]}"
        run_long_term_test "$test_name" "$test_file"
        TEST_RESULTS[$test_name]=$?
        
        # Brief pause between tests
        sleep 5
    done
fi

# Calculate results
for test_name in "${!TEST_RESULTS[@]}"; do
    if [ ${TEST_RESULTS[$test_name]} -eq 0 ]; then
        ((PASSED_TESTS++))
    else
        ((FAILED_TESTS++))
    fi
done

echo ""
echo "📊 Long-Term Test Results Summary"
echo "=================================="
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"
echo "📈 Success Rate: $(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%"
echo ""

# Generate detailed report if requested
if [ "$GENERATE_REPORT" = "true" ]; then
    echo "📄 Generating detailed report..."
    
    REPORT_FILE="$RESULTS_DIR/long-term-test-report.html"
    
    cat > "$REPORT_FILE" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>IMF Long-Term Test Report - $TIMESTAMP</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; padding: 10px 15px; background: #f8f9fa; border-radius: 5px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; }
        .warning { border-left-color: #ffc107; }
        .error { border-left-color: #dc3545; }
        .test-result { margin: 15px 0; padding: 15px; border-radius: 5px; }
        .test-passed { background-color: #d4edda; border: 1px solid #c3e6cb; }
        .test-failed { background-color: #f8d7da; border: 1px solid #f5c6cb; }
        .log-preview { background: #f8f9fa; padding: 10px; border-radius: 3px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
        .timestamp { color: #6c757d; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🕰️ IMF Long-Term Test Report</h1>
            <p class="timestamp">Generated: $(date)</p>
            <p>Test Duration: ${LONG_TERM_DURATION} seconds | Environment: ${TEST_ENV}</p>
        </div>
        
        <div class="metrics">
            <div class="metric success">
                <strong>✅ Passed Tests</strong><br>
                <span style="font-size: 1.5em;">${PASSED_TESTS}</span>
            </div>
            <div class="metric error">
                <strong>❌ Failed Tests</strong><br>
                <span style="font-size: 1.5em;">${FAILED_TESTS}</span>
            </div>
            <div class="metric">
                <strong>📈 Success Rate</strong><br>
                <span style="font-size: 1.5em;">$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))%</span>
            </div>
            <div class="metric">
                <strong>⏱️ Total Duration</strong><br>
                <span style="font-size: 1.5em;">${LONG_TERM_DURATION}s</span>
            </div>
        </div>
        
        <h2>📋 Test Results</h2>
EOF

    # Add individual test results
    for test_name in "${!TEST_RESULTS[@]}"; do
        local result_class="test-failed"
        local result_icon="❌"
        local result_text="FAILED"
        
        if [ ${TEST_RESULTS[$test_name]} -eq 0 ]; then
            result_class="test-passed"
            result_icon="✅"
            result_text="PASSED"
        fi
        
        cat >> "$REPORT_FILE" << EOF
        <div class="test-result $result_class">
            <h3>$result_icon $test_name - $result_text</h3>
            <p><strong>Test File:</strong> ${LONG_TERM_TESTS[$test_name]}</p>
            <p><strong>Exit Code:</strong> ${TEST_RESULTS[$test_name]}</p>
            
            <details>
                <summary>View Log Output</summary>
                <div class="log-preview">
$(head -50 "$RESULTS_DIR/${test_name}.log" 2>/dev/null | sed 's/</\&lt;/g' | sed 's/>/\&gt;/g' || echo "Log file not available")
                </div>
            </details>
        </div>
EOF
    done

    cat >> "$REPORT_FILE" << EOF
        
        <h2>📊 System Information</h2>
        <div class="log-preview">
Node.js Version: $(node --version)
Docker Version: $(docker --version)
OS: $(uname -a)
Memory: $(free -h 2>/dev/null | head -2 || echo "Memory info not available")
        </div>
        
        <h2>🔗 Useful Links</h2>
        <ul>
            <li><a href="../../README.md">IMF Documentation</a></li>
            <li><a href="../test-setup.ts">Test Setup Configuration</a></li>
            <li><a href="../../docker/test-mcp-server/README.md">Test MCP Server Documentation</a></li>
        </ul>
    </div>
</body>
</html>
EOF

    echo "📄 Report generated: $REPORT_FILE"
    
    # Try to open report in browser (optional)
    if command -v open &> /dev/null; then
        open "$REPORT_FILE" 2>/dev/null || true
    elif command -v xdg-open &> /dev/null; then
        xdg-open "$REPORT_FILE" 2>/dev/null || true
    fi
fi

# Cleanup
echo ""
echo "🧹 Cleanup..."
if [ "$TEST_ENV" != "development" ]; then
    echo "🛑 Stopping Test MCP Servers..."
    cd docker/test-mcp-server
    docker compose down
    cd ../..
fi

echo ""
echo "🏁 Long-term test suite completed!"
echo "Results available in: $RESULTS_DIR"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Check the results for details."
    exit 1
fi