/**
 * Example Tests Using Retry Mechanisms
 * Demonstrates how to use the retry utilities in real test scenarios
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import {
  retryHttpRequest,
  retryDatabaseOperation,
  waitForCondition,
  getRetryStats,
  resetRetryStats,
} from '../setup/test-retry-setup';
import {
  makeReliableApiRequest,
  expectEventually,
  createReliableTest,
  retryableExpects,
  ensureServerRunning,
  performanceTest,
} from '../utils/test-helpers';

// These tests demonstrate retry patterns, but are skipped by default
// Remove .skip to run them as part of your test suite
describe.skip('Retry Mechanism Examples', () => {
  beforeAll(async () => {
    resetRetryStats();

    // Ensure test environment is ready
    try {
      await ensureServerRunning(3000);
    } catch (error) {
      console.log('Test server not running, some tests may be skipped');
    }
  });

  afterAll(() => {
    const stats = getRetryStats();
    console.log('Test run retry statistics:', stats);
  });

  describe('HTTP Request Retries', () => {
    test('should retry failed API requests', async () => {
      let attemptCount = 0;

      const flakyRequest = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          // Simulate a flaky service that fails first 2 attempts
          throw new Error('Service temporarily unavailable');
        }
        return { ok: true, status: 200 };
      };

      const result = await retryHttpRequest(flakyRequest, 'flaky-api-test');

      expect(result.ok).toBe(true);
      expect(attemptCount).toBe(3); // Should have retried twice
    });

    test('should make reliable API request to health endpoint', async () => {
      const response = await makeReliableApiRequest(
        'http://localhost:3000/api/health',
        { method: 'GET' },
        'health-check-test',
      );

      expect(response.ok).toBe(true);
    });

    test('should handle API rate limiting with retries', async () => {
      // This test would normally fail due to rate limiting
      // but retries with backoff should handle it
      const promises = Array.from({ length: 5 }, (_, i) =>
        makeReliableApiRequest('http://localhost:3000/api/health', {}, `rate-limit-test-${i}`),
      );

      const responses = await Promise.all(promises);
      responses.forEach((response) => {
        expect(response.ok).toBe(true);
      });
    });
  });

  describe('Database Operation Retries', () => {
    test('should retry database connection failures', async () => {
      let connectionAttempts = 0;

      const flakyDbConnection = async () => {
        connectionAttempts++;
        if (connectionAttempts < 2) {
          throw new Error('ECONNREFUSED: Connection refused');
        }
        return { connected: true };
      };

      const result = await retryDatabaseOperation(flakyDbConnection, 'db-connection-test');

      expect(result.connected).toBe(true);
      expect(connectionAttempts).toBe(2);
    });

    test('should use database state assertion with retries', async () => {
      let queryCount = 0;

      const eventuallyConsistentQuery = async () => {
        queryCount++;
        // Simulate eventual consistency - data appears after 2 queries
        if (queryCount < 2) {
          return { count: 0 };
        }
        return { count: 5 };
      };

      await retryableExpects.toHaveDbState(
        eventuallyConsistentQuery,
        (result) => {
          expect(result.count).toBeGreaterThan(0);
        },
        'eventual-consistency-test',
      );

      expect(queryCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Condition Waiting with Retries', () => {
    test('should wait for condition to become true', async () => {
      let conditionMet = false;

      // Simulate condition that becomes true after 2 seconds
      setTimeout(() => {
        conditionMet = true;
      }, 2000);

      await waitForCondition(() => conditionMet, { timeout: 5000, interval: 500 });

      expect(conditionMet).toBe(true);
    });

    test('should use expectEventually for async assertions', async () => {
      let value = 0;

      // Simulate value that changes over time
      const interval = setInterval(() => {
        value++;
      }, 200);

      try {
        await expectEventually(
          () => value,
          (currentValue) => {
            expect(currentValue).toBeGreaterThanOrEqual(5);
          },
          { timeout: 2000, interval: 100, testName: 'eventual-value-test' },
        );
      } finally {
        clearInterval(interval);
      }

      expect(value).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Integration Test Patterns', () => {
    test(
      'should handle flaky integration test with wrapper',
      createReliableTest(
        async () => {
          // Simulate a flaky integration test
          const random = Math.random();
          if (random < 0.6) {
            // 60% chance of failure
            throw new Error('Flaky integration test failure');
          }

          expect(true).toBe(true);
        },
        {
          maxAttempts: 5,
          testName: 'flaky-integration-test',
          beforeRetry: async () => {
            // Reset any state before retry
            console.log('Resetting test state before retry...');
          },
        },
      ),
    );

    test('should handle file system operations with retries', async () => {
      const fs = await import('fs/promises');
      const testFile = '/tmp/retry-test-file.txt';

      // Clean up first
      try {
        await fs.unlink(testFile);
      } catch {
        // File might not exist
      }

      // Write file (might fail due to system load)
      await retryableExpects.toHaveFileState(
        testFile,
        (exists) => !exists, // Initially shouldn't exist
        'file-initial-state',
      );

      // Create file asynchronously
      setTimeout(async () => {
        await fs.writeFile(testFile, 'test content');
      }, 1000);

      // Wait for file to be created
      await retryableExpects.toHaveFileState(
        testFile,
        (exists, content) => exists && content?.includes('test content'),
        'file-creation-test',
      );

      // Cleanup
      await fs.unlink(testFile);
    });
  });

  describe('Performance Tests with Tolerance', () => {
    test('should handle timing variations in performance tests', async () => {
      const simulateWork = async () => {
        // Simulate work that takes 100ms ± 20ms
        const baseTime = 100;
        const variation = Math.random() * 40 - 20; // -20 to +20ms
        const workTime = Math.max(50, baseTime + variation);

        await new Promise((resolve) => setTimeout(resolve, workTime));
        return 'work completed';
      };

      const stats = await performanceTest(simulateWork, {
        expectedMaxDuration: 120, // Expect max 120ms
        tolerance: 0.3, // Allow 30% tolerance for timing variations
        warmupRuns: 2,
        testRuns: 5,
        testName: 'variable-timing-test',
      });

      expect(stats.averageDuration).toBeLessThan(200);
      console.log('Performance test stats:', stats);
    });
  });

  describe('Retry Strategy Comparisons', () => {
    test('should demonstrate different backoff strategies', async () => {
      const strategies = ['exponential', 'linear', 'fixed'] as const;

      for (const strategy of strategies) {
        let attempts = 0;
        const startTime = Date.now();

        try {
          await retryHttpRequest(async () => {
            attempts++;
            if (attempts < 3) {
              throw new Error(`Attempt ${attempts} failed`);
            }
            return { ok: true, status: 200 };
          }, `${strategy}-backoff-test`);
        } catch {
          // Expected to succeed after retries
        }

        const totalTime = Date.now() - startTime;
        console.log(`${strategy} backoff: ${attempts} attempts, ${totalTime}ms total`);

        expect(attempts).toBe(3);
      }
    });
  });
});

// Example of test-specific retry configuration
describe.skip('Custom Retry Configuration Examples', () => {
  // Test suite with custom retry count
  describe('Very Flaky Tests', () => {
    test('should eventually pass with enough retries', async () => {
      // 80% chance of failure
      if (Math.random() < 0.8) {
        throw new Error('Random failure for demonstration');
      }
      expect(true).toBe(true);
    });
  });

  // Individual test with retries (using retry wrapper instead)
  test(
    'should retry individual test',
    createReliableTest(
      async () => {
        // 50% chance of failure
        if (Math.random() < 0.5) {
          throw new Error('Random failure for individual test');
        }
        expect(true).toBe(true);
      },
      { maxAttempts: 3, testName: 'individual-retry-test' },
    ),
  );
});
