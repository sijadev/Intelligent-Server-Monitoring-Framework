# 🛠️ Troubleshooting

(Extrahiert aus Haupt-README)

## Allgemeine Strategie

1. Problem klassifizieren (Collector, Detector, Remediator, API, Infra)
2. Logs prüfen (Server + Plugin spezifisch)
3. Metriken validieren (System + interne Health Checks)
4. Reproduzierbarkeit testen (isolierter Ablauf)
5. Automatisierte Tests ergänzen

## Häufige Probleme

### Hohe CPU Auslastung

- Ursache: Endlos-Loop, zu aggressive Intervalle
- Maßnahmen: Intervall erhöhen, Profiling laufen lassen

### Speicherleck

- Ursache: Nicht freigegebene Objekte
- Maßnahmen: tracemalloc aktivieren, Referenzen identifizieren

### Plugin reagiert nicht

- Ursache: Async Deadlock / Ausnahme unterdrückt
- Maßnahmen: Timeout + zusätzliche Logging Hooks

### Falsche Schwellenwert-Auslösung

- Ursache: Konfiguration nicht geladen
- Maßnahmen: Config Merge Reihenfolge prüfen

## Diagnose Tools

```bash
# CPU Profiling
python -m cProfile -o profile.out main.py

# Speicher Tracking
python -X tracemalloc main.py
```

## Log Level Erhöhen

```bash
LOG_LEVEL=debug python main.py
```
