import { classifySimplified2DGeometry } from './classify2DGeometry.js';
import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
import { solveZShape } from './solveZShape.js';
import { solveLoop } from './solveLoop.js';
import { solveOffset } from './solveOffset.js';
import { solveMultiLeg } from './solveMultiLeg.js';

export function solveSimplified2D(input = {}, params = {}) {
  const classification = input.classification || classifySimplified2DGeometry(input);
  const context = { geometryType: classification.geometryType, segments: input.segments || [], nodes: input.nodes || {}, params, warnings: [...(input.warnings || []), ...(classification.warnings || [])], assumptions: [] };
  let result;
  if (classification.geometryType === 'L_SHAPE') result = solveByGeneratingAndAbsorbingLegs(context);
  else if (classification.geometryType === 'Z_SHAPE') result = solveZShape(context);
  else if (classification.geometryType === 'LOOP_OR_MULTI_LEG') result = solveLoop(context);
  else if (classification.geometryType === 'OFFSET') result = solveOffset(context);
  else result = solveMultiLeg(context);
  return { ...result, classification, diagnostics: input.diagnostics || [], summary: { geometryType: classification.geometryType, status: result.status, ratio: result.stats?.ratio || 0 } };
}
