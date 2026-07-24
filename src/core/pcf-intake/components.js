import { deepFreeze, semanticHash, stringValue } from '../shared-piping-model/index.js';
import { PCF_COMPONENT_TYPES, PCF_REVIEW_ONLY_TYPES } from './constants.js';
import { pcfDiagnostic } from './diagnostics.js';

const COMPONENT_TYPE_SET = new Set(PCF_COMPONENT_TYPES);
const REVIEW_ONLY_SET = new Set(PCF_REVIEW_ONLY_TYPES);

export function locatePcfComponents(sourceText) {
  const rows = [];
  let current = null;
  sourceText.split('\n').forEach((sourceLine, index) => {
    const line = sourceLine.trim();
    if (COMPONENT_TYPE_SET.has(line)) {
      if (current) rows.push(deepFreeze(current));
      current = { type: line, startLine: index + 1, endLine: index + 1, rawLines: [sourceLine] };
    } else if (current) {
      current.endLine = index + 1;
      current.rawLines.push(sourceLine);
    }
  });
  if (current) rows.push(deepFreeze(current));
  return rows;
}

export function normalizePcfComponents(parsedComponents, lineEvidence, units, diagnostics) {
  const coordinateScale = units.coordinate?.scaleToMm || null;
  const boreScale = units.bore?.scaleToMm || coordinateScale;
  return deepFreeze(parsedComponents.map((component, index) => {
    const line = lineEvidence[index] || { startLine: null, endLine: null, rawLines: component.rawLines || [] };
    const raw = normalizeComponent(component, 1, 1);
    const millimetres = coordinateScale ? normalizeComponent(component, coordinateScale, boreScale || coordinateScale) : null;
    const componentId = `pcf-component:${semanticHash(componentSemantic(component, coordinateScale, boreScale)).split(':').at(-1)}`;
    const adoptionMode = REVIEW_ONLY_SET.has(raw.type) ? 'REVIEW_ONLY' : 'MODEL';
    if (adoptionMode === 'REVIEW_ONLY') diagnostics.push(pcfDiagnostic('WARNING', 'PCF_COMPONENT_REVIEW_ONLY', `${raw.type} is retained for review but excluded from Workspace adoption.`, { componentId, lineNumber: line.startLine }));
    return deepFreeze({
      componentId, sourceIndex: index, sourceLineStart: line.startLine, sourceLineEnd: line.endLine,
      rawLines: deepFreeze([...(line.rawLines || component.rawLines || [])]), type: raw.type,
      points: raw.points, centrePoint: raw.centrePoint, branchPoints: raw.branchPoints,
      coOrds: raw.coOrds, bore: raw.bore, pointsMm: millimetres?.points || [],
      centrePointMm: millimetres?.centrePoint || null, branchPointsMm: millimetres?.branchPoints || [],
      coOrdsMm: millimetres?.coOrds || null, boreMm: millimetres?.bore || null,
      attributes: raw.attributes, adoptionMode,
    });
  }));
}

export function addPcfComponentDiagnostics(components, diagnostics) {
  const groups = new Map();
  components.forEach((row) => { if (!groups.has(row.componentId)) groups.set(row.componentId, []); groups.get(row.componentId).push(row); });
  groups.forEach((rows, componentId) => {
    if (rows.length > 1) diagnostics.push(pcfDiagnostic('ERROR', 'PCF_DUPLICATE_CANONICAL_IDENTITY', `Canonical component identity ${componentId} occurs ${rows.length} times.`, { componentId, lineNumbers: rows.map((row) => row.sourceLineStart) }));
  });
  components.filter((row) => row.adoptionMode === 'MODEL').forEach((row) => {
    if (hasRequiredGeometry(row)) return;
    diagnostics.push(pcfDiagnostic('ERROR', 'PCF_REQUIRED_GEOMETRY_MISSING', `${row.type} is missing required endpoint or branch evidence.`, { componentId: row.componentId, lineNumber: row.sourceLineStart }));
  });
}

function hasRequiredGeometry(row) {
  const hasAnyPoint = row.points.length > 0 || Boolean(row.centrePoint || row.coOrds || row.branchPoints.length);
  if (['ELBOW', 'BEND'].includes(row.type)) return row.points.length >= 2 && Boolean(row.centrePoint);
  if (['TEE', 'CROSS'].includes(row.type)) return row.points.length >= 2 && row.branchPoints.length >= 1;
  if (['SUPPORT', 'CAP', 'BLIND-FLANGE', 'INSTRUMENT'].includes(row.type)) return hasAnyPoint;
  return row.points.length >= 2;
}

function normalizeComponent(component, coordinateScale, boreScale) {
  const points = deepFreeze((component?.points || []).map((point) => scalePoint(point, coordinateScale, boreScale)).filter(Boolean));
  const branchPoints = deepFreeze([component?.branch1Point, component?.branch2Point, component?.branch3Point].map((point) => scalePoint(point, coordinateScale, boreScale)).filter(Boolean));
  return {
    type: stringValue(component?.type).toUpperCase() || 'UNKNOWN', points,
    centrePoint: scalePoint(component?.centrePoint, coordinateScale, boreScale), branchPoints,
    coOrds: scalePoint(component?.coOrds || component?.coords, coordinateScale, boreScale),
    bore: positiveScaled(component?.bore, boreScale), attributes: canonicalAttributes(component?.attributes),
  };
}
function scalePoint(value, coordinateScale, boreScale) {
  if (!value || ![value.x, value.y, value.z].every(Number.isFinite)) return null;
  const point = { x: value.x * coordinateScale, y: value.y * coordinateScale, z: value.z * coordinateScale };
  const bore = positiveScaled(value.bore, boreScale);
  return deepFreeze(bore === null ? point : { ...point, bore });
}
function positiveScaled(value, scale) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number * scale : null; }
function canonicalAttributes(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return deepFreeze(Object.fromEntries(Object.entries(source).map(([key, child]) => [String(key), String(child ?? '')]).sort(([a], [b]) => a.localeCompare(b))));
}
function componentSemantic(component, coordinateScale, boreScale) {
  const normalized = normalizeComponent(component, coordinateScale || 1, boreScale || coordinateScale || 1);
  return { ...normalized, coordinateUnit: coordinateScale || null, boreUnit: boreScale || null };
}
