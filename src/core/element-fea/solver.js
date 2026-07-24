import { deepFreeze } from '../shared-piping-model/immutable.js';
import { assembleContinuumSystem, partitionSystem, reconstructDisplacement } from './assembly.js';
import { BACKEND_ID, RESULT_STATUS } from './constants.js';
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
  if (!loadCase) {
    return rejectedResult(model, RESULT_STATUS.REJECTED_INVALID, [diagnostic('LOAD_CASE_MISSING', 'An exact load-case identity is required and must exist.')], model.limitations);
  }
  try { return solveQualifiedModel(model, loadCase); }
  catch (error) {
    const code = error instanceof RangeError ? 'RESOURCE_QUALIFICATION_FAILED' : 'SOLVER_FAILURE';
    const status = error instanceof RangeError ? RESULT_STATUS.REJECTED_INVALID : RESULT_STATUS.QUARANTINED_NUMERICAL;
    return rejectedResult(model, status, [diagnostic(code, error.message)], model.limitations);
  }
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
  if (!partition.freeEquations.length) {
    return deepFreeze({ ok: true, solution: [], pivotRatio: 1, pivots: [], minimumPivot: null, maximumPivot: null, backendIdentity: BACKEND_ID });
  }
  return solveDenseLdlt(partition.Kff, partition.effectiveFreeLoad, tolerances);
}
function failedBackendResult(model, backend) {
  const singular = backend.classification === 'SINGULAR';
  const status = singular ? RESULT_STATUS.REJECTED_SINGULAR : RESULT_STATUS.QUARANTINED_NUMERICAL;
  const code = singular ? 'SINGULAR_SYSTEM' : backend.classification;
  const trace = { backendTrace: backendTrace(backend) };
  return rejectedResult(model, status, [diagnostic(code, `Dense reference solve failed: ${backend.classification}.`)], model.limitations, trace);
}

function recoverSystem(model, system, partition, displacement, backend) {
  const originalInternalForce = multiplyMatrixVector(system.stiffness, displacement);
  const imbalance = subtractVectors(originalInternalForce, system.appliedLoad);
  const constrainedSet = new Set(partition.constrainedEquations);
  const reactionVector = imbalance.map((value, equation) => constrainedSet.has(equation) ? value : 0);
  const freeResidualValues = partition.freeEquations.map((equation) => imbalance[equation]);
  const globalResidualValues = subtractVectors(imbalance, reactionVector);
  const elementEvidence = recoverElements(model, system, displacement);
  const strainEnergy = 0.5 * dot(displacement, originalInternalForce);
  const elementEnergyTotal = elementEvidence.elementStrainEnergy.reduce((sum, row) => sum + row.value, 0);
  const appliedLoadTotals = componentTotals(model.nodes, system.dofMap, system.appliedLoad);
  const reactionTotals = componentTotals(model.nodes, system.dofMap, reactionVector);
  return {
    assembledSystemHash: system.assembledSystemHash,
    backendTrace: backendTrace(backend),
    dofMap: system.dofMap,
    constraintPartition: partitionEvidence(system.dofMap, partition),
    directNodalLoads: system.directNodalLoads,
    directNodalLoadEvidence: system.directNodalLoadEvidence,
    equivalentEdgeLoads: system.equivalentEdgeLoads,
    edgeLoadEvidence: system.edgeLoadEvidence,
    appliedLoadVector: system.appliedLoad,
    effectiveFreeLoad: partition.effectiveFreeLoad,
    nodalDisplacements: dofRows(system.dofMap, displacement),
    reactions: constrainedRows(system.dofMap, partition.constrainedEquations, reactionVector),
    constrainedDofImbalance: constrainedRows(system.dofMap, partition.constrainedEquations, imbalance),
    ...elementEvidence,
    freeDofResidual: residualEvidence(system.dofMap, partition.freeEquations, freeResidualValues),
    globalResidual: residualEvidence(system.dofMap, system.dofMap.map((row) => row.equation), globalResidualValues),
    appliedLoadTotals,
    reactionTotals,
    equilibriumTotals: addTotals(appliedLoadTotals, reactionTotals),
    strainEnergy,
    energyConsistency: { elementEnergyTotal, absoluteDifference: Math.abs(strainEnergy - elementEnergyTotal) },
    diagnostics: [],
  };
}

function recoverElements(model, system, displacement) {
  const materialMap = new Map(model.materials.map((row) => [row.materialId, row]));
  const rows = system.operators.map(({ element, operator, indices }) => {
    const localDisplacement = indices.map((index) => displacement[index]);
    const result = recoverT3Result(operator, localDisplacement, materialMap.get(element.materialId), model.solverProfile.formulation);
    return { elementId: element.elementId, localDofOrder: element.nodeIds.flatMap((nodeId) => [`${nodeId}:UX`, `${nodeId}:UY`]), result };
  });
  return {
    elementStrains: rows.map((row) => ({ elementId: row.elementId, values: row.result.strain, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })),
    elementStresses: rows.map((row) => ({ elementId: row.elementId, values: row.result.stress, sigmaZ: row.result.sigmaZ, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })),
    principalStresses: rows.map((row) => ({ elementId: row.elementId, ...row.result.principal })),
    vonMisesStress: rows.map((row) => ({ elementId: row.elementId, value: row.result.vonMises })),
    elementInternalForces: rows.map((row) => ({ elementId: row.elementId, localDofOrder: row.localDofOrder, values: row.result.internalForce })),
    elementStrainEnergy: rows.map((row) => ({ elementId: row.elementId, value: row.result.strainEnergy })),
  };
}

