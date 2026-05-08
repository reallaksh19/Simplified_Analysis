import { validateSketchTopology, buildConnectionIndex } from '../../../sketcher/topology/validateSketchTopology.js';
import { classifyTeeMainBranch } from '../../../sketcher/topology/classifyTeeMainBranch.js';

export const SOLVER_TOPOLOGY_SCHEMA_VERSION = 'solver-topology-classification-v1';

export const SOLVER_TOPOLOGY_TYPE = Object.freeze({
  EMPTY: 'EMPTY',
  GC3D_SUPPORTED_ROUTE: 'GC3D_SUPPORTED_ROUTE',
  BRANCH_ROUTE: 'BRANCH_ROUTE',
  UNSUPPORTED_MIXED_TOPOLOGY: 'UNSUPPORTED_MIXED_TOPOLOGY',
  INVALID_TOPOLOGY: 'INVALID_TOPOLOGY',
});

function normalizeNodes(nodesInput) {
  if (!nodesInput) return {};
  if (Array.isArray(nodesInput)) {
    return nodesInput.reduce((acc, n) => { acc[n.id] = n; return acc; }, {});
  }
  return nodesInput;
}

function normalizeSegments(segsInput) {
  if (!Array.isArray(segsInput)) return [];
  return segsInput.map(s => ({
    ...s,
    startNode: s.startNode || s.startNodeId,
    endNode: s.endNode || s.endNodeId,
  }));
}

function isBranchNode(node) {
  const t = String(node.type || '').toLowerCase();
  return t === 'tee' || t === 'branch' || t === 'olet';
}

function isBranchSegment(seg) {
  const t = String(seg.compType || seg.properties?.type || '').toUpperCase();
  return t === 'TEE' || t === 'BRANCH' || t === 'OLET';
}

export function classifySolverTopology(payload = {}) {
  const nodes = normalizeNodes(payload.nodes);
  const segments = normalizeSegments(payload.segments);

  if (Object.keys(nodes).length === 0 && segments.length === 0) {
    return { schemaVersion: SOLVER_TOPOLOGY_SCHEMA_VERSION, topologyType: SOLVER_TOPOLOGY_TYPE.EMPTY, route: 'NONE', canRunGC3D: false, canRunBranchScreening: false, branchDetails: [], diagnostics: [] };
  }

  const validation = validateSketchTopology(nodes, segments);
  if (!validation.ok) {
    return { schemaVersion: SOLVER_TOPOLOGY_SCHEMA_VERSION, topologyType: SOLVER_TOPOLOGY_TYPE.INVALID_TOPOLOGY, route: 'BLOCKED', canRunGC3D: false, canRunBranchScreening: false, branchDetails: [], diagnostics: validation.issues };
  }

  const connectionIndex = buildConnectionIndex(segments);
  const branchNodeEntries = Object.entries(nodes).filter(([, n]) => isBranchNode(n));
  const hasBranchSegment = segments.some(isBranchSegment);

  if (branchNodeEntries.length === 0 && !hasBranchSegment) {
    return { schemaVersion: SOLVER_TOPOLOGY_SCHEMA_VERSION, topologyType: SOLVER_TOPOLOGY_TYPE.GC3D_SUPPORTED_ROUTE, route: 'GC3D', canRunGC3D: true, canRunBranchScreening: false, branchDetails: [], diagnostics: [] };
  }

  const branchDetails = branchNodeEntries.map(([nodeId, node]) => {
    const connected = connectionIndex[nodeId] || [];
    const t = String(node.type || '').toLowerCase();
    let mainSegmentIds = [];
    let branchSegmentId = null;
    let colinearityScore = null;

    if (t === 'tee' && connected.length === 3) {
      const classification = classifyTeeMainBranch(nodes, nodeId, connected);
      if (classification.ok) {
        mainSegmentIds = classification.main.map(s => s.id);
        branchSegmentId = classification.branch?.id || null;
        colinearityScore = classification.colinearityScore;
      }
    } else {
      mainSegmentIds = connected.slice(0, 2).map(s => s.id);
      branchSegmentId = connected[2]?.id || null;
    }

    return { branchNodeId: nodeId, branchType: node.type, mainSegmentIds, branchSegmentId, colinearityScore, connectionCount: connected.length };
  });

  return { schemaVersion: SOLVER_TOPOLOGY_SCHEMA_VERSION, topologyType: SOLVER_TOPOLOGY_TYPE.BRANCH_ROUTE, route: 'BRANCH_SCREENING', canRunGC3D: false, canRunBranchScreening: true, branchDetails, diagnostics: [] };
}
