import { deepFreeze } from '../shared-piping-model/immutable.js';
import { assembleContinuumSystem, partitionSystem, reconstructDisplacement } from './assembly.js';
import { BACKEND_ID, CONTINUUM_RESULT_SCHEMA, CONTINUUM_RESULT_SCHEMA_V2, ELEMENT_TYPES, FORMULATIONS, RESULT_STATUS } from './constants.js';
import { recoverElementResult } from './element-dispatch.js';
import { solveDenseLdlt } from './linear-backend.js';
import { dot, multiplyMatrixVector, subtractVectors, vectorNormInfinity } from './matrix.js';
import { qualifyContinuumModel } from './model.js';
import { qualifiedResult, rejectedResult } from './result.js';

export function solveContinuumModel(input, loadCaseIdentity) {
  const qualification = qualifyContinuumModel(input); if (!qualification.ok) return rejectedResult(input, RESULT_STATUS.REJECTED_INVALID, qualification.diagnostics);
  const model = qualification.model; const loadCase = selectLoadCase(model, loadCaseIdentity);
  if (!loadCase) return rejectedResult(model, RESULT_STATUS.REJECTED_INVALID, [diagnostic('LOAD_CASE_MISSING', 'An exact load-case identity is required and must exist.')], model.limitations);
  try { return solveQualifiedModel(model, loadCase); }
  catch (error) { const resource = error instanceof RangeError; return rejectedResult(model, resource ? RESULT_STATUS.REJECTED_INVALID : RESULT_STATUS.QUARANTINED_NUMERICAL, [diagnostic(resource ? 'RESOURCE_QUALIFICATION_FAILED' : 'SOLVER_FAILURE', error.message)], model.limitations); }
}

function solveQualifiedModel(model, loadCase) {
  const system = assembleContinuumSystem(model, loadCase); const partition = partitionSystem(system, model); const backend = solveFreeSystem(partition, model.solverProfile.tolerances);
  if (!backend.ok) return failedBackendResult(model, backend); const displacement = reconstructDisplacement(system.dofMap.length, partition, backend.solution);
  const recovery = recoverSystem(model, system, partition, displacement, backend); const failure = qualificationFailure(model, recovery); return failure || qualifiedResult(model, loadCase, recovery);
}
function solveFreeSystem(partition, tolerances) {
  if (!partition.freeEquations.length) return deepFreeze({ ok: true, solution: [], pivotRatio: 1, pivots: [], minimumPivot: null, maximumPivot: null, backendIdentity: BACKEND_ID });
  return solveDenseLdlt(partition.Kff, partition.effectiveFreeLoad, tolerances);
}
function failedBackendResult(model, backend) {
  const singular = backend.classification === 'SINGULAR'; const status = singular ? RESULT_STATUS.REJECTED_SINGULAR : RESULT_STATUS.QUARANTINED_NUMERICAL; const code = singular ? 'SINGULAR_SYSTEM' : backend.classification;
  return rejectedResult(model, status, [diagnostic(code, `Dense reference solve failed: ${backend.classification}.`)], model.limitations, { backendTrace: backendTrace(backend) });
}

function recoverSystem(model, system, partition, displacement, backend) {
  const originalInternalForce = multiplyMatrixVector(system.stiffness, displacement); const imbalance = subtractVectors(originalInternalForce, system.appliedLoad); const constrainedSet = new Set(partition.constrainedEquations);
  const reactionVector = imbalance.map((value, equation) => constrainedSet.has(equation) ? value : 0); const freeResidualValues = partition.freeEquations.map((equation) => imbalance[equation]); const globalResidualValues = subtractVectors(imbalance, reactionVector);
  const elementEvidence = recoverElements(model, system, displacement); const strainEnergy = 0.5 * dot(displacement, originalInternalForce); const elementEnergyTotal = elementEvidence.elementStrainEnergy.reduce((sum, row) => sum + row.value, 0);
  const appliedLoadTotals = componentTotals(model.nodes, system.dofMap, system.appliedLoad); const reactionTotals = componentTotals(model.nodes, system.dofMap, reactionVector);
  return { resultSchema: elementEvidence.resultSchema, assembledSystemHash: system.assembledSystemHash, backendTrace: backendTrace(backend), dofMap: system.dofMap, constraintPartition: partitionEvidence(system.dofMap, partition), directNodalLoads: system.directNodalLoads, directNodalLoadEvidence: system.directNodalLoadEvidence, equivalentEdgeLoads: system.equivalentEdgeLoads, edgeLoadEvidence: system.edgeLoadEvidence, appliedLoadVector: system.appliedLoad, effectiveFreeLoad: partition.effectiveFreeLoad, nodalDisplacements: dofRows(system.dofMap, displacement), reactions: constrainedRows(system.dofMap, partition.constrainedEquations, reactionVector), constrainedDofImbalance: constrainedRows(system.dofMap, partition.constrainedEquations, imbalance), ...elementEvidence, freeDofResidual: residualEvidence(system.dofMap, partition.freeEquations, freeResidualValues), globalResidual: residualEvidence(system.dofMap, system.dofMap.map((row) => row.equation), globalResidualValues), appliedLoadTotals, reactionTotals, equilibriumTotals: addTotals(appliedLoadTotals, reactionTotals), strainEnergy, energyConsistency: { elementEnergyTotal, absoluteDifference: Math.abs(strainEnergy - elementEnergyTotal) }, diagnostics: lockingDiagnostics(model), additionalLimitations: lockingLimitations(model) };
}

