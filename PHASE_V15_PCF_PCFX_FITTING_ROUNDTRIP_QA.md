# Phase V15: PCF/PCFX Fitting Roundtrip QA

## Objective

Implement PCFX roundtrip adapter to validate that fitting topology and metadata survives export and import cycles.

## Target Workflow

```
Sketcher graph → PCFX export → PCFX import → Sketcher graph → validation
```

This phase validates that V11, V12, and V14 data preserves through roundtrip:
- Elbow, Tee, Olet fittings
- BRLEN (branch length)
- componentData with status
- rawAttributes (CA97, etc.)
- normalized metadata
- derived metadata
- tee main/branch classification

## Files

### New

- `src/core/pcfx/pcfxRoundtripAdapter.js` — Main adapter with export/import/validate functions
- `scripts/v15-pcfx-roundtrip-check.mjs` — Static checks for schema and exports
- `scripts/v15-pcfx-roundtrip-behavior-test.mjs` — Behavior tests for bend/tee/olet/missing
- `PHASE_V15_PCF_PCFX_FITTING_ROUNDTRIP_QA.md` — This file

### Updated

- `package.json` — Add `check:v15`, `check:v15:behavior`, `ci:v15`

## Schema

### PCFX Constants

```javascript
PCFX_ROUNDTRIP_SCHEMA_VERSION = 'pcfx-roundtrip-adapter-v1'
PCFX_VERSION = 'PCFX1-SCREENING-JSON'
```

### PCFX Object Model

```javascript
{
  schemaVersion,
  pcfxVersion,
  project: { id, name },
  units: { length },
  nodes: { [nodeId]: { type, pos, rawAttributes, normalized, derived, meta } },
  segments: [{ id, startNode, endNode, compType, properties, rawAttributes, normalized, derived }],
  components: [{ id, nodeId, componentType, connectedSegmentIds, rawAttributes, normalized, derived, meta }],
  graphTranslatorComponents: [...],
  diagnostics: [...],
  lossContract: [...],
  rawAttributes: {},
  normalized: {},
  derived: {}
}
```

## Adapter Exports

- `exportSketchGraphToPCFX(graph)` — Convert sketch graph to PCFX object
- `importPCFXToSketchGraph(pcfx)` — Convert PCFX back to sketch graph
- `validatePCFXRoundtrip(original, imported)` — Validate roundtrip integrity

## Helpers

- `clone(value)` — Deep clone via JSON parse
- `diagnostic(severity, code, message, data)` — Create diagnostic record
- `canonicalNode(nodeId, node, connectedSegments)` — Canonical node form
- `canonicalSegment(seg)` — Canonical segment form
- `componentFromNode(nodeId, node, connectedSegments)` — Component record from fitting node
- `connectionIndex(segments)` — Build connection map
- `detectDuplicateIds(items, key)` — Find duplicate IDs

## Loss Contract

If a component's derived.componentData.status is MISSING_COMPONENT_DATA or NOT_QUALIFIED:

```javascript
lossContract.push({
  code: 'COMPONENT_DATA_NOT_QUALIFIED',
  severity: 'warn',
  componentId: 'CMP-...',
  status: 'MISSING_COMPONENT_DATA' | 'NOT_QUALIFIED'
})
```

## Tests

### Behavior Tests

1. **Bend Test** — Elbow node preserves type and componentData
2. **Tee Test** — Tee node with main/branch classification
3. **Olet Test** — Olet node with BRLEN componentData
4. **Missing Component Test** — Elbow without componentData goes to lossContract

### Static Checks

Verify exports: PCFX_ROUNDTRIP_SCHEMA_VERSION, PCFX_VERSION, exportSketchGraphToPCFX, importPCFXToSketchGraph, validatePCFXRoundtrip, and metadata preservation constants.

## Certification

```bash
npm run check:v15
npm run check:v15:behavior
npm run check:benchmarks
npm run ci:v15
```

## Deferred

- Full production PCF writer
- Full production PCF parser
- XML PCFX1 profile
- PCF/PCFX import/export UI
- Golden real-project PCF fixtures
- Cross-app PCFX compatibility with CRF and PCF Studio
