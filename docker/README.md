# IMF Docker Environment

Die Docker-Umgebung für das Intelligent Monitoring Framework mit vollständiger AI Storage Unterstützung.

## 🚀 Quick Start

```bash
# Setup und Start der kompletten Umgebung
npm run docker:setup

# Oder manuell:
chmod +x ./docker/setup.sh
./docker/setup.sh
```

## 🏗️ Architektur

### Services

- **imf-app**: Hauptanwendung (Node.js/Express + Vite)
- **postgres**: PostgreSQL 15 für AI Progress Storage
- **redis**: Redis 7 für Caching und Sessions
- **test-mcp-server**: Test MCP Server für Integration Tests
- **python-ai**: Python AI Framework

### Development Services (nur in dev)

- **pgadmin**: Database Management UI
- **redis-commander**: Redis Management UI

## 📊 Verfügbare Ports

| Service | Port | URL | Beschreibung |
|---------|------|-----|--------------|
| IMF App | 3000 | http://localhost:3000 | Express Server API |
| Vite Dev | 5173 | http://localhost:5173 | Frontend Development |
| PostgreSQL | 5432 | - | Database |
| Redis | 6379 | - | Cache/Session Store |
| Test MCP | 3001 | http://localhost:3001 | Test MCP Server |
| pgAdmin | 8080 | http://localhost:8080 | DB Management |
| Redis Commander | 8081 | http://localhost:8081 | Redis Management |

## 🔧 Environment Configuration

### Development (.env)
```bash
NODE_ENV=development
AI_STORAGE_TYPE=hybrid
DB_PASSWORD=imf_password
MCP_SERVER_ID=imf-main-server
PROJECT_ID=imf-monitoring
ORGANIZATION_ID=imf-org
```

### Production
```bash
NODE_ENV=production
AI_STORAGE_TYPE=hybrid
DATABASE_URL=postgresql://user:password@host:port/database
REDIS_URL=redis://host:port
DB_PASSWORD=secure_password
```

## 🗄️ Database Schema

Die PostgreSQL Datenbank enthält:

- **ai_progress_tenant**: Tenant-aware AI Model Storage
- **sharing_audit_log**: Cross-Tenant Sharing Audit Trail
- **mcp_server_registry**: MCP Server Registry

## 🎯 Storage Types

| Type | Beschreibung | Docker Service |
|------|--------------|----------------|
| `memory` | In-Memory Storage | imf-app |
| `database` | PostgreSQL Storage | postgres |
| `redis` | Redis Storage | redis |
| `hybrid` | PostgreSQL + Redis | postgres + redis |
| `file` | File-based Storage | Volume Mount |

## 📝 Nützliche Befehle

### Docker Management
```bash
# Services starten
npm run docker:dev

# Mit Rebuild
npm run docker:dev-build

# Production starten
npm run docker:prod

# Services stoppen
npm run docker:down

# Logs anzeigen
npm run docker:logs

# Komplett aufräumen
npm run docker:clean
```

### Database Access
```bash
# PostgreSQL CLI
docker-compose exec postgres psql -U imf_user -d imf_ai_storage

# Database Backup
docker-compose exec postgres pg_dump -U imf_user imf_ai_storage > backup.sql

# Database Restore
docker-compose exec postgres psql -U imf_user -d imf_ai_storage < backup.sql
```

### Testing
```bash
# In Container testen
docker-compose exec imf-app npm test

# AI Storage Tests
docker-compose exec imf-app npm run test:ai-storage

# Long-term Tests
docker-compose exec imf-app npm run test server/test/long-term/
```

### Debugging
```bash
# Container Logs
docker-compose logs -f imf-app
docker-compose logs -f postgres
docker-compose logs -f redis

# Container Shell
docker-compose exec imf-app bash
docker-compose exec postgres bash

# Performance Monitoring
docker stats
```

## 🔒 Security Features

### Tenant Isolation
- **Row Level Security (RLS)** in PostgreSQL
- **Isolation Keys** für Multi-Tenant Separation
- **Environment-based Separation** (dev/staging/prod)

### Access Control
- **Granular Permissions** für Cross-Tenant Sharing
- **Audit Trail** für alle Sharing-Aktionen
- **Expiration** für geteilte Models

## 🧪 Testing

### AI Storage Tests
```bash
# Tenant Isolation Tests
docker-compose exec imf-app npx vitest run server/test/long-term/ai-enhanced-continuous-monitoring-tenant-aware.test.ts

# Cross-Tenant Sharing Tests
docker-compose exec imf-app npx vitest run server/test/enhanced-cross-tenant-sharing.test.ts

# Integration Tests
docker-compose exec imf-app npx vitest run server/test/container-integration-real-data.test.ts
```

## 🚨 Troubleshooting

### Häufige Probleme

**Database Connection Failed**
```bash
# Check PostgreSQL Status
docker-compose logs postgres
docker-compose exec postgres pg_isready -U imf_user
```

**Redis Connection Failed**
```bash
# Check Redis Status
docker-compose logs redis
docker-compose exec redis redis-cli ping
```

**Port Already in Use**
```bash
# Check port usage
lsof -i :3000
lsof -i :5432

# Stop conflicting services
docker-compose down
```

**Build Failures**
```bash
# Clean rebuild
docker-compose down --volumes
docker-compose build --no-cache
docker-compose up -d
```

### Performance Optimization

**Database Performance**
```sql
-- Check slow queries
SELECT * FROM pg_stat_activity WHERE state = 'active';

-- Analyze table statistics
ANALYZE ai_progress_tenant;
```

**Redis Memory Usage**
```bash
# Redis info
docker-compose exec redis redis-cli info memory

# Clear cache if needed
docker-compose exec redis redis-cli flushall
```

## 📈 Monitoring

### Health Checks
```bash
# Service Health
curl http://localhost:3000/health

# Database Health
docker-compose exec postgres pg_isready -U imf_user

# Redis Health
docker-compose exec redis redis-cli ping
```

### Metrics
- **Docker Stats**: `docker stats`
- **pgAdmin Dashboard**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🔄 CI/CD Integration

### GitHub Actions
```yaml
# In .github/workflows/ci.yml
- name: Start Docker Services
  run: |
    npm run docker:dev
    sleep 30  # Wait for services

- name: Run Tests
  run: |
    npm run test:ai-storage
```

### Production Deployment
```bash
# Production Build
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Production Start
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

**Die Docker-Umgebung ist vollständig für AI Storage mit Tenant-Aware Architecture konfiguriert!**