function recoverElements(model, system, displacement) {
  const materialMap = new Map(model.materials.map((row) => [row.materialId, row]));
  const rows = system.operators.map(({ element, operator, indices }) => { const localDisplacement = indices.map((index) => displacement[index]); const result = recoverElementResult(element, operator, localDisplacement, materialMap.get(element.materialId), model.solverProfile.formulation); return { element, operator, localDofOrder: element.nodeIds.flatMap((nodeId) => [`${nodeId}:UX`, `${nodeId}:UY`]), result }; });
  return rows.some((row) => row.element.type === ELEMENT_TYPES.Q4) ? q4Evidence(rows) : t3Evidence(rows);
}
function t3Evidence(rows) {
  return { resultSchema: CONTINUUM_RESULT_SCHEMA, elementStrains: rows.map((row) => ({ elementId: row.element.elementId, values: row.result.integrationPointResults[0].strain, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })), elementStresses: rows.map((row) => ({ elementId: row.element.elementId, values: row.result.integrationPointResults[0].stress, sigmaZ: row.result.integrationPointResults[0].sigmaZ, recoveryLocation: 'T3_CONSTANT_ELEMENT_DOMAIN' })), principalStresses: rows.map((row) => ({ elementId: row.element.elementId, ...row.result.integrationPointResults[0].principal })), vonMisesStress: rows.map((row) => ({ elementId: row.element.elementId, value: row.result.integrationPointResults[0].vonMises })), elementInternalForces: rows.map((row) => ({ elementId: row.element.elementId, localDofOrder: row.localDofOrder, values: row.result.internalForce })), elementStrainEnergy: rows.map((row) => ({ elementId: row.element.elementId, value: row.result.strainEnergy })) };
}
function q4Evidence(rows) {
  const integrationPointResults = rows.flatMap((row) => row.result.integrationPointResults.map((point) => ({ elementId: row.element.elementId, elementType: row.element.type, integrationPointId: point.integrationPointId, naturalCoordinates: point.naturalCoordinates, globalCoordinates: point.globalCoordinates, strain: point.strain, stress: point.stress, sigmaZ: point.sigmaZ, principalStresses: point.principal.values, inPlanePrincipalStresses: point.principal.inPlane, principalOrientationRadians: point.principal.angleRadians, principalOrientationDefined: point.principal.orientationDefined, vonMisesStress: point.vonMises, recoveryLocation: point.recoveryLocation, strainEnergyContribution: point.strainEnergyContribution })));
  const elementIntegrationEvidence = rows.map((row) => ({ elementId: row.element.elementId, elementType: row.element.type, integrationRule: row.operator.integrationRule || 'T3_CONSTANT_EXACT', points: row.element.type === ELEMENT_TYPES.Q4 ? row.operator.integrationPoints.map(integrationEvidence) : [{ integrationPointId: 'T3_CONSTANT', B: row.operator.geometry.B, determinantMeasure: row.operator.geometry.area, globalCoordinates: row.operator.centroid }] }));
  const elementQualityEvidence = rows.map((row) => ({ elementId: row.element.elementId, elementType: row.element.type, evidence: row.element.type === ELEMENT_TYPES.Q4 ? row.operator.qualityEvidence : { signedArea: row.operator.geometry.area } }));
  return { resultSchema: CONTINUUM_RESULT_SCHEMA_V2, integrationPointResults, elementIntegrationEvidence, elementQualityEvidence, elementInternalForces: internalForces(rows), elementStrainEnergy: elementEnergies(rows) };
}
function integrationEvidence(point) { return { integrationPointId: point.integrationPointId, naturalCoordinates: { xi: point.xi, eta: point.eta }, globalCoordinates: point.globalCoordinates, weight: point.weight, jacobian: point.jacobian, determinant: point.determinant, inverseJacobian: point.inverseJacobian, globalDerivatives: point.globalDerivatives, B: point.B }; }
function internalForces(rows) { return rows.map((row) => ({ elementId: row.element.elementId, elementType: row.element.type, localDofOrder: row.localDofOrder, values: row.result.internalForce })); }
function elementEnergies(rows) { return rows.map((row) => ({ elementId: row.element.elementId, elementType: row.element.type, value: row.result.strainEnergy, integratedPointEnergy: row.result.integratedPointEnergy })); }

