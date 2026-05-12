# Slice N Verification Gate

## Scope

| Slice | Purpose |
|---|---|
| Slice N | Split selected Sketcher pipe into upstream pipe, inline Master DB component, and downstream pipe |

## Commands

```bash
npx playwright test e2e/3d-simplified-navigation.spec.js
npx playwright test e2e/3d-simplified-model-contract.spec.js
npx playwright test e2e/3d-simplified-sketcher-push.spec.js
npx playwright test e2e/3d-simplified-property-contract.spec.js
npx playwright test e2e/3d-simplified-support-loads.spec.js
npx playwright test e2e/3d-simplified-master-db-component.spec.js
npx playwright test e2e/3d-simplified-report.spec.js
npx playwright test e2e/3d-simplified-full-workflow.spec.js
npx playwright test e2e/3d-simplified-report-download.spec.js
npx playwright test e2e/3d-simplified-manual-property-editor.spec.js
npx playwright test e2e/3d-simplified-support-node-editor.spec.js
npx playwright test e2e/3d-simplified-component-insert-buttons.spec.js
npx playwright test e2e/3d-simplified-component-split-placement.spec.js
npm run check:full
npm run build
```

## Result log

| Command                        | Result | Notes              |
| ------------------------------ | -----: | ------------------ |
| navigation spec                |    PASS |                    |
| model contract spec            |    PASS |                    |
| sketcher push spec             |    PASS |                    |
| property contract spec         |    PASS |                    |
| support loads spec             |    PASS |                    |
| Master DB component spec       |    PASS |                    |
| report spec                    |    PASS |                    |
| full workflow spec             |    PASS |                    |
| report download spec           |    PASS |                    |
| manual property editor spec    |    PASS |                    |
| support node editor spec       |    PASS |                    |
| component insert buttons spec  |    PASS | Slice M regression |
| component split placement spec |    PASS | Slice N            |
| npm run check:full             |    PASS |                    |
| npm run build                  |    PASS |                    |

## Engineering notes

Slice N intentionally keeps Slice M behavior unchanged.

Two user flows now exist:

| Flow                  | Button family                 | Behavior                                                                     |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------------- |
| Apply component data  | `sketcher-insert-component-*` | Applies Master DB data to the selected segment                               |
| Place/split component | `sketcher-place-component-*`  | Splits selected pipe into upstream pipe + inline component + downstream pipe |

For support-load continuity, unsupported inline component segments are distributed across all available supports by simplified fallback. This is documented behavior for the current simplified solver and is not a stiffness-based support reaction method.

## Checkpoint statement

Only after all rows are PASS:

```text
Checkpoint passed for Slice N.
```
