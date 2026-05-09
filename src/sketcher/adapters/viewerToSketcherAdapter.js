import { buildGraphFromComponents } from '../GraphTranslator.js';
import { canonicalGeometryToSketcher } from '../../core/geometry/adapters/sketcherToCanonicalGeometry.js';

export const VIEWER_TO_SKETCHER_ADAPTER_SCHEMA_VERSION = 'viewer-to-sketcher-adapter-v18a';

function clone(value) {
  return JSON.parse(JSON.stringify(value ?? null));
}

function diagnostic(severity, code, message, data = {}) {
  return { severity, code, message, data };
}

function normalizeResult(result = {}, source = 'viewer-components') {
  const nodes = result.nodes && typeof result.nodes === 'object' ? result.nodes : {};
  const segments = Array.isArray(result.segments) ? result.segments : [];
  const warnings = Array.isArray(result.warnings) ? result.warnings : [];
  const diagnostics = Array.isArray(result.diagnostics) ? result.diagnostics : [];

  const normalizedDiagnostics = [
    ...warnings.map((message, index) => diagnostic(
      'warn',
      'VIEWER_TO_SKETCHER_IMPORT_WARNING',
      typeof message === 'string' ? message : message?.message || `Import warning ${index + 1}`,
      typeof message === 'object' ? clone(message.data || message) : {},
    )),
    ...diagnostics,
  ];

  return {
    schemaVersion: VIEWER_TO_SKETCHER_ADAPTER_SCHEMA_VERSION,
    source,
    nodes,
    segments,
    diagnostics: normalizedDiagnostics,
    lossContract: [],
    normalized: {
      nodeCount: Object.keys(nodes).length,
      segmentCount: segments.length,
      diagnosticCount: normalizedDiagnostics.length,
    },
    derived: { ok: true },
  };
}

function buildUnsupportedLossContract(components = []) {
  const supported = new Set([
    'PIPE', 'ELBOW', 'BEND', 'TEE', 'VALVE', 'FLANGE', 'SUPPORT',
    'ANCHOR', 'GUIDE', 'OLET', 'REDUCER',
  ]);

  return (components || [])
    .filter((component) => {
      const type = String(component.type || component.componentType || component.skey || '').toUpperCase();
      return type && !supported.has(type);
    })
    .map((component, index) => ({
      severity: 'warn',
      code: 'VIEWER_COMPONENT_UNSUPPORTED_OR_PROXY',
      message: `Component ${component.id || component.refNo || index + 1} type is not directly supported by Sketcher and may be imported as proxy/diagnostic only.`,
      data: {
        id: component.id || component.refNo || null,
        type: component.type || component.componentType || component.skey || null,
      },
    }));
}

export function convertViewerComponentsToSketcher(components = [], options = {}) {
  try {
    const result = buildGraphFromComponents(components || [], options);
    const normalized = normalizeResult(result, options.source || 'viewer-components');
    const lossContract = buildUnsupportedLossContract(components);

    return {
      ...normalized,
      lossContract,
      diagnostics: [
        ...(normalized.diagnostics || []),
        ...lossContract,
      ],
      rawAttributes: {
        sourceComponentCount: components?.length || 0,
      },
      derived: {
        ok: true,
        hasLoss: lossContract.length > 0,
      },
    };
  } catch (error) {
    return {
      schemaVersion: VIEWER_TO_SKETCHER_ADAPTER_SCHEMA_VERSION,
      source: options.source || 'viewer-components',
      nodes: {},
      segments: [],
      diagnostics: [
        diagnostic('error', 'VIEWER_TO_SKETCHER_CONVERSION_FAILED', error?.message || 'Viewer-to-Sketcher conversion failed.'),
      ],
      lossContract: [],
      rawAttributes: { sourceComponentCount: components?.length || 0 },
      derived: { ok: false, hasLoss: true },
    };
  }
}

export function convertCanonicalGeometryToSketcher(geometry = {}, options = {}) {
  try {
    const result = canonicalGeometryToSketcher(geometry || {}, options);
    return normalizeResult(result, options.source || 'canonical-geometry');
  } catch (error) {
    return {
      schemaVersion: VIEWER_TO_SKETCHER_ADAPTER_SCHEMA_VERSION,
      source: options.source || 'canonical-geometry',
      nodes: {},
      segments: [],
      diagnostics: [
        diagnostic('error', 'CANONICAL_TO_SKETCHER_CONVERSION_FAILED', error?.message || 'Canonical geometry to Sketcher conversion failed.'),
      ],
      lossContract: [],
      derived: { ok: false },
    };
  }
}
