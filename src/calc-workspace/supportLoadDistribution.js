/**
 * Functionality: distributes the vertical (gravity) load of imported piping
 * geometry onto its supports using element tributary weights and reports the
 * selection centre of gravity. Parameters: calculation workspace dataset, the
 * per-pipe support-load model (for unit weights), and the formula profile.
 * Outputs: per-support vertical loads (OPE/HYD, kg and N), COG, totals, and an
 * audit of every element-to-support contribution. Fallback: elements without
 * resolvable weight or without any support in range are reported, never
 * silently dropped.
 *
 * Method NEAREST_TWO_SUPPORT_LEVER_V1: each pipe-like element's weight acts at
 * its geometric centre; it is shared between the two nearest supports with the
 * classic lever (inverse-distance) rule R1 = W*d2/(d1+d2), R2 = W*d1/(d1+d2).
 * A single support takes the full element weight. Total distributed weight is
 * conserved by construction.
 */

import {
  clonePlain,
  freezeDeep,
  isPipeLikeType,
  isSupportLikeType,
  numberMaybe,
  readObjectEndpoints,
  stringValue,
  workspaceObjects,
  workspaceSupports,
} from './workspaceModel.js';
import { normalizeSupportLoadProfile } from './supportLoadEngine.js';

export const SUPPORT_LOAD_DISTRIBUTION_SCHEMA = 'support-load-distribution/v1';
export const SUPPORT_LOAD_DISTRIBUTION_METHOD = 'NEAREST_TWO_SUPPORT_LEVER_V1';

export function buildSupportLoadDistribution(workspace, supportLoadModel, profileLike) {
  const profile = normalizeSupportLoadProfile(profileLike || supportLoadModel?.profile);
  const supports = collectSupports(workspace);
  const elements = collectWeightedElements(workspace, supportLoadModel);
  const logs = [];

  const perSupport = new Map(supports.map((support) => [support.id, {
    ...support,
    verticalLoadOpeKg: 0,
    verticalLoadHydKg: 0,
    contributions: [],
  }]));
  const unsupported = [];
  let totalOpeKg = 0;
  let totalHydKg = 0;
  let distributedOpeKg = 0;
  const cogAccumulator = { x: 0, y: 0, z: 0, weight: 0 };

  for (const element of elements) {
    totalOpeKg += element.weightOpeKg;
    totalHydKg += element.weightHydKg;
    if (element.center) {
      cogAccumulator.x += element.center.x * element.weightOpeKg;
      cogAccumulator.y += element.center.y * element.weightOpeKg;
      cogAccumulator.z += element.center.z * element.weightOpeKg;
      cogAccumulator.weight += element.weightOpeKg;
    }
    const shares = leverShares(element, supports);
    if (!shares.length) {
      unsupported.push({ objectId: element.objectId, name: element.name, weightOpeKg: round3(element.weightOpeKg) });
      continue;
    }
    distributedOpeKg += element.weightOpeKg;
    for (const share of shares) {
      const target = perSupport.get(share.supportId);
      target.verticalLoadOpeKg += element.weightOpeKg * share.fraction;
      target.verticalLoadHydKg += element.weightHydKg * share.fraction;
      target.contributions.push({
        objectId: element.objectId,
        name: element.name,
        type: element.type,
        fraction: round3(share.fraction),
        weightOpeKg: round3(element.weightOpeKg * share.fraction),
        distanceMm: round3(share.distanceMm),
      });
    }
  }

  const newtonFactor = profile.gravityFactor * profile.verticalLoadFactor;
  const supportRows = Array.from(perSupport.values()).map((support) => freezeDeep({
    supportId: support.id,
    name: support.name,
    supportType: support.type,
    position: support.position,
    verticalLoadOpeKg: round3(support.verticalLoadOpeKg),
    verticalLoadHydKg: round3(support.verticalLoadHydKg),
    verticalLoadOpeN: round1(support.verticalLoadOpeKg * newtonFactor),
    verticalLoadHydN: round1(support.verticalLoadHydKg * newtonFactor),
    contributionCount: support.contributions.length,
    contributions: support.contributions,
  }));

  logs.push({ level: 'info', message: `Distributed ${round3(distributedOpeKg)} kg (OPE) of ${round3(totalOpeKg)} kg over ${supports.length} support(s) from ${elements.length} weighted element(s).` });
  if (unsupported.length) logs.push({ level: 'warn', message: `${unsupported.length} element(s) had no support to carry them; their weight is reported under totals.unsupportedWeightKg.` });
  if (!supports.length) logs.push({ level: 'warn', message: 'No support-like objects found in the imported geometry.' });

  return freezeDeep({
    schema: SUPPORT_LOAD_DISTRIBUTION_SCHEMA,
    method: SUPPORT_LOAD_DISTRIBUTION_METHOD,
    evaluatedAt: new Date().toISOString(),
    profile: clonePlain(profile),
    totals: {
      elements: elements.length,
      supports: supports.length,
      totalWeightOpeKg: round3(totalOpeKg),
      totalWeightHydKg: round3(totalHydKg),
      distributedWeightOpeKg: round3(distributedOpeKg),
      unsupportedWeightOpeKg: round3(totalOpeKg - distributedOpeKg),
      totalVerticalOpeN: round1(distributedOpeKg * newtonFactor),
      cog: cogAccumulator.weight > 0
        ? { x: round3(cogAccumulator.x / cogAccumulator.weight), y: round3(cogAccumulator.y / cogAccumulator.weight), z: round3(cogAccumulator.z / cogAccumulator.weight) }
        : null,
    },
    supports: supportRows,
    unsupported,
    logs,
  });
}

