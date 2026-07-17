import { deepFreeze, validateSharedPipingModel } from '../shared-piping-model/index.js';
import { validatePipingPortTopologyGraph } from '../piping-topology/index.js';
import { validateRestraintCapabilityModel, validateSupportAttachmentModel } from '../support-restraints/index.js';
import { validateLoadCaseSet, validateModelLoadPrimitiveSet, validateModelLoadReadinessAudit } from '../model-loads/index.js';
import { validateVerticalLoadPathModel } from '../support-load-screening/index.js';
import {
  validateFlexuralPropertyProjection, validateVerticalBeamModel,
  validateVerticalBeamSolution, validateVerticalBeamSolverAudit,
} from '../vertical-beam-solver/index.js';
import { validateThreeDCalculationReviewModel } from './model.js';

export function assessThreeDCalculationActions(reviewModel) {
  if (!validateThreeDCalculationReviewModel(reviewModel).ok) return unavailableActions();
  const c = reviewModel.sourceContext.contracts;
  const shared = valid(validateSharedPipingModel, c.sharedModel);
  const topology = valid(validatePipingPortTopologyGraph, c.topologyGraph);
  const attachment = valid(validateSupportAttachmentModel, c.supportAttachmentModel);
  const restraint = valid(validateRestraintCapabilityModel, c.restraintCapabilityModel);
  const beamBuild = beamBuildReady(c);
  const beamModel = valid(validateVerticalBeamModel, c.verticalBeamModel);
  const beamSolved = beamModel && valid(validateVerticalBeamSolution, c.verticalBeamSolution)
    && valid(validateVerticalBeamSolverAudit, c.verticalBeamSolverAudit);
  return deepFreeze({
    EXPORT_SHARED_MODEL: shared,
    REBUILD_TOPOLOGY_EXACT: shared,
    EXPORT_TOPOLOGY: topology,
    REBUILD_SUPPORT_EVIDENCE: shared && topology,
    EXPORT_SUPPORT_RESTRAINT: attachment && restraint,
    REBUILD_VERTICAL_BEAM_MODEL: beamBuild,
    SOLVE_VERTICAL_BEAM: beamModel,
    EXPORT_VERTICAL_BEAM: beamSolved,
  });
}

function beamBuildReady(c) {
  return valid(validateVerticalLoadPathModel, c.verticalLoadPathModel)
    && valid(validateLoadCaseSet, c.loadCaseSet)
    && valid(validateModelLoadPrimitiveSet, c.loadPrimitiveSet)
    && valid(validateModelLoadReadinessAudit, c.modelLoadReadinessAudit)
    && valid(validateFlexuralPropertyProjection, c.flexuralPropertyProjection);
}
function valid(validator, value) { try { return Boolean(value && validator(value).ok); } catch { return false; } }
function unavailableActions() {
  return deepFreeze({ EXPORT_SHARED_MODEL: false, REBUILD_TOPOLOGY_EXACT: false, EXPORT_TOPOLOGY: false, REBUILD_SUPPORT_EVIDENCE: false, EXPORT_SUPPORT_RESTRAINT: false, REBUILD_VERTICAL_BEAM_MODEL: false, SOLVE_VERTICAL_BEAM: false, EXPORT_VERTICAL_BEAM: false });
}
