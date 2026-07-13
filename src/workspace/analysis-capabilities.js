import { AnalysisCapabilityRegistry } from './analysis-capability-registry.js';
import { pipeScreeningCapability } from './pipe-screening-capability.js';
import { supportLoadCapability } from './support-load-capability.js';

export function createDefaultAnalysisCapabilityRegistry() {
  return new AnalysisCapabilityRegistry()
    .register(supportLoadCapability)
    .register(pipeScreeningCapability);
}
