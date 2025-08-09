# 🏗️ Architektur-Verbesserungen für IMF

## Übersicht der implementierten Patterns

### 1. 🔄 **State Management Pattern**

**Datei**: `server/state/server-state.ts`

**Vorteile**:

- ✅ Zentraler Zustand für den gesamten Server
- ✅ Event-basierte Zustandsänderungen
- ✅ Typsichere State-Operationen
- ✅ Health-Check Integration
- ✅ Graceful Shutdown Support

**Verwendung**:

```typescript
import { serverState } from './state/server-state';

// Status setzen
serverState.setServerStatus('running');
serverState.setPythonFrameworkStatus({ status: 'running', pid: 12345 });

// Status abfragen
const isHealthy = serverState.isHealthy();
const uptime = serverState.getUptime();

// Events abonnieren
serverState.on('server:status', (newStatus, oldStatus) => {
  console.log(`Server status changed: ${oldStatus} -> ${newStatus}`);
});
```

### 2. 🎯 **Service Container & Dependency Injection**

**Datei**: `server/services/service-container.ts`

**Vorteile**:

- ✅ Zentrale Service-Verwaltung
- ✅ Dependency Injection
- ✅ Service-Lebenszyklus Management
- ✅ Health-Checks für alle Services
- ✅ Graceful Shutdown

**Verwendung**:

```typescript
import { serviceContainer, getService } from './services/service-container';

// Services registrieren
await serviceContainer.initialize({
  storage: storageService,
  pythonMonitor: pythonService,
  logAggregator: logService,
});

// Service verwenden
const storage = getService<Storage>('storage');
const healthStatus = await serviceContainer.healthCheck();
```

### 3. 📡 **Event-Driven Architecture**

**Datei**: `server/events/event-bus.ts`

**Vorteile**:

- ✅ Lose gekoppelte Komponenten
- ✅ Typsichere Event-Definitionen
- ✅ Event-History und -Statistiken
- ✅ Middleware-Support
- ✅ Async Event Handling

**Verwendung**:

```typescript
import { eventBus, emitEvent, onEvent } from './events/event-bus';

// Event emittieren
emitEvent('data:plugin:created', {
  plugin: newPlugin,
  timestamp: new Date(),
});

// Event abonnieren
onEvent('database:connected', (data) => {
  console.log('Database connected at:', data.timestamp);
});

// Event-Statistiken
const Stats = eventBus.getEventStats();
```

### 4. 📊 **Repository Pattern**

**Datei (ersetzt durch Drizzle Implementierung)**: `server/repositories/base.repository.ts`

**Vorteile**:

- ✅ Konsistente Datenbank-Operationen
- ✅ Query-Builder Funktionalität
- ✅ Pagination und Filtering
- ✅ Event-Integration
- ✅ Error-Handling

**Implementierung**:

```typescript
// Heutige Implementierung nutzt DrizzleRepository
export class PluginRepository extends DrizzleRepository<Plugin, string> {
  constructor(db: PostgresJsDatabase<any>, logger?: ILoggerService) {
    super(db, plugins, plugins.id, 'plugins', logger);
  }
}
```

### 5. 🔧 **Middleware Stack Pattern**

**Datei**: `server/middleware/middleware-stack.ts`

**Vorteile**:

- ✅ Modulare Request-Verarbeitung
- ✅ Request-Context Management
- ✅ Rate Limiting
- ✅ Error Handling
- ✅ Request Logging

**Verwendung**:

```typescript
import { createDefaultMiddlewareStack } from './middleware/middleware-stack';

const middlewareStack = createDefaultMiddlewareStack();
app.use((req, res, next) => middlewareStack.execute(req, res, next));
```

### 6. 🏭 **Factory Pattern**

**Datei**: `server/factories/service-factory.ts`

**Vorteile**:

- ✅ Environment-spezifische Service-Erstellung
- ✅ Konfigurierbare Service-Parameter
- ✅ Validation und Fallbacks
- ✅ Testbarkeit

**Verwendung**:

```typescript
import { createServiceFactory } from './factories/service-factory';

const factory = createServiceFactory(); // Automatische Umgebungs-Erkennung
const services = await factory.createAllServices();

// Oder spezifische Factory
const devFactory = new DevelopmentServiceFactory();
const testFactory = new TestServiceFactory();
```

## 🔄 Migration Plan

### Phase 1: State Management (✅ Implementiert)

- [x] Server State Management
- [x] Event Bus System
- [x] Service Container