function qualificationFailure(model, recovery) {
  const tolerances = model.solverProfile.tolerances;
  const loadScale = Math.max(1, vectorNormInfinity(recovery.appliedLoadVector));
  const residualLimit = tolerances.residualForceAbsolute + tolerances.residualForceRelative * loadScale;
  if (recovery.freeDofResidual.infinityNorm > residualLimit) return quarantine(model, 'FREE_RESIDUAL_FAILURE', 'Free-DOF residual exceeds the approved tolerance.', recovery.backendTrace);
  if (recovery.globalResidual.infinityNorm > residualLimit) return quarantine(model, 'GLOBAL_RESIDUAL_FAILURE', 'Complete-system residual exceeds the approved tolerance.', recovery.backendTrace);
  if (Math.max(Math.abs(recovery.equilibriumTotals.fx), Math.abs(recovery.equilibriumTotals.fy)) > tolerances.forceEquilibriumAbsolute
      || Math.abs(recovery.equilibriumTotals.mz) > tolerances.momentEquilibriumAbsolute) {
    return quarantine(model, 'EQUILIBRIUM_FAILURE', 'Global force or moment balance exceeds the approved tolerance.', recovery.backendTrace);
  }
  if (!Number.isFinite(recovery.strainEnergy) || recovery.strainEnergy < 0
      || recovery.energyConsistency.absoluteDifference > tolerances.energyAbsolute) {
    return quarantine(model, 'ENERGY_FAILURE', 'Strain-energy evidence exceeds the approved consistency tolerance.', recovery.backendTrace);
  }
  return null;
}
function quarantine(model, code, message, trace) {
  return rejectedResult(model, RESULT_STATUS.QUARANTINED_NUMERICAL, [diagnostic(code, message)], model.limitations, { backendTrace: trace });
}
function partitionEvidence(dofMap, partition) {
  const byEquation = new Map(dofMap.map((row) => [row.equation, row]));
  return {
    method: 'PARTITION_ELIMINATION',
    freeEquations: partition.freeEquations.map((equation) => ({ equation, equationIdentity: byEquation.get(equation).equationIdentity })),
    constrainedEquations: partition.constraints.map((row) => ({
      equation: row.equation,
      equationIdentity: byEquation.get(row.equation).equationIdentity,
      constraintId: row.constraintId,
      constraintType: row.constraintType,
      prescribedValue: row.value,
    })),
    freeAppliedLoad: partition.freeAppliedLoad,
    imposedDisplacementLoad: partition.imposedDisplacementLoad,
  };
}
function backendTrace(backend) {
  return {
    backendIdentity: backend.backendIdentity,
    pivots: backend.pivots || [],
    pivotRatio: backend.pivotRatio ?? null,
    minimumPivot: backend.minimumPivot ?? null,
    maximumPivot: backend.maximumPivot ?? null,
    classification: backend.classification || 'SOLVED',
  };
}
function dofRows(dofMap, values) { return dofMap.map((row) => ({ ...row, value: values[row.equation] })); }
function constrainedRows(dofMap, equations, values) {
  const rows = new Map(dofMap.map((row) => [row.equation, row]));
  return equations.map((equation) => ({ ...rows.get(equation), value: values[equation] }));
}
function residualEvidence(dofMap, equations, values) {
  const rows = new Map(dofMap.map((row) => [row.equation, row]));
  return { values, infinityNorm: vectorNormInfinity(values), equations: equations.map((equation) => ({ equation, equationIdentity: rows.get(equation).equationIdentity })) };
}
function componentTotals(nodes, dofMap, values) {
  const nodeMap = new Map(nodes.map((node) => [node.nodeId, node]));
  const forces = new Map(nodes.map((node) => [node.nodeId, { fx: 0, fy: 0 }]));
  dofMap.forEach((row) => { forces.get(row.nodeId)[row.component === 'UX' ? 'fx' : 'fy'] += values[row.equation]; });
  return [...forces].reduce((totals, [nodeId, force]) => {
    const node = nodeMap.get(nodeId);
    totals.fx += force.fx; totals.fy += force.fy; totals.mz += node.x * force.fy - node.y * force.fx;
    return totals;
  }, { fx: 0, fy: 0, mz: 0 });
}
function addTotals(left, right) { return { fx: left.fx + right.fx, fy: left.fy + right.fy, mz: left.mz + right.mz }; }
function selectLoadCase(model, identity) {
  if (identity !== undefined && identity !== null) return model.loadCases.find((row) => row.loadCaseId === identity) || null;
  return model.loadCases.length === 1 ? model.loadCases[0] : null;
}
function diagnostic(code, message) { return { code, severity: 'ERROR', message }; }
