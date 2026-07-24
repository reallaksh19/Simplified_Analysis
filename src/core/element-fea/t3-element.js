import { deepFreeze } from '../shared-piping-model/index.js';
import { constitutiveMatrix, principalStress, recoverSigmaZ, vonMisesStress } from './constitutive.js';
import { dot, multiplyMatrices, multiplyMatrixVector, scaleMatrix, transpose } from './matrix.js';
import { createT3Geometry, outwardEdgeNormal } from './t3-geometry.js';
import { FORMULATIONS, LOAD_TYPES } from './constants.js';

export function createT3Operator(element, nodeMap, material, profile) {
  const nodes = element.nodeIds.map((id) => nodeMap.get(id));
  const geometry = createT3Geometry(nodes);
  const D = constitutiveMatrix(material, profile.formulation);
  const scale = geometry.area * elementScale(element, profile);
  const stiffness = scaleMatrix(multiplyMatrices(transpose(geometry.B), multiplyMatrices(D, geometry.B)), scale);
  return deepFreeze({ geometry, D, stiffness, scale });
}

export function equivalentEdgeLoad(element, load, nodeMap, profile) {
  const edge = outwardEdgeNormal(element.nodeIds, load.edgeNodeIds, nodeMap);
  const traction = load.type === LOAD_TYPES.TRACTION
    ? [load.tx, load.ty] : [-load.pressure * edge.normal[0], -load.pressure * edge.normal[1]];
  const each = 0.5 * edge.length * elementScale(element, profile);
  const vector = Array(6).fill(0);
  edge.orderedNodeIds.forEach((nodeId) => {
    const index = element.nodeIds.indexOf(nodeId) * 2;
    vector[index] += each * traction[0];
    vector[index + 1] += each * traction[1];
  });
  return deepFreeze({ vector, traction, length: edge.length, normal: edge.normal, orderedNodeIds: edge.orderedNodeIds });
}

export function recoverT3Result(operator, displacement, material, formulation) {
  const strain = multiplyMatrixVector(operator.geometry.B, displacement);
  const stress = multiplyMatrixVector(operator.D, strain);
  const sigmaZ = recoverSigmaZ(stress, material, formulation);
  const principal = principalStress(stress, sigmaZ, formulation);
  const vonMises = vonMisesStress(stress, sigmaZ);
  const internalForce = multiplyMatrixVector(operator.stiffness, displacement);
  const strainEnergy = 0.5 * dot(displacement, internalForce);
  return deepFreeze({ strain, stress, sigmaZ, principal, vonMises, internalForce, strainEnergy });
}

function elementScale(element, profile) {
  return profile.formulation === FORMULATIONS.PLANE_STRESS ? element.thickness : profile.outOfPlaneScale;
}