### Phase 2: Repository Layer

- [ ] Plugin Repository
- [ ] Problem Repository
- [ ] Metrics Repository
- [ ] Configuration Repository

### Phase 3: Middleware Integration

- [ ] Request Context in bestehende Routes
- [ ] Rate Limiting aktivieren
- [ ] Enhanced Error Handling

### Phase 4: Factory Integration

- [ ] Service Factory in index.ts integrieren
- [ ] Environment-spezifische Konfigurationen
- [ ] Test-Factory Setup

## 🎯 **Weitere empfohlene Verbesserungen**

### 1. **Command Query Responsibility Segregation (CQRS)**

```typescript
// Commands (Write Operations)
export class CreatePluginCommand {
  constructor(public readonly data: InsertPlugin) {}
}

export class CreatePluginHandler {
  async handle(command: CreatePluginCommand): Promise<Plugin> {
    // Validation, business logic, event emission
  }
}

// Queries (Read Operations)
export class GetPluginsQuery {
  constructor(public readonly filters?: PluginFilters) {}
}

export class GetPluginsHandler {
  async handle(query: GetPluginsQuery): Promise<Plugin[]> {
    // Optimized read logic
  }
}
```

### 2. **Domain-Driven Design (DDD)**

```typescript
// Domain Models
export class PluginDomain {
  constructor(private plugin: Plugin) {}

  start(): void {
    if (this.plugin.status === 'running') {
      throw new Error('Plugin is already running');
    }
    this.plugin.status = 'running';
    // Emit domain event
  }

  stop(): void {
    // Business logic for stopping plugin
  }
}
```

### 3. **API Versioning**

```typescript
// v1/routes.ts
export const v1Routes = express.Router();
v1Routes.get('/plugins', getPluginsV1);

// v2/routes.ts
export const v2Routes = express.Router();
v2Routes.get('/plugins', getPluginsV2);

// app.ts
app.use('/api/v1', v1Routes);
app.use('/api/v2', v2Routes);
```

### 4. **Background Job Processing**

```typescript
export class JobQueue {
  async addJob(type: string, data: any, options?: JobOptions): Promise<void> {
    // Queue job for background processing
  }
}

// Jobs
export class MetricsCollectionJob {
  async execute(data: any): Promise<void> {
    // Collect and store metrics
  }
}
```

## 🧪 **Testing Strategy**

### Unit Tests

```typescript
describe('PluginRepository', () => {
  let repository: PluginRepository;
  let testFactory: TestServiceFactory;

  beforeEach(async () => {
    testFactory = new TestServiceFactory();
    const services = await testFactory.createAllServices();
    repository = new PluginRepository(services.storage);
  });

  it('should create plugin successfully', async () => {
    const plugin = await repository.create(mockPluginData);
    expect(plugin.id).toBeDefined();
  });
});
```

### Integration Tests

```typescript
describe('Plugin API', () => {
  let app: Express;
  let serviceContainer: ServiceContainer;

  beforeEach(async () => {
    const factory = new TestServiceFactory();
    const services = await factory.createAllServices();
    serviceContainer = new ServiceContainer();
    await serviceContainer.initialize(services);
    app = createApp(serviceContainer);
  });

  it('should create plugin via API', async () => {
    const response = await request(app).post('/api/plugins').send(mockPluginData).expect(201);

    expect(response.body.id).toBeDefined();
  });
});
```

## 📊 **Performance Monitoring**

### Metrics Collection

```typescript
export class MetricsCollector {
  collectSystemMetrics(): SystemMetrics {
    return {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      requests: serverState.getMetrics().requestCount,
    };
  }
}
```

### Health Checks

```typescript
export class HealthChecker {
  async checkHealth(): Promise<HealthStatus> {
    return {
      status: serverState.isHealthy() ? 'healthy' : 'unhealthy',
      services: await serviceContainer.healthCheck(),
      uptime: serverState.getUptime(),
      timestamp: new Date(),
    };
  }
}
```

Diese Architektur-Verbesserungen machen das System:

- 🏗️ **Skalierbarer** - Klare Trennung von Verantwortlichkeiten
- 🧪 **Testbarer** - Dependency Injection und Mocking
- 🔧 **Wartbarer** - Modulare Struktur und klare Interfaces
- 📊 **Überwachbarer** - Zentrale Metriken und Health Checks
- 🚀 **Performanter** - Optimierte Queries und Caching-Möglichkeiten
