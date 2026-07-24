import { deepFreeze } from '../shared-piping-model/index.js';
import { assembleContinuumSystem, partitionSystem, reconstructDisplacement } from './assembly.js';
import { RESULT_STATUS } from './constants.js';
import { solveDenseLdlt } from './linear-backend.js';
import { dot, multiplyMatrixVector, subtractVectors, vectorNormInfinity } from './matrix.js';
import { qualifyContinuumModel } from './model.js';
import { qualifiedResult, rejectedResult } from './result.js';
import { recoverT3Result } from './t3-element.js';

export function solveContinuumModel(input, loadCaseIdentity) {
  const qualification = qualifyContinuumModel(input);
  if (!qualification.ok) return rejectedResult(input, RESULT_STATUS.REJECTED_INVALID, qualification.diagnostics);
  const model = qualification.model;
  const loadCase = selectLoadCase(model, loadCaseIdentity);
  if (!loadCase) return rejectedResult(model, RESULT_STATUS.REJECTED_INVALID, [diagnostic('LOAD_CASE_MISSING', 'Requested load case is not present.')], model.limitations);
  try { return solveQualifiedModel(model, loadCase); }
  catch (error) { return rejectedResult(model, RESULT_STATUS.REJECTED_INVALID, [diagnostic('SOLVER_REJECTED', error.message)], model.limitations); }
}

function solveQualifiedModel(model, loadCase) {
  const system = assembleContinuumSystem(model, loadCase);
  const partition = partitionSystem(system, model);
  const backend = solveFreeSystem(partition, model.solverProfile.tolerances);
  if (!backend.ok) return failedBackendResult(model, backend);
  const displacement = reconstructDisplacement(system.dofMap.length, partition, backend.solution);
  const recovery = recoverSystem(model, system, partition, displacement, backend);
  const failure = qualificationFailure(model, recovery);
  return failure || qualifiedResult(model, loadCase, recovery);
}

function solveFreeSystem(partition, tolerances) {
  if (!partition.free.length) return deepFreeze({ ok: true, solution: [], pivotRatio: 1, pivots: [], backendIdentity: 'dense-ldlt-reference/v1' });
  return solveDenseLdlt(partition.Kff, partition.effectiveFreeLoad, tolerances);
}

function failedBackendResult(model, backend) {
  const status = backend.classification === 'ILL_CONDITIONED'
    ? RESULT_STATUS.QUARANTINED_NUMERICAL : RESULT_STATUS.REJECTED_SINGULAR;
  const code = backend.classification === 'ILL_CONDITIONED' ? 'ILL_CONDITIONED' : 'SINGULAR_SYSTEM';
  return rejectedResult(model, status, [diagnostic(code, `Dense reference solve failed: ${backend.classification}.`)], model.limitations);
}

function recoverSystem(model, system, partition, displacement, backend) {
  const imbalance = subtractVectors(multiplyMatrixVector(system.stiffness, displacement), system.appliedLoad);
  const constrainedSet = new Set(partition.constrained);
  const reactions = imbalance.map((value, index) => constrainedSet.has(index) ? value : 0);
  const freeResidual = partition.free.map((equation) => imbalance[equation]);
  const globalResidual = subtractVectors(imbalance, reactions);
  const elementEvidence = recoverElements(model, system, displacement);
  return {
    backendTrace: { backendIdentity: backend.backendIdentity, pivots: backend.pivots, pivotRatio: backend.pivotRatio },
    dofMap: system.dofMap,
    constraintPartition: { freeEquations: partition.free, constrainedEquations: partition.constrained, prescribedValues: partition.prescribedVector },
    directNodalLoads: system.directNodalLoads,
    equivalentEdgeLoads: system.equivalentEdgeLoads,
    edgeLoadEvidence: system.edgeLoadEvidence,
    effectiveFreeLoad: partition.effectiveFreeLoad,
    nodalDisplacements: displacementRows(system.dofMap, displacement),
    reactions: displacementRows(system.dofMap, reactions),
    ...elementEvidence,
    freeDofResidual: residualEvidence(freeResidual),
    globalResidual: residualEvidence(globalResidual),
    appliedLoadTotals: componentTotals(model.nodes, system.dofMap, system.appliedLoad),
    reactionTotals: componentTotals(model.nodes, system.dofMap, reactions),
    strainEnergy: 0.5 * dot(displacement, multiplyMatrixVector(system.stiffness, displacement)),
    diagnostics: [],
  };
}

