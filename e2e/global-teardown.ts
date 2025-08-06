async function globalTeardown() {
  console.log('🧹 Running global E2E test teardown...');
  
  // Cleanup any test data, close connections, etc.
  // This runs after all tests are complete
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;