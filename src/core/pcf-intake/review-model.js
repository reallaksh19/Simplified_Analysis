import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { PCF_REVIEW_MODEL_SCHEMA } from './constants.js';
import { validatePcfIntakeSource } from './source.js';

export function createPcfReviewModel(source) {
  const validation = validatePcfIntakeSource(source);
  if (!validation.ok) throw new TypeError(`PCF intake source is invalid: ${validation.errors.join(' ')}`);
  const components = deepFreeze(source.components.map((row) => deepFreeze({
    componentId: row.componentId,
    sourceIndex: row.sourceIndex,
    sourceLineStart: row.sourceLineStart,
    sourceLineEnd: row.sourceLineEnd,
    type: row.type,
    adoptionMode: row.adoptionMode,
    pointCount: row.points.length,
    branchPointCount: row.branchPoints.length,
    attributes: row.attributes,
    points: row.points,
    centrePoint: row.centrePoint,
    branchPoints: row.branchPoints,
    rawLines: row.rawLines,
  })));
  const base = {
    schema: PCF_REVIEW_MODEL_SCHEMA,
    sourceSemanticHash: source.semanticHash,
    sourceTextHash: source.sourceTextHash,
    sourceName: source.sourceName,
    sourceText: source.sourceText,
    units: source.units,
    summary: source.summary,
    components,
    canonicalGeometrySummary: deepFreeze({
      valid: source.canonicalGeometry?.valid === true,
      unit: source.canonicalGeometry?.unit || null,
      nodeCount: source.canonicalGeometry?.summary?.nodeCount || 0,
      segmentCount: source.canonicalGeometry?.summary?.segmentCount || 0,
      supportPointCount: source.canonicalGeometry?.summary?.supportPointCount || 0,
    }),
    diagnostics: source.diagnostics,
    adoption: source.adoption,
    statement: 'Parsing and review do not change the active Workspace dataset. Adoption requires the explicit Adopt into Workspace action.',
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(reviewIdentity(base)) });
}

export function validatePcfReviewModel(value, source) {
  const errors = [];
  if (value?.schema !== PCF_REVIEW_MODEL_SCHEMA) errors.push('Invalid PCF review-model schema.');
  try {
    const expected = createPcfReviewModel(source);
    if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push('PCF review model does not match its source.');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function reviewIdentity(model) {
  return {
    schema: model.schema,
    sourceSemanticHash: model.sourceSemanticHash,
    units: model.units,
    summary: model.summary,
    components: model.components.map((row) => ({
      componentId: row.componentId,
      type: row.type,
      adoptionMode: row.adoptionMode,
      pointCount: row.pointCount,
      branchPointCount: row.branchPointCount,
      attributes: row.attributes,
      points: row.points,
      centrePoint: row.centrePoint,
      branchPoints: row.branchPoints,
    })).sort((a, b) => a.componentId.localeCompare(b.componentId)),
    canonicalGeometrySummary: model.canonicalGeometrySummary,
    diagnostics: model.diagnostics.map((row) => ({ severity: row.severity, code: row.code, componentId: row.componentId, message: row.message })),
    adoption: model.adoption,
    statement: model.statement,
  };
}