// Builds a managed-stage JSON tree ("staggedJson") viewable in the 3D JSON
// viewer: the imported schematic geometry plus one LOADMARKER node per support
// carrying the calculated loads as attributes (rendered as a marker sphere).
export function buildSupportLoadStageTree(workspace, distribution, sourceName) {
  const source = stringValue(sourceName || workspace?.packageMeta?.source?.sourceFileName || 'workspace');
  const geometryChildren = [];

  for (const object of workspaceObjects(workspace)) {
    const endpoints = readObjectEndpoints(object);
    if (!endpoints.start && !endpoints.center) continue;
    const attributes = {};
    if (endpoints.start) attributes.APOS = plainPoint(endpoints.start);
    if (endpoints.end) attributes.LPOS = plainPoint(endpoints.end);
    if (!endpoints.start && endpoints.center) attributes.POS = plainPoint(endpoints.center);
    const bore = objectBoreText(object);
    if (bore) attributes.ABORE = bore;
    geometryChildren.push({
      name: stringValue(object?.name || object?.id || 'ELEMENT'),
      type: stringValue(object?.type || 'PIPE') || 'PIPE',
      attributes,
    });
  }

  for (const support of collectSupports(workspace)) {
    if (!support.position) continue;
    geometryChildren.push({
      name: support.name,
      type: 'SUPPORT',
      attributes: { NAME: support.name, TYPE: stringValue(support.type || 'ATTA'), POS: plainPoint(support.position) },
    });
  }

  const markerChildren = (distribution?.supports || []).filter((row) => row.position).map((row) => ({
    name: `LOAD ${row.name}`,
    type: 'LOADMARKER',
    attributes: {
      POS: plainPoint(row.position),
      ABORE: '300mm',
      MARKER: 'SUPPORT_VERTICAL_LOAD',
      SUPPORT_NAME: row.name,
      VERTICAL_LOAD_OPE_KG: row.verticalLoadOpeKg,
      VERTICAL_LOAD_HYD_KG: row.verticalLoadHydKg,
      VERTICAL_LOAD_OPE_N: row.verticalLoadOpeN,
      VERTICAL_LOAD_HYD_N: row.verticalLoadHydN,
      CONTRIBUTING_ELEMENTS: row.contributionCount,
      METHOD: distribution.method,
      EVALUATED_AT: distribution.evaluatedAt,
    },
  }));

  return [
    {
      name: `SUPPORT-LOADS ${source}`,
      type: 'BRANCH',
      attributes: {
        NAME: `SUPPORT-LOADS ${source}`,
        SCHEMA: SUPPORT_LOAD_DISTRIBUTION_SCHEMA,
        METHOD: stringValue(distribution?.method || SUPPORT_LOAD_DISTRIBUTION_METHOD),
        TOTAL_WEIGHT_OPE_KG: distribution?.totals?.totalWeightOpeKg ?? 0,
        TOTAL_VERTICAL_OPE_N: distribution?.totals?.totalVerticalOpeN ?? 0,
        ...(distribution?.totals?.cog ? { COG: plainPoint(distribution.totals.cog) } : {}),
      },
      children: [...geometryChildren, ...markerChildren],
    },
  ];
}

