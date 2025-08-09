// Lightweight mode for faster API contract tests.
// Ensures heavy services (Python monitor, Test Manager) are skipped.
// Must run before any server code imports config.
process.env.IMF_LIGHTWEIGHT_TEST = '1';
process.env.PYTHON_FRAMEWORK_ENABLED = 'false';
process.env.TEST_MANAGER_ENABLED = 'false';
