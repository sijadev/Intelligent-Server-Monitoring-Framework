/**
 * Test Retry Setup and Utilities
 * Provides advanced retry mechanisms for flaky tests
 */

import { vi, beforeEach, afterEach } from 'vitest';

// Global retry statistics
interface RetryStats {
  totalRetries: number;
  testRetries: Map<string, number>;
  failureReasons: Map<string, string[]>;
}

const retryStats: RetryStats = {
  totalRetries: 0,
  testRetries: new Map(),
  failureReasons: new Map(),
};

// Exponential backoff delay function
export function exponentialBackoffDelay(
  attempt: number,
  baseDelay = 1000,
  maxDelay = 30000,
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
  return Math.floor(delay + jitter);
}

// Linear backoff delay function
export function linearBackoffDelay(attempt: number, baseDelay = 1000): number {
  return baseDelay * (attempt + 1);
}

/**
 * Enhanced retry function with different backoff strategies
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    backoffStrategy?: 'exponential' | 'linear' | 'fixed' | 'none';
    baseDelay?: number;
    maxDelay?: number;
    shouldRetry?: (error: Error, attempt: number) => boolean;
    onRetry?: (error: Error, attempt: number) => void;
    testName?: string;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    backoffStrategy = 'exponential',
    baseDelay = 1000,
    maxDelay = 30000,
    shouldRetry = () => true,
    onRetry,
    testName = 'unknown',
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const result = await operation();

      // Track successful retry
      if (attempt > 0) {
        retryStats.totalRetries += attempt;
        retryStats.testRetries.set(testName, (retryStats.testRetries.get(testName) || 0) + attempt);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      // Track failure reason
      const reasons = retryStats.failureReasons.get(testName) || [];
      reasons.push(`Attempt ${attempt + 1}: ${lastError.message}`);
      retryStats.failureReasons.set(testName, reasons);

      // Check if we should retry
      if (attempt < maxAttempts - 1 && shouldRetry(lastError, attempt)) {
        // Calculate delay based on strategy
        let delay = 0;
        switch (backoffStrategy) {
          case 'exponential':
            delay = exponentialBackoffDelay(attempt, baseDelay, maxDelay);
            break;
          case 'linear':
            delay = linearBackoffDelay(attempt, baseDelay);
            break;
          case 'fixed':
            delay = baseDelay;
            break;
          case 'none':
            delay = 0;
            break;
        }

        if (onRetry) {
          onRetry(lastError, attempt);
        }

        console.log(
          `Test "${testName}" failed (attempt ${attempt + 1}/${maxAttempts}): ${lastError.message}`,
        );
        if (delay > 0) {
          console.log(`Retrying in ${delay}ms with ${backoffStrategy} backoff...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError!;
}

/**
 * Retry wrapper for database operations
 */
export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>,
  testName?: string,
): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    shouldRetry: (error) => {
      // Retry on common database errors
      const retryableErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'connection terminated',
        'server closed the connection',
        'Connection terminated',
        'timeout',
      ];

      return retryableErrors.some((errorType) =>
        error.message.toLowerCase().includes(errorType.toLowerCase()),
      );
    },
    onRetry: (error, attempt) => {
      console.log(`Database operation retry ${attempt + 1}: ${error.message}`);
    },
    testName: testName || 'database-operation',
  });
}

/**
 * Retry wrapper for HTTP requests
 */
export async function retryHttpRequest<T>(
  request: () => Promise<T>,
  testName?: string,
): Promise<T> {
  return retryWithBackoff(request, {
    maxAttempts: 4,
    backoffStrategy: 'exponential',
    baseDelay: 500,
    maxDelay: 10000,
    shouldRetry: (error, attempt) => {
      // Don't retry client errors (4xx), but retry server errors (5xx) and network errors
      if ('status' in error) {
        const status = (error as any).status;
        return status >= 500 || status === 429; // Retry server errors and rate limits
      }

      // Retry network errors
      const networkErrors = [
        'ECONNREFUSED',
        'ETIMEDOUT',
        'ENOTFOUND',
        'fetch failed',
        'network timeout',
      ];

      return (
        networkErrors.some((errorType) =>
          error.message.toLowerCase().includes(errorType.toLowerCase()),
        ) && attempt < 3
      ); // Max 3 attempts for network errors
    },
    onRetry: (error, attempt) => {
      console.log(`HTTP request retry ${attempt + 1}: ${error.message}`);
    },
    testName: testName || 'http-request',
  });
}

