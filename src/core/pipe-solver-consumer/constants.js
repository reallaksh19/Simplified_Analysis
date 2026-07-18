export const PIPE_SOLVER_CONSUMER_SOURCE_SCHEMA = 'pipe-solver-consumer-source/v1';
export const PIPE_SOLVER_REVIEW_MODEL_SCHEMA = 'pipe-solver-review-model/v1';
export const PIPE_SCREENING_ANALYSIS_TYPE = 'pipe-screening';
export const PIPE_SCREENING_ENGINEERING_LEVEL = 'BENCHMARKED_SCREENING';
export const PIPE_SCREENING_METHOD_ID = 'SIMPLIFIED_2D_TOPOLOGY_SCREENING';
export const PIPE_SCREENING_RESULT_SCHEMA = 'solver-result-contract-v1';

export const PIPE_SCREENING_MANIFEST = Object.freeze({
  analysisType: PIPE_SCREENING_ANALYSIS_TYPE,
  label: 'Pipe flexibility screening',
  description: 'Runs the benchmarked simplified 2D screening solver for the selected pipe line.',
  engineeringLevel: PIPE_SCREENING_ENGINEERING_LEVEL,
  solverId: 'workspace-simplified-2d-screening',
  solverVersion: '1.0.0',
  methodId: PIPE_SCREENING_METHOD_ID,
  methodVersion: '1',
  codeBasis: Object.freeze(['Simplified guided-cantilever flexibility screening equations']),
  assumptions: Object.freeze([
    'The connected route is projected onto its two dominant geometric axes.',
    'The route is assessed as a simplified generating-leg and absorbing-leg system.',
  ]),
  limitations: Object.freeze([
    'This is a screening method, not a final piping-code stress analysis.',
    'Restraint stiffness, gaps, friction, branch flexibility, equipment interaction, and nonlinear effects are excluded.',
  ]),
});

export const PIPE_SOLVER_VIEW_LIMITATIONS = Object.freeze([
  'Benchmarked simplified 2D screening only.',
  'Not final piping-code stress analysis.',
  'Not general 3D piping flexibility.',
  'No branch flexibility or branch SIF solution.',
  'No equipment interaction.',
  'No nonlinear gaps, friction, contact or restraint stiffness.',
  'No automatic execution.',
  'Inputs must be explicit or user-overridden through the existing session boundary.',
]);

export const PIPE_SOLVER_DIAGNOSTIC_CODES = Object.freeze({
  NO_DATASET: 'PIPE_SOLVER_NO_DATASET',
  NO_SELECTION: 'PIPE_SOLVER_NO_SELECTION',
  CAPABILITY_INSPECTION_FAILED: 'PIPE_SOLVER_CAPABILITY_INSPECTION_FAILED',
  SESSION_MISMATCH: 'PIPE_SOLVER_SESSION_MISMATCH',
  LEDGER_DATASET_MISMATCH: 'PIPE_SOLVER_LEDGER_DATASET_MISMATCH',
  RESULT_INVALID: 'PIPE_SOLVER_RESULT_INVALID',
});
