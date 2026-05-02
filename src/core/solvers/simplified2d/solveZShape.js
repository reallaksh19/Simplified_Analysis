import { solveByGeneratingAndAbsorbingLegs } from './solveLShape.js';
export const solveZShape = (context) => solveByGeneratingAndAbsorbingLegs({ ...context, assumptions: [...(context.assumptions || []), 'Z-shape is treated as a multi-leg simplified screening case in Phase 3.'] });
