import { solveSimplified2D } from '../core/solvers/simplified2d/solveSimplified2D.js';
import { ENGINEERING_LEVEL } from '../core/solvers/certification/solverResultContract.js';
import { buildPipeScreeningInput } from './analysis-context.js';

export const PIPE_SCREENING_CAPABILITY_ID = 'pipe-screening';

export const pipeScreeningCapability = Object.freeze({
  id: PIPE_SCREENING_CAPABILITY_ID,
  label: 'Pipe flexibility screening',
  description: 'Runs the certified simplified 2D screening solver for the selected pipe line.',
  engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING,

  evaluate(context) {
    const prepared = buildPipeScreeningInput(context);
    return {
      enabled: prepared.enabled,
      reason: prepared.reason,
      missing: prepared.missing,
    };
  },

  execute(context) {
    const prepared = buildPipeScreeningInput(context);
    if (!prepared.enabled) {
      throw new Error(prepared.reason || 'Pipe screening inputs are not ready.');
    }
    const result = solveSimplified2D(prepared.input, prepared.params);
    return Object.freeze({
      ...result,
      meta: Object.freeze({
        ...(result.meta || {}),
        requestedTargetId: context.targetId,
        lineKey: prepared.lineKey,
        sourceEntityIds: prepared.sourceEntityIds,
        projectionAxes: prepared.projectionAxes,
      }),
      summary: Object.freeze({
        ...(result.summary || {}),
        lineKey: prepared.lineKey,
        sourceEntityCount: prepared.sourceEntityIds.length,
      }),
    });
  },
});
