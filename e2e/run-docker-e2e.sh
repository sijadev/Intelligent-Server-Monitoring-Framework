#!/bin/bash

# IMF Docker E2E Test Runner
# Runs E2E tests in Docker environment and saves results to log file

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="./test-logs"
LOG_FILE="${LOG_DIR}/e2e-docker-${TIMESTAMP}.log"
RESULTS_DIR="./test-results"
REPORT_DIR="./playwright-report"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[IMF E2E Docker]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Create log directory
mkdir -p "$LOG_DIR"
mkdir -p "$RESULTS_DIR"

# Initialize log file
print_status "=== IMF Docker E2E Test Run Started at $(date) ==="
print_status "Log file: $LOG_FILE"

# Change to e2e directory
cd "$(dirname "$0")"

# Check if Docker is available
if ! command -v docker >/dev/null 2>&1; then
    print_error "Docker is not installed or not available"
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "Docker Compose is not installed or not available"
    exit 1
fi

# Clean up any existing containers
print_status "Cleaning up existing containers..."
docker-compose down -v 2>&1 | tee -a "$LOG_FILE" || true

# Remove old test results
print_status "Cleaning up old test results..."
rm -rf "$RESULTS_DIR"/* 2>/dev/null || true
rm -rf "$REPORT_DIR"/* 2>/dev/null || true

# Pull latest images
print_status "Pulling latest Docker images..."
docker-compose pull 2>&1 | tee -a "$LOG_FILE"

# Build and start containers
print_status "Building and starting Docker containers..."
if docker-compose up --build --abort-on-container-exit --exit-code-from playwright 2>&1 | tee -a "$LOG_FILE"; then
    EXIT_CODE=0
    print_success "Docker E2E tests completed successfully!"
else
    EXIT_CODE=$?
    print_error "Docker E2E tests failed with exit code: $EXIT_CODE"
fi

# Extract test results from containers
print_status "Extracting test results from containers..."
docker-compose cp playwright:/app/test-results "$RESULTS_DIR" 2>&1 | tee -a "$LOG_FILE" || print_warning "Could not extract test-results"
docker-compose cp playwright:/app/playwright-report "$REPORT_DIR" 2>&1 | tee -a "$LOG_FILE" || print_warning "Could not extract playwright-report"

# Save container logs
print_status "Saving container logs..."
docker-compose logs --no-color > "${LOG_DIR}/docker-logs-${TIMESTAMP}.log" 2>&1 || true

# Parse test results if available
if [ -f "$RESULTS_DIR/results.json" ]; then
    print_status "Parsing test results..."
    
    # Extract basic stats from results.json
    TOTAL_TESTS=$(jq -r '.stats.total // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    PASSED_TESTS=$(jq -r '.stats.passed // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    FAILED_TESTS=$(jq -r '.stats.failed // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    SKIPPED_TESTS=$(jq -r '.stats.skipped // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    
    print_status "=== Test Results Summary ==="
    print_status "Total Tests: $TOTAL_TESTS"
    print_status "Passed: $PASSED_TESTS"
    print_status "Failed: $FAILED_TESTS"
    print_status "Skipped: $SKIPPED_TESTS"
    
    # List failed tests
    if [ "$FAILED_TESTS" -gt 0 ]; then
        print_warning "Failed Tests:"
        jq -r '.tests[] | select(.status == "failed") | "  - \(.title) (\(.file))"' "$RESULTS_DIR/results.json" 2>/dev/null | tee -a "$LOG_FILE" || true
    fi
else
    print_warning "No results.json found - test results may not be available"
fi

# Clean up containers
print_status "Cleaning up Docker containers..."
docker-compose down -v 2>&1 | tee -a "$LOG_FILE" || true

# Generate summary
print_status "=== Final Summary ==="
print_status "Test run completed at: $(date)"
print_status "Exit code: $EXIT_CODE"
print_status "Log file: $LOG_FILE"

if [ -d "$RESULTS_DIR" ] && [ "$(ls -A "$RESULTS_DIR" 2>/dev/null)" ]; then
    print_status "Test results saved in: $RESULTS_DIR"
fi

if [ -d "$REPORT_DIR" ] && [ "$(ls -A "$REPORT_DIR" 2>/dev/null)" ]; then
    print_status "HTML report saved in: $REPORT_DIR"
    print_status "View report with: npx playwright show-report"
fi

# Set appropriate exit code
if [ $EXIT_CODE -eq 0 ]; then
    print_success "🎉 All Docker E2E tests passed!"
else
    print_error "❌ Docker E2E tests failed!"
fi

print_status "=== End of Test Run ==="

exit $EXIT_CODE