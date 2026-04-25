# Phase 2 — Canonical Geometry + PCF Handoff Report

## Objective

Create one shared geometry truth for the project and make the PCF Viewer handoff explicit. This phase prevents every tab from inventing its own geometry model.

## Completed source changes

### 1. Canonical geometry core added

New files:

```text
src/core/geometry/geometryTypes.js
src/core/geometry/validateGeometry.js
src/core/geometry/adapters/pcfToCanonicalGeometry.js
src/core/geometry/adapters/canonicalToPcfComponents.js
```

Implemented:

- Canonical geometry schema marker: `canonical-geometry-v1`
- Canonical node/segment JSDoc contracts
- Geometry validator with node, segment, duplicate, zero-length, and unit diagnostics
- PCF-to-canonical geometry adapter
- Conservative canonical-to-PCF component adapter

### 2. App store handoff added

Updated:

```text
src/store/appStore.js
```

Added:

- `canonicalGeometry`
- `geometryDiagnostics`
- `setCanonicalGeometry`
- `getSelectedComponents`
- `getSelectedCanonicalGeometry`

`setComponents()` now rebuilds canonical geometry automatically from parsed PCF components.

### 3. PCF parser upgraded

Updated:

```text
src/utils/pcfParser.js
```

Added:

- `parsePcfWithDiagnostics(rawText)`
- deterministic component IDs without `Date.now()`
- `BRANCH2-POINT` and `BRANCH3-POINT` parsing
- `coords` alias for `CO-ORDS`
- parser diagnostics and parse summary

The old `parsePcf(rawText)` API remains backward compatible.

### 4. PCF export wired

Updated:

```text
src/components/Viewer3DTab.jsx
src/utils/pcfSerializer.js
```

Implemented:

- working `handleExportPcf()`
- export button now downloads `simplified-analysis-export.pcf`
- export log entry includes canonical summary and diagnostic count
- serializer now preserves branch points and support `CO-ORDS`

### 5. Simplified Analysis no longer polls legacy global PCF state

Updated:

```text
src/simp-analysis/SimpAnalysisTab.jsx
```

Changed behavior:

- Removed periodic legacy global polling
- Reads app-store `components`, `analysisPayload`, and `canonicalGeometry`
- Displays canonical node/segment status in the tab header

### 6. Version advanced

Updated:

```text
src/config/version.js
```

Version now identifies:

```text
2026.04.25-phase2
Phase 2 Canonical Geometry + PCF Handoff
canonical-geometry-v1
```

### 7. Smoke checks upgraded

Updated:

```text
scripts/smoke-check.mjs
scripts/syntax-check.mjs
```

Smoke check now verifies:

- canonical geometry core files exist
- parser exposes diagnostics
- app store exposes canonical geometry
- viewer wires parser/export/geometry status
- simplified analysis does not read legacy `window._state`
- PCF parse → canonical geometry → validation → serialize round trip works on an inline sample

## Check results in this environment

### Passed

```text
node scripts/smoke-check.mjs
```

Result:

```text
Smoke check passed: Phase 2 canonical geometry, PCF parser/export, and safe calculation path checks are valid.
```

### Limited / not fully rerun here

`npm run check` requires the dependency tree under `node_modules`. The delivery ZIP intentionally excludes `node_modules`. The sandbox had dependencies available only in another extracted folder, but invoking package-level npm/lint checks against that external dependency tree was unstable. Run the following locally after extracting the ZIP:

```bash
npm install
npm run syntax
npm run lint
npm run test
npm run check
npm run check:build
```

## Functional smoke test expected locally

1. Open app.
2. Load or paste PCF in Viewer.
3. Click Generate 3D.
4. Confirm status shows components, canonical nodes, and canonical segments.
5. Open Data Table and verify parsed components.
6. Click Export PCF and confirm file downloads.
7. Open Simplified Analysis and confirm canonical node/segment status appears.

## Phase 2 residual risks

- Transform and Sketcher are not yet fully converted to canonical geometry. That is Phase 3.
- Calc Extended still needs canonical geometry adapter handoff. That is Phase 4.
- `src/gc3d` duplicate remains intentionally untouched until Phase 4 port/archive.
- Parser/serializer are conservative and not yet a full lossless PCF round-trip engine.
