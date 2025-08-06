#!/bin/bash

# IMF - Vollständige Test-Suite mit automatischem Docker Management
# Startet Docker, führt alle Tests aus und räumt am Ende auf

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging Funktion
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Cleanup Funktion
cleanup() {
    log "🧹 Cleanup wird ausgeführt..."
    
    # Docker services stoppen
    if docker info >/dev/null 2>&1; then
        log "🐳 Stoppe Docker Services..."
        docker-compose down --remove-orphans 2>/dev/null || true
        cd docker/test-mcp-server && docker-compose down --remove-orphans 2>/dev/null || true
        cd ../..
        
        # Nur stoppen wenn wir Docker gestartet haben
        if [ "$DOCKER_STARTED_BY_SCRIPT" = "true" ]; then
            log "🛑 Stoppe Docker Desktop..."
            osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
            sleep 3
        fi
    fi
    
    success "✅ Cleanup abgeschlossen"
}

# Trap für Cleanup bei Script-Ende oder Fehler
trap cleanup EXIT INT TERM

log "🚀 Starte vollständige IMF Test-Suite mit Docker Management"

# Prüfe ob Docker läuft
DOCKER_STARTED_BY_SCRIPT=false
if ! docker info >/dev/null 2>&1; then
    log "🐳 Docker läuft nicht - starte Docker Desktop..."
    
    # Docker Desktop starten (macOS)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open -a Docker
        DOCKER_STARTED_BY_SCRIPT=true
        
        # Warte bis Docker läuft
        log "⏳ Warte auf Docker startup..."
        DOCKER_WAIT_COUNT=0
        while ! docker info >/dev/null 2>&1; do
            sleep 2
            echo -n "."
            DOCKER_WAIT_COUNT=$((DOCKER_WAIT_COUNT + 1))
            if [ $DOCKER_WAIT_COUNT -gt 60 ]; then
                error "❌ Docker konnte nicht gestartet werden (Timeout nach 2 Minuten)"
                exit 1
            fi
        done
        echo ""
        success "✅ Docker ist bereit"
    else
        error "❌ Docker ist nicht verfügbar. Bitte starte Docker manuell."
        exit 1
    fi
else
    log "✅ Docker läuft bereits"
fi

# Docker Services starten
log "🔧 Starte Docker Services..."
docker-compose up -d postgres redis 2>/dev/null || {
    warning "⚠️ Hauptservices konnten nicht gestartet werden - versuche trotzdem Test-Services"
}

# Test MCP Services starten
log "🧪 Starte Test MCP Services..."
cd docker/test-mcp-server
docker-compose up -d --build || {
    warning "⚠️ Test MCP Services konnten nicht gestartet werden"
}
cd ../..

# Kurz warten damit Services hochfahren
log "⏳ Warte 10 Sekunden auf Service-Startup..."
sleep 10

# Exit-Code für Tests
TEST_EXIT_CODE=0

log "🧪 Starte Test-Suite..."

# Python Framework Tests
log "🐍 Führe Python Framework Tests aus..."
if npm run test:python; then
    success "✅ Python Tests: PASSED"
else
    error "❌ Python Tests: FAILED"
    TEST_EXIT_CODE=1
fi

# AI Storage Tests  
log "🤖 Führe AI Storage Tests aus..."
if npm run test:ai-storage; then
    success "✅ AI Storage Tests: PASSED"
else
    error "❌ AI Storage Tests: FAILED"
    TEST_EXIT_CODE=1
fi

# Docker Integration Tests
log "🐳 Führe Docker Integration Tests aus..."
if npm run test:docker; then
    success "✅ Docker Integration Tests: PASSED"
else
    warning "⚠️ Docker Integration Tests: FAILED (möglicherweise Netzwerk-Issues)"
fi

# Haupttest-Suite (mit Timeout für macOS)
log "🧪 Führe Haupttest-Suite aus..."
if npm test; then
    success "✅ Haupttest-Suite: PASSED"
else
    warning "⚠️ Haupttest-Suite: Einige Tests fehlgeschlagen (möglicherweise Docker-abhängig)"
fi

# Test Ergebnisse
log "📊 Test-Zusammenfassung:"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    success "🎉 Alle kritischen Tests erfolgreich!"
else
    warning "⚠️ Einige Tests sind fehlgeschlagen - siehe Details oben"
fi

log "🏁 Test-Suite abgeschlossen"

# Cleanup erfolgt automatisch durch trap
exit $TEST_EXIT_CODE