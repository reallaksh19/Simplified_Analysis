import { resolveReducerDimensions, resolveTeeDimensions } from '../src/data/b169FittingDimensionalMasterDb.js';
import { resolveReducerInsertData, resolveTeeInsertData } from '../src/sketcher/componentProperties/b169FittingMasterResolver.js';
function assert(c,m){ if(!c) throw new Error(m); }
const reducer = resolveReducerDimensions({ fromDn:200, toDn:150, reducerType:'CONCENTRIC', scheduleFrom:'STD', scheduleTo:'STD' });
assert(reducer.isQualified,'reducer should resolve');
assert(reducer.value.length_mm > 0,'reducer length expected');
const tee = resolveTeeDimensions({ headerDn:200, branchDn:100, schedule:'STD' });
assert(tee.isQualified,'tee should resolve');
assert(tee.value.runC2E_mm > 0 && tee.value.branchC2E_mm > 0,'tee C2E expected');
assert(resolveReducerInsertData({ fromDn:200, toDn:150 }).length_mm > 0,'reducer insert should include length');
assert(resolveTeeInsertData({ headerDn:200, branchDn:100 }).runC2E_mm > 0,'tee insert should include C2E');
console.log('V19E B16.9 fitting master behavior test passed.');
