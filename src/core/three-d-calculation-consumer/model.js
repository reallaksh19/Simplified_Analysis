import { canonicalStringify, deepFreeze, semanticHash, validateSharedPipingModel } from '../shared-piping-model/index.js';
import { validatePipingPortTopologyGraph, validateTopologyConnectionAudit } from '../piping-topology/index.js';
import {
  validateRestraintCapabilityAudit, validateRestraintCapabilityModel,
  validateSupportAttachmentAudit, validateSupportAttachmentModel,
} from '../support-restraints/index.js';
import { validateModelLoadPrimitiveSet } from '../model-loads/index.js';
import {
  validateFlexuralPropertyProjection, validateVerticalBeamModel,
  validateVerticalBeamSolution, validateVerticalBeamSolverAudit,
} from '../vertical-beam-solver/index.js';
import { validateWorkspaceConsumerContext } from '../workspace-consumers/index.js';
import {
  THREE_D_CALCULATION_ASSUMPTIONS, THREE_D_CALCULATION_LIMITATIONS,
  THREE_D_CALCULATION_REVIEW_MODEL_SCHEMA, THREE_D_DIAGNOSTIC_CODES,
} from './constants.js';
import { projectComponents, projectModelSummary, projectPorts } from './projection-model.js';
import { projectConnections, projectTopologyComponents, projectTopologyDiagnostics } from './projection-topology.js';
import { projectRestraintCapabilities, projectSupportAttachments } from './projection-support.js';
import { projectFlexuralProperties, projectLoadPrimitives, projectVerticalBeamCases } from './projection-optional.js';

export function createThreeDCalculationReviewModel(context) {
  assertContext(context);
  const required = requiredEvidence(context);
  const load = optionalLoadEvidence(context);
  const beam = optionalBeamEvidence(context, required);
  const diagnostics = canonicalDiagnostics([...projectTopologyDiagnostics(required.topologyGraph, required.topologyAudit), ...load.diagnostics, ...beam.diagnostics]);
  const identity = reviewIdentity(context, required, load.evidence, beam.evidence, diagnostics);
  const reviewModelId = `three-d-calculation-review-model:${semanticHash(identity).split(':')[1]}`;
  const payload = { ...identity, reviewModelId };
  return deepFreeze({ ...payload, sourceContext: context, semanticHash: semanticHash(payload) });
}

export function validateThreeDCalculationReviewModel(value) {
  const errors = [];
  if (value?.schema !== THREE_D_CALCULATION_REVIEW_MODEL_SCHEMA) errors.push('Invalid three-dimensional calculation review-model schema.');
  if (!value?.sourceContext) errors.push('Three-dimensional calculation review-model source context is required.');
  if (!errors.length) {
    try {
      const expected = createThreeDCalculationReviewModel(value.sourceContext);
      if (value.sourceContext !== expected.sourceContext) errors.push('Three-dimensional review-model source context reference mismatch.');
      if (canonicalStringify(contractPayload(value)) !== canonicalStringify(contractPayload(expected))) errors.push('Three-dimensional review model does not match exact source evidence.');
    } catch (error) { errors.push(error instanceof Error ? error.message : String(error)); }
  }
  return deepFreeze({ ok: errors.length === 0, errors });
}

function reviewIdentity(context, required, load, beam, diagnostics) {
  const components = projectComponents(required.sharedModel), ports = projectPorts(required.topologyGraph);
  const connections = projectConnections(required.topologyGraph), topologyComponents = projectTopologyComponents(required.topologyGraph, required.topologyAudit);
  const supportAttachments = projectSupportAttachments(required.attachmentModel);
  const restraintCapabilities = projectRestraintCapabilities(required.restraintModel);
  const loadPrimitives = load ? projectLoadPrimitives(load) : deepFreeze([]);
  const flexuralProperties = beam ? projectFlexuralProperties(beam.projection) : deepFreeze([]);
  const verticalBeamCases = beam ? projectVerticalBeamCases(beam.model, beam.solution, beam.audit) : deepFreeze([]);
  return {
    schema: THREE_D_CALCULATION_REVIEW_MODEL_SCHEMA,
    datasetId: context.datasetId,
    contextSemanticHash: context.semanticHash,
    sourceReferences: sourceReferences(required, load, beam),
    modelSummary: projectModelSummary(required.sharedModel, required.topologyGraph),
    components, ports, connections, topologyComponents, supportAttachments, restraintCapabilities,
    loadPrimitives, flexuralProperties, verticalBeamCases,
    assumptions: THREE_D_CALCULATION_ASSUMPTIONS,
    limitations: THREE_D_CALCULATION_LIMITATIONS,
    diagnostics,
    summary: summary(components, ports, connections, topologyComponents, supportAttachments, restraintCapabilities, loadPrimitives, flexuralProperties, verticalBeamCases),
  };
}

