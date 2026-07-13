import { connectedPipeComponent } from './analysis-connectivity.js';
import { freezeDeep, stringValue } from './dataset-utils.js';

const PIPE_REFERENCE_KEYS = [
  'PIPE_ID',
  'PARENT_PIPE_ID',
  'SOURCE_PIPE_ID',
  'OWNER_PIPE_ID',
];

const LINE_KEYS = ['LINE_NO', 'LINENO', 'LINE_NUMBER', 'LINE_ID', 'LINE'];

export function createAnalysisContext(workspaceState, targetId) {
  const snapshot = workspaceState.getSnapshot();
  const entity = workspaceState.getEntity(targetId);
  if (snapshot.status !== 'ready' || !snapshot.dataset || !entity) {
    throw new Error(`Analysis target is not available in the active dataset: ${targetId}.`);
  }
  return freezeDeep({
    targetId: entity.entityId,
    entity,
    dataset: snapshot.dataset,
    selectedEntityId: snapshot.selectedEntityId,
    version: snapshot.version,
  });
}

export function resolvePipeEntity(context) {
  if (context.entity.category === 'pipe') return context.entity;
  if (context.entity.category !== 'support') return null;

  const explicitId = firstString(context.entity, PIPE_REFERENCE_KEYS);
  if (explicitId) {
    const explicit = context.dataset.entities.find((entity) => (
      entity.category === 'pipe' && entity.entityId === explicitId
    ));
    if (explicit) return explicit;
  }

  const lineKey = resolveLineKey(context.entity);
  if (!lineKey) return null;
  const candidates = context.dataset.entities.filter((entity) => (
    entity.category === 'pipe' && resolveLineKey(entity) === lineKey
  ));
  return candidates.length === 1 ? candidates[0] : null;
}

export function toSupportLoadSource(pipeEntity) {
  const properties = pipeEntity.properties || {};
  const geometry = properties.geometry || {};
  const nativeParams = properties.nativeParams || {};
  return freezeDeep({
    id: pipeEntity.entityId,
    name: pipeEntity.name,
    type: pipeEntity.entityType,
    sourcePath: pipeEntity.sourcePath,
    sourceAttributes: properties.sourceAttributes || {},
    attributes: properties.attributes || {},
    enrichedAttributes: properties.enrichedAttributes || {},
    nativeParams,
    apos: geometry.start || nativeParams.startPoint || null,
    lpos: geometry.end || nativeParams.endPoint || null,
    center: geometry.center || nativeParams.center || null,
  });
}

export function buildPipeScreeningInput(context) {
  if (context.entity.category !== 'pipe') {
    return disabledScreening('Pipe flexibility screening requires a selected pipe.');
  }

  const lineKey = resolveLineKey(context.entity);
  if (!lineKey) {
    return disabledScreening('Pipe flexibility screening requires an explicit line identity.', ['lineIdentity']);
  }
  const candidates = context.dataset.entities.filter((entity) => (
    entity.category === 'pipe'
    && resolveLineKey(entity) === lineKey
    && entity.properties?.geometry?.start
    && entity.properties?.geometry?.end
  ));
  const lineEntities = connectedPipeComponent(context.entity, candidates);
  if (lineEntities.length < 2) {
    return disabledScreening(
      'At least two connected pipe legs on the selected line are required.',
      ['connectedLineSegments'],
    );
  }

  const projected = projectLineEntities(lineEntities);
  const params = {
    deltaT: explicitDeltaT(context.entity),
    alpha: firstNumber(context.entity, [
      'ALPHA', 'ALPHA_PER_C', 'THERMAL_EXPANSION_COEFFICIENT', 'THERMAL_EXPANSION_COEFF',
    ]),
    E: firstNumber(context.entity, [
      'E_MPA', 'ELASTIC_MODULUS_MPA', 'YOUNGS_MODULUS_MPA', 'ELASTIC_MODULUS',
    ]),
    od: firstNumber(context.entity, [
      'PIPE_OD', 'PIPEOD', 'OD_MM', 'OUTSIDE_DIAMETER_MM', 'OUTSIDE_DIAMETER', 'OD',
    ]),
    Sa: firstNumber(context.entity, [
      'SA_MPA', 'ALLOWABLE_STRESS_MPA', 'ALLOWABLE_STRESS', 'SA',
    ]),
  };
  const missing = Object.entries(params)
    .filter(([, value]) => !Number.isFinite(value) || value <= 0)
    .map(([field]) => field);
  if (missing.length) {
    return disabledScreening(
      `Explicit engineering inputs are missing: ${missing.join(', ')}.`,
      missing,
    );
  }

  return freezeDeep({
    enabled: true,
    reason: '',
    missing: [],
    lineKey,
    input: {
      nodes: projected.nodes,
      segments: projected.segments,
      warnings: [],
      diagnostics: [],
    },
    params,
    sourceEntityIds: lineEntities.map((entity) => entity.entityId),
    projectionAxes: projected.axes,
  });
}

