import { deepFreeze, finiteNumber, semanticHash, stringValue } from '../shared-piping-model/index.js';
import { CONTINUUM_MODEL_SCHEMA, DOF_ORDER, ELEMENT_TYPE, FORMULATIONS, LOAD_TYPES } from './constants.js';
import { signedArea } from './t3-geometry.js';
import { createLfeaProfile } from './profile.js';

export function qualifyContinuumModel(input) {
  try {
    const model = createContinuumModel(input);
    return deepFreeze({ ok: true, model, diagnostics: [] });
  } catch (error) {
    return deepFreeze({ ok: false, model: null, diagnostics: [diagnostic('MODEL_REJECTED', error.message)] });
  }
}

export function createContinuumModel(input) {
  const source = record(input, 'model');
  if (source.schema !== CONTINUUM_MODEL_SCHEMA) throw new TypeError('Invalid fea-continuum-model/v1 schema.');
  const profile = createLfeaProfile(source.solverProfile);
  const sourceHash = text(source.sourceSemanticHash, 'sourceSemanticHash');
  const nodes = normalizeNodes(source.nodes, sourceHash);
  const materials = normalizeMaterials(source.materials, sourceHash, profile.formulation);
  const elements = normalizeElements(source.elements, sourceHash, nodes, materials, profile);
  const restraints = normalizeRestraints(source.restraints, nodes);
  const prescribed = normalizePrescribed(source.prescribedDisplacements, nodes, restraints);
  const loadCases = normalizeLoadCases(source.loadCases, nodes, elements, edgeOwnership(elements));
  const sourceReferences = textArray(source.sourceReferences, 'sourceReferences');
  if (!sourceReferences.length) throw new TypeError('At least one source reference is required.');
  assertConnected(nodes, elements);
  const base = {
    schema: CONTINUUM_MODEL_SCHEMA,
    modelIdentity: text(source.modelIdentity, 'modelIdentity'),
    modelVersion: text(source.modelVersion, 'modelVersion'),
    sourceSemanticHash: sourceHash,
    solverProfile: profile,
    nodes,
    elements,
    materials,
    restraints,
    prescribedDisplacements: prescribed,
    loadCases,
    sourceReferences,
    limitations: textArray(source.limitations, 'limitations'),
  };
  return deepFreeze({ ...base, semanticHash: semanticHash(base) });
}

function normalizeNodes(value, sourceHash) {
  const rows = array(value, 'nodes').map((row) => {
    const node = record(row, 'node');
    ancestry(node, sourceHash, 'node');
    return { nodeId: text(node.nodeId, 'nodeId'), x: finite(node.x, 'node.x'), y: finite(node.y, 'node.y'), sourceSemanticHash: sourceHash };
  });
  assertUnique(rows, 'nodeId', 'node');
  if (!rows.length) throw new TypeError('At least one node is required.');
  return sortById(rows, 'nodeId');
}

function normalizeMaterials(value, sourceHash, formulation) {
  const rows = array(value, 'materials').map((row) => {
    const material = record(row, 'material');
    ancestry(material, sourceHash, 'material');
    const E = finite(material.E, 'material.E');
    const nu = finite(material.nu, 'material.nu');
    if (!(E > 0)) throw new TypeError('Material E must be positive.');
    if (!(nu > -1 && nu < 0.5)) throw new TypeError(`Material nu is invalid for ${formulation}.`);
    return { materialId: text(material.materialId, 'materialId'), E, nu, sourceSemanticHash: sourceHash };
  });
  assertUnique(rows, 'materialId', 'material');
  if (!rows.length) throw new TypeError('At least one material is required.');
  return sortById(rows, 'materialId');
}

function normalizeElements(value, sourceHash, nodes, materials, profile) {
  const nodeMap = new Map(nodes.map((row) => [row.nodeId, row]));
  const materialIds = new Set(materials.map((row) => row.materialId));
  const rows = array(value, 'elements').map((row) => elementRow(row, sourceHash, nodeMap, materialIds, profile));
  assertUnique(rows, 'elementId', 'element');
  if (!rows.length) throw new TypeError('At least one element is required.');
  return sortById(rows, 'elementId');
}

