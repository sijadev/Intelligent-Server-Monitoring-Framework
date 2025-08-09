# Test MCP Server

Ein konfigurierbarer Test MCP (Model Context Protocol) Server für die Validierung der IMF MCP-Integration. Dieser Server läuft in Docker Containern und bietet verschiedene Test-Szenarien für umfassende MCP-Protokoll-Tests.

## Übersicht

Der Test MCP Server bietet:

- **🔧 Konfigurierbare Test-Szenarien**: Verschiedene Verhaltensweisen für Tools, Resources und Prompts
- **🐳 Docker-basierte Isolation**: Konsistente Testumgebung ohne externe Abhängigkeiten
- **📊 Performance-Metriken**: Detaillierte Statistiken über Anfragen und Antwortzeiten
- **❌ Fehler-Simulation**: Kontrollierte Fehlerszenarien für Robustheitstests
- **🚀 Multiple Transport-Protokolle**: HTTP, WebSocket und STDIO Unterstützung

## Schnellstart

### Voraussetzungen

- Docker und Docker Compose installiert
- Node.js 18+ (für lokale Entwicklung)

### Setup

```bash
# Ins Verzeichnis wechseln
cd docker/test-mcp-server

# Automatisches Setup ausführen
./setup.sh

# Oder manuell:
docker-compose up -d
```

### Verfügbare Services

Nach dem Start sind folgende Test-Server verfügbar:

| Service     | Port | Szenario            | URL                     |
| ----------- | ---- | ------------------- | ----------------------- |
| Basic       | 3001 | Grundfunktionalität | <http://localhost:3001> |
| Errors      | 3002 | Fehlerbehandlung    | <http://localhost:3002> |
| Performance | 3003 | Performance-Tests   | <http://localhost:3003> |
| WebSocket   | 3004 | WebSocket-Protokoll | ws://localhost:3004     |

## Konfiguration

### Test-Szenarien

#### Basic Test (`config/basic-test.json`)

- **Zweck**: Grundlegende MCP-Protokoll-Funktionalität testen
- **Tools**: `echo`, `calculate`
- **Resources**: Einfache JSON-Daten
- **Prompts**: Basis-Greeting-Prompts
- **Fehler**: Keine simulierten Fehler

#### Error Simulation (`config/error-simulation.json`)

- **Zweck**: Fehlerbehandlung und Recovery-Mechanismen testen
- **Tools**: `reliable_tool`, `unreliable_tool`, `timeout_tool`, `slow_tool`
- **Resources**: Arbeitende, defekte und langsame Resources
- **Prompts**: Funktionierende und fehlerhafte Prompts
- **Fehler**: 5% Verbindungsabbrüche, 10% Response-Fehler

#### Performance Test (`config/performance-test.json`)

- **Zweck**: Performance unter verschiedenen Lastbedingungen testen
- **Tools**: Schnelle, mittlere und langsame Tools
- **Resources**: Verschiedene Datengrößen
- **Prompts**: Performance-optimierte Prompts
- **Fehler**: Minimale Fehlerrate für realistische Tests

### Anpassung der Konfiguration

Erstellen Sie eigene Konfigurationsdateien im `config/` Verzeichnis:

```json
{
  \"server\": {
    \"name\": \"Custom Test MCP Server\",
    \"version\": \"1.0.0\",
    \"port\": 3001,
    \"protocol\": \"http\",
    \"host\": \"0.0.0.0\"
  },
  \"tools\": [
    {
      \"name\": \"my_tool\",
      \"description\": \"Custom tool for specific testing\",
      \"inputSchema\": {
        \"type\": \"object\",
        \"properties\": {
          \"input\": { \"type\": \"string\" }
        }
      },
      \"behavior\": \"success\",
      \"delayMs\": 0
    }
  ],
  \"resources\": [
    {
      \"uri\": \"test://my-resource\",
      \"name\": \"My Resource\",
      \"description\": \"Custom resource for testing\",
      \"mimeType\": \"application/json\",
      \"behavior\": \"success\",
      \"content\": \"{\\\"custom\\\": true}\"
    }
  ],
  \"prompts\": [
    {
      \"name\": \"my_prompt\",
      \"description\": \"Custom prompt for testing\",
      \"arguments\": [],
      \"behavior\": \"success\",
      \"responseTemplate\": \"Custom response\"
    }
  ]
}
```

