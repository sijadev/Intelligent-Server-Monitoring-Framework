# Test Fixtures

This directory contains lightweight template data used by tests to generate concrete profiles at runtime rather than committing many near-duplicate large JSON files.

Templates:

- test-profile-templates.json: Defines base complexity tiers (low/medium/high) with core knobs.

Runtime Factory Utility:

- `tests/utils/profile-factory.ts` provides:
  - `listProfileTemplates()` – list available templates
  - `createProfileFromTemplate(templateId, overrides)` – build a profile input payload
  - `registerProfileViaApi(baseUrl, templateId, overrides)` – optional helper to POST to running API

Example (test):

```ts
import { createProfileFromTemplate } from '../tests/utils/profile-factory';

const input = await createProfileFromTemplate('template-medium', {
  name: 'Custom Medium Scenario',
});
await fetch(`${BASE}/api/test-manager/profiles`, {
  method: 'POST',
  body: JSON.stringify(input),
  headers: { 'Content-Type': 'application/json' },
});
```

Policy:

- Do NOT commit large generated `profile-*.json` blobs.
- Use the factory to generate at runtime; keep templates small & stable.
- If a canonical example is ever needed, prefer adding a tiny synthetic profile, not a multi-thousand line artifact.

Migration Note:

Legacy gigantic `profile-<timestamp>.json` files have been removed in favor of this runtime generation approach.
