# Phase U7: Browser QA and Deterministic CI

## Objective

Upgrade QA from shallow app-load smoke tests to workflow-oriented browser checks and deterministic runtime guards.

## Deliverables

### 1. Browser Workflow Smoke Suite
- File: `e2e/u7-workflow-smoke.spec.js`
- Tests core user workflows:
  - App loads and Settings tab is reachable
  - Settings edits mark results stale and change contract hash
  - Reports tab shows no active report before calculation

### 2. Deterministic Timestamp Guard
- File: `scripts/qa-check.mjs` (updated)
- Scans source for non-deterministic calls:
  - `Date.now()`
  - `new Date(`
  - `performance.now(`
- Maintains whitelist for approved files:
  - `src/sketcher/SketcherStore.js`
  - `src/reporting/index.js`

### 3. Required E2E File Guard
- File: `scripts/u7-browser-qa-check.mjs`
- Validates presence of required E2E specs
- Checks playwright config for artifact policy

### 4. CI Aggregate Script
- Package scripts:
  - `npm run check:u7` — Static checks only
  - `npm run ci:u7` — Full CI: u6 + u7 checks + qa + e2e + build

## Testing

```bash
npm run check:u7
npm run check:qa
npm run check:e2e
npm run ci:u7
```

## Files Changed

- Created: `e2e/u7-workflow-smoke.spec.js`
- Created: `scripts/u7-browser-qa-check.mjs`
- Created: `PHASE_U7_BROWSER_QA_DETERMINISTIC_CI.md`
- Updated: `scripts/qa-check.mjs`
- Updated: `playwright.config.js`
- Updated: `package.json`
