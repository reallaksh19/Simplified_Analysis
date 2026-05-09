export const COMPONENT_ENGINEERING_SCHEMA_VERSION = 'component-engineering-v18e';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

export function createBaseComponent({
  id,
  type,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  rawAttributes = {},
} = {}) {
  return {
    schemaVersion: COMPONENT_ENGINEERING_SCHEMA_VERSION,
    id,
    type,
    sourceStatus,
    source,
    sourceRevision,
    dataStatus,
    rawAttributes: clone(rawAttributes || {}),
  };
}

export function createReducerComponent({
  id,
  startNode = null,
  endNode = null,
  fromDn,
  toDn,
  reducerType = 'CONCENTRIC',
  length_mm,
  weight_kg = null,
  scheduleFrom = null,
  scheduleTo = null,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  fittingDimensionSource = null,
  fittingDimensionSourceRevision = null,
  fittingDimensionStatus = null,
  rawAttributes = {},
} = {}) {
  return {
    ...createBaseComponent({ id, type: 'REDUCER', sourceStatus, source, sourceRevision, dataStatus, rawAttributes }),
    startNode,
    endNode,
    fromDn: finite(fromDn),
    toDn: finite(toDn),
    reducerType,
    length_mm: finite(length_mm),
    weight_kg: finite(weight_kg),
    scheduleFrom,
    scheduleTo,
    fittingDimensionSource: fittingDimensionSource ?? rawAttributes.fittingDimensionSource ?? null,
    fittingDimensionSourceRevision: fittingDimensionSourceRevision ?? rawAttributes.fittingDimensionSourceRevision ?? null,
    fittingDimensionStatus: fittingDimensionStatus ?? rawAttributes.fittingDimensionStatus ?? null,
  };
}

export function createTeeComponent({
  id,
  nodeId,
  mainSegmentA = null,
  mainSegmentB = null,
  branchSegment = null,
  headerDn = null,
  branchDn = null,
  teeType = null,
  schedule = null,
  runC2E_mm = null,
  branchC2E_mm = null,
  weight_kg = null,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  fittingDimensionSource = null,
  fittingDimensionSourceRevision = null,
  fittingDimensionStatus = null,
  rawAttributes = {},
} = {}) {
  return {
    ...createBaseComponent({ id, type: 'TEE', sourceStatus, source, sourceRevision, dataStatus, rawAttributes }),
    nodeId,
    mainSegmentA,
    mainSegmentB,
    branchSegment,
    headerDn: finite(headerDn),
    branchDn: finite(branchDn),
    teeType: teeType || (finite(headerDn) === finite(branchDn) ? 'EQUAL' : 'REDUCING'),
    schedule,
    runC2E_mm: finite(runC2E_mm),
    branchC2E_mm: finite(branchC2E_mm),
    weight_kg: finite(weight_kg),
    fittingDimensionSource: fittingDimensionSource ?? rawAttributes.fittingDimensionSource ?? null,
    fittingDimensionSourceRevision: fittingDimensionSourceRevision ?? rawAttributes.fittingDimensionSourceRevision ?? null,
    fittingDimensionStatus: fittingDimensionStatus ?? rawAttributes.fittingDimensionStatus ?? null,
  };
}

export function createValveComponent({
  id,
  startNode = null,
  endNode = null,
  dn,
  rating,
  valveType = 'VALVE',
  faceToFace_mm,
  weight_kg,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  rawAttributes = {},
} = {}) {
  return {
    ...createBaseComponent({ id, type: 'VALVE', sourceStatus, source, sourceRevision, dataStatus, rawAttributes }),
    startNode,
    endNode,
    dn: finite(dn),
    rating,
    valveType,
    faceToFace_mm: finite(faceToFace_mm),
    length_mm: finite(faceToFace_mm),
    weight_kg: finite(weight_kg),
  };
}

export function createFlangeComponent({
  id,
  nodeId = null,
  dn,
  rating,
  flangeType = 'WN',
  faceType = 'RF',
  thickness_mm = null,
  weight_kg,
  gasketAllowance_mm = 0,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  rawAttributes = {},
} = {}) {
  return {
    ...createBaseComponent({ id, type: 'FLANGE', sourceStatus, source, sourceRevision, dataStatus, rawAttributes }),
    nodeId,
    dn: finite(dn),
    rating,
    flangeType,
    faceType,
    thickness_mm: finite(thickness_mm),
    gasketAllowance_mm: finite(gasketAllowance_mm) ?? 0,
    weight_kg: finite(weight_kg),
  };
}

