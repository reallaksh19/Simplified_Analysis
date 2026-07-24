import {
  ACTION_SENSES, COORDINATE_SYSTEMS, END_CONDITIONS, MODEL_SCHEMA,
  QUALIFICATION_PROFILE_SCHEMA, SOURCE_EVIDENCE_SCHEMA, THICKNESS_POLICIES,
} from './constants.js';
import { modelError } from './errors.js';
import { nonNegativeNumber, positiveNumber } from './numeric.js';
import {
  arrayValue, booleanValue, enumValue, record, scalarEvidence, sortByIdentity,
  sortedStrings, sourceRef, stringValue, uniqueByIdentity, vectorEvidence,
} from './validation.js';

export function normalizeSourceModel(input) {
  const source = record(input, 'model');
  if (source.schema !== MODEL_SCHEMA) throw modelError('SCHEMA_MISMATCH', 'schema', `schema must be ${MODEL_SCHEMA}.`);
  const identity = stringValue(source.modelIdentity, 'modelIdentity');
  const version = stringValue(source.modelVersion, 'modelVersion');
  const ancestry = normalizeAncestry(source.sourceAncestry);
  const evidence = {
    schema: SOURCE_EVIDENCE_SCHEMA,
    modelIdentity: identity,
    modelVersion: version,
    sourceAncestry: ancestry,
    units: record(source.units, 'units'),
    pipeGeometry: normalizeGeometry(source.pipeGeometry, ancestry),
    pipeCoordinateSystem: normalizeCoordinateSystem(source.pipeCoordinateSystem, ancestry),
    materials: normalizeMaterials(source.materials, ancestry),
    thicknessBasis: normalizeThickness(source.thicknessBasis, ancestry),
    pressureDefinitions: normalizePressures(source.pressureDefinitions, ancestry),
    loadReferencePoints: normalizeReferencePoints(source.loadReferencePoints, ancestry),
    loadCases: normalizeLoadCases(source.loadCases, ancestry),
    resultRequests: normalizeRequests(source.resultRequests, ancestry),
    qualificationProfile: normalizeProfile(source.qualificationProfile),
    limitations: normalizeLimitations(source.limitations),
  };
  validateReferences(evidence);
  return evidence;
}

