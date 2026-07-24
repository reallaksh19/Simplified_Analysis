import { deepFreeze } from '../shared-piping-model/index.js';
import { addSubmatrix, multiplyMatrixVector, subtractVectors, zeros } from './matrix.js';
import { createDofMap, elementEquationIndices, equationLookup } from './dof-map.js';
import { createT3Operator, equivalentEdgeLoad } from './t3-element.js';

export function assembleContinuumSystem(model, loadCase) {
  const dofMap = createDofMap(model.nodes);
  if (dofMap.length > model.solverProfile.referenceBackendMaxDofs) throw new RangeError('Model exceeds the qualified dense reference backend DOF limit.');
  const lookup = equationLookup(dofMap);
  const nodeMap = new Map(model.nodes.map((row) => [row.nodeId, row]));
  const materialMap = new Map(model.materials.map((row) => [row.materialId, row]));
  const stiffness = zeros(dofMap.length);
  const operators = [];
  model.elements.forEach((element) => {
    const operator = createT3Operator(element, nodeMap, materialMap.get(element.materialId), model.solverProfile);
    const indices = elementEquationIndices(element, lookup);
    addSubmatrix(stiffness, indices, operator.stiffness);
    operators.push({ element, operator, indices });
  });
  const loadEvidence = assembleLoads(model, loadCase, lookup, nodeMap);
  return deepFreeze({ dofMap, stiffness, operators, ...loadEvidence });
}

function assembleLoads(model, loadCase, lookup, nodeMap) {
  const directNodalLoads = Array(model.nodes.length * 2).fill(0);
  const equivalentEdgeLoads = Array(model.nodes.length * 2).fill(0);
  loadCase.nodalForces.forEach((load) => {
    directNodalLoads[lookup.get(`${load.nodeId}:UX`)] += load.fx;
    directNodalLoads[lookup.get(`${load.nodeId}:UY`)] += load.fy;
  });
  const edgeEvidence = loadCase.edgeLoads.map((load) => applyEdgeLoad(model, load, lookup, nodeMap, equivalentEdgeLoads));
  const appliedLoad = directNodalLoads.map((value, index) => value + equivalentEdgeLoads[index]);
  return { directNodalLoads, equivalentEdgeLoads, appliedLoad, edgeLoadEvidence: edgeEvidence };
}

function applyEdgeLoad(model, load, lookup, nodeMap, target) {
  const element = model.elements.find((row) => row.elementId === load.elementId);
  const evidence = equivalentEdgeLoad(element, load, nodeMap, model.solverProfile);
  const indices = elementEquationIndices(element, lookup);
  evidence.vector.forEach((value, index) => { target[indices[index]] += value; });
  return { loadId: load.loadId, elementId: element.elementId, ...evidence };
}

export function partitionSystem(system, model) {
  const lookup = equationLookup(system.dofMap);
  const constraints = constraintRows(model, lookup);
  const constrained = constraints.map((row) => row.equation);
  const constrainedSet = new Set(constrained);
  const free = system.dofMap.map((row) => row.equation).filter((equation) => !constrainedSet.has(equation));
  const prescribedVector = constraints.map((row) => row.value);
  const Kff = submatrix(system.stiffness, free, free);
  const Kfc = submatrix(system.stiffness, free, constrained);
  const Ff = free.map((index) => system.appliedLoad[index]);
  const effectiveFreeLoad = subtractVectors(Ff, multiplyMatrixVector(Kfc, prescribedVector));
  return deepFreeze({ constraints, free, constrained, prescribedVector, Kff, Kfc, Ff, effectiveFreeLoad });
}

export function reconstructDisplacement(size, partition, freeValues) {
  const displacement = Array(size).fill(0);
  partition.free.forEach((equation, index) => { displacement[equation] = freeValues[index]; });
  partition.constrained.forEach((equation, index) => { displacement[equation] = partition.prescribedVector[index]; });
  return displacement;
}

function constraintRows(model, lookup) {
  const rows = [
    ...model.restraints.map((row) => ({ ...row, equation: lookup.get(`${row.nodeId}:${row.component}`) })),
    ...model.prescribedDisplacements.map((row) => ({ ...row, equation: lookup.get(`${row.nodeId}:${row.component}`) })),
  ];
  return rows.sort((a, b) => a.equation - b.equation);
}
function submatrix(matrix, rows, columns) { return rows.map((row) => columns.map((column) => matrix[row][column])); }
