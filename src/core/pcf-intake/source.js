import { canonicalStringify, deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import { parsePcfWithDiagnostics } from '../../pcf/pcfParser.js';
import { PCF_INTAKE_SOURCE_SCHEMA } from './constants.js';
import { addPcfComponentDiagnostics, locatePcfComponents, normalizePcfComponents } from './components.js';
import { canonicalizePcfDiagnostics, normalizeParserDiagnostics, pcfDiagnostic } from './diagnostics.js';
import { addPcfCanonicalDiagnostics, buildPcfCanonicalGeometry, pcfCanonicalGeometryIdentity } from './geometry.js';
import { addPcfUnitDiagnostics, readPcfUnitEvidence } from './units.js';

export function createPcfIntakeSource(input = {}) {
  const sourceText = normalizeText(input.sourceText);
  const sourceName = stringValue(input.sourceName) || 'staged-intake.pcf';
  const parsed = parsePcfWithDiagnostics(sourceText);
  const units = readPcfUnitEvidence(sourceText);
  const diagnostics = normalizeParserDiagnostics(parsed.diagnostics);
  addPcfUnitDiagnostics(units, parsed.components, diagnostics);
  const components = normalizePcfComponents(parsed.components, locatePcfComponents(sourceText), units, diagnostics);
  addPcfComponentDiagnostics(components, diagnostics);
  const modelComponents = components.filter((row) => row.adoptionMode === 'MODEL');
  const canonicalGeometry = buildPcfCanonicalGeometry(modelComponents, units, diagnostics);
  addPcfCanonicalDiagnostics(canonicalGeometry, diagnostics);
  if (!sourceText.trim()) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_SOURCE_EMPTY', 'PCF source text is empty.'));
  if (!components.length) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_COMPONENTS_EMPTY', 'No PCF components were parsed.'));
  if (!modelComponents.length) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_MODEL_COMPONENTS_EMPTY', 'No parsed component is eligible for Workspace adoption.'));
  const canonicalDiagnostics = canonicalizePcfDiagnostics(diagnostics);
  const blockers = canonicalDiagnostics.filter((row) => row.severity === 'ERROR').map((row) => row.code).sort();
  const base = {
    schema: PCF_INTAKE_SOURCE_SCHEMA, sourceName, sourceText, sourceTextHash: pcfSourceTextHash(sourceText),
    units, components, canonicalGeometry,
    summary: deepFreeze({
      componentCount: components.length, modelComponentCount: modelComponents.length,
      reviewOnlyComponentCount: components.length - modelComponents.length,
      diagnosticCount: canonicalDiagnostics.length,
      errorCount: canonicalDiagnostics.filter((row) => row.severity === 'ERROR').length,
      warningCount: canonicalDiagnostics.filter((row) => row.severity === 'WARNING').length,
      canonicalNodeCount: canonicalGeometry?.summary?.nodeCount || 0,
      canonicalSegmentCount: canonicalGeometry?.summary?.segmentCount || 0,
    }),
    diagnostics: canonicalDiagnostics, adoption: deepFreeze({ allowed: blockers.length === 0, blockers }),
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(sourceSemanticIdentity(base)) });
}

export function validatePcfIntakeSource(value) {
  const errors = [];
  if (value?.schema !== PCF_INTAKE_SOURCE_SCHEMA) errors.push('Invalid PCF intake source schema.');
  try {
    const expected = createPcfIntakeSource({ sourceText: value?.sourceText, sourceName: value?.sourceName });
    if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push('PCF intake source does not match deterministic parsing evidence.');
  } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  return deepFreeze({ ok: errors.length === 0, errors });
}

export function pcfSourceTextHash(sourceText) { return semanticHash({ text: normalizeText(sourceText) }); }
function normalizeText(value) { return typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : ''; }
function sourceSemanticIdentity(source) {
  return {
    schema: source.schema, units: source.units,
    components: source.components.map((row) => ({
      componentId: row.componentId, type: row.type, pointsMm: row.pointsMm,
      centrePointMm: row.centrePointMm, branchPointsMm: row.branchPointsMm,
      coOrdsMm: row.coOrdsMm, boreMm: row.boreMm, attributes: row.attributes,
      adoptionMode: row.adoptionMode,
    })).sort((a, b) => a.componentId.localeCompare(b.componentId)),
    canonicalGeometry: pcfCanonicalGeometryIdentity(source.canonicalGeometry),
    diagnostics: source.diagnostics.map((row) => ({ severity: row.severity, code: row.code, componentId: row.componentId, message: row.message })),
    adoption: source.adoption,
  };
}
