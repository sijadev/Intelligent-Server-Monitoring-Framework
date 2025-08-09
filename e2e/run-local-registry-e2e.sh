#!/bin/bash

# IMF E2E Tests mit lokalem Docker Registry
# Nutzt vorgebaute Images aus dem lokalen Registry

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_DIR="./test-logs"
LOG_FILE="${LOG_DIR}/e2e-local-${TIMESTAMP}.log"
RESULTS_DIR="./test-results"
REPORT_DIR="./playwright-report"
REGISTRY_HOST="localhost:5000"

print_status() {
    echo -e "${BLUE}[IMF E2E Local]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

# Create directories
mkdir -p "$LOG_DIR" "$RESULTS_DIR"

print_status "=== IMF E2E Tests mit lokalem Registry gestartet um $(date) ==="

# Check if local registry is running
if ! curl -s http://localhost:5000/v2/ > /dev/null; then
    print_error "Lokales Docker Registry ist nicht verfügbar auf localhost:5000"
    print_status "Starte das Registry mit: ./setup-local-registry.sh"
    exit 1
fi

print_success "Lokales Registry ist verfügbar"

# Check if images exist in registry
REQUIRED_IMAGES=(
    "imf-app:latest"
    "imf-playwright:latest" 
    "postgres:15"
    "redis:7-alpine"
)

print_status "Überprüfe verfügbare Images im lokalen Registry..."
for image in "${REQUIRED_IMAGES[@]}"; do
    if curl -s "http://localhost:5000/v2/${image%:*}/tags/list" | grep -q "${image#*:}"; then
        print_success "✓ ${REGISTRY_HOST}/$image verfügbar"
    else
        print_error "✗ ${REGISTRY_HOST}/$image nicht gefunden"
        print_status "Führe setup-local-registry.sh aus, um Images zu cachen"
        exit 1
    fi
done

# Clean up any existing containers
print_status "Cleanup bestehender Container..."
docker-compose -f docker-compose.local.yml down -v 2>&1 | tee -a "$LOG_FILE" || true

# Remove old test results
print_status "Lösche alte Test-Ergebnisse..."
rm -rf "$RESULTS_DIR"/* 2>/dev/null || true
rm -rf "$REPORT_DIR"/* 2>/dev/null || true

# Start containers with local images
print_status "Starte Container mit lokalen Images..."
if docker-compose -f docker-compose.local.yml up --abort-on-container-exit --exit-code-from playwright 2>&1 | tee -a "$LOG_FILE"; then
    EXIT_CODE=0
    print_success "E2E Tests erfolgreich abgeschlossen!"
else
    EXIT_CODE=$?
    print_error "E2E Tests fehlgeschlagen mit Exit Code: $EXIT_CODE"
fi

# Extract test results
print_status "Extrahiere Test-Ergebnisse..."
docker-compose -f docker-compose.local.yml cp playwright:/app/test-results "$RESULTS_DIR" 2>&1 | tee -a "$LOG_FILE" || print_warning "Konnte test-results nicht extrahieren"
docker-compose -f docker-compose.local.yml cp playwright:/app/playwright-report "$REPORT_DIR" 2>&1 | tee -a "$LOG_FILE" || print_warning "Konnte playwright-report nicht extrahieren"

# Save container logs
print_status "Speichere Container-Logs..."
docker-compose -f docker-compose.local.yml logs --no-color > "${LOG_DIR}/local-docker-logs-${TIMESTAMP}.log" 2>&1 || true

# Parse results if available
if [ -f "$RESULTS_DIR/results.json" ]; then
    print_status "Analysiere Test-Ergebnisse..."
    
    TOTAL_TESTS=$(jq -r '.stats.total // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    PASSED_TESTS=$(jq -r '.stats.passed // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0") 
    FAILED_TESTS=$(jq -r '.stats.failed // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    SKIPPED_TESTS=$(jq -r '.stats.skipped // 0' "$RESULTS_DIR/results.json" 2>/dev/null || echo "0")
    
    print_status "=== Test-Ergebnisse ==="
    print_status "Gesamt: $TOTAL_TESTS | Bestanden: $PASSED_TESTS | Fehlgeschlagen: $FAILED_TESTS | Übersprungen: $SKIPPED_TESTS"
    
    if [ "$FAILED_TESTS" -gt 0 ]; then
        print_warning "Fehlgeschlagene Tests:"
        jq -r '.tests[] | select(.status == "failed") | "  - \(.title) (\(.file))"' "$RESULTS_DIR/results.json" 2>/dev/null | tee -a "$LOG_FILE" || true
    fi
else
    print_warning "Keine results.json gefunden"
fi

# Cleanup containers
print_status "Cleanup Container..."
docker-compose -f docker-compose.local.yml down -v 2>&1 | tee -a "$LOG_FILE" || true

# Show summary
print_status "=== Zusammenfassung ==="
print_status "Test-Lauf beendet um: $(date)"
print_status "Exit Code: $EXIT_CODE" 
print_status "Log-Datei: $LOG_FILE"

if [ -d "$RESULTS_DIR" ] && [ "$(ls -A "$RESULTS_DIR" 2>/dev/null)" ]; then
    print_status "Test-Ergebnisse: $RESULTS_DIR"
fi

if [ -d "$REPORT_DIR" ] && [ "$(ls -A "$REPORT_DIR" 2>/dev/null)" ]; then
    print_status "HTML-Report: $REPORT_DIR"
    print_status "Report anzeigen: npx playwright show-report"
fi

# Final result
if [ $EXIT_CODE -eq 0 ]; then
    print_success "🚀 Alle E2E Tests bestanden!"
else
    print_error "❌ E2E Tests fehlgeschlagen!"
fi

print_status "=== Ende des Test-Laufs ==="

exit $EXIT_CODE