export function createFlangeValveFlangeAssembly({
  id,
  startNode = null,
  endNode = null,
  dn,
  rating = 'CL300',
  valveType = 'VALVE',
  flangeType = 'WN',
  faceType = 'RF',
  valveFaceToFace_mm,
  flangeThickness_mm,
  gasketAllowance_mm = 0,
  valveWeight_kg,
  flangeWeight_kg,
  sourceStatus = 'USER_DEFINED',
  source = 'sketcher',
  sourceRevision = null,
  dataStatus = null,
  flangeDimensionSource = null,
  flangeDimensionSourceRevision = null,
  flangeDimensionStatus = null,
  rawAttributes = {},
} = {}) {
  const valveLength = finite(valveFaceToFace_mm);
  const flangeLength = finite(flangeThickness_mm);
  const gasket = finite(gasketAllowance_mm) ?? 0;
  const valveWeight = finite(valveWeight_kg);
  const flangeWeight = finite(flangeWeight_kg);

  const totalLength = valveLength !== null && flangeLength !== null
    ? valveLength + 2 * flangeLength + 2 * gasket
    : null;

  const totalWeight = valveWeight !== null && flangeWeight !== null
    ? valveWeight + 2 * flangeWeight
    : null;

  return {
    ...createBaseComponent({ id, type: 'FLANGE_VALVE_FLANGE', sourceStatus, source, sourceRevision, dataStatus, rawAttributes }),
    startNode,
    endNode,
    dn: finite(dn),
    rating,
    valveType,
    flangeType,
    faceType,
    valveFaceToFace_mm: valveLength,
    flangeThickness_mm: flangeLength,
    gasketAllowance_mm: gasket,
    valveWeight_kg: valveWeight,
    flangeWeight_kg: flangeWeight,
    totalLength_mm: totalLength,
    length_mm: totalLength,
    totalWeight_kg: totalWeight,
    weight_kg: totalWeight,
    flangeDimensionSource: flangeDimensionSource ?? rawAttributes.flangeDimensionSource ?? null,
    flangeDimensionSourceRevision: flangeDimensionSourceRevision ?? rawAttributes.flangeDimensionSourceRevision ?? null,
    flangeDimensionStatus: flangeDimensionStatus ?? rawAttributes.flangeDimensionStatus ?? null,
  };
}

export function componentLengthMm(component = {}) {
  return finite(component.length_mm ?? component.totalLength_mm ?? component.faceToFace_mm);
}

export function componentWeightKg(component = {}) {
  return finite(component.weight_kg ?? component.totalWeight_kg);
}

export function normalizeComponentEngineeringData(component = {}) {
  if (!component || typeof component !== 'object') return null;
  return {
    schemaVersion: COMPONENT_ENGINEERING_SCHEMA_VERSION,
    ...component,
  };
}

export function validateComponentEngineeringData(component = {}) {
  const diagnostics = [];
  const id = component.id || 'UNKNOWN_COMPONENT';
  const type = String(component.type || '').toUpperCase();

  if (!component.id) {
    diagnostics.push(diagnostic('error', 'COMPONENT_ID_MISSING', 'Component is missing id.', {}));
  }

  if (!type) {
    diagnostics.push(diagnostic('error', 'COMPONENT_TYPE_MISSING', `Component ${id} is missing type.`, { componentId: id }));
  }

  if (['REDUCER', 'VALVE', 'FLANGE_VALVE_FLANGE'].includes(type) && componentLengthMm(component) === null) {
    diagnostics.push(diagnostic('error', 'COMPONENT_LENGTH_MISSING', `Component ${id} is missing installed length.`, { componentId: id, type }));
  }

  if (['REDUCER', 'VALVE', 'FLANGE', 'FLANGE_VALVE_FLANGE'].includes(type) && componentWeightKg(component) === null) {
    diagnostics.push(diagnostic('warn', 'COMPONENT_WEIGHT_MISSING', `Component ${id} is missing weight; support load may be incomplete.`, { componentId: id, type }));
  }

  if (type === 'FLANGE_VALVE_FLANGE') {
    if (finite(component.valveFaceToFace_mm) === null) {
      diagnostics.push(diagnostic('error', 'FVF_VALVE_LENGTH_MISSING', `FVF ${id} is missing valve face-to-face length.`, { componentId: id }));
    }
    if (finite(component.flangeThickness_mm) === null) {
      diagnostics.push(diagnostic('error', 'FVF_FLANGE_THICKNESS_MISSING', `FVF ${id} is missing flange thickness.`, { componentId: id }));
    }
  }

  if (type === 'TEE') {
    if (finite(component.runC2E_mm) === null || finite(component.branchC2E_mm) === null) {
      diagnostics.push(diagnostic('warn', 'TEE_C2E_MISSING', `Tee ${id} is missing run/branch center-to-end dimensions.`, { componentId: id }));
    }
  }

  return {
    ok: diagnostics.every((item) => item.severity !== 'error'),
    status: diagnostics.some((item) => item.severity === 'error') ? 'NOT_QUALIFIED' : diagnostics.length ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    diagnostics,
  };
}

export function componentToNodeMeta(component = {}) {
  return {
    componentId: component.id,
    componentType: component.type,
    componentData: component,
  };
}

export function buildComponentSummary(component = {}) {
  return {
    id: component.id,
    type: component.type,
    length_mm: componentLengthMm(component),
    weight_kg: componentWeightKg(component),
    sourceStatus: component.sourceStatus || component.dataStatus || 'UNKNOWN',
  };
}
