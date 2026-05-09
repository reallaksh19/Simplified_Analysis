export const MASTER_DB_BULK_VALIDATION_SCHEMA_VERSION = 'master-db-bulk-validation-v19h';

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value) {
  return String(value ?? '').trim();
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function componentWeightKey(row = {}) {
  return [
    text(row.componentType).toUpperCase() || 'COMPONENT',
    finite(row.dn) ?? finite(row.nps) ?? 'NO_SIZE',
    finite(row.ratingClass) ?? 'NO_CLASS',
    text(row.typeDesc).toUpperCase() || 'NO_DESC',
  ].join('|');
}

export function flangeDimensionKey(row = {}) {
  return [
    finite(row.dn) ?? finite(row.nps) ?? 'NO_SIZE',
    finite(row.ratingClass) ?? 'NO_CLASS',
    text(row.flangeType).toUpperCase() || 'NO_FLANGE',
    text(row.faceType).toUpperCase() || 'NO_FACE',
  ].join('|');
}

export function b169FittingKey(row = {}) {
  const type = text(row.fittingType).toUpperCase();
  if (type === 'REDUCER') {
    return [
      'REDUCER',
      finite(row.fromDn) ?? 'NO_FROM',
      finite(row.toDn) ?? 'NO_TO',
      text(row.reducerType).toUpperCase() || 'NO_TYPE',
      text(row.scheduleFrom).toUpperCase() || 'STD',
      text(row.scheduleTo).toUpperCase() || 'STD',
    ].join('|');
  }

  return [
    'TEE',
    finite(row.headerDn) ?? 'NO_HEADER',
    finite(row.branchDn) ?? 'NO_BRANCH',
    text(row.teeType).toUpperCase() || 'NO_TEE_TYPE',
    text(row.schedule).toUpperCase() || 'STD',
  ].join('|');
}

function findDuplicates(rows = [], keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const group = groups.get(key) || [];
    group.push(row);
    groups.set(key, group);
  }

  return [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({ key, rowIds: group.map((row) => row.id || '(no-id)'), count: group.length }));
}

export function validateComponentWeightRows(rows = []) {
  const diagnostics = [];
  for (const [index, row] of rows.entries()) {
    const id = row.id || `componentWeightRows[${index}]`;
    if (!text(row.componentType)) diagnostics.push(diagnostic('error', 'BULK_COMPONENT_TYPE_MISSING', `Component weight row ${id} is missing component type.`, { rowId: id }));
    if (finite(row.dn) === null && finite(row.nps) === null) diagnostics.push(diagnostic('error', 'BULK_COMPONENT_SIZE_MISSING', `Component weight row ${id} is missing DN/NPS.`, { rowId: id }));
    if (finite(row.ratingClass) === null) diagnostics.push(diagnostic('error', 'BULK_COMPONENT_CLASS_MISSING', `Component weight row ${id} is missing rating class.`, { rowId: id }));
    if (finite(row.rfFaceToFace_mm) === null && finite(row.rfRtjWeight_kg) === null && finite(row.bwWeight_kg) === null) diagnostics.push(diagnostic('warn', 'BULK_COMPONENT_VALUE_INCOMPLETE', `Component weight row ${id} has no length/weight value.`, { rowId: id }));
  }

  for (const duplicate of findDuplicates(rows, componentWeightKey)) {
    diagnostics.push(diagnostic('error', 'BULK_COMPONENT_DUPLICATE_KEY', `Duplicate component master key ${duplicate.key}.`, duplicate));
  }

  return diagnostics;
}

export function validateFlangeDimensionRows(rows = []) {
  const diagnostics = [];
  for (const [index, row] of rows.entries()) {
    const id = row.id || `flangeDimensionalRows[${index}]`;
    if (finite(row.dn) === null && finite(row.nps) === null) diagnostics.push(diagnostic('error', 'BULK_FLANGE_SIZE_MISSING', `Flange dimension row ${id} is missing DN/NPS.`, { rowId: id }));
    if (finite(row.ratingClass) === null) diagnostics.push(diagnostic('error', 'BULK_FLANGE_CLASS_MISSING', `Flange dimension row ${id} is missing rating class.`, { rowId: id }));
    if (!text(row.flangeType)) diagnostics.push(diagnostic('error', 'BULK_FLANGE_TYPE_MISSING', `Flange dimension row ${id} is missing flange type.`, { rowId: id }));
    if (!text(row.faceType)) diagnostics.push(diagnostic('error', 'BULK_FLANGE_FACE_MISSING', `Flange dimension row ${id} is missing face type.`, { rowId: id }));
    if (finite(row.thickness_mm) === null || finite(row.thickness_mm) <= 0) diagnostics.push(diagnostic('error', 'BULK_FLANGE_THICKNESS_MISSING', `Flange dimension row ${id} is missing positive thickness.`, { rowId: id }));
  }

  for (const duplicate of findDuplicates(rows, flangeDimensionKey)) {
    diagnostics.push(diagnostic('error', 'BULK_FLANGE_DUPLICATE_KEY', `Duplicate flange master key ${duplicate.key}.`, duplicate));
  }

  return diagnostics;
}

