import { validateSketchTopology, buildConnectionIndex } from '../../sketcher/topology/validateSketchTopology.js';

export const PCFX_ROUNDTRIP_SCHEMA_VERSION = 'pcfx-roundtrip-adapter-v1';
export const PCFX_VERSION = 'PCFX1-SCREENING-JSON';

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function connectionIndex(segments) {
  return buildConnectionIndex(segments);
}

function detectDuplicateIds(items, key = 'id') {
  const seen = new Set();
  return items.filter(item => {
    const id = item[key];
    if (seen.has(id)) return true;
    seen.add(id);
    return false;
  });
}

function normalizeSegment(seg) {
  return {
    ...seg,
    startNode: seg.startNode || seg.startNodeId,
    endNode: seg.endNode || seg.endNodeId,
  };
}

function canonicalNode(nodeId, node, connectedSegments = []) {
  const componentData = node.meta?.componentData || node.derived?.componentData || null;
  return {
    id: nodeId,
    type: node.type || 'free',
    pos: node.pos || [0, 0, 0],
    rawAttributes: node.rawAttributes || {},
    normalized: { nodeType: node.type || 'free', ...(node.normalized || {}) },
    derived: { componentData, convertedBy: node.meta?.convertedBy || null, connectionCount: connectedSegments.length, ...(node.derived || {}) },
    meta: node.meta || {},
  };
}

function canonicalSegment(seg) {
  return {
    id: seg.id,
    startNode: seg.startNode || seg.startNodeId,
    endNode: seg.endNode || seg.endNodeId,
    compType: seg.compType || null,
    properties: seg.properties || {},
    rawAttributes: seg.rawAttributes || {},
    normalized: { componentType: seg.compType || null, ...(seg.normalized || {}) },
    derived: seg.derived || {},
  };
}

function componentFromNode(nodeId, node, connectedSegments = []) {
  const type = String(node.type || '').toLowerCase();
  const componentTypeMap = { elbow: 'ELBOW', tee: 'TEE', olet: 'OLET', branch: 'BRANCH', valve: 'VALVE', flange: 'FLANGE' };
  const componentType = componentTypeMap[type];
  if (!componentType) return null;

  const componentData = node.meta?.componentData || node.derived?.componentData || null;
  return {
    id: `CMP-${nodeId}`,
    nodeId,
    componentType,
    connectedSegmentIds: connectedSegments.map(s => s.id),
    rawAttributes: node.rawAttributes || {},
    normalized: node.normalized || {},
    derived: { componentData, convertedBy: node.meta?.convertedBy || null, connectionCount: connectedSegments.length },
    meta: node.meta || {},
  };
}

export function exportSketchGraphToPCFX({ nodes = {}, segments = [], project = {}, units = {} } = {}) {
  const normalizedSegs = segments.map(normalizeSegment);
  const connIdx = connectionIndex(normalizedSegs);
  const validation = validateSketchTopology(nodes, normalizedSegs);
  const diagnostics = [];
  const lossContract = [];

  const pcfxNodes = {};
  const components = [];
  const graphTranslatorComponents = [];

  for (const [nodeId, node] of Object.entries(nodes)) {
    const connected = connIdx[nodeId] || [];
    pcfxNodes[nodeId] = canonicalNode(nodeId, node, connected);

    const comp = componentFromNode(nodeId, node, connected);
    if (comp) {
      components.push(comp);
      // Check loss contract
      const cdStatus = comp.derived?.componentData?.status;
      if (cdStatus === 'MISSING_COMPONENT_DATA' || cdStatus === 'NOT_QUALIFIED') {
        lossContract.push({ code: 'COMPONENT_DATA_NOT_QUALIFIED', severity: 'warn', componentId: comp.id, status: cdStatus });
      }
    }
  }

  const pcfxSegments = normalizedSegs.map(canonicalSegment);

  return {
    schemaVersion: PCFX_ROUNDTRIP_SCHEMA_VERSION,
    pcfxVersion: PCFX_VERSION,
    project: { id: 'SIMPLIFIED_ANALYSIS_SKETCH', name: 'Simplified Analysis Sketch', ...project },
    units: { length: 'mm', ...units },
    nodes: pcfxNodes,
    segments: pcfxSegments,
    components,
    graphTranslatorComponents,
    diagnostics: [...diagnostics, ...validation.issues],
    lossContract,
    rawAttributes: {},
    normalized: {},
    derived: {},
  };
}

