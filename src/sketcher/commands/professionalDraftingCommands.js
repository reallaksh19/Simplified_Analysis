import { buildConnectionIndex, validateSketchTopology } from '../topology/validateSketchTopology.js';
import { classifyTeeMainBranch } from '../topology/classifyTeeMainBranch.js';
import { resolveElbowC2E, resolveTeeC2E, resolveOletBRLEN } from '../../core/component-data/resolveComponentDimensions.js';

export const SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION = 'sketch-drafting-command-v1';

const LOCAL_DN_TO_NPS = { 15: 0.5, 20: 0.75, 25: 1, 40: 1.5, 50: 2, 80: 3, 100: 4, 150: 6, 200: 8, 250: 10, 300: 12, 350: 14, 400: 16, 450: 18, 500: 20, 600: 24 };

function dnToNpsLocal(dn) { return LOCAL_DN_TO_NPS[Math.round(dn)] ?? null; }

function maxConnectedBoreMm(connected) { return Math.max(...connected.map(s => s.properties?.bore ?? s.properties?.dn ?? 200)); }

function minConnectedBoreMm(connected) { return Math.min(...connected.map(s => s.properties?.bore ?? s.properties?.dn ?? 100)); }

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function cloneGraph(nodes, segments) {
  return {
    nodes: JSON.parse(JSON.stringify(nodes)),
    segments: JSON.parse(JSON.stringify(segments)),
  };
}

function convertSelectedNodeType({ nodes, segments, selectedNodeId, targetType, requiredConnectionCount, minConnectionCount, command, componentDataResolver }) {
  if (!selectedNodeId || !nodes[selectedNodeId]) {
    return { schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION, ok: false, command, nodes, segments, diagnostics: [diagnostic('error', 'NO_SELECTED_NODE', 'No node is selected or the selected node does not exist.', { selectedNodeId })], message: 'No selected node.', meta: {} };
  }
  const connectionIndex = buildConnectionIndex(segments);
  const connected = connectionIndex[selectedNodeId] || [];
  const count = connected.length;
  if (requiredConnectionCount !== undefined && count !== requiredConnectionCount) {
    return { schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION, ok: false, command, nodes, segments, diagnostics: [diagnostic('error', 'INVALID_CONNECTION_COUNT', `Node requires exactly ${requiredConnectionCount} connected segments; found ${count}.`, { selectedNodeId, count, required: requiredConnectionCount })], message: `Connection count mismatch.`, meta: {} };
  }
  if (minConnectionCount !== undefined && count < minConnectionCount) {
    return { schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION, ok: false, command, nodes, segments, diagnostics: [diagnostic('error', 'INSUFFICIENT_CONNECTION_COUNT', `Node requires at least ${minConnectionCount} connected segments; found ${count}.`, { selectedNodeId, count, min: minConnectionCount })], message: `Insufficient connections.`, meta: {} };
  }

  const { nodes: newNodes, segments: newSegments } = cloneGraph(nodes, segments);
  const node = newNodes[selectedNodeId];
  node.type = targetType;
  node.meta = node.meta || {};
  node.meta.convertedBy = command;

  let componentData = null;
  if (componentDataResolver) {
    componentData = componentDataResolver({ connected, selectedNodeId, node });
    node.meta.componentData = componentData;
  }

  const validation = validateSketchTopology(newNodes, newSegments);
  const componentDiagnostics = componentData?.diagnostics || [];

  return {
    schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION,
    ok: validation.ok,
    command,
    nodes: newNodes,
    segments: newSegments,
    diagnostics: [...validation.issues, ...componentDiagnostics],
    message: validation.ok ? `Node converted to ${targetType}.` : `Converted with topology issues.`,
    meta: { componentDataStatus: componentData?.status || null },
  };
}

export function convertSelectedNodeToBend({ nodes = {}, segments = [], selectedNodeId, componentDataResolver } = {}) {
  return convertSelectedNodeType({ nodes, segments, selectedNodeId, targetType: 'elbow', requiredConnectionCount: 2, command: 'CONVERT_BEND', componentDataResolver });
}

export function convertSelectedNodeToTee({ nodes = {}, segments = [], selectedNodeId, componentDataResolver } = {}) {
  return convertSelectedNodeType({ nodes, segments, selectedNodeId, targetType: 'tee', requiredConnectionCount: 3, command: 'CONVERT_TEE', componentDataResolver });
}

export function convertSelectedNodeToOlet({ nodes = {}, segments = [], selectedNodeId, componentDataResolver } = {}) {
  return convertSelectedNodeType({ nodes, segments, selectedNodeId, targetType: 'olet', minConnectionCount: 2, command: 'CONVERT_OLET', componentDataResolver });
}

export function autoConnectPipes({ nodes = {}, segments = [], toleranceMm = 1.0 } = {}) {
  const { nodes: newNodes, segments: newSegments } = cloneGraph(nodes, segments);
  const nodeIds = Object.keys(newNodes);
  const remap = {};
  let mergeCount = 0;

  for (let i = 0; i < nodeIds.length; i++) {
    for (let j = i + 1; j < nodeIds.length; j++) {
      const a = nodeIds[i];
      const b = nodeIds[j];
      if (remap[b] || remap[a]) continue;
      const pa = newNodes[a]?.pos;
      const pb = newNodes[b]?.pos;
      if (!pa || !pb) continue;
      const dist = Math.hypot(pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]);
      if (dist <= toleranceMm) {
        remap[b] = a;
        mergeCount++;
      }
    }
  }

  for (const seg of newSegments) {
    if (remap[seg.startNode]) seg.startNode = remap[seg.startNode];
    if (remap[seg.endNode]) seg.endNode = remap[seg.endNode];
  }

  const selfLoops = newSegments.filter(s => s.startNode === s.endNode);
  const cleanedSegments = newSegments.filter(s => s.startNode !== s.endNode);
  for (const b of Object.keys(remap)) delete newNodes[b];

  const validation = validateSketchTopology(newNodes, cleanedSegments);

  return {
    schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION,
    ok: true,
    command: 'AUTO_CONNECT_PIPES',
    nodes: newNodes,
    segments: cleanedSegments,
    diagnostics: [diagnostic('info', 'AUTO_CONNECT_PIPES', `Merged ${mergeCount} node pairs within ${toleranceMm}mm.`, { mergeCount, removedSelfLoops: selfLoops.length, remap }), ...validation.issues],
    message: `Auto-connected ${mergeCount} node pair(s).`,
    meta: { mergeCount, remap },
  };
}

export function validateSketchCommand({ nodes = {}, segments = [] } = {}) {
  const validation = validateSketchTopology(nodes, segments);
  return {
    schemaVersion: SKETCH_DRAFTING_COMMAND_SCHEMA_VERSION,
    ok: validation.ok,
    command: 'VALIDATE_TOPOLOGY',
    nodes,
    segments,
    diagnostics: validation.issues,
    message: validation.ok ? 'Topology valid.' : `Topology has ${validation.summary.errorCount} error(s).`,
    meta: { validationSummary: validation.summary },
  };
}
