// Ensures DATABASE_URL is set in test environment if only TEST_DATABASE_URL provided
if (!process.env.DATABASE_URL && process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  // Minimal noisy log once
  console.log('[env-bridge] DATABASE_URL bridged from TEST_DATABASE_URL');
}
