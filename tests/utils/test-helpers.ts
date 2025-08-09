/**
 * Test Helper Functions with Retry Support
 * Common utilities for testing with built-in retry mechanisms
 */

import { expect } from 'vitest';
import {
  retryWithBackoff,
  retryHttpRequest,
  retryDatabaseOperation,
  waitForService,
} from '../setup/test-retry-setup';

/**
 * Test server availability with retry
 */
export async function ensureServerRunning(port: number, timeout = 30000): Promise<void> {
  const healthCheck = async (): Promise<boolean> => {
    try {
      const response = await fetch(`http://localhost:${port}/api/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  await waitForService(healthCheck, `server on port ${port}`, timeout);
}

/**
 * Reliable API request with automatic retries
 */
export async function makeReliableApiRequest(
  url: string,
  options: RequestInit = {},
  testName?: string,
): Promise<Response> {
  return retryHttpRequest(async () => {
    const response = await fetch(url, {
      ...options,
      timeout: 10000, // 10 second timeout
    });

    // Throw for HTTP errors to trigger retries
    if (!response.ok && response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }, testName);
}

/**
 * Database connection test with retry
 */
export async function ensureDatabaseConnected(connectionTest: () => Promise<any>): Promise<void> {
  await retryDatabaseOperation(async () => {
    await connectionTest();
  }, 'database-connection-test');
}

/**
 * Wait for element/condition with retry and better error messages
 */
export async function waitForConditionWithRetry<T>(
  operation: () => Promise<T>,
  condition: (result: T) => boolean,
  options: {
    maxAttempts?: number;
    delay?: number;
    testName?: string;
    errorMessage?: string;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 10,
    delay = 1000,
    testName = 'condition-wait',
    errorMessage = 'Condition not met',
  } = options;

  return retryWithBackoff(
    async () => {
      const result = await operation();

      if (!condition(result)) {
        throw new Error(`${errorMessage}. Current result: ${JSON.stringify(result)}`);
      }

      return result;
    },
    {
      maxAttempts,
      backoffStrategy: 'linear',
      baseDelay: delay,
      testName,
      shouldRetry: (error, attempt) => {
        // Always retry for condition waits
        return true;
      },
    },
  );
}

/**
 * Wrapper for flaky integration tests
 */
export function createReliableTest(
  testFn: () => Promise<void>,
  options: {
    maxAttempts?: number;
    testName?: string;
    beforeRetry?: () => Promise<void>;
  } = {},
) {
  const { maxAttempts = 3, testName = 'integration-test', beforeRetry } = options;

  return async () => {
    await retryWithBackoff(
      async () => {
        try {
          await testFn();
        } catch (error) {
          console.log(`Test "${testName}" failed:`, error);
          throw error;
        }
      },
      {
        maxAttempts,
        backoffStrategy: 'exponential',
        baseDelay: 2000,
        testName,
        onRetry: async (error, attempt) => {
          console.log(`Retrying test "${testName}" (attempt ${attempt + 2}/${maxAttempts})`);
          if (beforeRetry) {
            await beforeRetry();
          }
        },
      },
    );
  };
}

/**
 * Enhanced expect with retry for eventual consistency
 */
export async function expectEventually<T>(
  getValue: () => Promise<T> | T,
  matcher: (value: T) => void,
  options: {
    timeout?: number;
    interval?: number;
    testName?: string;
  } = {},
): Promise<void> {
  const { timeout = 10000, interval = 500, testName = 'expect-eventually' } = options;

  const startTime = Date.now();
  let lastError: Error;

  while (Date.now() - startTime < timeout) {
    try {
      const value = await getValue();
      matcher(value);
      return; // Success!
    } catch (error) {
      lastError = error as Error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  console.log(`expectEventually failed for "${testName}" after ${timeout}ms`);
  throw lastError!;
}

/**
 * Retry-aware test assertion helpers
 */
export const retryableExpects = {
  /**
   * Assert API response with retries
   */
  async toHaveApiResponse(
    request: () => Promise<Response>,
    expectedStatus: number,
    testName?: string,
  ): Promise<void> {
    await expectEventually(
      async () => {
        const response = await makeReliableApiRequest(
          (request as any).url || 'unknown-url',
          (request as any).options || {},
          testName,
        );
        return { status: response.status, response };
      },
      ({ status, response }) => {
        expect(status).toBe(expectedStatus);
      },
      { testName: testName || 'api-response-test' },
    );
  },

  /**
   * Assert database state with retries
   */
  async toHaveDbState<T>(
    query: () => Promise<T>,
    matcher: (result: T) => void,
    testName?: string,
  ): Promise<void> {
    await expectEventually(() => retryDatabaseOperation(query, testName), matcher, {
      testName: testName || 'db-state-test',
    });
  },

  /**
   * Assert file system state with retries
   */
  async toHaveFileState(
    filePath: string,
    condition: (exists: boolean, content?: string) => boolean,
    testName?: string,
  ): Promise<void> {
    await expectEventually(
      async () => {
        try {
          const fs = await import('fs/promises');
          const content = await fs.readFile(filePath, 'utf-8');
          return { exists: true, content };
        } catch {
          return { exists: false };
        }
      },
      ({ exists, content }) => {
        expect(condition(exists, content)).toBe(true);
      },
      { testName: testName || 'file-state-test' },
    );
  },
};

/**
 * Test environment setup with retries
 */
export async function setupTestEnvironment(
  setup: () => Promise<void>,
  testName?: string,
): Promise<void> {
  await retryWithBackoff(setup, {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelay: 2000,
    testName: testName || 'test-environment-setup',
    onRetry: (error, attempt) => {
      console.log(`Test environment setup retry ${attempt + 1}:`, error.message);
    },
  });
}

/**
 * Cleanup with retries (for teardown)
 */
export async function cleanupTestEnvironment(
  cleanup: () => Promise<void>,
  testName?: string,
): Promise<void> {
  await retryWithBackoff(cleanup, {
    maxAttempts: 2, // Fewer retries for cleanup
    backoffStrategy: 'fixed',
    baseDelay: 1000,
    testName: testName || 'test-environment-cleanup',
    shouldRetry: (error, attempt) => {
      // Only retry cleanup on specific errors
      const retryableErrors = ['EBUSY', 'ENOENT', 'timeout'];
      return retryableErrors.some((err) => error.message.includes(err));
    },
    onRetry: (error, attempt) => {
      console.log(`Test cleanup retry ${attempt + 1}:`, error.message);
    },
  });
}

/**
 * Performance test wrapper that handles timing variations
 */
export async function performanceTest<T>(
  operation: () => Promise<T>,
  options: {
    expectedMaxDuration: number;
    tolerance: number; // Percentage tolerance (e.g., 0.2 for 20%)
    warmupRuns?: number;
    testRuns?: number;
    testName?: string;
  },
): Promise<{ averageDuration: number; minDuration: number; maxDuration: number }> {
  const {
    expectedMaxDuration,
    tolerance,
    warmupRuns = 2,
    testRuns = 5,
    testName = 'performance-test',
  } = options;

  // Warmup runs
  for (let i = 0; i < warmupRuns; i++) {
    await operation();
  }

  // Actual test runs
  const durations: number[] = [];

  for (let i = 0; i < testRuns; i++) {
    const start = Date.now();
    await operation();
    const duration = Date.now() - start;
    durations.push(duration);
  }

  const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  const maxAllowedDuration = expectedMaxDuration * (1 + tolerance);

  console.log(`Performance test "${testName}":`, {
    averageDuration,
    minDuration,
    maxDuration,
    expectedMax: expectedMaxDuration,
    allowedMax: maxAllowedDuration,
  });

  // Use average for assertion to handle timing variations
  expect(averageDuration).toBeLessThanOrEqual(maxAllowedDuration);

  return { averageDuration, minDuration, maxDuration };
}
