# Slice U Verification Gate

## Scope

| Slice | Purpose |
|---|---|
| Slice U | Place inline Master DB component by absolute center distance in mm |

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
npx playwright test e2e/3d-simplified-component-placement-ratio.spec.js
npx playwright test e2e/3d-simplified-component-placement-report.spec.js
npx playwright test e2e/3d-simplified-component-placement-clamp.spec.js
npx playwright test e2e/3d-simplified-component-placement-warning.spec.js
npx playwright test e2e/3d-simplified-component-placement-diagnostic.spec.js
npx playwright test e2e/3d-simplified-component-placement-diagnostic-export.spec.js
npx playwright test e2e/3d-simplified-component-placement-distance.spec.js
npm run check:full
npm run build
```

## Result log

| Command                                    | Result | Notes              |
| ------------------------------------------ | -----: | ------------------ |
| navigation spec                            |   PASS |                    |
| model contract spec                        |   PASS |                    |
| sketcher push spec                         |   PASS |                    |
| property contract spec                     |   PASS |                    |
| support loads spec                         |   PASS |                    |
| Master DB component spec                   |   PASS |                    |
| report spec                                |   PASS |                    |
| full workflow spec                         |   PASS |                    |
| report download spec                       |   PASS |                    |
| manual property editor spec                |   PASS |                    |
| support node editor spec                   |   PASS |                    |
| component insert buttons spec              |   PASS |                    |
| component split placement spec             |   PASS |                    |
| component placement ratio spec             |   PASS |                    |
| component placement report spec            |   PASS |                    |
| component placement clamp spec             |   PASS |                    |
| component placement warning spec           |   PASS |                    |
| component placement diagnostic spec        |   PASS |                    |
| component placement diagnostic export spec |   PASS | Slice T regression |
| component placement distance spec          |   PASS | Slice U            |
| npm run check:full                         |   PASS |                    |
| npm run build                              |   PASS |                    |

## Engineering notes

Slice U adds absolute-distance placement input while preserving the existing percentage-ratio placement mode.

Rules:

```text
If Placement distance mm is blank: use Placement %
If Placement distance mm is positive: distance overrides %
```

The distance represents component center distance measured from the selected segment start node.

## Checkpoint statement

Only after all rows are PASS:

```text
Checkpoint passed for Slice U.
```