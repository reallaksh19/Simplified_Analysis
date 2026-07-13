import {
  buildSupportLoadInput,
  calculateSupportLoads,
  SUPPORT_LOAD_FORMULA_PROFILE_ID,
} from '../calc-workspace/supportLoadEngine.js';
import {
  createSolverResultContract,
  ENGINEERING_LEVEL,
} from '../core/solvers/certification/solverResultContract.js';
import { resolvePipeEntity, toSupportLoadSource } from './analysis-context.js';

export const SUPPORT_LOAD_CAPABILITY_ID = 'support-load';

export const supportLoadCapability = Object.freeze({
  id: SUPPORT_LOAD_CAPABILITY_ID,
  label: 'Support load screening',
  description: 'Calculates vertical, guide, and line-stop screening loads from explicit pipe data.',
  engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING,

  evaluate(context) {
    const prepared = prepareSupportLoad(context);
    if (!prepared.pipeEntity) {
      return {
        enabled: false,
        reason: 'No unambiguous pipe is linked to this selection.',
        missing: ['linkedPipe'],
      };
    }
    const readiness = prepared.input.readiness;
    const enabled = readiness.readyForOpeVertical
      || readiness.readyForHydVertical
      || readiness.readyForGuide
      || readiness.readyForLineStop;
    return {
      enabled,
      reason: enabled
        ? ''
        : `Support-load inputs are incomplete: ${readiness.missing.join(', ')}.`,
      missing: readiness.missing,
    };
  },

  execute(context) {
    const prepared = prepareSupportLoad(context);
    if (!prepared.pipeEntity || !prepared.input) {
      throw new Error('Support-load execution requires a linked pipe entity.');
    }
    const result = calculateSupportLoads(prepared.input, '');
    const status = result.status.calculated ? 'CALCULATED' : 'BLOCKED';
    return createSolverResultContract({
      moduleId: 'analysis-workspace-support-load',
      methodId: SUPPORT_LOAD_FORMULA_PROFILE_ID,
      formulaIds: [
        'SUPPORT_LOAD_VERTICAL_WEIGHTED',
        'SUPPORT_LOAD_GUIDE_SCREENING',
        'SUPPORT_LOAD_LINE_STOP_SCREENING',
      ],
      engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING,
      status,
      input: prepared.input,
      results: result,
      warnings: result.status.missing.map((field) => `Missing input: ${field}`),
      meta: {
        requestedTargetId: context.targetId,
        sourcePipeId: prepared.pipeEntity.entityId,
      },
      summary: {
        sourcePipeId: prepared.pipeEntity.entityId,
        calculated: result.status.calculated,
        blocked: result.status.blocked,
        missingCount: result.status.missing.length,
      },
    });
  },
});

function prepareSupportLoad(context) {
  const pipeEntity = resolvePipeEntity(context);
  if (!pipeEntity) return { pipeEntity: null, input: null };
  const source = toSupportLoadSource(pipeEntity);
  return {
    pipeEntity,
    input: buildSupportLoadInput(source),
  };
}