export function validateB169FittingRows(rows = []) {
  const diagnostics = [];
  for (const [index, row] of rows.entries()) {
    const id = row.id || `b169FittingRows[${index}]`;
    const type = text(row.fittingType).toUpperCase();

    if (!type) diagnostics.push(diagnostic('error', 'BULK_B169_TYPE_MISSING', `B16.9 fitting row ${id} is missing fitting type.`, { rowId: id }));

    if (type === 'REDUCER') {
      if (finite(row.fromDn) === null || finite(row.toDn) === null) diagnostics.push(diagnostic('error', 'BULK_B169_REDUCER_SIZE_MISSING', `Reducer row ${id} is missing from/to DN.`, { rowId: id }));
      if (finite(row.length_mm) === null || finite(row.length_mm) <= 0) diagnostics.push(diagnostic('error', 'BULK_B169_REDUCER_LENGTH_MISSING', `Reducer row ${id} is missing positive length.`, { rowId: id }));
    }

    if (type === 'TEE') {
      if (finite(row.headerDn) === null || finite(row.branchDn) === null) diagnostics.push(diagnostic('error', 'BULK_B169_TEE_SIZE_MISSING', `Tee row ${id} is missing header/branch DN.`, { rowId: id }));
      if (finite(row.runC2E_mm) === null || finite(row.branchC2E_mm) === null) diagnostics.push(diagnostic('error', 'BULK_B169_TEE_C2E_MISSING', `Tee row ${id} is missing run/branch C2E.`, { rowId: id }));
    }
  }

  for (const duplicate of findDuplicates(rows, b169FittingKey)) {
    diagnostics.push(diagnostic('error', 'BULK_B169_DUPLICATE_KEY', `Duplicate B16.9 fitting key ${duplicate.key}.`, duplicate));
  }

  return diagnostics;
}

export function validateMasterDbBulkData(data = {}) {
  const componentWeightRows = normalizeArray(data.componentWeightRows);
  const flangeDimensionalRows = normalizeArray(data.flangeDimensionalRows);
  const b169FittingRows = normalizeArray(data.b169FittingRows);

  const diagnostics = [
    ...validateComponentWeightRows(componentWeightRows),
    ...validateFlangeDimensionRows(flangeDimensionalRows),
    ...validateB169FittingRows(b169FittingRows),
  ];

  const errors = diagnostics.filter((item) => item.severity === 'error').length;
  const warnings = diagnostics.filter((item) => item.severity === 'warn' || item.severity === 'warning').length;

  return {
    schemaVersion: MASTER_DB_BULK_VALIDATION_SCHEMA_VERSION,
    status: errors ? 'BLOCKED' : warnings ? 'PASSED_WITH_WARNINGS' : 'PASSED',
    counts: {
      componentWeightRows: componentWeightRows.length,
      flangeDimensionalRows: flangeDimensionalRows.length,
      b169FittingRows: b169FittingRows.length,
      diagnostics: diagnostics.length,
      errors,
      warnings,
    },
    diagnostics,
  };
}

export function buildMasterDbCoverageMatrix(data = {}) {
  const componentWeightRows = normalizeArray(data.componentWeightRows);
  const flangeDimensionalRows = normalizeArray(data.flangeDimensionalRows);
  const b169FittingRows = normalizeArray(data.b169FittingRows);

  const dnSet = new Set();
  const classSet = new Set();

  for (const row of [...componentWeightRows, ...flangeDimensionalRows]) {
    if (finite(row.dn) !== null) dnSet.add(finite(row.dn));
    if (finite(row.ratingClass) !== null) classSet.add(finite(row.ratingClass));
  }

  const dns = [...dnSet].sort((a, b) => a - b);
  const classes = [...classSet].sort((a, b) => a - b);

  return {
    schemaVersion: `${MASTER_DB_BULK_VALIDATION_SCHEMA_VERSION}-coverage`,
    dnValues: dns,
    ratingClasses: classes,
    componentWeightKeys: componentWeightRows.map(componentWeightKey),
    flangeDimensionKeys: flangeDimensionalRows.map(flangeDimensionKey),
    b169FittingKeys: b169FittingRows.map(b169FittingKey),
    coverage: dns.map((dn) => ({
      dn,
      classes: classes.map((ratingClass) => ({
        ratingClass,
        hasComponentWeight: componentWeightRows.some((row) => finite(row.dn) === dn && finite(row.ratingClass) === ratingClass),
        hasFlangeDimension: flangeDimensionalRows.some((row) => finite(row.dn) === dn && finite(row.ratingClass) === ratingClass),
      })),
    })),
  };
}

export function parseAndValidateMasterDbImport(textValue) {
  let parsed;
  try {
    parsed = JSON.parse(textValue);
  } catch (error) {
    return {
      ok: false,
      data: null,
      validation: {
        schemaVersion: MASTER_DB_BULK_VALIDATION_SCHEMA_VERSION,
        status: 'BLOCKED',
        counts: { diagnostics: 1, errors: 1, warnings: 0 },
        diagnostics: [diagnostic('error', 'MASTER_DB_IMPORT_JSON_INVALID', error.message || 'Invalid JSON.')],
      },
    };
  }

  const validation = validateMasterDbBulkData(parsed);
  return {
    ok: validation.status !== 'BLOCKED',
    data: parsed,
    validation,
    coverage: buildMasterDbCoverageMatrix(parsed),
  };
}
