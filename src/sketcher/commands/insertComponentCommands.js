import {
  createReducerComponent,
  createFlangeValveFlangeAssembly,
  validateComponentEngineeringData,
} from '../componentProperties/componentEngineeringModel.js';

export const INSERT_COMPONENT_COMMAND_SCHEMA_VERSION = 'insert-component-commands-v18f';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function normalizeNodes(nodes = {}) {
  return clone(nodes || {});
}

function normalizeSegments(segments = []) {
  return clone(segments || []);
}

function normalizeComponents(components = {}) {
  return clone(components || {});
}

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function posOf(nodes, id) {
  return nodes[id]?.pos || [0, 0, 0];
}

function distance(a = [0, 0, 0], b = [0, 0, 0]) {
  return Math.hypot(
    Number(b[0]) - Number(a[0]),
    Number(b[1]) - Number(a[1]),
    Number(b[2]) - Number(a[2]),
  );
}

function interpolate(a = [0, 0, 0], b = [0, 0, 0], t = 0.5) {
  return [
    Number(a[0]) + (Number(b[0]) - Number(a[0])) * t,
    Number(a[1]) + (Number(b[1]) - Number(a[1])) * t,
    Number(a[2]) + (Number(b[2]) - Number(a[2])) * t,
  ];
}

function nextId(prefix, existingIds = []) {
  let max = 0;
  for (const id of existingIds) {
    if (!String(id).startsWith(prefix)) continue;
    const n = Number.parseInt(String(id).slice(prefix.length), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function getExistingIds(nodes, segments, components) {
  return {
    nodeIds: Object.keys(nodes || {}),
    segmentIds: (segments || []).map((segment) => segment.id),
    componentIds: Object.keys(components || {}),
  };
}

function buildResult({
  ok,
  command,
  nodes,
  segments,
  components,
  diagnostics = [],
  selectedSegmentId = null,
  selectedNodeId = null,
  activeNodeId = null,
  message = '',
  meta = {},
}) {
  return {
    schemaVersion: INSERT_COMPONENT_COMMAND_SCHEMA_VERSION,
    ok,
    command,
    nodes,
    segments,
    components,
    diagnostics,
    selectedSegmentId,
    selectedNodeId,
    activeNodeId,
    message,
    meta,
  };
}

function pipeLikeSegment(base, id, startNode, endNode, overrides = {}) {
  return {
    ...base,
    ...overrides,
    id,
    startNode,
    endNode,
    type: overrides.type || base.type || base.properties?.type || 'PIPE',
    componentId: overrides.componentId ?? null,
    componentData: overrides.componentData ?? null,
    properties: {
      ...(base.properties || {}),
      ...(overrides.properties || {}),
      type: overrides.properties?.type || overrides.type || base.properties?.type || 'PIPE',
    },
  };
}

function splitSegmentForInlineComponent({
  nodes,
  segments,
  components,
  segmentId,
  component,
  componentLength_mm,
  insertionDistance_mm = null,
  componentNodeType,
}) {
  const diagnostics = [];
  const segment = segments.find((item) => item.id === segmentId);

  if (!segment) {
    return {
      ok: false,
      diagnostics: [diagnostic('error', 'INSERT_SEGMENT_MISSING', `Segment ${segmentId} not found.`, { segmentId })],
    };
  }

  const a = posOf(nodes, segment.startNode);
  const b = posOf(nodes, segment.endNode);
  const segLength = distance(a, b);
  const compLength = finite(componentLength_mm);

  if (compLength === null || compLength <= 0) {
    return {
      ok: false,
      diagnostics: [diagnostic('error', 'INSERT_COMPONENT_LENGTH_MISSING', `Component ${component.id} requires positive installed length.`, { componentId: component.id })],
    };
  }

  if (segLength <= compLength + 1) {
    return {
      ok: false,
      diagnostics: [diagnostic('error', 'INSERT_COMPONENT_TOO_LONG', `Component ${component.id} length exceeds selected segment length.`, { componentId: component.id, segmentId, segLength, compLength })],
    };
  }

  const startDistance = insertionDistance_mm !== null
    ? Math.max(0, Math.min(Number(insertionDistance_mm), segLength - compLength))
    : Math.max(0, (segLength - compLength) / 2);

  const t1 = startDistance / segLength;
  const t2 = (startDistance + compLength) / segLength;

  const existing = getExistingIds(nodes, segments, components);
  const compStartNode = nextId('N', existing.nodeIds);
  const compEndNode = nextId('N', [...existing.nodeIds, compStartNode]);
  const compSegmentId = nextId('CSEG-', existing.segmentIds);
  const leftSegmentId = nextId('S', existing.segmentIds);
  const rightSegmentId = nextId('S', [...existing.segmentIds, leftSegmentId]);

  const nextNodes = {
    ...nodes,
    [compStartNode]: {
      pos: interpolate(a, b, t1),
      type: componentNodeType || 'component',
      meta: {
        componentId: component.id,
        componentType: component.type,
        role: 'component-start',
      },
    },
    [compEndNode]: {
      pos: interpolate(a, b, t2),
      type: componentNodeType || 'component',
      meta: {
        componentId: component.id,
        componentType: component.type,
        role: 'component-end',
      },
    },
  };

  const remainingSegments = segments.filter((item) => item.id !== segmentId);
  const nextSegments = [
    ...remainingSegments,
    pipeLikeSegment(segment, leftSegmentId, segment.startNode, compStartNode, { componentId: null, componentData: null }),
    pipeLikeSegment(segment, compSegmentId, compStartNode, compEndNode, {
      type: component.type,
      componentId: component.id,
      componentData: component,
      properties: {
        ...(segment.properties || {}),
        type: component.type,
        componentId: component.id,
      },
    }),
    pipeLikeSegment(segment, rightSegmentId, compEndNode, segment.endNode, { componentId: null, componentData: null }),
  ];

  const nextComponents = {
    ...components,
    [component.id]: {
      ...component,
      startNode: compStartNode,
      endNode: compEndNode,
      segmentId: compSegmentId,
    },
  };

  return {
    ok: true,
    nodes: nextNodes,
    segments: nextSegments,
    components: nextComponents,
    diagnostics,
    selectedSegmentId: compSegmentId,
    activeNodeId: compEndNode,
    meta: {
      originalSegmentId: segmentId,
      componentId: component.id,
      componentSegmentId: compSegmentId,
      leftSegmentId,
      rightSegmentId,
      compStartNode,
      compEndNode,
    },
  };
}

export function insertFlangeValveFlangeOnSegment({
  nodes = {},
  segments = [],
  components = {},
  segmentId,
  componentInput = {},
  insertionDistance_mm = null,
} = {}) {
  const nextNodes = normalizeNodes(nodes);
  const nextSegmentsSource = normalizeSegments(segments);
  const nextComponentsSource = normalizeComponents(components);
  const existing = getExistingIds(nextNodes, nextSegmentsSource, nextComponentsSource);
  const componentId = componentInput.id || nextId('FVF-', existing.componentIds);

  const component = createFlangeValveFlangeAssembly({
    ...componentInput,
    id: componentId,
  });

  const validation = validateComponentEngineeringData(component);
  const diagnostics = [
    ...validation.diagnostics,
    ...(componentInput.diagnostics || []).map((item) => ({ ...item, source: item.source || 'component-input' })),
  ];

  if (!validation.ok) {
    return buildResult({
      ok: false,
      command: 'INSERT_FLANGE_VALVE_FLANGE',
      nodes: nextNodes,
      segments: nextSegmentsSource,
      components: nextComponentsSource,
      diagnostics,
      selectedSegmentId: segmentId,
      message: 'FVF component data is not qualified.',
    });
  }

  const split = splitSegmentForInlineComponent({
    nodes: nextNodes,
    segments: nextSegmentsSource,
    components: nextComponentsSource,
    segmentId,
    component,
    componentLength_mm: component.length_mm,
    insertionDistance_mm,
    componentNodeType: 'valve',
  });

  return buildResult({
    ok: split.ok,
    command: 'INSERT_FLANGE_VALVE_FLANGE',
    nodes: split.nodes || nextNodes,
    segments: split.segments || nextSegmentsSource,
    components: split.components || nextComponentsSource,
    diagnostics: [...diagnostics, ...(split.diagnostics || [])],
    selectedSegmentId: split.selectedSegmentId || segmentId,
    activeNodeId: split.activeNodeId || null,
    message: split.ok ? `Inserted FVF ${component.id}.` : 'FVF insertion failed.',
    meta: split.meta || {},
  });
}

export function insertReducerOnSegment({
  nodes = {},
  segments = [],
  components = {},
  segmentId,
  componentInput = {},
  insertionDistance_mm = null,
} = {}) {
  const nextNodes = normalizeNodes(nodes);
  const nextSegmentsSource = normalizeSegments(segments);
  const nextComponentsSource = normalizeComponents(components);
  const existing = getExistingIds(nextNodes, nextSegmentsSource, nextComponentsSource);
  const componentId = componentInput.id || nextId('RED-', existing.componentIds);

  const component = createReducerComponent({
    ...componentInput,
    id: componentId,
  });

  const validation = validateComponentEngineeringData(component);
  const diagnostics = [
    ...validation.diagnostics,
    ...(componentInput.diagnostics || []).map((item) => ({ ...item, source: item.source || 'component-input' })),
  ];

  if (!validation.ok) {
    return buildResult({
      ok: false,
      command: 'INSERT_REDUCER',
      nodes: nextNodes,
      segments: nextSegmentsSource,
      components: nextComponentsSource,
      diagnostics,
      selectedSegmentId: segmentId,
      message: 'Reducer component data is not qualified.',
    });
  }

  const split = splitSegmentForInlineComponent({
    nodes: nextNodes,
    segments: nextSegmentsSource,
    components: nextComponentsSource,
    segmentId,
    component,
    componentLength_mm: component.length_mm,
    insertionDistance_mm,
    componentNodeType: 'reducer',
  });

  return buildResult({
    ok: split.ok,
    command: 'INSERT_REDUCER',
    nodes: split.nodes || nextNodes,
    segments: split.segments || nextSegmentsSource,
    components: split.components || nextComponentsSource,
    diagnostics: [...diagnostics, ...(split.diagnostics || [])],
    selectedSegmentId: split.selectedSegmentId || segmentId,
    activeNodeId: split.activeNodeId || null,
    message: split.ok ? `Inserted reducer ${component.id}.` : 'Reducer insertion failed.',
    meta: split.meta || {},
  });
}

export function insertFlangeValveFlangeContinue({
  nodes = {},
  segments = [],
  components = {},
  startNodeId,
  direction = [1, 0, 0],
  componentInput = {},
} = {}) {
  const nextNodes = normalizeNodes(nodes);
  const nextSegments = normalizeSegments(segments);
  const nextComponents = normalizeComponents(components);

  if (!nextNodes[startNodeId]) {
    return buildResult({
      ok: false,
      command: 'INSERT_FLANGE_VALVE_FLANGE_CONTINUE',
      nodes: nextNodes,
      segments: nextSegments,
      components: nextComponents,
      diagnostics: [diagnostic('error', 'CONTINUE_START_NODE_MISSING', 'A start node is required to continue with FVF.', { startNodeId })],
    });
  }

  const existing = getExistingIds(nextNodes, nextSegments, nextComponents);
  const componentId = componentInput.id || nextId('FVF-', existing.componentIds);
  const component = createFlangeValveFlangeAssembly({ ...componentInput, id: componentId });
  const validation = validateComponentEngineeringData(component);

  if (!validation.ok) {
    return buildResult({
      ok: false,
      command: 'INSERT_FLANGE_VALVE_FLANGE_CONTINUE',
      nodes: nextNodes,
      segments: nextSegments,
      components: nextComponents,
      diagnostics: validation.diagnostics,
    });
  }

  const lengthMm = component.length_mm;
  const unit = Math.hypot(...direction) > 1e-9 ? direction.map((v) => Number(v) / Math.hypot(...direction)) : [1, 0, 0];
  const start = posOf(nextNodes, startNodeId);
  const end = [
    start[0] + unit[0] * lengthMm,
    start[1] + unit[1] * lengthMm,
    start[2] + unit[2] * lengthMm,
  ];

  const endNodeId = nextId('N', existing.nodeIds);
  const segmentId = nextId('CSEG-', existing.segmentIds);

  nextNodes[endNodeId] = {
    pos: end,
    type: 'valve',
    meta: {
      componentId: component.id,
      componentType: component.type,
      role: 'component-outlet',
    },
  };

  const nextComponent = {
    ...component,
    startNode: startNodeId,
    endNode: endNodeId,
    segmentId,
  };

  nextComponents[nextComponent.id] = nextComponent;
  nextSegments.push({
    id: segmentId,
    startNode: startNodeId,
    endNode: endNodeId,
    type: nextComponent.type,
    componentId: nextComponent.id,
    componentData: nextComponent,
    properties: {
      type: nextComponent.type,
      bore: nextComponent.dn,
      componentId: nextComponent.id,
    },
  });

  return buildResult({
    ok: true,
    command: 'INSERT_FLANGE_VALVE_FLANGE_CONTINUE',
    nodes: nextNodes,
    segments: nextSegments,
    components: nextComponents,
    diagnostics: validation.diagnostics,
    activeNodeId: endNodeId,
    selectedSegmentId: segmentId,
    message: `Inserted FVF ${nextComponent.id} while continuing geometry.`,
    meta: { componentId: nextComponent.id, endNodeId, segmentId },
  });
}
