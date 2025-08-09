# 📡 WebSocket Netzwerk-Analyse

## 🤔 **Deine Frage: "Sehen wir alle im Netzwerk?"**

**Antwort: JA! Alle Container im Docker-Netzwerk können die WebSockets sehen.**

## 🔍 **Netzwerk-Konfiguration**

### **Docker Network Setup:**

- **Netzwerk**: `e2e_imf-test-network` (172.22.0.0/16)
- **Driver**: bridge
- **Internal**: false (kann mit Host kommunizieren)

### **Container IP-Adressen:**

```
IMF App (WebSocket Server): 172.22.0.4:3000
PostgreSQL:                172.22.0.3:5432
Redis:                     172.22.0.2:6379
Playwright (E2E Tests):    172.22.0.5
```

## 🌐 **WebSocket Sichtbarkeit**

### ✅ **Wer kann WebSockets sehen:**

1. **Alle Docker Container** im `imf-test-network`
2. **Host-System** (localhost:3000/ws)
3. **Playwright Tests** (über `http://imf-app:3000/ws`)
4. **Andere Netzwerk-Teilnehmer** im gleichen Subnetz

### 📊 **Aktuelle WebSocket-Verbindungen:**

Aus den E2E-Test-Logs sehen wir:

```
Total WebSocket Clients: ~165-183 aktive Verbindungen
Client IPs: Hauptsächlich 172.22.0.5 (Playwright Container)
```

## 🔒 **Sicherheits-Analyse**

### ⚠️ **Potentielle Sichtbarkeit:**

**JA, folgende können WebSocket-Traffic sehen:**

1. **Docker Host**: Vollständiger Zugriff auf alle Container
2. **Container im gleichen Netzwerk**: Können WebSocket-Verbindungen abfangen
3. **Playwright Tests**: Sehen alle Nachrichten (beabsichtigt für Testing)
4. **Docker Bridge Netzwerk**: Andere Container könnten Traffic monitoren

### 🛡️ **Aktuelle Schutzmaßnahmen:**

```typescript
// WebSocket Server Configuration (server/routes.ts)
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws',
  maxConnections: 50, // Begrenzte Verbindungen
  perMessageDeflate: false, // Keine Komprimierung
});
```

**Was NICHT geschützt ist:**

- ❌ Keine Authentication
- ❌ Keine Encryption (nur HTTP, nicht HTTPS/WSS)
- ❌ Keine Access Control Lists
- ❌ Keine Rate Limiting per Client

## 📈 **WebSocket-Traffic in E2E Tests**

### **Was die Tests sehen können:**

```javascript
// Alle Nachrichten-Types:
- problems: Problem-Updates
- metrics: System-Metriken
- logEntries: Real-time Logs
- plugins: Plugin-Status
- status: Framework-Status
```

### **Warum so viele Verbindungen:**

1. **Playwright Tests** erstellen multiple Browser-Instanzen
2. **Jeder Test** öffnet neue WebSocket-Verbindungen
3. **Auto-Reconnect** bei Connection-Problemen
4. **Parallel Testing** mit mehreren Browsern gleichzeitig

## 🎯 **Empfehlungen für Produktions-Sicherheit**

### **Option 1: Authentication hinzufügen**

```typescript
// JWT Token für WebSocket-Verbindungen
wss.on('connection', (ws, req) => {
  const token = new URL(req.url, 'http://localhost').searchParams.get('token');
  if (!validateJWT(token)) {
    ws.close(1008, 'Invalid token');
    return;
  }
});
```

### **Option 2: HTTPS/WSS in Produktion**

```typescript
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws`;
```

### **Option 3: Network Isolation**

```yaml
# docker-compose.yml
services:
  imf-app:
    networks:
      - internal-only
networks:
  internal-only:
    internal: true # Kein Zugang zum Host
```

## 🚨 **Aktueller Status in E2E Tests**

**Für Testing-Zwecke ist das PERFEKT:**

- ✅ Tests können alle WebSocket-Nachrichten monitoren
- ✅ Debugging ist einfach durch volle Sichtbarkeit
- ✅ E2E Tests validieren Real-time Features
- ✅ Network-Isolation zwischen Testläufen

**Für Produktion solltest du Security-Maßnahmen hinzufügen.**

---

## 🎯 **Fazit**

**JA**, alle Container im Docker-Netzwerk können die WebSocket-Verbindungen sehen. Das ist:

- ✅ **Gut für E2E Testing** (beabsichtigt)
- ⚠️ **Zu beachten für Produktion** (Security-Maßnahmen empfohlen)

Die aktuelle Konfiguration ist **optimal für Development und Testing**! 🚀
