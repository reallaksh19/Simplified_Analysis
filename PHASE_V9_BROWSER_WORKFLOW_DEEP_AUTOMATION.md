# Phase V9: Browser Workflow Deep Automation

## Objective

Prove real UI flows beyond app-load smoke tests through deterministic end-to-end browser workflow automation.

## Key Workflows

1. **Settings Workflow**: Edit settings → observe stale flag → hydrated settings hash changes
2. **Sketcher to 2D**: Create L-route → Analyze 2D → solver visible in results
3. **Sketcher to GC3D**: Create L-route → Push to 3D → GC3D/viewer route visible
4. **Calc Extended Report**: Run calculation → active report context published → Reports tab shows real method/formula IDs
5. **Benchmark Cards**: Navigate to benchmark tab → card opens → mock/fixture visible

## Implementation

### E2E Helpers

- **appNavigation.js**: Tab navigation and app state assertions
- **elementGuards.js**: Flexible element selection for evolving UI labels
- **reportAssertions.js**: Report content validation
- **sketcherActions.js**: Deterministic sketcher geometry creation via E2E hooks

### E2E Specs

- **v9-settings-workflow.spec.js**: Settings edit marks stale and changes hash
- **v9-sketcher-to-2d.spec.js**: L-route analyze 2D produces non-blank results
- **v9-sketcher-to-gc3d.spec.js**: L-route push to GC3D does not land blank
- **v9-calc-extended-report.spec.js**: Active calculation shows method/formula IDs in reports
- **v9-benchmark-cards.spec.js**: Benchmark tab opens if available

### Static Checks

- **scripts/v9-browser-workflow-check.mjs**: Verifies all files exist and contain required functions

## E2E Mode Guard

Tests use `window.__SIMPLIFIED_ANALYSIS_E2E__ = true` to enable direct store access:

```js
if (typeof window !== 'undefined' && window.__SIMPLIFIED_ANALYSIS_E2E__) {
  window.__SIMPLIFIED_ANALYSIS_SKETCHER_STORE__ = useSketchStore;
}
```

This hook is **never** used by production UI logic.

## Artifacts

On test failure, Playwright captures:
- Screenshots
- Video recordings
- Execution traces

## Certification

```bash
npm run check:v9
npm run check:qa
npm run check:e2e
npm run ci:v9
```
