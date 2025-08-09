# ⚙️ Konfiguration

(Extrahiert aus Haupt-README)

Dieses Dokument beschreibt zentrale Konfigurationsbereiche und Prioritäten der Overrides.

## Grundstruktur

```yaml
app:
  env: production
  log_level: info
```

## Schwellenwerte

```yaml
thresholds:
  cpu_usage:
    warning: 80
    critical: 95
  memory_usage:
    warning: 75
    critical: 90
```

## Datenbank

```yaml
database:
  url: postgresql://user:pass@host:5432/db
  pool:
    min: 2
    max: 10
```

## Feature Flags

```yaml
features:
  auto_remediation: true
  anomaly_detection: true
  experimental:
    adaptive_intervals: false
```

## Secrets Handling

Verwendung von Umgebungsvariablen + Secret Manager (Empfehlung). Placeholder Beispiele bewusst ausgelassen.

## Override Reihenfolge

1. Default config
2. Umgebungs-spezifisch (z.B. config.prod.yaml)
3. Environment Variablen
4. CLI Parameter

## Test Manager / Profiles (Fallback entfernt)

Die frühere Fallback-Implementierung (service-resilience mit `TestManagerFallback` / `PythonAPIFallback`) wurde vollständig entfernt, um inkonsistente Testdaten und versteckte Silent-Modes zu vermeiden. Der Test Manager setzt jetzt auf:

- Runtime Profile Factory (Templates unter `tests/fixtures/test-profile-templates.json` + Helfer `tests/utils/profile-factory.ts`)
- Persistenz über Datenbanktabellen `test_profiles` und `generated_test_data`
- Migration: `migrations/0001_add_test_profiles.sql` (unbedingt vor Start ausführen)

Wichtig:

1. Alte große `profile-*.json` Dateien werden nicht mehr benötigt und sollten entfernt sein / bleiben.
2. Falls beim Start weiterhin Warnungen zu fehlenden Relationen erscheinen, sicherstellen dass Migration ausgeführt wurde (z.B. über Drizzle Push oder manuelles `psql -f`).
3. Neue Profile erzeugen: Entweder API POST `/api/test-manager/profiles` oder Factory Utility im Testcode verwenden.

Minimalbeispiel (Test Helper):

```ts
import { createProfileFromTemplate } from '../tests/utils/profile-factory';
// ...
const input = await createProfileFromTemplate('high');
await fetch('http://localhost:3000/api/test-manager/profiles', {
  method: 'POST',
  body: JSON.stringify(input),
  headers: { 'Content-Type': 'application/json' },
});
```

Damit ist der deterministische, schlanke Profil-Workflow aktiv und alte Fallback-Pfade sind entfernt.
