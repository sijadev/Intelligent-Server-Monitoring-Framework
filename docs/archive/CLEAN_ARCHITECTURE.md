# Clean Code Architecture - IMF Server

## Overview

The Intelligent Monitoring Framework (IMF) server has been refactored to follow clean code principles and improve maintainability.

## Improved Project Structure

```
server/
├── controllers/           # HTTP request handlers
│   ├── base.controller.ts    # Base controller with common functionality
│   ├── dashboard.controller.ts
│   ├── plugins.controller.ts
│   ├── problems.controller.ts
│   ├── metrics.controller.ts
│   └── index.ts             # Controller exports
├── routes/               # Route definitions
│   ├── dashboard.routes.ts
│   ├── plugins.routes.ts
│   ├── problems.routes.ts
│   ├── metrics.routes.ts
│   └── index.ts             # Route aggregation
├── services/            # Business logic services
│   ├── logger.service.ts    # Centralized logging
│   ├── log-aggregator.ts
│   ├── python-monitor.ts
│   └── service-container.ts
├── utils/               # Utility functions
│   └── index.ts
├── constants.ts         # Application constants
├── config.ts           # Configuration management
├── storage-init-clean.ts # Clean storage initialization
├── routes-new.ts       # Clean route registration
└── index-clean.ts      # Clean server entry point
```

## Key Improvements

### 1. Separation of Concerns

- **Controllers**: Handle HTTP requests/responses, validation, error handling
- **Services**: Contain business logic and external integrations
- **Routes**: Define endpoint mappings and middleware
- **Utils**: Reusable utility functions

### 2. Consistent Error Handling

```typescript
// Base controller provides consistent error handling
protected handleError(res: Response, error: unknown, message: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  this.logger.log('ERROR', 'controller', `${message}: ${errorMessage}`);
  res.status(500).json({ message, error: errorMessage });
}
```

### 3. Centralized Logging

```typescript
// Replaced console.log with structured logging
logger.info('server', 'Server started', { port: config.PORT });
logger.error('database', 'Connection failed', { error });
```

### 4. Constants and Configuration

```typescript
// Magic numbers and strings extracted to constants
export const DEFAULTS = {
  METRICS_LIMIT: 100,
  PROBLEMS_LIMIT: 50,
  LOGS_LIMIT: 1000,
} as const;
```

### 5. Dependency Injection

Controllers inherit from BaseController and have access to:

- Storage layer
- Logger service
- Common error handling methods

## Benefits

1. **Maintainability**: Smaller, focused files with single responsibilities
2. **Testability**: Easier to mock dependencies and test individual components
3. **Scalability**: Clear structure for adding new features
4. **Debugging**: Centralized logging with structured data
5. **Type Safety**: Better TypeScript support with proper interfaces

## Migration Guide

To use the new clean architecture:

1. Replace current imports with new structure:

```typescript
// Old
import { registerRoutes } from './routes';

// New
import { registerRoutes } from './routes-new';
```

2. Update server entry point:

```typescript
// Use index-clean.ts instead of index.ts
```

3. Update storage initialization:

```typescript
// Use storage-init-clean.ts for better logging
```

## Testing

The new structure makes testing easier:

```typescript
// Test controllers in isolation
const controller = new PluginsController();
const mockResponse = { json: vi.fn(), status: vi.fn() };
await controller.getPlugins(mockRequest, mockResponse);
```

## Future Enhancements

1. **Middleware**: Add request validation middleware
2. **Rate Limiting**: Add rate limiting per endpoint
3. **Caching**: Add Redis caching layer
4. **Monitoring**: Add health checks and metrics
5. **Documentation**: Auto-generate API documentation
