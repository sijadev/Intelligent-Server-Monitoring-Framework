#!/bin/bash

# IMF E2E Test Runner Script
# Usage: ./run-tests.sh [options]

set -e

# Default values
TEST_TYPE="local"
HEADED=false
DEBUG=false
BROWSERS="chromium"
PATTERN=""
WORKERS=4

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[IMF E2E]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Help function
show_help() {
    echo "IMF E2E Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --type TYPE         Test type: local, docker, ci (default: local)"
    echo "  -h, --headed           Run tests in headed mode"
    echo "  -d, --debug            Run tests in debug mode"
    echo "  -b, --browsers LIST    Comma-separated list of browsers (default: chromium)"
    echo "  -p, --pattern PATTERN  Test pattern to run"
    echo "  -w, --workers NUM      Number of parallel workers (default: 4)"
    echo "  --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                          # Run basic local tests"
    echo "  $0 -h                       # Run tests in headed mode"
    echo "  $0 -t docker                # Run tests in Docker"
    echo "  $0 -p \"*dashboard*\"         # Run only dashboard tests"
    echo "  $0 -b \"chromium,firefox\"    # Run on multiple browsers"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -h|--headed)
            HEADED=true
            shift
            ;;
        -d|--debug)
            DEBUG=true
            shift
            ;;
        -b|--browsers)
            BROWSERS="$2"
            shift 2
            ;;
        -p|--pattern)
            PATTERN="$2"
            shift 2
            ;;
        -w|--workers)
            WORKERS="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Change to e2e directory
cd "$(dirname "$0")/.."

print_status "Starting IMF E2E Tests..."
print_status "Test type: $TEST_TYPE"
print_status "Headed mode: $HEADED"
print_status "Debug mode: $DEBUG"
print_status "Browsers: $BROWSERS"
print_status "Workers: $WORKERS"

if [ -n "$PATTERN" ]; then
    print_status "Test pattern: $PATTERN"
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Are you in the e2e directory?"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm ci
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright" ]; then
    print_status "Installing Playwright..."
    npm install @playwright/test
fi

print_status "Installing/updating Playwright browsers..."
npx playwright install --with-deps

# Set up environment
export CI=false
export BROWSERS="$BROWSERS"
export WORKERS="$WORKERS"

if [ "$DEBUG" = true ]; then
    export PWDEBUG=1
    export HEADED=true
fi

if [ "$HEADED" = true ]; then
    export HEADLESS=false
fi

# Run tests based on type
case $TEST_TYPE in
    "local")
        print_status "Running local E2E tests..."
        
        # Check if IMF application is running
        if ! curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_warning "IMF application not detected on localhost:3000"
            print_status "Please ensure the IMF application is running with:"
            print_status "  cd .. && npm run dev"
            print_status ""
            print_status "Or use Docker mode: $0 -t docker"
            exit 1
        fi
        
        # Build Playwright command
        CMD="npx playwright test"
        
        if [ "$HEADED" = true ]; then
            CMD="$CMD --headed"
        fi
        
        if [ "$DEBUG" = true ]; then
            CMD="$CMD --debug"
        fi
        
        if [ -n "$PATTERN" ]; then
            CMD="$CMD $PATTERN"
        fi
        
        print_status "Running: $CMD"
        $CMD
        ;;
        
    "docker")
        print_status "Running Docker E2E tests..."
        
        if ! command -v docker >/dev/null 2>&1; then
            print_error "Docker is required for Docker tests"
            exit 1
        fi
        
        if ! command -v docker-compose >/dev/null 2>&1; then
            print_error "Docker Compose is required for Docker tests"
            exit 1
        fi
        
        print_status "Building and starting Docker containers..."
        docker-compose up --build --abort-on-container-exit --exit-code-from playwright
        
        print_status "Extracting test results..."
        docker-compose cp playwright:/app/test-results ./test-results 2>/dev/null || true
        docker-compose cp playwright:/app/playwright-report ./playwright-report 2>/dev/null || true
        
        print_status "Cleaning up Docker containers..."
        docker-compose down -v
        ;;
        
    "ci")
        print_status "Running CI E2E tests..."
        
        # CI-specific configuration
        export CI=true
        export HEADLESS=true
        
        CMD="npx playwright test --reporter=json --output-file=test-results/results.json"
        
        if [ -n "$PATTERN" ]; then
            CMD="$CMD $PATTERN"
        fi
        
        print_status "Running: $CMD"
        $CMD
        ;;
        
    *)
        print_error "Unknown test type: $TEST_TYPE"
        print_status "Valid types: local, docker, ci"
        exit 1
        ;;
esac

# Check results
if [ $? -eq 0 ]; then
    print_success "E2E tests completed successfully!"
    
    # Show report information
    if [ -f "playwright-report/index.html" ]; then
        print_status "HTML report available at: playwright-report/index.html"
        print_status "View with: npx playwright show-report"
    fi
else
    print_error "E2E tests failed!"
    exit 1
fi

print_status "Done!"