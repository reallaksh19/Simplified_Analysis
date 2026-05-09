import { buildMasterDbGovernanceSummary } from '../src/core/engineering-data/validateMasterDbGovernance.js';
function assert(c,m){ if(!c) throw new Error(m); }
const finalSummary = buildMasterDbGovernanceSummary({ issueType:'FINAL_ISSUE', validateWholeDb:true });
assert(finalSummary.status === 'BLOCKED','final issue should block screening seed rows');
assert(finalSummary.blockers.length > 0,'blockers expected');
console.log('V19D master DB governance behavior test passed.');