export function importPCFXToSketchGraph(pcfx = {}) {
  const diagnostics = [];
  if (pcfx.schemaVersion && pcfx.schemaVersion !== PCFX_ROUNDTRIP_SCHEMA_VERSION) {
    diagnostics.push(diagnostic('warn', 'SCHEMA_VERSION_MISMATCH', `Expected ${PCFX_ROUNDTRIP_SCHEMA_VERSION}, got ${pcfx.schemaVersion}`));
  }

  const nodes = {};
  for (const [nodeId, node] of Object.entries(pcfx.nodes || {})) {
    // Find matching component
    const comp = (pcfx.components || []).find(c => c.nodeId === nodeId);
    nodes[nodeId] = {
      type: node.type,
      pos: node.pos || [0, 0, 0],
      rawAttributes: node.rawAttributes || {},
      normalized: node.normalized || {},
      derived: { ...(node.derived || {}), pcfxComponent: comp || null },
      meta: {
        ...(node.meta || {}),
        componentData: comp?.derived?.componentData || node.derived?.componentData || null,
        convertedBy: comp?.derived?.convertedBy || node.derived?.convertedBy || null,
      },
    };
  }

  const segments = (pcfx.segments || []).map(seg => ({
    id: seg.id,
    startNode: seg.startNode,
    endNode: seg.endNode,
    compType: seg.compType,
    properties: seg.properties || {},
    rawAttributes: seg.rawAttributes || {},
    normalized: seg.normalized || {},
    derived: seg.derived || {},
  }));

  const validation = validateSketchTopology(nodes, segments);

  return {
    nodes,
    segments,
    diagnostics: [...diagnostics, ...validation.issues],
    lossContract: pcfx.lossContract || [],
    validation,
    rawAttributes: pcfx.rawAttributes || {},
    normalized: pcfx.normalized || {},
    derived: pcfx.derived || {},
  };
}

export function validatePCFXRoundtrip(original, imported) {
  const errors = [];

  // Check for duplicate segment IDs
  const dupSegs = detectDuplicateIds(imported.segments || []);
  if (dupSegs.length > 0) {
    errors.push(diagnostic('error', 'DUPLICATE_SEGMENT_IDS', `Duplicate segment IDs after roundtrip: ${dupSegs.map(s => s.id).join(', ')}`));
  }

  // Check fitting nodes preserved
  for (const [nodeId, node] of Object.entries(original.nodes || {})) {
    const type = String(node.type || '').toLowerCase();
    if (['elbow', 'tee', 'olet', 'branch', 'valve', 'flange'].includes(type)) {
      const importedNode = (imported.nodes || {})[nodeId];
      if (!importedNode) {
        errors.push(diagnostic('error', 'FITTING_NODE_MISSING_AFTER_ROUNDTRIP', `Fitting node ${nodeId} missing after roundtrip.`, { nodeId }));
      } else if (importedNode.type !== node.type) {
        errors.push(diagnostic('error', 'FITTING_TYPE_CHANGED_AFTER_ROUNDTRIP', `Fitting node ${nodeId} type changed from ${node.type} to ${importedNode.type}.`, { nodeId }));
      }
    }
  }

  // Check self-loop segments
  for (const seg of (imported.segments || [])) {
    if (seg.startNode === seg.endNode) {
      errors.push(diagnostic('error', 'SELF_LOOP_SEGMENTS_AFTER_ROUNDTRIP', `Self-loop segment ${seg.id} after roundtrip.`, { segId: seg.id }));
    }
  }

  return { ok: errors.length === 0, errors };
}
