import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
export const solveOffset = (context) => solveByGeneratingAndAbsorbingLegs({ ...context, assumptions: [...(context.assumptions || []), 'Offset geometry is screened as a simplified multi-leg case.'] });
