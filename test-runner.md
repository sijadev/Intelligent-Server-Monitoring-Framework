# MCP Monitoring Tests

This document explains how to run the comprehensive test suite for the MCP (Model Context Protocol) monitoring system.

## Test Structure

The test suite is organized into three main categories:

### 1. Backend API Tests (`server/test/mcp-api.test.ts`)
Tests for the MCP server API endpoints including:
- GET/POST/PUT/DELETE operations for MCP servers
- Server metrics collection endpoints
- Dashboard data aggregation
- Error handling and validation

### 2. Python Plugin Tests (`python-framework/tests/test_mcp_discovery.py`)
Tests for the Python MCP monitoring plugins including:
- MCP server discovery mechanisms (process, port, Docker, config scanning)
- Metrics collection from discovered servers
- Pattern detection for problem identification
- Server remediation functionality

### 3. Frontend Component Tests (`client/src/test/mcp-dashboard.test.tsx`)
Tests for the React MCP Dashboard component including:
- Component rendering and state management
- Tab navigation and data display
- Server management interactions
- API integration and error handling

## Running Tests

### Prerequisites

Ensure all testing dependencies are installed:

```bash
# Node.js testing dependencies should already be installed
# Python testing dependencies should already be installed
```

### Frontend Tests
```bash
# Run all frontend tests
npx vitest

# Run tests in watch mode
npx vitest --watch

# Run tests with UI
npx vitest --ui

# Run only MCP dashboard tests
npx vitest client/src/test/mcp-dashboard.test.tsx
```

### Backend Tests
```bash
# Run backend API tests
npx vitest server/test/mcp-api.test.ts

# Run with coverage
npx vitest --coverage
```

### Python Tests
```bash
# Navigate to Python framework directory
cd python-framework

# Run all Python tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --cov=mcp_monitoring_plugin

# Run specific test file
python -m pytest tests/test_mcp_discovery.py -v
```

### Run All Tests
```bash
# Frontend and backend tests
npx vitest run

# Python tests
cd python-framework && python -m pytest tests/ -v
```

## Test Coverage

### Backend API Tests Cover:
- ✅ Server CRUD operations
- ✅ Metrics collection and storage
- ✅ Dashboard data aggregation
- ✅ Error handling and validation
- ✅ Database operations

### Python Plugin Tests Cover:
- ✅ Server discovery mechanisms
- ✅ Process scanning
- ✅ Port scanning
- ✅ Docker container detection
- ✅ Configuration file parsing
- ✅ Metrics collection
- ✅ Problem detection
- ✅ Server remediation

### Frontend Component Tests Cover:
- ✅ Component rendering
- ✅ Tab navigation
- ✅ Data display and formatting
- ✅ User interactions
- ✅ API integration
- ✅ Error handling
- ✅ Real-time updates

## Mock Data

The tests use comprehensive mock data to simulate:
- MCP servers with various configurations
- Server metrics and performance data
- Discovery methods and results
- API responses and error states

## Continuous Integration

To integrate these tests into a CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: MCP Monitoring Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      # Frontend and Backend Tests
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npx vitest run
      
      # Python Tests
      - name: Setup Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - run: cd python-framework && python -m pytest tests/ -v
```

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- Environment: jsdom for DOM testing
- Setup file: `client/src/test/setup.ts`
- Path aliases configured for imports

### Python Test Configuration
- Framework: pytest with asyncio support
- Mocking: unittest.mock for system dependencies
- Coverage: Available with pytest-cov

## Debugging Tests

### Frontend Test Debugging
```bash
# Run tests with verbose output
npx vitest --reporter=verbose

# Debug specific test
npx vitest --run --reporter=verbose client/src/test/mcp-dashboard.test.tsx
```

### Backend Test Debugging
```bash
# Run with detailed output
npx vitest server/test/mcp-api.test.ts --reporter=verbose
```

### Python Test Debugging
```bash
# Run with detailed output and logging
cd python-framework
python -m pytest tests/ -v -s --log-cli-level=DEBUG
```

## Adding New Tests

### For New API Endpoints
1. Add test cases to `server/test/mcp-api.test.ts`
2. Include positive and negative test scenarios
3. Test data validation and error handling

### For New Python Plugins
1. Create test files in `python-framework/tests/`
2. Use async/await for testing async plugin methods
3. Mock external dependencies (Docker, network, filesystem)

### For New Frontend Components
1. Add test files in `client/src/test/`
2. Mock API calls and external dependencies
3. Test user interactions and state changes

## Performance Testing

While not included in this test suite, consider adding:
- Load testing for API endpoints
- Performance benchmarks for discovery algorithms
- Memory usage testing for long-running operations

## Known Issues and Limitations

1. **Docker Tests**: Require Docker daemon running for full coverage
2. **Network Tests**: May fail in restricted network environments
3. **Process Tests**: Platform-specific behavior may vary

## Test Data Cleanup

Tests use in-memory storage and mocks, so no persistent data cleanup is required. Each test starts with a clean state.