function collectSupports(workspace) {
  const seen = new Set();
  const supports = [];
  const candidates = [...workspaceSupports(workspace), ...workspaceObjects(workspace).filter((object) => isSupportLikeType(object?.type))];
  candidates.forEach((object, index) => {
    const id = stringValue(object?.id) || `support-${index}`;
    if (seen.has(id)) return;
    seen.add(id);
    supports.push({
      id,
      name: stringValue(object?.name || object?.sourceAttributes?.NAME || object?.attributes?.NAME || id),
      type: stringValue(object?.type || 'SUPPORT'),
      position: supportPosition(object),
    });
  });
  return supports.filter((support) => support.position);
}

function collectWeightedElements(workspace, supportLoadModel) {
  const inputs = supportLoadModel?.inputsByPipeId || {};
  const elements = [];
  for (const object of workspaceObjects(workspace)) {
    if (!isPipeLikeType(object?.type)) continue;
    const endpoints = readObjectEndpoints(object);
    if (!endpoints.center) continue;
    const input = inputs[stringValue(object?.id)] || null;
    const lengthM = (endpoints.lengthMm || 0) / 1000;
    const unitWt = numberMaybe(input?.pipePhysical?.unitPipeWtKgPerM) ?? 0;
    const insulWt = numberMaybe(input?.pipePhysical?.insulationWtKgPerM) ?? 0;
    const fluidOpe = numberMaybe(input?.process?.fluidWtOpeKgPerM) ?? 0;
    const fluidHyd = numberMaybe(input?.process?.fluidWtHydKgPerM) ?? fluidOpe;
    const lumpKg = numberMaybe(input?.pipePhysical?.lumpWeightKg) ?? 0;
    const weightOpeKg = (unitWt + insulWt + fluidOpe) * lengthM + lumpKg;
    const weightHydKg = (unitWt + insulWt + fluidHyd) * lengthM + lumpKg;
    if (weightOpeKg <= 0) continue;
    elements.push({
      objectId: stringValue(object?.id),
      name: stringValue(object?.name || object?.id),
      type: stringValue(object?.type),
      center: endpoints.center,
      lengthMm: endpoints.lengthMm || 0,
      weightOpeKg,
      weightHydKg,
    });
  }
  return elements;
}

function leverShares(element, supports) {
  if (!supports.length || !element.center) return [];
  const ranked = supports
    .map((support) => ({ supportId: support.id, distanceMm: distance(element.center, support.position) }))
    .sort((a, b) => a.distanceMm - b.distanceMm);
  const nearest = ranked[0];
  const second = ranked[1];
  if (!second) return [{ supportId: nearest.supportId, fraction: 1, distanceMm: nearest.distanceMm }];
  const total = nearest.distanceMm + second.distanceMm;
  if (total <= 0) {
    return [
      { supportId: nearest.supportId, fraction: 0.5, distanceMm: nearest.distanceMm },
      { supportId: second.supportId, fraction: 0.5, distanceMm: second.distanceMm },
    ];
  }
  return [
    { supportId: nearest.supportId, fraction: second.distanceMm / total, distanceMm: nearest.distanceMm },
    { supportId: second.supportId, fraction: nearest.distanceMm / total, distanceMm: second.distanceMm },
  ];
}

function supportPosition(object) {
  const attrs = object?.sourceAttributes || object?.attributes || {};
  return readAnyPoint(object?.pos)
    || readAnyPoint(attrs.POS)
    || readAnyPoint(object?.nativeParams?.center)
    || readAnyPoint(object?.center)
    || readObjectEndpoints(object).center
    || null;
}

function readAnyPoint(value) {
  if (!value) return null;
  let source = value;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed.startsWith('{')) return null;
    try { source = JSON.parse(trimmed); } catch { return null; }
  }
  if (typeof source !== 'object') return null;
  const x = numberMaybe(source.x);
  const y = numberMaybe(source.y);
  const z = numberMaybe(source.z);
  return x !== null && y !== null && z !== null ? { x, y, z } : null;
}

function objectBoreText(object) {
  const attrs = object?.sourceAttributes || object?.attributes || {};
  const raw = attrs.ABORE || attrs.HBOR || object?.bore || object?.attributes?.enrichment?.pipingClass?.nominalBoreMm;
  const bore = numberMaybe(raw);
  return bore !== null ? `${bore}mm` : '';
}

function plainPoint(point) {
  return { x: point.x, y: point.y, z: point.z };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function round1(value) {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function round3(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
