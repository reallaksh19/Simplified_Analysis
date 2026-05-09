import { build3DSimplifiedCalculationReport } from '../src/3d-analysis/reporting/build3DSimplifiedCalculationReport.js';
function assert(c,m){ if(!c) throw new Error(m); }
const report = build3DSimplifiedCalculationReport({
  model: { nodes:{}, segments:[], components:{}, supports:[] },
  issueType: 'FINAL_ISSUE',
});
assert(report.status === 'BLOCKED','final issue should be blocked');
assert(report.blockers.some((b) => b.code === 'FINAL_ISSUE_BLOCKED_SCREENING_METHOD'),'final blocker missing');
assert(report.blockers.some((b) => b.code === 'MODEL_MISSING_OR_EMPTY'),'empty model blocker missing');
assert(report.markdown.includes('3D Simplified Calculation Report'),'markdown missing title');

const screeningEmpty = build3DSimplifiedCalculationReport({
  model: { nodes:{}, segments:[], components:{}, supports:[] },
  issueType: 'SCREENING_ISSUE',
});
assert(screeningEmpty.status === 'BLOCKED', 'screening report must block empty model.');

console.log('V18K report behavior test passed.');