export function resolveLineKey(entity) {
  const explicit = firstString(entity, LINE_KEYS);
  if (explicit) return `LINE:${explicit.toUpperCase()}`;
  const path = stringValue(entity.sourcePath);
  if (!path) return '';
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 1) return `PATH:${path}`;
  return `PATH:/${parts.slice(0, -1).join('/')}`;
}

export function firstNumber(entity, aliases) {
  const value = firstValue(entity, aliases);
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function firstString(entity, aliases) {
  const value = firstValue(entity, aliases);
  return stringValue(value);
}

function firstValue(entity, aliases) {
  const wanted = new Set(aliases.map(normalizeKey));
  const roots = [
    entity.properties?.sourceAttributes,
    entity.properties?.attributes,
    entity.properties?.enrichedAttributes,
    entity.properties?.nativeParams,
  ];
  for (const root of roots) {
    const match = findValue(root, wanted, 0);
    if (match.found) return match.value;
  }
  return null;
}

function findValue(value, wanted, depth) {
  if (!value || typeof value !== 'object' || depth > 5) return { found: false };
  for (const [key, child] of Object.entries(value)) {
    if (wanted.has(normalizeKey(key))) return { found: true, value: child };
  }
  for (const child of Object.values(value)) {
    const nested = findValue(child, wanted, depth + 1);
    if (nested.found) return nested;
  }
  return { found: false };
}

function explicitDeltaT(entity) {
  const direct = firstNumber(entity, ['DELTA_T', 'DELTAT', 'TEMPERATURE_DIFFERENCE_C']);
  if (direct !== null) return direct;
  const operating = firstNumber(entity, ['TEMP_EXP_C1', 'TEMP_C1', 'T1', 'OPERATING_TEMPERATURE_C']);
  const reference = firstNumber(entity, ['REFERENCE_TEMP_C', 'TREF', 'AMBIENT_TEMP_C']);
  if (operating === null || reference === null) return null;
  return Math.abs(operating - reference);
}

function projectLineEntities(entities) {
  const allPoints = entities.flatMap((entity) => [
    entity.properties.geometry.start,
    entity.properties.geometry.end,
  ]);
  const spans = ['x', 'y', 'z'].map((axis) => ({
    axis,
    span: Math.max(...allPoints.map((point) => point[axis]))
      - Math.min(...allPoints.map((point) => point[axis])),
  })).sort((a, b) => b.span - a.span);
  const axes = spans.slice(0, 2).map((entry) => entry.axis);
  const nodes = {};
  const segments = entities.map((entity) => {
    const startId = `${entity.entityId}:start`;
    const endId = `${entity.entityId}:end`;
    const start = entity.properties.geometry.start;
    const end = entity.properties.geometry.end;
    nodes[startId] = { pos: [start[axes[0]], start[axes[1]], 0] };
    nodes[endId] = { pos: [end[axes[0]], end[axes[1]], 0] };
    return {
      id: entity.entityId,
      start: startId,
      end: endId,
      trueLength: Math.hypot(end.x - start.x, end.y - start.y, end.z - start.z),
    };
  });
  return freezeDeep({ axes, nodes, segments });
}

function disabledScreening(reason, missing = []) {
  return freezeDeep({ enabled: false, reason, missing, input: null, params: null });
}

function normalizeKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toUpperCase();
}
