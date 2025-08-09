# 🔧 Plugin Development & Management

(Extrahiert aus Haupt-README)

Dieses Dokument beschreibt den Aufbau des Plugin-Systems (Collector, Detector, Remediator), die Erstellung eigener Plugins sowie Verwaltung und Konfiguration.

## Built-in Plugin Architecture

MCP.Guard kommt mit 8 eingebauten Plugins nach Typ organisiert:

### Collector Plugins (Data Gathering)

```python
# System Metrics Collector
async def collect_system_metrics():
    return {
        'cpuUsage': psutil.cpu_percent(),
        'memoryUsage': psutil.virtual_memory().percent,
        'diskUsage': psutil.disk_usage('/').percent
    }
```

_…weitere Beispiele siehe Quellcode (`python-framework/`)_

### Detector Plugins (Problem Detection)

```python
# Threshold Detector
async def detect_threshold_problems(metrics):
    problems = []
    if metrics['cpuUsage'] > 90:
        problems.append(Problem(
            type='HIGH_CPU_USAGE',
            severity='CRITICAL',
            description=f'CPU usage is {metrics["cpuUsage"]}%'
        ))
    return problems
```

### Remediator Plugins (Auto-Healing)

```python
# Auto-Remediator
async def auto_remediate_problems(problems):
    for problem in problems:
        if problem.type == 'HIGH_MEMORY_USAGE':
            gc.collect()
```

## Creating Custom Plugins

Beispiel eines Custom Collector Plugins:

```python
class CustomMonitorPlugin:
    def __init__(self):
        self.name = "custom_monitor"
        self.version = "1.0.0"
        self.type = "collector"

    async def collect_metrics(self):
        return {
            'customMetric': self.get_custom_data(),
            'timestamp': datetime.now()
        }
```

Registrierung in `enhanced_main.py`:

```python
self.plugins.append({
  'name': 'custom_monitor',
  'version': '1.0.0',
  'type': 'collector',
  'status': 'running',
  'description': 'Custom monitoring plugin',
  'collect_func': self.collect_custom_metrics
})
```

## Management via API

Siehe API Beispiele in Haupt-README oder `docs/INTELLIGENT_MCP_MONITORING.md`.

## Plugin Management UI

- Übersicht
- Live Status
- Steuerung (Start/Stop)
- Performance
- Konfiguration

## Konfigurationsdatei (Ausschnitt)

```yaml
thresholds:
  cpu_usage:
    warning: 80
    critical: 95
```

Weitere Details folgen – Abschnitt kann bei Bedarf erweitert werden.
