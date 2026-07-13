import { solveSimplified2D } from '../core/solvers/simplified2d/solveSimplified2D.js';
import { ENGINEERING_LEVEL } from '../core/solvers/certification/solverResultContract.js';
import { createInputField } from './analysis-input-evidence.js';
import { buildPipeScreeningInput } from './analysis-context.js';

export const PIPE_SCREENING_CAPABILITY_ID = 'pipe-screening';

const PARAMETER_FIELDS = Object.freeze([
  ['deltaT', 'Temperature difference', '°C'],
  ['alpha', 'Thermal expansion coefficient', '1/°C'],
  ['E', 'Elastic modulus', 'MPa'],
  ['od', 'Pipe outside diameter', 'mm'],
  ['Sa', 'Allowable stress', 'MPa'],
]);

export const pipeScreeningCapability = Object.freeze({
  id: PIPE_SCREENING_CAPABILITY_ID,
  label: 'Pipe flexibility screening',
  description: 'Runs the benchmarked simplified 2D screening solver for the selected pipe line.',
  engineeringLevel: ENGINEERING_LEVEL.BENCHMARKED_SCREENING,
  manifest: Object.freeze({
    solverId: 'workspace-simplified-2d-screening',
    solverVersion: '1.0.0',
    methodId: 'SIMPLIFIED_2D_TOPOLOGY_SCREENING',
    methodVersion: '1',
    codeBasis: ['Simplified guided-cantilever flexibility screening equations'],
    assumptions: [
      'The connected route is projected onto its two dominant geometric axes.',
      'The route is assessed as a simplified generating-leg and absorbing-leg system.',
    ],
    limitations: [
      'This is a screening method, not a final piping-code stress analysis.',
      'Restraint stiffness, gaps, friction, branch flexibility, equipment interaction, and nonlinear effects are excluded.',
    ],
  }),

  applicability(context) {
    return isStraightPipe(context.entity)
      ? { applicable: true, reason: '' }
      : { applicable: false, reason: 'Pipe flexibility screening is applicable only to a selected straight-pipe entity.' };
  },

  evaluate(context) {
    const prepared = buildPipeScreeningInput(context);
    return readiness(prepared);
  },

  inspect(context) {
    const prepared = buildPipeScreeningInput(context);
    const fields = [
      createInputField({
        key: 'connectedLineSegments',
        label: 'Connected pipe legs',
        unit: 'count',
        value: prepared.connectedSegmentCount || null,
        source: prepared.connectedSegmentCount ? 'derived' : 'missing',
        sourcePath: 'dataset.connectedPipeComponent',
        editable: false,
        validation: 'positive',
      }),
      ...PARAMETER_FIELDS.map(([key, label, unit]) => {
        const evidence = prepared.parameterEvidence?.[key] || {};
        return createInputField({
          key,
          label,
          unit,
          value: evidence.value,
          source: evidence.source || 'missing',
          sourcePath: evidence.sourcePath || '',
          validation: 'positive',
        });
      }),
    ];
    return { fields, readiness: readiness(prepared) };
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
        analysisSessionId: context.analysisSession?.sessionId || '',
      }),
      summary: Object.freeze({
        ...(result.summary || {}),
        lineKey: prepared.lineKey,
        sourceEntityCount: prepared.sourceEntityIds.length,
      }),
    });
  },
});

function readiness(prepared) {
  return {
    enabled: prepared.enabled,
    reason: prepared.reason,
    missing: prepared.missing,
  };
}

function isStraightPipe(entity) {
  return String(entity?.entityType || '').trim().toUpperCase() === 'PIPE';
}