## API Endpunkte

### Health Check

```bash
curl http://localhost:3001/health
```

### Statistiken abrufen

```bash
curl http://localhost:3001/stats
```

### Statistiken zurücksetzen

```bash
curl -X POST http://localhost:3001/stats/reset
```

### Konfiguration anzeigen

```bash
curl http://localhost:3001/config
```

## MCP Protokoll Tests

### Tools testen

```bash
# Liste verfügbarer Tools
curl -X POST http://localhost:3001/mcp/tools/list \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"tools/list\",
    \"params\": {}
  }'

# Tool aufrufen
curl -X POST http://localhost:3001/mcp/tools/call \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"tools/call\",
    \"params\": {
      \"name\": \"echo\",
      \"arguments\": { \"message\": \"Hello MCP!\" }
    }
  }'
```

### Resources testen

```bash
# Liste verfügbarer Resources
curl -X POST http://localhost:3001/mcp/resources/list \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"resources/list\",
    \"params\": {}
  }'

# Resource lesen
curl -X POST http://localhost:3001/mcp/resources/read \\
  -H \"Content-Type: application/json\" \\
  -d '{
    \"jsonrpc\": \"2.0\",
    \"id\": 1,
    \"method\": \"resources/read\",
    \"params\": { \"uri\": \"test://basic-data\" }
  }'
```

## Integration in bestehende Tests

Der Test MCP Server integriert sich nahtlos in die bestehende Vitest-Test-Infrastruktur:

```typescript
import { startTestMcpServers, stopTestMcpServers, createMcpClient } from './test-mcp-client';

describe('MCP Integration Tests', () => {
  beforeAll(async () => {
    await startTestMcpServers();
  });

  afterAll(async () => {
    await stopTestMcpServers();
  });

  it('should integrate with MCP protocol', async () => {
    const client = createMcpClient('http://localhost:3001');
    const response = await client.callTool('echo', { message: 'test' });
    expect(response).toHaveProperty('result');
  });
});
```

## Troubleshooting

### Container starten nicht

```bash
# Logs überprüfen
docker-compose logs

# Services neu starten
docker-compose down && docker-compose up -d
```

### Port-Konflikte

Ports in `docker-compose.yml` anpassen:

```yaml
ports:
  - \"3005:3001\" # Externen Port ändern
```

### Fehler beim Health Check

```bash
# Container-Status prüfen
docker-compose ps

# Detaillierte Logs
docker-compose logs test-mcp-basic
```

### Performance-Probleme

- Reduzieren Sie `delayMs` in der Konfiguration
- Deaktivieren Sie unnötigte Services
- Überprüfen Sie System-Ressourcen

## Entwicklung

### Lokale Entwicklung

```bash
# Dependencies installieren
npm install

# TypeScript kompilieren
npm run build

# Server lokal starten
npm run dev
```

### Neue Test-Szenarien hinzufügen

1. Erstellen Sie eine neue Konfigurationsdatei in `config/`
2. Fügen Sie einen neuen Service in `docker-compose.yml` hinzu
3. Aktualisieren Sie die Test-Clients entsprechend
4. Dokumentieren Sie das neue Szenario

### Custom Tools implementieren

Erweitern Sie `src/mcp-server.ts`:

```typescript
// Neuen Tool-Handler hinzufügen
this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'my_custom_tool') {
    // Custom Logic hier
    return { content: [{ type: 'text', text: 'Custom result' }] };
  }
  // ... existing logic
});
```

## Beitragen

1. Fork das Repository
2. Erstellen Sie einen Feature-Branch
3. Implementieren Sie Ihre Änderungen
4. Fügen Sie Tests hinzu
5. Dokumentieren Sie neue Features
6. Stellen Sie einen Pull Request

## Lizenz

Teil des Intelligent Monitoring Framework (IMF) Projekts.
