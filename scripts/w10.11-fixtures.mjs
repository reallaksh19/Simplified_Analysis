import { deepFreeze } from '../src/core/shared-piping-model/index.js';
import {
  PIPE_SCREENING_MANIFEST,
  createPipeSolverConsumerSource,
  createPipeSolverReviewModel,
} from '../src/core/pipe-solver-consumer/index.js';
import { createWorkspaceConsumerContext } from '../src/core/workspace-consumers/index.js';
import { buildW1010Context } from './w10.10-fixtures.mjs';

export function buildW1011Fixture(options = {}) {
  const datasetId = options.datasetId || 'W10.11-FIXTURE';
  const selectedEntityId = options.selectedEntity === false ? null : options.selectedEntityId || 'PIPE-1';
  const base = buildW1010Context({ datasetId, selectedEntityId: selectedEntityId || 'PIPE-1' });
  const context = selectedEntityId ? base : createWorkspaceConsumerContext({
    datasetId: base.datasetId,
    workspaceVersion: base.workspaceVersion,
    selectedEntityId: null,
    contracts: base.contracts,
  });
  const entity = selectedEntityId ? entityFixture(selectedEntityId, options.entityType || 'PIPE') : null;
  const inspection = entity ? inspectionFixture(entity, context, options) : null;
  const session = options.session === false || !entity ? null : sessionFixture(entity, context, inspection, options);
  const ledger = ledgerFixture(context, session, options);
  const source = createPipeSolverConsumerSource({
    sourceContext: context,
    selectedEntity: entity,
    capabilityInspection: inspection,
    activeSession: options.sessionMismatch ? { ...session, targetId: 'OTHER' } : session,
    ledgerSnapshot: ledger,
    diagnostics: options.diagnostics || [],
  });
  return { context, entity, inspection, session, ledger, source, review: createPipeSolverReviewModel(source) };
}

export function emptyW1011Fixture() {
  const context = createWorkspaceConsumerContext({
    datasetId: null,
    workspaceVersion: 0,
    selectedEntityId: null,
    contracts: {},
  });
  const source = createPipeSolverConsumerSource({ sourceContext: context });
  return { context, source, review: createPipeSolverReviewModel(source) };
}

function entityFixture(entityId, entityType) {
  const sourceAttributes = deepFreeze({ LINE_ID: 'LINE-W10.11', SYSTEM_ID: 'SYS-W10.11' });
  const nativeParams = deepFreeze({ startPoint: [0,0,0], endPoint: [1000,0,0] });
  return deepFreeze({
    entityId,
    entityType,
    name: entityId,
    lineId: 'LINE-W10.11',
    systemId: 'SYS-W10.11',
    sourcePath: `/MODEL/${entityId}`,
    properties: { sourceAttributes, nativeParams },
  });
}

function inspectionFixture(entity, context, options) {
  const applicable = entity.entityType === 'PIPE';
  const ready = options.ready !== false && applicable;
  const fields = inputFields(ready, options.reverseInputs);
  const missingInputs = ready ? [] : fields.filter((field) => field.value == null).map((field) => inputEvidence(field));
  const workspaceReadiness = deepFreeze({
    schema: 'workspace-analysis-readiness/v1',
    ...PIPE_SCREENING_MANIFEST,
    targetId: entity.entityId,
    datasetId: context.datasetId,
    applicable,
    applicabilityReason: applicable ? '' : 'Pipe flexibility screening is applicable only to a selected straight-pipe entity.',
    qualificationStatus: !applicable ? 'NOT_APPLICABLE' : ready ? 'READY_FOR_REVIEWED_EXECUTION' : 'INPUT_REQUIRED',
    requiredInputs: fields.map(inputEvidence),
    resolvedInputs: fields.filter((field) => field.value != null).map(inputEvidence),
    missingInputs,
    invalidInputs: [],
    diagnostics: options.diagnostics || [],
    readyToReview: applicable,
    readyToRun: ready,
  });
  return deepFreeze({
    fields,
    readiness: { enabled: ready, reason: ready ? '' : 'Explicit engineering inputs are missing.', missing: missingInputs.map((row) => row.key) },
    summary: { fieldCount: fields.length, overrideCount: 0, missingCount: missingInputs.length, invalidCount: 0 },
    workspaceReadiness,
  });
}

