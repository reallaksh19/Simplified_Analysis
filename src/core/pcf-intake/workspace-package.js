import { canonicalStringify, deepFreeze, semanticHash } from '../shared-piping-model/index.js';
import { PCF_WORKSPACE_PACKAGE_SCHEMA } from './constants.js';
import { validatePcfIntakeSource } from './source.js';

export function createPcfWorkspacePackage(source) {
  const validation = validatePcfIntakeSource(source);
  if (!validation.ok) throw new TypeError(`PCF intake source is invalid: ${validation.errors.join(' ')}`);
  if (!source.adoption.allowed) throw new TypeError(`PCF intake cannot be adopted: ${source.adoption.blockers.join(', ')}.`);
  const objects = source.components.filter((row) => row.adoptionMode === 'MODEL').map(componentObject);
  const packageIdentity = {
    sourceSemanticHash: source.semanticHash,
    sourceTextHash: source.sourceTextHash,
    objects,
  };
  return deepFreeze({
    schema: PCF_WORKSPACE_PACKAGE_SCHEMA,
    source: deepFreeze({
      kind: 'PCF',
      sourceName: source.sourceName,
      pcfSourceSemanticHash: source.semanticHash,
      pcfSourceTextHash: source.sourceTextHash,
      coordinateUnit: 'mm',
      originalCoordinateUnit: source.units.coordinate?.unit || null,
      excludedReviewOnlyComponentIds: source.components.filter((row) => row.adoptionMode === 'REVIEW_ONLY').map((row) => row.componentId).sort(),
      adoptionSemanticHash: semanticHash(packageIdentity),
    }),
    objects: deepFreeze(objects),
  });
}

export function validatePcfWorkspacePackage(value, source) {
  const errors = [];
  try {
    const expected = createPcfWorkspacePackage(source);
    if (canonicalStringify(value) !== canonicalStringify(expected)) errors.push('PCF Workspace package does not match its intake source.');
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function componentObject(row) {
  const branchPoints = row.branchPointsMm;
  const sourceAttributes = {
    ...row.attributes,
    PCF_COMPONENT_ID: row.componentId,
    PCF_SOURCE_LINE_START: String(row.sourceLineStart ?? ''),
    PCF_SOURCE_LINE_END: String(row.sourceLineEnd ?? ''),
  };
  const object = {
    sourceId: row.componentId,
    id: row.componentId,
    name: `${row.type} ${row.sourceIndex + 1}`,
    type: row.type,
    sourcePath: `/pcf/components/${row.sourceIndex}`,
    points: row.pointsMm,
    sourceAttributes,
    attributes: row.attributes,
    nativeParams: {
      role: row.type,
      points: row.pointsMm,
      branchPoints,
      sourceLineStart: row.sourceLineStart,
      sourceLineEnd: row.sourceLineEnd,
      pcfComponentIdentity: row.componentId,
    },
    diagnostics: [],
  };
  if (row.centrePointMm) object.centrePoint = row.centrePointMm;
  if (branchPoints[0]) object.branch1Point = branchPoints[0];
  if (branchPoints[1]) object.branch2Point = branchPoints[1];
  if (branchPoints[2]) object.branch3Point = branchPoints[2];
  if (row.coOrdsMm) object.coOrds = row.coOrdsMm;
  if (row.boreMm) object.bore = row.boreMm;
  return deepFreeze(object);
}
