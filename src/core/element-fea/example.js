import { deepFreeze } from '../shared-piping-model/index.js';

export function createReferenceExampleModel() {
  const sourceSemanticHash = 'example-source:v1';
  return deepFreeze({
    schema: 'fea-continuum-model/v1',
    modelIdentity: 'LFEA-EXAMPLE-T3',
    modelVersion: '1',
    sourceSemanticHash,
    solverProfile: exampleProfile(),
    nodes: exampleNodes(sourceSemanticHash),
    materials: [{ materialId: 'MAT1', E: 100, nu: 0.25, sourceSemanticHash }],
    elements: [{ elementId: 'E1', type: 'T3', nodeIds: ['N1','N2','N3'], materialId: 'MAT1', thickness: 1, sourceSemanticHash }],
    restraints: exampleRestraints(),
    prescribedDisplacements: examplePrescribedDisplacements(),
    loadCases: [{ loadCaseId: 'LC1', nodalForces: [], edgeLoads: [] }],
    sourceReferences: ['explicit-example'],
    limitations: ['Demonstration model; not design qualification.'],
  });
}

function exampleProfile() {
  return {
    profileIdentity: 'lfea-example-plane-stress', profileVersion: '1', formulation: 'PLANE_STRESS',
    units: { length: 'm', force: 'N', stress: 'Pa' },
    coordinateConvention: 'RIGHT_HANDED_X_RIGHT_Y_UP', runtimeIdentity: 'browser-es-module',
    outOfPlaneScale: 1, referenceBackendMaxDofs: 100,
    tolerances: {
      geometryArea: 1e-12, pivotAbsolute: 1e-12, pivotRatio: 1e-12,
      residualForceAbsolute: 1e-8, residualForceRelative: 1e-10,
      forceEquilibriumAbsolute: 1e-8, momentEquilibriumAbsolute: 1e-8,
    },
    limitations: ['Small-model dense reference backend only.', 'T3 linear elasticity only.'],
  };
}
function exampleNodes(sourceSemanticHash) {
  return [
    { nodeId: 'N1', x: 0, y: 0, sourceSemanticHash },
    { nodeId: 'N2', x: 1, y: 0, sourceSemanticHash },
    { nodeId: 'N3', x: 0, y: 1, sourceSemanticHash },
  ];
}
function exampleRestraints() {
  return [
    { constraintId: 'R1', nodeId: 'N1', component: 'UX' },
    { constraintId: 'R2', nodeId: 'N1', component: 'UY' },
    { constraintId: 'R3', nodeId: 'N2', component: 'UY' },
  ];
}
function examplePrescribedDisplacements() {
  return [
    { constraintId: 'P1', nodeId: 'N2', component: 'UX', value: 0.01 },
    { constraintId: 'P2', nodeId: 'N3', component: 'UX', value: 0 },
    { constraintId: 'P3', nodeId: 'N3', component: 'UY', value: 0.02 },
  ];
}
