# 🤝 Contributing

(Extrahiert aus Haupt-README)

## Code Guidelines

- Clean Architecture Prinzipien
- Klare Layer (Domain, Application, Infrastructure)
- Keine Logik in Framework Adaptern

## Commit Messages

Konventionelles Format:

```text
feat(test-manager): add lcov parsing for line coverage
fix(docs): correct markdown spacing
```

## Branching

- main (geschützt)
- Development (aktiver Integrationszweig)
- feature/`<topic>`
- fix/`<topic>`

## Pull Requests

- Beschreibung + Motivation
- Screenshots bei UI Änderungen
- Tests oder Gründe für fehlende Tests
- Checklist: Lint, Tests, Coverage Report

## Code Review

- Fokus: Lesbarkeit, Risiken, Testbarkeit
- Nitpicks minimieren
- Sicherheitsrelevante Aspekte hervorheben

## Release Prozess

1. Version bump
2. Changelog aktualisieren
3. Tag pushen
4. CI Release Pipeline