function inputFields(ready, reverse) {
  const rows = [
    field('connectedLineSegments','Connected pipe legs','count',2,'derived',false),
    field('deltaT','Temperature difference','°C',ready ? 180 : null,ready ? 'source' : 'missing'),
    field('alpha','Thermal expansion coefficient','1/°C',ready ? 0.000012 : null,ready ? 'source' : 'missing'),
    field('E','Elastic modulus','MPa',ready ? 200000 : null,ready ? 'source' : 'missing'),
    field('od','Pipe outside diameter','mm',ready ? 168.3 : null,ready ? 'source' : 'missing'),
    field('Sa','Allowable stress','MPa',ready ? 100 : null,ready ? 'source' : 'missing'),
  ];
  return deepFreeze(reverse ? rows.reverse() : rows);
}
function field(key,label,unit,value,source,editable=true) {
  return deepFreeze({ key,label,unit,kind:'number',required:true,editable,value,source,sourcePath:`fixture.${key}`,validation:'positive' });
}
function inputEvidence(field) {
  return { key:field.key,label:field.label,value:field.value,unit:field.unit,source:field.source,sourcePath:field.sourcePath,editable:field.editable };
}

function sessionFixture(entity, context, inspection, options) {
  const status = options.status || (inspection.workspaceReadiness.readyToRun ? 'ready' : 'draft');
  const result = status === 'completed' ? resultFixture(options.invalidResult) : null;
  return deepFreeze({
    schema:'analysis-session/v1',
    sessionId:'analysis-session-1',
    targetId:entity.entityId,
    analysisType:'pipe-screening',
    datasetId:options.sessionDatasetId || context.datasetId,
    workspaceVersion:context.workspaceVersion,
    version:2,
    status,
    inputs:inspection.fields,
    overrides:options.overrides || {},
    fieldErrors:options.fieldErrors || {},
    readiness:inspection.readiness,
    workspaceReadiness:inspection.workspaceReadiness,
    requestId:['running','completed','failed'].includes(status)?'analysis-request-1':undefined,
    result,
    failure:status==='failed'?deepFreeze({code:'PIPE_SCREENING_FAILED',message:'Fixture failure.',details:{}}):null,
  });
}
function resultFixture(invalid) {
  return deepFreeze({
    schemaVersion:invalid?'unexpected-result':'solver-result-contract-v1',
    moduleId:'simplified-2d',
    methodId:'SIMPLIFIED_2D_TOPOLOGY_SCREENING',
    formulaIds:['SIMPLIFIED_2D_FLEXIBILITY'],
    unitSystem:{length:'mm',stress:'MPa'},
    settingsHash:null,
    dataStatus:'CALCULATED',
    engineeringLevel:'BENCHMARKED_SCREENING',
    status:'PASS',
    input:{},
    results:{ratio:0.5},
    diagnostics:[],
    warnings:[],
    formulaTrace:[{formulaId:'SIMPLIFIED_2D_FLEXIBILITY'}],
    meta:{},
    summary:{status:'PASS',warningCount:0,diagnosticCount:0},
  });
}
function ledgerFixture(context, session, options) {
  const entries = [];
  if (session && ['completed','failed'].includes(session.status)) {
    entries.push(deepFreeze({schema:'analysis-ledger-entry/v1',entryId:'entry-2',sequence:2,archiveKey:'archive-2',datasetId:context.datasetId,session}));
    entries.push(deepFreeze({schema:'analysis-ledger-entry/v1',entryId:'entry-1',sequence:1,archiveKey:'archive-1',datasetId:context.datasetId,session:{...session,sessionId:'analysis-session-0'}}));
  }
  if (options.includeOtherLedger) entries.push(deepFreeze({schema:'analysis-ledger-entry/v1',entryId:'other',sequence:3,archiveKey:'other',datasetId:context.datasetId,session:{...session,analysisType:'support-load'}}));
  return deepFreeze({schema:'analysis-ledger/v1',datasetId:options.ledgerDatasetId || context.datasetId,entries,activeEntryId:options.activeEntryId || (entries[0]?.entryId || ''),comparison:null,version:1});
}