/**
 * Retry wrapper for file system operations
 */
export async function retryFileOperation<T>(
  operation: () => Promise<T>,
  testName?: string,
): Promise<T> {
  return retryWithBackoff(operation, {
    maxAttempts: 3,
    backoffStrategy: 'linear',
    baseDelay: 500,
    shouldRetry: (error) => {
      const retryableErrors = ['EBUSY', 'EMFILE', 'ENFILE', 'EACCES', 'EAGAIN', 'EPERM'];

      return retryableErrors.some((errorCode) => error.message.includes(errorCode));
    },
    onRetry: (error, attempt) => {
      console.log(`File operation retry ${attempt + 1}: ${error.message}`);
    },
    testName: testName || 'file-operation',
  });
}

/**
 * Wait for condition to be true with timeout and retries
 */
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  options: {
    timeout?: number;
    interval?: number;
    timeoutError?: string;
  } = {},
): Promise<void> {
  const {
    timeout = 10000,
    interval = 100,
    timeoutError = 'Condition not met within timeout',
  } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();
      if (result) {
        return;
      }
    } catch (error) {
      // Ignore condition check errors and continue waiting
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(timeoutError);
}

/**
 * Wait for service to be ready (health check)
 */
export async function waitForService(
  healthCheck: () => Promise<boolean>,
  serviceName: string,
  timeout = 30000,
): Promise<void> {
  return waitForCondition(healthCheck, {
    timeout,
    interval: 1000,
    timeoutError: `Service ${serviceName} not ready within ${timeout}ms`,
  });
}

/**
 * Flaky test detector - marks tests that fail inconsistently
 */
const flakyTests = new Set<string>();

export function markTestAsFlaky(testName: string): void {
  flakyTests.add(testName);
}

export function isTestFlaky(testName: string): boolean {
  return flakyTests.has(testName);
}

/**
 * Setup and teardown for retry tracking
 */
beforeEach(async (context) => {
  // Clear any global state that might affect tests
  vi.clearAllMocks();

  // Set test start time for performance tracking
  (context as any).testStartTime = Date.now();
});

afterEach(async (context) => {
  const testName = (context as any).task?.name || 'unknown';
  const duration = Date.now() - ((context as any).testStartTime || Date.now());

  // Log slow tests
  if (duration > 5000) {
    console.log(`⚠️ Slow test detected: "${testName}" took ${duration}ms`);
  }

  // Check for flaky test patterns
  const retryCount = retryStats.testRetries.get(testName) || 0;
  if (retryCount > 0) {
    console.log(`🔄 Test "${testName}" required ${retryCount} retries`);

    if (retryCount >= 2) {
      markTestAsFlaky(testName);
      console.log(`⚠️ Test "${testName}" marked as flaky due to multiple retries`);
    }
  }
});

// Export retry statistics for analysis
export function getRetryStats(): RetryStats {
  return {
    ...retryStats,
    testRetries: new Map(retryStats.testRetries),
    failureReasons: new Map(retryStats.failureReasons),
  };
}

export function resetRetryStats(): void {
  retryStats.totalRetries = 0;
  retryStats.testRetries.clear();
  retryStats.failureReasons.clear();
  flakyTests.clear();
}

// Log retry stats at the end of test run
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    const stats = getRetryStats();
    if (stats.totalRetries > 0) {
      console.log('\n📊 Test Retry Statistics:');
      console.log(`Total retries: ${stats.totalRetries}`);
      console.log(`Flaky tests: ${flakyTests.size}`);

      if (flakyTests.size > 0) {
        console.log('Flaky test list:');
        Array.from(flakyTests).forEach((test) => {
          console.log(`  - ${test}`);
        });
      }
    }
  });
}
