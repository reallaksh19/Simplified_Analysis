import { addComponentWeightOverride, clearMasterDbOverrides, getMasterDbOverrides } from '../src/data/masterDbOverrides.js';
function assert(c,m){ if(!c) throw new Error(m); }
clearMasterDbOverrides();
addComponentWeightOverride({ id:'USER-WT-TEST', componentType:'VALVE', dn:999, ratingClass:300, rfFaceToFace_mm:1234, rfRtjWeight_kg:567 });
assert(getMasterDbOverrides().componentWeightRows.length === 1,'override should be stored');
clearMasterDbOverrides();
console.log('V19C master DB editor behavior test passed.');
