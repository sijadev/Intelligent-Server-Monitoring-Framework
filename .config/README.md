# Development Configuration

This directory contains local development configuration files to customize the IMF behavior during development.

## Files

### `development.json`

Main development configuration that overrides default settings for local development.

## Configuration Structure

```json
{
  "environment": "development",
  "services": {
    "testManager": {
      "enabled": true, // Enable Test Manager with fallback
      "cliRequired": false // Don't require CLI to be installed
    },
    "pythonFramework": {
      "enabled": true, // Enable Python framework
      "autoStart": false, // Don't auto-start Python processes
      "healthCheckInterval": 60000,
      "maxRetries": 3
    }
  },
  "external": {
    "requirePythonAPI": false, // Don't require Python API to be running
    "requireRedis": false, // Don't require Redis
    "requireTestManager": false, // Don't require Test Manager CLI
    "gracefulFallback": true // Use graceful fallbacks when services fail
  }
}
```

## Usage

The configuration is automatically loaded when `NODE_ENV=development`. Services will check these settings to:

- Skip initialization of unavailable dependencies
- Use real fallback implementations for development
- Use graceful fallbacks for external services
- Enable development-specific features

## Benefits

- **Faster Development Startup**: Skip unavailable external dependencies
- **Isolated Development**: Work without all production dependencies
- **Flexible Configuration**: Easily enable/disable services for testing
- **Graceful Fallbacks**: Continue working even when services fail

## Adding New Services

To add configuration for a new service:

1. Add service configuration in `development.json`
2. Use helper functions in `server/config/development-config.ts`:
   - `isServiceEnabled(serviceName)`
   - `isExternalServiceRequired(serviceName)`
   - `useGracefulFallback()`

## Example Service Integration

```typescript
import {
  isServiceEnabled,
  useGracefulFallback
} from '../config/development-config';
import { MyServiceFallback } from './service-resilience';

async initialize() {
  if (!isServiceEnabled('myService')) {
    console.log('📋 My Service disabled by development configuration');
    return;
  }

  try {
    await this.realInitialization();
  } catch (error) {
    if (useGracefulFallback()) {
  console.log('My Service using real fallback implementation');
      this.fallbackImplementation = new MyServiceFallback();
      return;
    }
    throw error;
  }
}
```

This ensures smooth development experience while maintaining production reliability.
