import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
export const solveLoop = (context) => solveByGeneratingAndAbsorbingLegs({ ...context, assumptions: [...(context.assumptions || []), 'Loop geometry is screened with longest/absorbing-leg approximation until benchmark formulas are ported.'] });
