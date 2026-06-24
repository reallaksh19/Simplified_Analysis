import { classifySimplified2DGeometry } from './classify2DGeometry.js';
import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
import { solveZShape } from './solveZShape.js';
import { solveLoop } from './solveLoop.js';
import { solveOffset } from './solveOffset.js';
import { solveMultiLeg } from './solveMultiLeg.js';
import { createSolverResultContract, ENGINEERING_LEVEL } from '../certification/solverResultContract.js';

// Map geometry type to method ID for solver-result-contract-v1
function getMethodIdFromGeometryType(geometryType) {
  const mapping = {
    'L_SHAPE': 'SIMPLIFIED_2D_L_SHAPE',
    'Z_SHAPE': 'SIMPLIFIED_2D_Z_SHAPE',
    'LOOP_OR_MULTI_LEG': 'SIMPLIFIED_2D_LOOP_OR_MULTI_LEG',
    'OFFSET': 'SIMPLIFIED_2D_OFFSET',
    'SINGLE_LEG': 'SIMPLIFIED_2D_SINGLE_LEG',
    'STRAIGHT_RUN': 'SIMPLIFIED_2D_STRAIGHT_RUN',
  };
  return mapping[geometryType] || 'SIMPLIFIED_2D_EMPTY';
}

export function solveSimplified2D(input = {}, params = {}) {
  const classification = input.classification || classifySimplified2DGeometry(input);
  const context = { geometryType: classification.geometryType, segments: input.segments || [], nodes: input.nodes || {}, params, warnings: [...(input.warnings || []), ...(classification.warnings || [])], assumptions: [] };
  let result;
  if (classification.geometryType === 'L_SHAPE') result = solveByGeneratingAndAbsorbingLegs(context);
  else if (classification.geometryType === 'Z_SHAPE') result = solveZShape(context);
  else if (classification.geometryType === 'LOOP_OR_MULTI_LEG') result = solveLoop(context);
  else if (classification.geometryType === 'OFFSET') result = solveOffset(context);
  else result = solveMultiLeg(context);

  const legacyResult = { ...result, classification, diagnostics: input.diagnostics || [], summary: { geometryType: classification.geometryType, status: result.status, ratio: result.stats?.ratio || 0 } };
  const methodId = getMethodIdFromGeometryType(classification.geometryType);

  return createSolverResultContract({
    moduleId: 'simplified-2d',
    methodId,
    formulaIds: [],
    engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING,
    status: result.status || 'UNKNOWN',
    results: legacyResult,
    diagnostics: input.diagnostics || [],
    warnings: [...(input.warnings || []), ...(classification.warnings || [])],
    meta: { geometryType: classification.geometryType },
  });
}