function recoverElements(model, system, displacement) {
  const materialMap = new Map(model.materials.map((row) => [row.materialId, row]));
  const rows = system.operators.map(({ element, operator, indices }) => {
    const local = indices.map((index) => displacement[index]);
    const result = recoverT3Result(operator, local, materialMap.get(element.materialId), model.solverProfile.formulation);
    return { elementId: element.elementId, result };
  });
  return {
    elementStrains: rows.map((row) => ({ elementId: row.elementId, values: row.result.strain, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })),
    elementStresses: rows.map((row) => ({ elementId: row.elementId, values: row.result.stress, sigmaZ: row.result.sigmaZ, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })),
    principalStresses: rows.map((row) => ({ elementId: row.elementId, ...row.result.principal })),
    vonMisesStress: rows.map((row) => ({ elementId: row.elementId, value: row.result.vonMises })),
    elementInternalForces: rows.map((row) => ({ elementId: row.elementId, values: row.result.internalForce })),
    elementStrainEnergy: rows.map((row) => ({ elementId: row.elementId, value: row.result.strainEnergy })),
  };
}

function qualificationFailure(model, recovery) {
  const tolerances = model.solverProfile.tolerances;
  const loadScale = Math.max(1, Math.abs(recovery.appliedLoadTotals.fx), Math.abs(recovery.appliedLoadTotals.fy));
  const residualLimit = tolerances.residualForceAbsolute + tolerances.residualForceRelative * loadScale;
  if (recovery.freeDofResidual.infinityNorm > residualLimit) {
    return rejectedResult(model, RESULT_STATUS.QUARANTINED_NUMERICAL, [diagnostic('FREE_RESIDUAL_FAILURE', 'Free-DOF residual exceeds the approved tolerance.')], model.limitations);
  }
  const balanceX = recovery.appliedLoadTotals.fx + recovery.reactionTotals.fx;
  const balanceY = recovery.appliedLoadTotals.fy + recovery.reactionTotals.fy;
  const balanceMoment = recovery.appliedLoadTotals.mz + recovery.reactionTotals.mz;
  if (Math.max(Math.abs(balanceX), Math.abs(balanceY)) > tolerances.forceEquilibriumAbsolute
      || Math.abs(balanceMoment) > tolerances.momentEquilibriumAbsolute) {
    return rejectedResult(model, RESULT_STATUS.QUARANTINED_NUMERICAL, [diagnostic('EQUILIBRIUM_FAILURE', 'Global force balance exceeds the approved tolerance.')], model.limitations);
  }
  return null;
}

function displacementRows(dofMap, values) { return dofMap.map((row) => ({ ...row, value: values[row.equation] })); }
function residualEvidence(values) { return { values, infinityNorm: vectorNormInfinity(values) }; }
function componentTotals(nodes, dofMap, values) {
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]));
  const forces = new Map(nodes.map((node) => [node.nodeId, { fx: 0, fy: 0 }]));
  dofMap.forEach((row) => { forces.get(row.nodeId)[row.component === 'UX' ? 'fx' : 'fy'] += values[row.equation]; });
  return [...forces].reduce((totals, [nodeId, force]) => {
    const node = nodeMap.get(nodeId); totals.fx += force.fx; totals.fy += force.fy;
    totals.mz += node.x * force.fy - node.y * force.fx; return totals;
  }, { fx: 0, fy: 0, mz: 0 });
}
function selectLoadCase(model, identity) { return identity ? model.loadCases.find((row) => row.loadCaseId === identity) : model.loadCases[0]; }
function diagnostic(code, message) { return { code, severity: 'ERROR', message }; }