function requiredEvidence(context) {
  const c = context.contracts;
  const required = {
    sharedModel: c.sharedModel, topologyGraph: c.topologyGraph, topologyAudit: c.topologyAudit,
    attachmentModel: c.supportAttachmentModel, attachmentAudit: c.supportAttachmentAudit,
    restraintModel: c.restraintCapabilityModel, restraintAudit: c.restraintCapabilityAudit,
  };
  if (Object.values(required).some((value) => !value)) throw new TypeError('Complete W10.1-W10.3 evidence is required.');
  validateRequired(required, context.datasetId);
  return required;
}

function validateRequired(e, datasetId) {
  assertValid('shared model', validateSharedPipingModel(e.sharedModel));
  assertValid('topology graph', validatePipingPortTopologyGraph(e.topologyGraph));
  assertValid('topology audit', validateTopologyConnectionAudit(e.topologyAudit));
  assertValid('support attachment model', validateSupportAttachmentModel(e.attachmentModel));
  assertValid('support attachment audit', validateSupportAttachmentAudit(e.attachmentAudit));
  assertValid('restraint capability model', validateRestraintCapabilityModel(e.restraintModel));
  assertValid('restraint capability audit', validateRestraintCapabilityAudit(e.restraintAudit));
  if ([e.topologyGraph, e.attachmentModel, e.restraintModel].some((row) => row.datasetId !== datasetId) || e.sharedModel.project.datasetId !== datasetId) throw new TypeError('Required evidence dataset mismatch.');
  if (e.topologyGraph.sharedModelSemanticHash !== e.sharedModel.semanticHash || e.topologyAudit.modelSemanticHash !== e.sharedModel.semanticHash) throw new TypeError('Topology evidence does not match the shared model.');
  if (e.topologyGraph.topologyAudit.semanticHash !== e.topologyAudit.semanticHash) throw new TypeError('Topology audit does not match the topology graph.');
  if (e.attachmentModel.sharedModelSemanticHash !== e.sharedModel.semanticHash || e.attachmentModel.topologySemanticHash !== e.topologyGraph.semanticHash) throw new TypeError('Support attachment evidence is stale.');
  if (e.attachmentModel.attachmentAudit.semanticHash !== e.attachmentAudit.semanticHash) throw new TypeError('Support attachment audit mismatch.');
  if (e.restraintModel.attachmentModelSemanticHash !== e.attachmentModel.semanticHash || e.restraintModel.restraintAudit.semanticHash !== e.restraintAudit.semanticHash) throw new TypeError('Restraint evidence is stale.');
}

function optionalLoadEvidence(context) {
  const primitiveSet = context.contracts.loadPrimitiveSet;
  if (!primitiveSet) return { evidence: null, diagnostics: [] };
  try {
    assertValid('model-load primitive set', validateModelLoadPrimitiveSet(primitiveSet));
    if (primitiveSet.datasetId !== context.datasetId) throw new TypeError('Model-load primitive dataset mismatch.');
    return { evidence: primitiveSet, diagnostics: [] };
  } catch (error) { return excluded(THREE_D_DIAGNOSTIC_CODES.OPTIONAL_MODEL_LOAD_INVALID, error); }
}