function normalizeAncestry(value) {
  const source = record(value, 'sourceAncestry');
  return {
    sourceModelIdentity: stringValue(source.sourceModelIdentity, 'sourceAncestry.sourceModelIdentity'),
    sourceVersion: stringValue(source.sourceVersion, 'sourceAncestry.sourceVersion'),
    adapterIdentity: stringValue(source.adapterIdentity, 'sourceAncestry.adapterIdentity'),
    adapterVersion: stringValue(source.adapterVersion, 'sourceAncestry.adapterVersion'),
  };
}
function normalizeGeometry(value, ancestry) {
  const source = record(value, 'pipeGeometry');
  const outsideDiameter = scalarEvidence(source.outsideDiameter, ancestry, 'pipeGeometry.outsideDiameter');
  positiveNumber(outsideDiameter.value, 'pipeGeometry.outsideDiameter.value');
  return { outsideDiameter };
}
function normalizeCoordinateSystem(value, ancestry) {
  const source = record(value, 'pipeCoordinateSystem');
  return {
    identity: stringValue(source.identity, 'pipeCoordinateSystem.identity'),
    origin: vectorEvidence(source.origin, ancestry, 'pipeCoordinateSystem.origin'),
    axialDirection: vectorEvidence(source.axialDirection, ancestry, 'pipeCoordinateSystem.axialDirection'),
    radialHint: vectorEvidence(source.radialHint, ancestry, 'pipeCoordinateSystem.radialHint'),
    circumferentialHint: vectorEvidence(source.circumferentialHint, ancestry, 'pipeCoordinateSystem.circumferentialHint'),
  };
}
function normalizeMaterials(value, ancestry) {
  const materials = arrayValue(value, 'materials').map((item, index) => {
    const source = record(item, `materials[${index}]`);
    return {
      identity: stringValue(source.identity, `materials[${index}].identity`),
      role: stringValue(source.role, `materials[${index}].role`),
      sourceRef: sourceRef(source.sourceRef, ancestry, `materials[${index}].sourceRef`),
    };
  });
  uniqueByIdentity(materials, 'materials');
  return sortByIdentity(materials);
}
function normalizeThickness(value, ancestry) {
  const source = record(value, 'thicknessBasis');
  const result = {
    policy: enumValue(source.policy, THICKNESS_POLICIES, 'thicknessBasis.policy'),
    nominalPipeThickness: scalarEvidence(source.nominalPipeThickness, ancestry, 'thicknessBasis.nominalPipeThickness'),
    corrosionAllowance: scalarEvidence(source.corrosionAllowance, ancestry, 'thicknessBasis.corrosionAllowance'),
    wearPadThickness: scalarEvidence(source.wearPadThickness, ancestry, 'thicknessBasis.wearPadThickness'),
    cradleThickness: scalarEvidence(source.cradleThickness, ancestry, 'thicknessBasis.cradleThickness'),
    effectiveAnalyticalThickness: scalarEvidence(source.effectiveAnalyticalThickness, ancestry, 'thicknessBasis.effectiveAnalyticalThickness'),
  };
  if (source.assessmentPipeThickness !== undefined) {
    result.assessmentPipeThickness = scalarEvidence(source.assessmentPipeThickness, ancestry, 'thicknessBasis.assessmentPipeThickness');
  }
  positiveNumber(result.nominalPipeThickness.value, 'thicknessBasis.nominalPipeThickness.value');
  nonNegativeNumber(result.corrosionAllowance.value, 'thicknessBasis.corrosionAllowance.value');
  for (const key of ['wearPadThickness', 'cradleThickness', 'effectiveAnalyticalThickness']) {
    nonNegativeNumber(result[key].value, `thicknessBasis.${key}.value`);
  }
  return result;
}
function normalizePressures(value, ancestry) {
  const rows = arrayValue(value, 'pressureDefinitions').map((item, index) => {
    const path = `pressureDefinitions[${index}]`; const source = record(item, path);
    const row = {
      identity: stringValue(source.identity, `${path}.identity`),
      internalPressure: scalarEvidence(source.internalPressure, ancestry, `${path}.internalPressure`),
      externalPressure: scalarEvidence(source.externalPressure, ancestry, `${path}.externalPressure`),
      endCondition: enumValue(source.endCondition, END_CONDITIONS, `${path}.endCondition`),
    };
    nonNegativeNumber(row.internalPressure.value, `${path}.internalPressure.value`);
    nonNegativeNumber(row.externalPressure.value, `${path}.externalPressure.value`);
    if (source.explicitAxialResultant !== undefined) row.explicitAxialResultant = scalarEvidence(source.explicitAxialResultant, ancestry, `${path}.explicitAxialResultant`);
    if (row.endCondition === END_CONDITIONS.EXPLICIT_AXIAL_RESULTANT && !row.explicitAxialResultant) {
      throw modelError('EXPLICIT_AXIAL_RESULTANT_REQUIRED', path, 'Explicit axial resultant is required.');
    }
    if (row.endCondition !== END_CONDITIONS.EXPLICIT_AXIAL_RESULTANT && row.explicitAxialResultant) {
      throw modelError('EXPLICIT_AXIAL_RESULTANT_CONFLICT', path, 'Explicit axial resultant is only valid for its end condition.');
    }
    return row;
  });
  uniqueByIdentity(rows, 'pressureDefinitions'); return sortByIdentity(rows);
}
function normalizeReferencePoints(value, ancestry) {
  const rows = arrayValue(value, 'loadReferencePoints').map((item, index) => {
    const path = `loadReferencePoints[${index}]`; const source = record(item, path);
    return {
      identity: stringValue(source.identity, `${path}.identity`),
      coordinateSystem: enumValue(source.coordinateSystem, COORDINATE_SYSTEMS, `${path}.coordinateSystem`),
      point: vectorEvidence(source.point, ancestry, `${path}.point`),
    };
  });
  uniqueByIdentity(rows, 'loadReferencePoints'); return sortByIdentity(rows);
}
function normalizeLoadCases(value, ancestry) {
  const rows = arrayValue(value, 'loadCases').map((item, index) => {
    const path = `loadCases[${index}]`; const source = record(item, path);
    return {
      identity: stringValue(source.identity, `${path}.identity`),
      sourceCoordinateSystem: enumValue(source.sourceCoordinateSystem, COORDINATE_SYSTEMS, `${path}.sourceCoordinateSystem`),
      sourceReferencePointIdentity: stringValue(source.sourceReferencePointIdentity, `${path}.sourceReferencePointIdentity`),
      targetReferencePointIdentity: stringValue(source.targetReferencePointIdentity, `${path}.targetReferencePointIdentity`),
      actionSense: enumValue(source.actionSense, ACTION_SENSES, `${path}.actionSense`),
      force: vectorEvidence(source.force, ancestry, `${path}.force`),
      moment: vectorEvidence(source.moment, ancestry, `${path}.moment`),
    };
  });
  uniqueByIdentity(rows, 'loadCases'); return sortByIdentity(rows);
}
function normalizeRequests(value, ancestry) {
  const source = record(value, 'resultRequests');
  const requestedAnalyses = sortedStrings(arrayValue(source.requestedAnalyses, 'resultRequests.requestedAnalyses').map((row, index) => stringValue(row, `resultRequests.requestedAnalyses[${index}]`)));
  const pressure = arrayValue(source.pressure, 'resultRequests.pressure').map((item, index) => {
    const path = `resultRequests.pressure[${index}]`; const row = record(item, path);
    const radii = arrayValue(row.requestedRadii, `${path}.requestedRadii`).map((radius, radiusIndex) => scalarEvidence(radius, ancestry, `${path}.requestedRadii[${radiusIndex}]`));
    return {
      identity: stringValue(row.identity, `${path}.identity`),
      pressureDefinitionIdentity: stringValue(row.pressureDefinitionIdentity, `${path}.pressureDefinitionIdentity`),
      requestedRadii: radii.sort((left, right) => left.value - right.value),
      includeAxialPressureStress: booleanValue(row.includeAxialPressureStress, `${path}.includeAxialPressureStress`),
      includeThinWallComparison: booleanValue(row.includeThinWallComparison, `${path}.includeThinWallComparison`),
    };
  });
  uniqueByIdentity(pressure, 'resultRequests.pressure');
  return {
    requestedAnalyses,
    transformedLoadCaseIdentities: sortedStrings(arrayValue(source.transformedLoadCaseIdentities, 'resultRequests.transformedLoadCaseIdentities').map((row, index) => stringValue(row, `resultRequests.transformedLoadCaseIdentities[${index}]`))),
    pressure: sortByIdentity(pressure),
  };
}
function normalizeProfile(value) {
  const profile = record(value, 'qualificationProfile');
  if (profile.schema !== QUALIFICATION_PROFILE_SCHEMA) throw modelError('QUALIFICATION_SCHEMA_MISMATCH', 'qualificationProfile.schema', 'Qualification profile schema is invalid.');
  const tolerances = record(profile.tolerances, 'qualificationProfile.tolerances');
  const normalized = {
    schema: profile.schema,
    identity: stringValue(profile.identity, 'qualificationProfile.identity'),
    frameMinimumSine: positiveNumber(profile.frameMinimumSine, 'qualificationProfile.frameMinimumSine'),
    handednessMinimumAlignment: positiveNumber(profile.handednessMinimumAlignment, 'qualificationProfile.handednessMinimumAlignment'),
    tolerances: {},
  };
  for (const quantity of ['dimensionless', 'length', 'force', 'moment', 'stress']) {
    const rule = record(tolerances[quantity], `qualificationProfile.tolerances.${quantity}`);
    normalized.tolerances[quantity] = {
      absolute: nonNegativeNumber(rule.absolute, `qualificationProfile.tolerances.${quantity}.absolute`),
      relative: nonNegativeNumber(rule.relative, `qualificationProfile.tolerances.${quantity}.relative`),
    };
  }
  return normalized;
}
function normalizeLimitations(value) {
  return sortedStrings(arrayValue(value, 'limitations').map((row, index) => stringValue(row, `limitations[${index}]`)));
}
function validateReferences(model) {
  const pointIds = new Set(model.loadReferencePoints.map((row) => row.identity));
  model.loadCases.forEach((row) => {
    if (!pointIds.has(row.sourceReferencePointIdentity)) throw modelError('UNKNOWN_REFERENCE_POINT', `loadCases.${row.identity}.sourceReferencePointIdentity`, 'Source reference point is unknown.');
    if (!pointIds.has(row.targetReferencePointIdentity)) throw modelError('UNKNOWN_REFERENCE_POINT', `loadCases.${row.identity}.targetReferencePointIdentity`, 'Target reference point is unknown.');
  });
  const loadIds = new Set(model.loadCases.map((row) => row.identity));
  model.resultRequests.transformedLoadCaseIdentities.forEach((identity) => {
    if (!loadIds.has(identity)) throw modelError('UNKNOWN_LOAD_CASE', 'resultRequests.transformedLoadCaseIdentities', `Unknown load case ${identity}.`);
  });
  const pressureIds = new Set(model.pressureDefinitions.map((row) => row.identity));
  model.resultRequests.pressure.forEach((row) => {
    if (!pressureIds.has(row.pressureDefinitionIdentity)) throw modelError('UNKNOWN_PRESSURE_DEFINITION', `resultRequests.pressure.${row.identity}`, 'Pressure definition is unknown.');
  });
}