function elementRow(value, sourceHash, nodeMap, materialIds, profile) {
  const element = record(value, 'element');
  ancestry(element, sourceHash, 'element');
  if (element.type !== ELEMENT_TYPE) throw new TypeError(`Unsupported element type: ${element.type}.`);
  const nodeIds = array(element.nodeIds, 'element.nodeIds').map((id) => text(id, 'element.nodeId'));
  if (nodeIds.length !== 3 || new Set(nodeIds).size !== 3) throw new TypeError('T3 connectivity requires three distinct nodes.');
  const coordinates = nodeIds.map((id) => nodeMap.get(id));
  if (coordinates.some((row) => !row)) throw new TypeError('Element connectivity references a missing node.');
  const area = signedArea(coordinates);
  if (!(area > profile.tolerances.geometryArea)) throw new TypeError('T3 element has zero, near-zero, or inverted signed area.');
  const materialId = text(element.materialId, 'element.materialId');
  if (!materialIds.has(materialId)) throw new TypeError('Element material assignment is missing.');
  const thickness = profile.formulation === FORMULATIONS.PLANE_STRESS
    ? positive(element.thickness, 'element.thickness') : null;
  return { elementId: text(element.elementId, 'elementId'), type: ELEMENT_TYPE, nodeIds, materialId, thickness, signedArea: area, sourceSemanticHash: sourceHash };
}

function normalizeRestraints(value, nodes) {
  const nodeIds = new Set(nodes.map((row) => row.nodeId));
  const rows = array(value, 'restraints').map((row) => dofRecord(row, 'restraint', nodeIds, 0));
  assertUnique(rows, 'constraintId', 'restraint');
  assertUniqueDofs(rows, 'restraint');
  return sortDofs(rows);
}

function normalizePrescribed(value, nodes, restraints) {
  const nodeIds = new Set(nodes.map((row) => row.nodeId));
  const rows = array(value, 'prescribedDisplacements').map((row) => {
    const normalized = dofRecord(row, 'prescribed displacement', nodeIds, finite(record(row, 'prescribed').value, 'prescribed.value'));
    return { ...normalized, value: finite(record(row, 'prescribed').value, 'prescribed.value') };
  });
  assertUnique(rows, 'constraintId', 'prescribed displacement');
  assertUniqueDofs(rows, 'prescribed displacement');
  const fixed = new Set(restraints.map(dofKey));
  if (rows.some((row) => fixed.has(dofKey(row)))) throw new TypeError('A DOF cannot be both fixed and prescribed.');
  return sortDofs(rows);
}

function normalizeLoadCases(value, nodes, elements, ownership) {
  const nodeIds = new Set(nodes.map((row) => row.nodeId));
  const elementMap = new Map(elements.map((row) => [row.elementId, row]));
  const rows = array(value, 'loadCases').map((row) => loadCaseRow(row, nodeIds, elementMap, ownership));
  assertUnique(rows, 'loadCaseId', 'load case');
  if (!rows.length) throw new TypeError('At least one load case is required.');
  return sortById(rows, 'loadCaseId');
}

function loadCaseRow(value, nodeIds, elementMap, ownership) {
  const loadCase = record(value, 'loadCase');
  const nodalForces = array(loadCase.nodalForces, 'nodalForces').map((row) => nodalForce(row, nodeIds));
  const edgeLoads = array(loadCase.edgeLoads, 'edgeLoads').map((row) => edgeLoad(row, elementMap, ownership));
  assertUnique([...nodalForces, ...edgeLoads], 'loadId', 'load');
  if (new Set(edgeLoads.map(edgeLoadKey)).size !== edgeLoads.length) throw new TypeError('Duplicate edge load application is prohibited.');
  return { loadCaseId: text(loadCase.loadCaseId, 'loadCaseId'), nodalForces: sortById(nodalForces, 'loadId'), edgeLoads: sortById(edgeLoads, 'loadId') };
}

function nodalForce(value, nodeIds) {
  const row = record(value, 'nodalForce');
  const nodeId = text(row.nodeId, 'nodalForce.nodeId');
  if (!nodeIds.has(nodeId)) throw new TypeError('Nodal force references a missing node.');
  return { loadId: text(row.loadId, 'loadId'), nodeId, fx: finite(row.fx, 'nodalForce.fx'), fy: finite(row.fy, 'nodalForce.fy') };
}

