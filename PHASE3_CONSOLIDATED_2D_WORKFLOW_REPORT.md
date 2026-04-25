# Phase 3 — Consolidated 2D Workflow Report

## Outcome

Phase 3 consolidates the 2D workflow so that Transform, Sketcher, and Simplified Analysis no longer create unrelated calculation payloads. The new workflow is:

```text
PCF / canonical geometry
  → Transform 2D payload or Sketcher graph
  → Canonical geometry adapter
  → Simplified 2D payload
  → Simplified 2D screening solver
```

## Key implementation

### New core geometry modules

- `planeDetection.js` — detects dominant projection plane and exposes projection helpers.
- `topologyClassifier.js` — classifies canonical graph topology by node degree.
- `transform3dTo2d.js` — dependency-light true-length 3D-to-2D transform utility.

### New adapters

- `transformToCanonicalGeometry.js` converts Transform tab output to canonical geometry.
- `sketcherToCanonicalGeometry.js` converts Sketcher graph to/from canonical geometry.
- `canonicalToSimplified2D.js` converts canonical geometry into the solver-ready Simplified 2D payload.

### New simplified 2D solver core

- Classifies L-shape, Z-shape, loop/multi-leg, offset, straight, and empty cases.
- Produces deterministic screening result.
- Exposes assumptions, warnings, classification, status, and formula trace.
- Labels the result as screening, not final code stress analysis.

## UI wiring

### Transform tab

`TransformTab.jsx` now stores:

- Transform payload
- Canonical geometry from Transform
- Simplified 2D solver payload

Then it opens `simpAnalysis` with the explicit payload.

### Sketcher

`SketcherStore.js` now supports:

- `importFromCanonicalGeometry`
- `exportToCanonicalGeometry`

`SketcherTab.jsx` now includes an **Analyze 2D** action that sends the edited graph directly to Simplified Analysis through canonical geometry.

### Simplified Analysis

`SimpAnalysisTab.jsx` now consumes payloads in this order:

1. Explicit `simplifiedGeometry`
2. Explicit `analysisPayload` with `simplified-2d-v1`
3. Active canonical geometry fallback
4. Old PCF component graph fallback

## Checks run

```text
npm run syntax  ✅ passed with dependency-free fallback
npm run test    ✅ passed
npm run check   ✅ passed
```

## Important limitation

Because this delivery excludes `node_modules`, full JSX parsing through `@babel/parser`, ESLint, and Vite build should be rerun locally after:

```bash
npm install
npm run check:full
```

## Engineering note

The simplified solver added in Phase 3 is intentionally a screening solver. It should not be used as a final code compliance result until Phase 4/5 benchmark parity against the legacy SPL2/workbook methods is completed.
