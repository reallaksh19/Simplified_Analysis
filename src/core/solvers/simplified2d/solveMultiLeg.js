import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
export const solveMultiLeg = (context) => solveByGeneratingAndAbsorbingLegs({ ...context, assumptions: [...(context.assumptions || []), 'Multi-leg geometry is screened approximately; complex branches require detailed analysis.'] });
