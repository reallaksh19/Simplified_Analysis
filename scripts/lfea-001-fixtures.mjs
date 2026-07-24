import { createReferenceExampleModel } from '../src/core/element-fea/index.js';

export function clone(value) { return JSON.parse(JSON.stringify(value)); }
export function baseModel() { return clone(createReferenceExampleModel()); }

export function prescribedFieldModel(field, options = {}) {
  const model = baseModel();
  if (options.formulation) model.solverProfile.formulation = options.formulation;
  if (options.nodes) model.nodes = options.nodes.map((row) => ({ ...row, sourceSemanticHash: model.sourceSemanticHash }));
  if (options.elements) model.elements = options.elements.map((row) => ({ ...row, sourceSemanticHash: model.sourceSemanticHash }));
  model.restraints = [];
  model.prescribedDisplacements = model.nodes.flatMap((node, index) => [
    { constraintId: `P${index}-X`, nodeId: node.nodeId, component: 'UX', value: field(node.x, node.y)[0] },
    { constraintId: `P${index}-Y`, nodeId: node.nodeId, component: 'UY', value: field(node.x, node.y)[1] },
  ]);
  model.loadCases = [{ loadCaseId: 'LC1', nodalForces: [], edgeLoads: [] }];
  return model;
}

export function squarePatch(field) {
  return prescribedFieldModel(field, {
    nodes: [
      { nodeId:'N1',x:0,y:0 }, { nodeId:'N2',x:1,y:0 },
      { nodeId:'N3',x:1,y:1 }, { nodeId:'N4',x:0,y:1 },
    ],
    elements: [
      { elementId:'E1',type:'T3',nodeIds:['N1','N2','N3'],materialId:'MAT1',thickness:1 },
      { elementId:'E2',type:'T3',nodeIds:['N1','N3','N4'],materialId:'MAT1',thickness:1 },
    ],
  });
}

export function fixedLoadedModel(edgeLoad) {
  const model = baseModel();
  model.restraints = model.nodes.flatMap((node, index) => [
    { constraintId:`R${index}-X`,nodeId:node.nodeId,component:'UX' },
    { constraintId:`R${index}-Y`,nodeId:node.nodeId,component:'UY' },
  ]);
  model.prescribedDisplacements = [];
  model.loadCases = [{ loadCaseId:'LC1', nodalForces:[], edgeLoads:[edgeLoad] }];
  return model;
}

export function unrestrainedModel() {
  const model = baseModel();
  model.restraints = [];
  model.prescribedDisplacements = [];
  model.loadCases = [{ loadCaseId:'LC1', nodalForces:[{ loadId:'F1',nodeId:'N2',fx:1,fy:0 }],edgeLoads:[] }];
  return model;
}
