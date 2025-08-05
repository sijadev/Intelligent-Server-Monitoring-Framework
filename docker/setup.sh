#!/bin/bash

# IMF Docker Setup Script
# Setzt die Docker-Umgebung für lokale Entwicklung auf

set -e

echo "🐳 IMF Docker Setup wird gestartet..."

# Check Docker Installation
if ! command -v docker &> /dev/null; then
    echo "❌ Docker ist nicht installiert. Bitte Docker installieren."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose ist nicht installiert. Bitte Docker Compose installieren."
    exit 1
fi

# Verzeichnisse erstellen
echo "📁 Erstelle notwendige Verzeichnisse..."
mkdir -p ./backups
mkdir -p ./test-workspace/{logs,output,profiles}
mkdir -p ./python-framework/ai_models

# Environment File erstellen falls nicht vorhanden
if [ ! -f .env ]; then
    echo "🔧 Erstelle .env File..."
    cat > .env << EOF
# IMF Environment Configuration
NODE_ENV=development
AI_STORAGE_TYPE=hybrid
DB_PASSWORD=imf_password
MCP_SERVER_ID=imf-main-server
PROJECT_ID=imf-monitoring
ORGANIZATION_ID=imf-org

# Optional: Override für Production
# DATABASE_URL=postgresql://user:password@host:port/database
# REDIS_URL=redis://host:port
EOF
fi

# Docker Images bauen
echo "🔨 Baue Docker Images..."
docker-compose build

# Services starten
echo "🚀 Starte Services..."
docker-compose up -d postgres redis

# Warte auf Database
echo "⏳ Warte auf PostgreSQL..."
timeout 60 bash -c 'until docker-compose exec postgres pg_isready -U imf_user -d imf_ai_storage; do sleep 2; done'

echo "⏳ Warte auf Redis..."
timeout 30 bash -c 'until docker-compose exec redis redis-cli ping; do sleep 2; done'

# Hauptanwendung starten
echo "🏃 Starte IMF Anwendung..."
docker-compose up -d

# Status anzeigen
echo ""
echo "✅ IMF Docker Setup abgeschlossen!"
echo ""
echo "📊 Verfügbare Services:"
echo "  - IMF App:          http://localhost:3000"
echo "  - Vite Dev Server:  http://localhost:5173"
echo "  - pgAdmin:          http://localhost:8080 (admin@imf.local / admin)"
echo "  - Redis Commander: http://localhost:8081"
echo "  - Test MCP Server:  http://localhost:3001"
echo ""
echo "🔧 Nützliche Befehle:"
echo "  docker-compose logs -f           # Logs anzeigen"
echo "  docker-compose down              # Services stoppen"
echo "  docker-compose restart imf-app   # App neu starten"
echo "  docker-compose exec postgres psql -U imf_user -d imf_ai_storage  # DB Zugriff"
echo ""
echo "🧪 Tests ausführen:"
echo "  docker-compose exec imf-app npm test"
echo "  docker-compose exec imf-app npm run test:ai-storage"
echo ""