function qualificationFailure(model, recovery) {
  const tolerances = model.solverProfile.tolerances; const loadScale = Math.max(1, vectorNormInfinity(recovery.appliedLoadVector)); const residualLimit = tolerances.residualForceAbsolute + tolerances.residualForceRelative * loadScale;
  if (recovery.freeDofResidual.infinityNorm > residualLimit) return quarantine(model, 'FREE_RESIDUAL_FAILURE', 'Free-DOF residual exceeds the approved tolerance.', recovery.backendTrace);
  if (recovery.globalResidual.infinityNorm > residualLimit) return quarantine(model, 'GLOBAL_RESIDUAL_FAILURE', 'Complete-system residual exceeds the approved tolerance.', recovery.backendTrace);
  if (Math.max(Math.abs(recovery.equilibriumTotals.fx), Math.abs(recovery.equilibriumTotals.fy)) > tolerances.forceEquilibriumAbsolute || Math.abs(recovery.equilibriumTotals.mz) > tolerances.momentEquilibriumAbsolute) return quarantine(model, 'EQUILIBRIUM_FAILURE', 'Global force or moment balance exceeds the approved tolerance.', recovery.backendTrace);
  if (!Number.isFinite(recovery.strainEnergy) || recovery.strainEnergy < -tolerances.energyAbsolute || recovery.energyConsistency.absoluteDifference > tolerances.energyAbsolute) return quarantine(model, 'ENERGY_FAILURE', 'Strain-energy evidence exceeds the approved consistency tolerance.', recovery.backendTrace);
  return null;
}
function quarantine(model, code, message, trace) { return rejectedResult(model, RESULT_STATUS.QUARANTINED_NUMERICAL, [diagnostic(code, message)], model.limitations, { backendTrace: trace }); }
function lockingDiagnostics(model) { return hasQ4PlaneStrain(model) ? [diagnostic('Q4_PLANE_STRAIN_LOCKING_APPLICABILITY', 'Full-integration Q4 plane strain may exhibit volumetric locking near incompressibility; no formulation change is applied.','WARNING')] : []; }
function lockingLimitations(model) { return hasQ4PlaneStrain(model) ? ['Q4 plane-strain applicability near incompressibility requires independent mesh-convergence evidence; reduced integration is not authorized.'] : []; }
function hasQ4PlaneStrain(model) { return model.solverProfile.formulation === FORMULATIONS.PLANE_STRAIN && model.elements.some((row) => row.type === ELEMENT_TYPES.Q4); }
function partitionEvidence(dofMap, partition) { const byEquation = new Map(dofMap.map((row) => [row.equation, row])); return { method: 'PARTITION_ELIMINATION', freeEquations: partition.freeEquations.map((equation) => ({ equation, equationIdentity: byEquation.get(equation).equationIdentity })), constrainedEquations: partition.constraints.map((row) => ({ equation: row.equation, equationIdentity: byEquation.get(row.equation).equationIdentity, constraintId: row.constraintId, constraintType: row.constraintType, prescribedValue: row.value })), freeAppliedLoad: partition.freeAppliedLoad, imposedDisplacementLoad: partition.imposedDisplacementLoad };
}
function backendTrace(backend) { return { backendIdentity: backend.backendIdentity, pivots: backend.pivots || [], pivotRatio: backend.pivotRatio ?? null, minimumPivot: backend.minimumPivot ?? null, maximumPivot: backend.maximumPivot ?? null, classification: backend.classification || 'SOLVED' }; }
function dofRows(dofMap, values) { return dofMap.map((row) => ({ ...row, value: values[row.equation] })); }
function constrainedRows(dofMap, equations, values) { const rows = new Map(dofMap.map((row) => [row.equation, row])); return equations.map((equation) => ({ ...rows.get(equation), value: values[equation] })); }
function residualEvidence(dofMap, equations, values) { const rows = new Map(dofMap.map((row) => [row.equation, row])); return { values, infinityNorm: vectorNormInfinity(values), equations: equations.map((equation) => ({ equation, equationIdentity: rows.get(equation).equationIdentity })) }; }
function componentTotals(nodes, dofMap, values) { const nodeMap = new Map(nodes.map((node) => [node.nodeId, node])); const forces = new Map(nodes.map((node) => [node.nodeId, { fx: 0, fy: 0 }])); dofMap.forEach((row) => { forces.get(row.nodeId)[row.component === 'UX' ? 'fx' : 'fy'] += values[row.equation]; }); return [...forces].reduce((totals, [nodeId, force]) => { const node = nodeMap.get(nodeId); totals.fx += force.fx; totals.fy += force.fy; totals.mz += node.x * force.fy - node.y * force.fx; return totals; }, { fx: 0, fy: 0, mz: 0 }); }
function addTotals(left, right) { return { fx: left.fx + right.fx, fy: left.fy + right.fy, mz: left.mz + right.mz }; }
function selectLoadCase(model, identity) { if (identity !== undefined && identity !== null) return model.loadCases.find((row) => row.loadCaseId === identity) || null; return model.loadCases.length === 1 ? model.loadCases[0] : null; }
function diagnostic(code, message, severity = 'ERROR') { return { code, severity, message }; }
