import { createInspection } from './analysis-input-evidence.js';
import { freezeDeep } from './dataset-utils.js';

export class AnalysisCapabilityError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'AnalysisCapabilityError';
    this.code = code;
    this.details = freezeDeep({ ...details });
  }
}

export class AnalysisCapabilityRegistry {
  #capabilities = new Map();

  register(definition) {
    const capability = normalizeDefinition(definition);
    if (this.#capabilities.has(capability.id)) {
      throw new AnalysisCapabilityError(
        'DUPLICATE_CAPABILITY',
        `Analysis capability is already registered: ${capability.id}.`,
      );
    }
    this.#capabilities.set(capability.id, capability);
    return this;
  }

  list(context) {
    return freezeDeep([...this.#capabilities.values()].map((capability) => {
      const readiness = normalizeReadiness(capability.evaluate(context));
      return {
        analysisType: capability.id,
        label: capability.label,
        description: capability.description,
        engineeringLevel: capability.engineeringLevel,
        enabled: readiness.enabled,
        reason: readiness.reason,
        missing: readiness.missing,
      };
    }));
  }

  inspect(analysisType, context) {
    const capability = this.#require(analysisType);
    const readiness = normalizeReadiness(capability.evaluate(context));
    if (!capability.inspect) return createInspection([], readiness);
    const inspection = capability.inspect(context);
    if (!inspection || typeof inspection !== 'object') {
      throw new AnalysisCapabilityError(
        'INVALID_INPUT_INSPECTION',
        `${capability.id} returned an invalid input inspection.`,
      );
    }
    return createInspection(inspection.fields || [], inspection.readiness || readiness);
  }

  async execute(analysisType, context) {
    const capability = this.#require(analysisType);
    const readiness = normalizeReadiness(capability.evaluate(context));
    if (!readiness.enabled) {
      throw new AnalysisCapabilityError(
        'CAPABILITY_NOT_READY',
        readiness.reason || `${capability.label} is not ready.`,
        { missing: readiness.missing },
      );
    }

    const result = await capability.execute(context);
    if (!result || typeof result !== 'object') {
      throw new AnalysisCapabilityError(
        'INVALID_CAPABILITY_RESULT',
        `${capability.id} returned an invalid result.`,
      );
    }
    return result;
  }

  has(analysisType) {
    return this.#capabilities.has(String(analysisType || ''));
  }

  get size() {
    return this.#capabilities.size;
  }

  #require(analysisType) {
    const capability = this.#capabilities.get(String(analysisType || ''));
    if (!capability) {
      throw new AnalysisCapabilityError(
        'CAPABILITY_NOT_FOUND',
        `Unknown analysis capability: ${analysisType}.`,
      );
    }
    return capability;
  }
}

function normalizeDefinition(definition) {
  if (!definition || typeof definition !== 'object') {
    throw new TypeError('Analysis capability definition must be an object.');
  }
  const id = nonEmptyString(definition.id, 'id');
  const label = nonEmptyString(definition.label, 'label');
  if (typeof definition.evaluate !== 'function') {
    throw new TypeError(`Analysis capability ${id} requires evaluate(context).`);
  }
  if (typeof definition.execute !== 'function') {
    throw new TypeError(`Analysis capability ${id} requires execute(context).`);
  }
  if (definition.inspect !== undefined && typeof definition.inspect !== 'function') {
    throw new TypeError(`Analysis capability ${id} inspect must be a function.`);
  }
  return Object.freeze({
    id,
    label,
    description: String(definition.description || ''),
    engineeringLevel: String(definition.engineeringLevel || 'SCREENING'),
    evaluate: definition.evaluate,
    execute: definition.execute,
    inspect: definition.inspect || null,
  });
}

function normalizeReadiness(value) {
  if (value === true) return { enabled: true, reason: '', missing: [] };
  if (value === false || value == null) {
    return { enabled: false, reason: 'Capability is not available for this selection.', missing: [] };
  }
  if (typeof value !== 'object') {
    throw new TypeError('Capability readiness must be a boolean or object.');
  }
  return {
    enabled: value.enabled === true,
    reason: String(value.reason || ''),
    missing: Array.isArray(value.missing) ? value.missing.map(String) : [],
  };
}

function nonEmptyString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`Analysis capability ${field} must be a non-empty string.`);
  }
  return value.trim();
}
