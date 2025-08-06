#!/bin/bash

# IMF E2E Test Log Reader
# Helper script to read and analyze E2E test logs

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

LOG_DIR="./test-logs"

print_status() {
    echo -e "${BLUE}[Log Reader]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show help
show_help() {
    echo "IMF E2E Test Log Reader"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -l, --latest      Show latest test log"
    echo "  -a, --all         List all available logs"
    echo "  -f, --file FILE   Read specific log file"
    echo "  -s, --summary     Show summary of latest test run"
    echo "  -e, --errors      Show only errors from latest log"
    echo "  -d, --docker      Show Docker container logs from latest run"
    echo "  --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -l                    # Show latest test log"
    echo "  $0 -s                    # Show summary of latest test"
    echo "  $0 -f test-logs/e2e-docker-20241201_143022.log"
    echo ""
}

# Check if log directory exists
if [ ! -d "$LOG_DIR" ]; then
    print_error "Log directory '$LOG_DIR' not found"
    print_status "Run Docker E2E tests first with: ./run-docker-e2e.sh"
    exit 1
fi

# Parse command line arguments
case "${1:-latest}" in
    -l|--latest|latest)
        LATEST_LOG=$(ls -t "$LOG_DIR"/e2e-docker-*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_LOG" ]; then
            print_status "Showing latest test log: $LATEST_LOG"
            echo "===========================================" 
            cat "$LATEST_LOG"
        else
            print_error "No E2E test logs found"
        fi
        ;;
        
    -a|--all)
        print_status "Available test logs:"
        ls -la "$LOG_DIR"/*.log 2>/dev/null || print_error "No log files found"
        ;;
        
    -f|--file)
        if [ -n "$2" ]; then
            if [ -f "$2" ]; then
                print_status "Reading log file: $2"
                echo "===========================================" 
                cat "$2"
            else
                print_error "Log file not found: $2"
            fi
        else
            print_error "Please specify a log file"
            show_help
        fi
        ;;
        
    -s|--summary)
        LATEST_LOG=$(ls -t "$LOG_DIR"/e2e-docker-*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_LOG" ]; then
            print_status "Test Summary from: $LATEST_LOG"
            echo "===========================================" 
            grep -E "(Test Results Summary|Total Tests|Passed|Failed|Skipped|Exit code|Final Summary)" "$LATEST_LOG" || print_error "No summary found"
        else
            print_error "No E2E test logs found"
        fi
        ;;
        
    -e|--errors)
        LATEST_LOG=$(ls -t "$LOG_DIR"/e2e-docker-*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_LOG" ]; then
            print_status "Errors from: $LATEST_LOG"
            echo "===========================================" 
            grep -E "\[ERROR\]|\[WARNING\]|Error:|Failed" "$LATEST_LOG" || print_status "No errors found"
        else
            print_error "No E2E test logs found"
        fi
        ;;
        
    -d|--docker)
        LATEST_DOCKER_LOG=$(ls -t "$LOG_DIR"/docker-logs-*.log 2>/dev/null | head -1)
        if [ -n "$LATEST_DOCKER_LOG" ]; then
            print_status "Docker container logs from: $LATEST_DOCKER_LOG"
            echo "===========================================" 
            cat "$LATEST_DOCKER_LOG"
        else
            print_error "No Docker logs found"
        fi
        ;;
        
    --help)
        show_help
        ;;
        
    *)
        print_error "Unknown option: $1"
        show_help
        exit 1
        ;;
esac