import { deepFreeze } from '../shared-piping-model/index.js';
import { createSimpleChainVerticalProfile } from './profile.js';
import { buildVerticalLoadPathModel } from './path-model.js';
import { buildTributarySupportLoadScreening } from './screening-engine.js';
import { createSupportLoadScreeningAudit } from './screening-audit.js';

export function buildVerticalLoadPathFoundation(inputs, options = {}) {
  const profile = options.profile || createSimpleChainVerticalProfile(options.profileOptions);
  const pathModel = buildVerticalLoadPathModel(
    inputs.sharedModel,
    inputs.topologyGraph,
    inputs.attachmentModel,
    inputs.restraintModel,
    profile,
  );
  return deepFreeze({ profile, pathModel });
}

export function runTributarySupportLoadScreening(pathFoundation, inputs) {
  const screening = buildTributarySupportLoadScreening(
    pathFoundation.pathModel,
    inputs.loadCaseSet,
    inputs.loadPrimitiveSet,
    inputs.modelLoadReadinessAudit,
    pathFoundation.profile,
  );
  const audit = createSupportLoadScreeningAudit(screening);
  return deepFreeze({ ...pathFoundation, screening, audit });
}
