import {
  createReducerComponent,
  createFlangeValveFlangeAssembly,
  validateComponentEngineeringData,
  componentLengthMm,
  componentWeightKg,
} from '../src/sketcher/componentProperties/componentEngineeringModel.js';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const reducer = createReducerComponent({
  id: 'RED-001',
  fromDn: 200,
  toDn: 150,
  length_mm: 152,
  weight_kg: 12,
});

assert(componentLengthMm(reducer) === 152, 'Reducer length should resolve.');
assert(componentWeightKg(reducer) === 12, 'Reducer weight should resolve.');
assert(validateComponentEngineeringData(reducer).ok, 'Reducer should validate.');

const fvf = createFlangeValveFlangeAssembly({
  id: 'FVF-001',
  dn: 200,
  valveFaceToFace_mm: 381,
  flangeThickness_mm: 41.3,
  gasketAllowance_mm: 3,
  valveWeight_kg: 95,
  flangeWeight_kg: 28,
});

assert(fvf.totalLength_mm === 381 + 2 * 41.3 + 2 * 3, 'FVF total length formula mismatch.');
assert(fvf.totalWeight_kg === 95 + 2 * 28, 'FVF total weight formula mismatch.');
assert(validateComponentEngineeringData(fvf).ok, 'FVF should validate.');

console.log('V18E component engineering model behavior test passed.');