function edgeLoad(value, elementMap, ownership) {
  const row = record(value, 'edgeLoad');
  const elementId = text(row.elementId, 'edgeLoad.elementId');
  const element = elementMap.get(elementId);
  if (!element) throw new TypeError('Edge load references a missing element.');
  const edgeNodeIds = array(row.edgeNodeIds, 'edgeNodeIds').map((id) => text(id, 'edgeNodeId'));
  if (edgeNodeIds.length !== 2 || edgeNodeIds.some((id) => !element.nodeIds.includes(id))) throw new TypeError('Edge load must reference a complete element edge.');
  if (!adjacentEdge(element.nodeIds, edgeNodeIds)) throw new TypeError('Edge load nodes are not an element edge.');
  if ((ownership.get(canonicalEdge(edgeNodeIds)) || []).length !== 1) throw new TypeError('Loads on shared internal edges are prohibited.');
  if (!Object.values(LOAD_TYPES).includes(row.type)) throw new TypeError('Unsupported edge load type.');
  const load = { loadId: text(row.loadId, 'loadId'), elementId, edgeNodeIds: [...edgeNodeIds].sort(compare), type: row.type };
  return row.type === LOAD_TYPES.TRACTION
    ? { ...load, tx: finite(row.tx, 'edgeLoad.tx'), ty: finite(row.ty, 'edgeLoad.ty') }
    : { ...load, pressure: finite(row.pressure, 'edgeLoad.pressure') };
}

function assertConnected(nodes, elements) {
  const adjacency = new Map(nodes.map((row) => [row.nodeId, new Set()]));
  elements.forEach((element) => element.nodeIds.forEach((left) => element.nodeIds.forEach((right) => adjacency.get(left).add(right))));
  const visited = new Set();
  const stack = [nodes[0].nodeId];
  while (stack.length) { const id = stack.pop(); if (visited.has(id)) continue; visited.add(id); adjacency.get(id).forEach((next) => stack.push(next)); }
  if (visited.size !== nodes.length) throw new TypeError('Disconnected topology is not supported by LFEA-001.');
}

function dofRecord(value, label, nodeIds, fixedValue) {
  const row = record(value, label);
  const nodeId = text(row.nodeId, `${label}.nodeId`);
  if (!nodeIds.has(nodeId)) throw new TypeError(`${label} references a missing node.`);
  if (!DOF_ORDER.includes(row.component)) throw new TypeError(`${label} component is invalid.`);
  return { constraintId: text(row.constraintId, `${label}.constraintId`), nodeId, component: row.component, value: fixedValue };
}
function ancestry(row, expected, label) { if (row.sourceSemanticHash !== expected) throw new TypeError(`${label} source ancestry does not match the model.`); }

function edgeOwnership(elements) {
  const ownership = new Map();
  elements.forEach((element) => elementEdges(element.nodeIds).forEach((edge) => {
    const key = canonicalEdge(edge);
    ownership.set(key, [...(ownership.get(key) || []), element.elementId]);
  }));
  return ownership;
}
function elementEdges(nodes) { return [[nodes[0],nodes[1]],[nodes[1],nodes[2]],[nodes[2],nodes[0]]]; }
function canonicalEdge(edge) { return [...edge].sort(compare).join('|'); }
function edgeLoadKey(load) { return `${load.elementId}:${canonicalEdge(load.edgeNodeIds)}`; }

function adjacentEdge(nodes, edge) { const pairs = [[nodes[0],nodes[1]],[nodes[1],nodes[2]],[nodes[2],nodes[0]]]; return pairs.some((pair) => pair.includes(edge[0]) && pair.includes(edge[1])); }
function assertUnique(rows, key, label) { if (new Set(rows.map((row) => row[key])).size !== rows.length) throw new TypeError(`Duplicate ${label} identity.`); }
function assertUniqueDofs(rows, label) { if (new Set(rows.map(dofKey)).size !== rows.length) throw new TypeError(`Contradictory or duplicate ${label} DOF.`); }
function dofKey(row) { return `${row.nodeId}:${row.component}`; }
function sortDofs(rows) { return [...rows].sort((a,b) => compare(a.nodeId,b.nodeId) || DOF_ORDER.indexOf(a.component)-DOF_ORDER.indexOf(b.component)); }
function sortById(rows, key) { return [...rows].sort((a,b) => compare(a[key],b[key])); }
function compare(left, right) { return left < right ? -1 : left > right ? 1 : 0; }
function record(value, name) { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} must be a record.`); return value; }
function array(value, name) { if (!Array.isArray(value)) throw new TypeError(`${name} must be an array.`); return value; }
function text(value, name) { const result = stringValue(value); if (!result) throw new TypeError(`${name} is required.`); return result; }
function finite(value, name) { const result = finiteNumber(value); if (result === null) throw new TypeError(`${name} must be finite.`); return result; }
function positive(value, name) { const result = finite(value, name); if (!(result > 0)) throw new TypeError(`${name} must be positive.`); return result; }
function textArray(value, name) { return array(value, name).map((item) => text(item, name)).sort(compare); }
function diagnostic(code, message) { return { code, severity: 'ERROR', message }; }
