# Test Isolation and Environment Setup

This directory contains the test infrastructure for the Intelligent Monitoring Framework, including proper test isolation, database management, and test utilities.

## Overview

The IMF test suite uses a comprehensive isolation system to ensure tests run independently and reliably. This includes:

- **Storage Isolation**: Tests use `MemStorage` by default, with optional real database testing
- **Environment Isolation**: Separate test environment configuration
- **Data Isolation**: Each test starts with a clean state
- **Service Mocking**: External services are mocked during tests

## Quick Start

### Basic Testing
```bash
# Run all tests (uses MemStorage)
npm test

# Run with coverage
npm test:coverage

# Run with watch mode
npm run test:watch

# Run with UI
npm run test:ui
```

### Database Testing
```bash
# Setup test database (one-time setup)
npm run test:db-setup

# Run tests with real database
npm run test:db

# Clean test database
npm run test:db-clean
```

### Isolated Testing
```bash
# Run with maximum isolation (slower but more reliable)
npm run test:isolated
```

## Test Environment Configuration

### Memory Storage (Default)
- Fast execution
- Perfect isolation
- No external dependencies
- Suitable for unit tests and most integration tests

### Real Database Testing
- Tests actual database operations
- Validates SQL queries and migrations
- Required for database-specific functionality
- Requires PostgreSQL setup

## Using Test Isolation in Your Tests

### Basic Setup
```typescript
import { setupTestEnvironment, testHelpers } from './test-setup';

describe('My Test Suite', () => {
  // Setup isolated environment
  const { getStorage } = setupTestEnvironment();

  it('should work with isolated storage', async () => {
    const storage = getStorage();
    
    // Use test helpers for consistent data
    const testPlugin = testHelpers.createTestPlugin();
    await storage.createOrUpdatePlugin(testPlugin);
    
    const plugins = await storage.getPlugins();
    expect(plugins).toHaveLength(1);
  });
});
```

### Real Database Testing
```typescript
import { setupTestEnvironment } from './test-setup';

describe('Database Integration Tests', () => {
  const { getStorage, isUsingRealDatabase } = setupTestEnvironment({
    useRealDatabase: true,  // Enable real database
    isolateEachTest: true,  // Clean between tests
    cleanupAfterTests: true // Clean after all tests
  });

  it('should work with real database', async () => {
    // Skip if database not available
    if (!isUsingRealDatabase()) {
      console.log('Skipping database test - database not available');
      return;
    }
    
    const storage = getStorage();
    // ... test with real database
  });
});
```

### Custom Isolation
```typescript
import { createTestDatabase, destroyTestDatabase } from './test-setup';

describe('Custom Database Tests', () => {
  let storage: DatabaseStorage;
  let dbName: string;

  beforeAll(async () => {
    // Create completely isolated database instance
    storage = await createTestDatabase();
    dbName = `test_${Date.now()}`;
  });

  afterAll(async () => {
    // Clean up isolated database
    await destroyTestDatabase(storage, dbName);
  });

  // ... tests
});
```

## Test Helpers

The test suite includes comprehensive helpers for generating consistent test data:

```typescript
import { testHelpers, waitFor } from './test-setup';

// Generate test data
const user = testHelpers.createTestUser();
const plugin = testHelpers.createTestPlugin();
const metrics = testHelpers.createTestMetrics();
const problem = testHelpers.createTestProblem();
const logEntry = testHelpers.createTestLogEntry();

// Wait for async operations
await waitFor(100); // Wait 100ms
```

## Database Setup

### Prerequisites
- PostgreSQL installed and running
- Node.js and npm

### Automatic Setup
```bash
# Run the setup script
npm run test:db-setup
```

### Manual Setup
```bash
# Connect to PostgreSQL
psql -U postgres

# Create test user and database
CREATE USER test WITH PASSWORD 'test';
ALTER USER test CREATEDB;
CREATE DATABASE imf_test_db OWNER test;

# Exit and test connection
\q
psql postgresql://test:test@localhost:5432/imf_test_db -c "SELECT 1;"
```

### Environment Variables
```bash
# Set in .env.test or environment
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/imf_test_db
NODE_ENV=test
```

## Test Configuration

### Vitest Configuration
The test runner is configured for optimal isolation:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./server/test/test-setup.ts'],
    env: { NODE_ENV: 'test' },
    pool: 'threads',
    poolOptions: {
      threads: {
        isolate: true, // Isolate test contexts
      },
    },
  },
});
```

### Environment Files
- `.env` - Development configuration
- `.env.test` - Test-specific configuration
- `.env.local` - Local overrides (gitignored)

## Best Practices

### Test Isolation
1. **Always use setupTestEnvironment()** in test suites
2. **Use test helpers** for consistent data generation
3. **Clean up after tests** - the framework handles this automatically
4. **Mock external services** - use provided mocks or create your own

### Database Testing
1. **Use MemStorage by default** - it's faster and more reliable
2. **Use real database only when necessary** - for schema validation, migrations, complex queries
3. **Always check database availability** - tests should gracefully degrade
4. **Use isolated databases** for integration tests

### Performance
1. **Minimize database tests** - they're slower than memory tests
2. **Use parallel execution** - but ensure proper isolation
3. **Mock external services** - avoid network calls in tests
4. **Use test helpers** - avoid duplicate test setup code

### Debugging
1. **Enable verbose logging** in test mode if needed
2. **Use test:watch** for development
3. **Check database state** manually if tests fail
4. **Use test:ui** for interactive debugging

## Troubleshooting

### Common Issues

#### "Database connection failed"
```bash
# Check if PostgreSQL is running
pg_isready -h localhost -p 5432

# Check if test database exists
psql postgresql://test:test@localhost:5432/imf_test_db -c "SELECT 1;"

# Recreate test database
npm run test:db-setup
```

#### "Tests interfering with each other"
- Ensure you're using `setupTestEnvironment()` with `isolateEachTest: true`
- Check that tests don't share global state
- Use test helpers instead of hardcoded data

#### "Slow test execution"
- Switch from real database to MemStorage for unit tests
- Reduce test parallelism if needed
- Check for unnecessary async operations

#### "Mock issues"
- Ensure mocks are properly reset between tests
- Use vi.clearAllMocks() in setupTestEnvironment
- Check mock configurations in test-setup.ts

### Getting Help
1. Check this README
2. Look at example tests in this directory
3. Review test-setup.ts for available utilities
4. Check vitest documentation for advanced configuration

## File Structure

```
server/test/
├── README.md                 # This file
├── test-setup.ts            # Main test isolation framework
├── isolation-example.test.ts # Example of using isolation
├── *.test.ts               # Individual test files
└── setup.ts                # Basic test setup (client-side)
```

## Contributing

When adding new tests:

1. **Use the isolation framework** - import and use setupTestEnvironment()
2. **Add test helpers** if you create reusable test data patterns
3. **Document special requirements** - if your test needs specific setup
4. **Test both storage types** - ensure tests work with both MemStorage and DatabaseStorage
5. **Follow naming conventions** - use descriptive test names and group related tests

Example test structure:
```typescript
import { setupTestEnvironment, testHelpers } from './test-setup';

describe('Feature Name', () => {
  const { getStorage } = setupTestEnvironment();

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Test implementation
    });
  });
});
```