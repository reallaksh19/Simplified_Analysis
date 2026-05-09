import {
  buildMasterDbCoverageMatrix,
  parseAndValidateMasterDbImport,
  validateMasterDbBulkData,
} from '../src/data/masterDbBulkValidation.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const duplicateData = {
  componentWeightRows: [
    { id: 'A', componentType: 'VALVE', dn: 200, ratingClass: 300, typeDesc: 'Valve', rfFaceToFace_mm: 495, rfRtjWeight_kg: 100 },
    { id: 'B', componentType: 'VALVE', dn: 200, ratingClass: 300, typeDesc: 'Valve', rfFaceToFace_mm: 495, rfRtjWeight_kg: 101 },
  ],
  flangeDimensionalRows: [
    { id: 'F1', dn: 200, ratingClass: 300, flangeType: 'WN', faceType: 'RF', thickness_mm: 41.3 },
  ],
  b169FittingRows: [
    { id: 'R1', fittingType: 'REDUCER', fromDn: 200, toDn: 150, reducerType: 'CONCENTRIC', scheduleFrom: 'STD', scheduleTo: 'STD', length_mm: 152 },
  ],
};

const validation = validateMasterDbBulkData(duplicateData);
assert(validation.status === 'BLOCKED', 'Duplicate component key should block validation.');
assert(validation.diagnostics.some((item) => item.code === 'BULK_COMPONENT_DUPLICATE_KEY'), 'Duplicate diagnostic expected.');

const parsed = parseAndValidateMasterDbImport(JSON.stringify({
  componentWeightRows: [],
  flangeDimensionalRows: [],
  b169FittingRows: [],
}));
assert(parsed.ok, 'Empty but valid import schema should parse and validate.');

const coverage = buildMasterDbCoverageMatrix(duplicateData);
assert(coverage.dnValues.includes(200), 'Coverage matrix should include DN 200.');
assert(coverage.ratingClasses.includes(300), 'Coverage matrix should include CL300.');

console.log('V19H Master DB bulk validation behavior test passed.');
