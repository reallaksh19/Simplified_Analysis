# Phase V16: Production PCFX Import-Export UI and Golden Fixtures

## Objective

Expose the V15 PCFX adapter to users through import/export UI buttons and add golden PCFX fixtures for testing and validation.

## Scope

This phase adds three levels of testing:
1. **Pure adapter behavior** — V15 roundtrip functions
2. **Golden fixture behavior** — Pre-made PCFX JSON files
3. **Browser UI smoke behavior** — E2E sketcher and reports UI

## Key Files

### Core Utilities
- `src/core/pcfx/pcfxFileUtils.js` (V15 carryover)
- `src/reporting/reportPcfxDebugSnapshot.js` (V15 carryover)

### Golden Fixtures
- `benchmarks/fixtures/pcfx-roundtrip/bend.pcfx.json`
- `benchmarks/fixtures/pcfx-roundtrip/tee.pcfx.json`
- `benchmarks/fixtures/pcfx-roundtrip/olet.pcfx.json`
- `benchmarks/fixtures/pcfx-roundtrip/missing-component.pcfx.json`

### Scripts
- `scripts/v16-pcfx-ui-fixtures-check.mjs` — Static validation
- `scripts/v16-pcfx-ui-fixtures-behavior-test.mjs` — Behavior tests

### E2E Tests
- `e2e/v16-pcfx-import-export.spec.js` — Browser smoke tests

### Updated Files
- `src/sketcher/SketcherStore.js` — Added PCFX state and actions
- `src/sketcher/SketcherTab.jsx` — Added PCFX toolbar buttons
- `src/reporting/ReportsTab.jsx` — Added PCFX debug export button
- `scripts/qa-check.mjs` — Added V16 e2e test to required files

## File Utils (`pcfxFileUtils.js`)

### Exports
- `serializePCFX(pcfx)` — JSON.stringify with proper formatting
- `parsePCFXText(text)` — JSON.parse with error handling
- `downloadTextFile(filename, content, mimeType)` — Browser download
- `readFileAsText(file)` — FileReader promise wrapper
- `makePCFXFilename(prefix)` — Sanitize and format filenames

## Report Debug Snapshot (`reportPcfxDebugSnapshot.js`)

### Exports
- `createReportPCFXDebugSnapshot(options)` — Create debug snapshot
- `REPORT_PCFX_DEBUG_SCHEMA_VERSION` = `'report-pcfx-debug-snapshot-v1'`

### Snapshot Shape
```javascript
{
  schemaVersion: PCFX_ROUNDTRIP_SCHEMA_VERSION,
  pcfxVersion: PCFX_VERSION,
  debugProfile: REPORT_PCFX_DEBUG_SCHEMA_VERSION,
  project: 'SIMPLIFIED_ANALYSIS_REPORT_DEBUG',
  units: { reportUnitSystem },
  nodes: {},
  segments: [],
  components: [],
  diagnostics: [],
  lossContract: [],
  rawAttributes: {},
  normalized: {
    moduleId,
    methodId,
    formulaIds,
    settingsHash,
    status,
    dataStatus,
    componentDataStatus
  },
  derived: {
    reportStableHash,
    revisionId,
    issueStatus,
    issueType,
    reviewerChecker
  },
  reportPayload,
  jsonSnapshot,
  revision
}
```

## Sketcher Store Actions

- `exportToPCFXObject()` — Generate PCFX from current graph
- `exportToPCFXFile()` — Download PCFX JSON file
- `importFromPCFXText(text)` — Load PCFX and reconstruct graph
- `runPCFXRoundtripCheck()` — Validate roundtrip fidelity

## Sketcher UI Buttons

**PCFX Import/Export toolbar section:**
- `data-testid="sketcher-export-pcfx"` — Export PCFX
- `data-testid="sketcher-import-pcfx"` — Import PCFX
- `data-testid="sketcher-import-pcfx-input"` — Hidden file input
- `data-testid="sketcher-roundtrip-pcfx"` — Roundtrip Check

## Reports UI Button

- `data-testid="report-export-pcfx-debug"` — Export Report PCFX Debug snapshot

## Golden Fixtures

### bend.pcfx.json
- Node B type `elbow`
- rawAttributes CA97 = `BEND-FIXTURE`
- componentData status `SCREENING_SAMPLE`
- Component CMP-B type `ELBOW`

### tee.pcfx.json
- Node T type `tee`
- rawAttributes CA97 = `TEE-FIXTURE`
- componentData status `SCREENING_SAMPLE`
- Component CMP-T type `TEE`
- graphTranslatorComponents with TEE_CLASSIFICATION `VECTOR_COLINEARITY`

### olet.pcfx.json
- Node O type `olet`
- rawAttributes CA97 = `OLET-FIXTURE`
- componentData BRLEN_in = 6, BRLEN_mm = 152.4
- Component CMP-O type `OLET`

### missing-component.pcfx.json
- Node A type `elbow`
- componentData status `MISSING_COMPONENT_DATA`
- lossContract entry with code `COMPONENT_DATA_NOT_QUALIFIED`

## Tests

### Static Checks (v16-pcfx-ui-fixtures-check.mjs)
- pcfxFileUtils.js exports present
- reportPcfxDebugSnapshot.js exports present
- All 4 golden fixtures exist
- SketcherStore has exportToPCFXFile
- SketcherTab has sketcher-export-pcfx testid

### Behavior Tests (v16-pcfx-ui-fixtures-behavior-test.mjs)
- Parse each golden fixture JSON
- importPCFXToSketchGraph
- validatePCFXRoundtrip
- Fixture-specific assertions (type preservation, componentData, etc.)
- Serialize/parse roundtrip
- Report PCFX debug snapshot creation

### E2E Tests (v16-pcfx-import-export.spec.js)
- PCFX buttons visible in sketcher toolbar
- PCFX debug export button available in reports tab

## NPM Scripts

- `npm run check:v16` — Static checks
- `npm run check:v16:behavior` — Behavior tests
- `npm run ci:v16` — Full CI pipeline (v15 + v16 + qa + benchmarks + build)

## Certification Status

✓ All static checks pass
✓ All behavior tests pass
✓ All benchmarks pass
✓ Build succeeds

## Notes

- This is **not** a full PCF parser/writer.
- Golden fixtures are for testing roundtrip fidelity and UI integration.
- The PCFX format is internal to Simplified Analysis and not yet compatible with external tools.
- Future work (deferred): cross-app PCFX compatibility, XML PCF profiles, golden real-project fixtures.
