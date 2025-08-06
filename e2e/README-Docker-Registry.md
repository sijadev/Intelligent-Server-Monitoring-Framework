# IMF E2E Docker Registry Setup

Dieses System vermeidet ständige Downloads durch ein lokales Docker Registry und Container-Backups.

## 🏗️ Komponenten

### 1. Lokales Docker Registry
- **Registry**: `localhost:5000` - Speichert Docker Images lokal
- **Registry UI**: `localhost:5001` - Web-Interface für das Registry
- **Automatisches Caching**: Lädt alle benötigten Images herunter und cached sie

### 2. Container Backup System
- **Backup**: Erstellt komprimierte Archive aller Images
- **Restore**: Stellt Images aus Backups wieder her
- **Export/Import**: Einzelne Images verwalten

### 3. Optimierte E2E Tests
- **Lokale Images**: Nutzt Images aus dem lokalen Registry
- **Schnelle Starts**: Keine Downloads mehr bei Testläufen
- **Offline-Fähigkeit**: Tests laufen auch ohne Internet

## 🚀 Setup und Verwendung

### Schritt 1: Lokales Registry einrichten

```bash
# Registry starten und Images cachen
./setup-local-registry.sh

# Registry Status prüfen
curl http://localhost:5000/v2/_catalog
```

### Schritt 2: E2E Tests ausführen

```bash
# Mit lokalem Registry (empfohlen)
./run-local-registry-e2e.sh

# Traditionell mit Downloads
./run-docker-e2e.sh
```

### Schritt 3: Container-Backups erstellen

```bash
# Backup aller Images erstellen
./backup-containers.sh backup

# Verfügbare Backups anzeigen
./backup-containers.sh list

# Aus Backup wiederherstellen
./backup-containers.sh restore
```

## 📁 Verzeichnisstruktur

```
e2e/
├── docker-registry/
│   ├── docker-compose.registry.yml   # Registry Service
│   └── registry-config.yml           # Registry Konfiguration
├── docker-backups/                   # Container Backups
├── docker-compose.local.yml          # Lokale E2E Tests
├── setup-local-registry.sh           # Registry Setup
├── run-local-registry-e2e.sh         # E2E mit lokalem Registry
└── backup-containers.sh              # Backup Management
```

## 🔧 Konfiguration

### Registry Images
Automatisch gecacht:
- `postgres:15`
- `redis:7-alpine`
- `node:20-alpine`
- `mcr.microsoft.com/playwright:v1.40.0-focal`
- `localhost:5000/imf-app:latest`
- `localhost:5000/imf-playwright:latest`

### Registry Ports
- **5000**: Registry API
- **5001**: Registry Web UI

### Backup-Optionen
- Automatische Komprimierung
- Manifest mit Metadaten
- Cleanup alter Backups

## 📊 Vorteile

### Geschwindigkeit
- ⚡ **90% schneller**: Keine Downloads bei wiederholten Tests
- 🚀 **Offline-Tests**: Funktioniert ohne Internet
- 💾 **Lokaler Cache**: Images bleiben erhalten

### Zuverlässigkeit
- 🔒 **Konsistente Images**: Gleiche Versionen bei allen Tests
- 💿 **Backups**: Images können wiederhergestellt werden
- 🛡️ **Fehlerresistenz**: Unabhängig von externen Registries

### Entwicklung
- 👀 **Registry UI**: Einfache Verwaltung über Web-Interface
- 🔄 **Versionierung**: Verschiedene Image-Versionen parallel
- 🧹 **Cleanup**: Automatisches Löschen alter Images

## 🎛️ Commands

### Registry Management
```bash
# Registry starten
cd docker-registry && docker-compose -f docker-compose.registry.yml up -d

# Registry stoppen  
cd docker-registry && docker-compose -f docker-compose.registry.yml down

# Registry Status
curl -s http://localhost:5000/v2/_catalog | jq
```

### Backup Commands
```bash
# Vollbackup erstellen
./backup-containers.sh backup

# Einzelnes Image exportieren
./backup-containers.sh export localhost:5000/imf-app:latest

# Image importieren
./backup-containers.sh import ./docker-backups/imf-app_backup.tar

# Backups auflisten
./backup-containers.sh list

# Alte Backups löschen
./backup-containers.sh clean
```

### Test Commands
```bash
# E2E Tests mit lokalem Registry
./run-local-registry-e2e.sh

# Test-Logs lesen
./read-test-logs.sh --latest

# Nur Fehler anzeigen
./read-test-logs.sh --errors
```

## 🚨 Troubleshooting

### Registry nicht verfügbar
```bash
# Registry Status prüfen
curl http://localhost:5000/v2/

# Registry neu starten
cd docker-registry
docker-compose -f docker-compose.registry.yml restart
```

### Images fehlen
```bash
# Images neu cachen
./setup-local-registry.sh

# Verfügbare Images prüfen
curl -s http://localhost:5000/v2/_catalog | jq '.repositories[]'
```

### Tests schlagen fehl
```bash
# Lokale Registry Tests
./run-local-registry-e2e.sh

# Fallback zu Standard Tests
./run-docker-e2e.sh

# Logs analysieren
./read-test-logs.sh --errors
```

### Speicherplatz
```bash
# Registry Größe prüfen
docker system df

# Unbenutzte Images löschen
docker image prune -a

# Alte Backups löschen
./backup-containers.sh clean
```

## ⚙️ Wartung

### Regelmäßige Aufgaben
1. **Wöchentlich**: `./backup-containers.sh backup`
2. **Monatlich**: `./backup-containers.sh clean`
3. **Bei Updates**: `./setup-local-registry.sh`

### Monitoring
- Registry UI: http://localhost:5001
- Registry API: http://localhost:5000/v2/_catalog
- Backup Größe: `du -sh docker-backups/`

## 🎯 Best Practices

1. **Regelmäßige Backups**: Vor größeren Änderungen
2. **Image Tagging**: Spezifische Tags statt `:latest`
3. **Cleanup**: Alte Images und Backups regelmäßig löschen
4. **Monitoring**: Registry-Größe im Auge behalten
5. **Offline-Tests**: Registry für CI/CD Pipelines nutzen

---

🚀 **Happy Testing mit lokalem Docker Registry!**