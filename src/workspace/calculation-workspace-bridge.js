import {
  normalizeCalculationWorkspacePackage,
  workspaceObjects,
  workspaceSupports,
} from '../calc-workspace/workspaceModel.js';
import { freezeDeep } from './dataset-utils.js';
import { WORKSPACE_DATASET_SCHEMA } from './dataset-adapter.js';
import { STAGED_MODEL_INDEX_SCHEMA } from './staged-model-index.js';

export const CALCULATION_WORKSPACE_BRIDGE_SCHEMA = 'calculation-workspace-bridge/v1';

export function buildCalculationWorkspaceBridge(dataset) {
  assertBridgeableDataset(dataset);
  const calculationWorkspace = normalizeCalculationWorkspacePackage(
    dataset.sourceModel.sourcePackage,
    dataset.sourceName,
    '',
  );
  return freezeDeep({
    schema: CALCULATION_WORKSPACE_BRIDGE_SCHEMA,
    datasetId: dataset.datasetId,
    sourceSchema: dataset.sourceSchema,
    sourceNodeCount: dataset.sourceModel.summary.nodeCount,
    calculationWorkspace,
    summary: {
      objects: workspaceObjects(calculationWorkspace).length,
      supports: workspaceSupports(calculationWorkspace).length,
      sourceRoots: dataset.sourceModel.summary.rootCount,
    },
  });
}

function assertBridgeableDataset(dataset) {
  if (!dataset || dataset.schema !== WORKSPACE_DATASET_SCHEMA) {
    throw new TypeError(`Calculation workspace bridge requires ${WORKSPACE_DATASET_SCHEMA}.`);
  }
  if (!dataset.sourceModel || dataset.sourceModel.schema !== STAGED_MODEL_INDEX_SCHEMA) {
    throw new TypeError(`Calculation workspace bridge requires ${STAGED_MODEL_INDEX_SCHEMA}.`);
  }
  if (!dataset.sourceModel.sourcePackage || typeof dataset.sourceModel.sourcePackage !== 'object') {
    throw new TypeError('Calculation workspace bridge requires the preserved staged JSON source package.');
  }
}