function optionalBeamEvidence(context, required) {
  const values = {
    projection: context.contracts.flexuralPropertyProjection,
    model: context.contracts.verticalBeamModel,
    solution: context.contracts.verticalBeamSolution,
    audit: context.contracts.verticalBeamSolverAudit,
  };
  const present = Object.values(values).filter(Boolean).length;
  if (!present) return { evidence: null, diagnostics: [] };
  if (present !== 4) return excluded(THREE_D_DIAGNOSTIC_CODES.OPTIONAL_VERTICAL_BEAM_INCOMPLETE, new Error('Optional W10.6 evidence is incomplete.'));
  try {
    validateBeam(values, required, context.datasetId);
    return { evidence: values, diagnostics: [] };
  } catch (error) { return excluded(THREE_D_DIAGNOSTIC_CODES.OPTIONAL_VERTICAL_BEAM_INVALID, error); }
}

function validateBeam(e, required, datasetId) {
  assertValid('flexural projection', validateFlexuralPropertyProjection(e.projection));
  assertValid('vertical-beam model', validateVerticalBeamModel(e.model));
  assertValid('vertical-beam solution', validateVerticalBeamSolution(e.solution));
  assertValid('vertical-beam audit', validateVerticalBeamSolverAudit(e.audit));
  if (Object.values(e).some((row) => row.datasetId !== datasetId)) throw new TypeError('Vertical-beam evidence dataset mismatch.');
  if (e.projection.sharedModelSemanticHash !== required.sharedModel.semanticHash) throw new TypeError('Flexural projection does not match the shared model.');
  if (e.model.flexuralProjectionSemanticHash !== e.projection.semanticHash) throw new TypeError('Vertical-beam model does not match flexural evidence.');
  if (e.solution.beamModelSemanticHash !== e.model.semanticHash || e.audit.solutionSemanticHash !== e.solution.semanticHash) throw new TypeError('Vertical-beam solution/audit evidence is stale.');
}

function sourceReferences(r, load, beam) {
  return deepFreeze({
    sharedModelSemanticHash: r.sharedModel.semanticHash,
    topologyGraphSemanticHash: r.topologyGraph.semanticHash,
    topologyAuditSemanticHash: r.topologyAudit.semanticHash,
    supportAttachmentModelSemanticHash: r.attachmentModel.semanticHash,
    supportAttachmentAuditSemanticHash: r.attachmentAudit.semanticHash,
    restraintCapabilityModelSemanticHash: r.restraintModel.semanticHash,
    restraintCapabilityAuditSemanticHash: r.restraintAudit.semanticHash,
    loadPrimitiveSetSemanticHash: load?.semanticHash || null,
    flexuralPropertyProjectionSemanticHash: beam?.projection.semanticHash || null,
    verticalBeamModelSemanticHash: beam?.model.semanticHash || null,
    verticalBeamSolutionSemanticHash: beam?.solution.semanticHash || null,
    verticalBeamSolverAuditSemanticHash: beam?.audit.semanticHash || null,
  });
}

function summary(...rows) {
  const [components, ports, connections, topology, attachments, restraints, loads, flexural, beam] = rows;
  return deepFreeze({ componentCount: components.length, portCount: ports.length, connectionCount: connections.length, topologyComponentCount: topology.length, supportAttachmentCount: attachments.length, restraintCapabilityCount: restraints.length, loadPrimitiveCount: loads.length, flexuralPropertyCount: flexural.length, verticalBeamCaseCount: beam.length, optionalModelLoadsIncluded: loads.length > 0, optionalVerticalBeamIncluded: beam.length > 0 });
}
function excluded(code, error) { return { evidence: null, diagnostics: [deepFreeze({ code, severity: 'WARNING', scope: 'OPTIONAL_EVIDENCE', message: error instanceof Error ? error.message : String(error) })] }; }
function canonicalDiagnostics(rows) { return deepFreeze([...rows].sort((a, b) => `${a.scope}|${a.code}|${a.message}`.localeCompare(`${b.scope}|${b.code}|${b.message}`))); }
function assertContext(context) { const validation = validateWorkspaceConsumerContext(context); if (!validation.ok) throw new TypeError(`Invalid workspace consumer context: ${validation.errors.join(' ')}`); }
function assertValid(label, validation) { if (!validation.ok) throw new TypeError(`Invalid ${label}: ${validation.errors.join(' ')}`); }
function contractPayload(value) { const { sourceContext: _sourceContext, ...payload } = value || {}; return payload; }
