import { createDefaultAnalysisCapabilityRegistry } from './analysis-capabilities.js';
import { AnalysisCoordinator } from './analysis-coordinator.js';
import { AnalysisLedgerController } from './analysis-ledger-controller.js';
import { AnalysisLedger } from './analysis-ledger-store.js';
import { AnalysisSessionController } from './analysis-session-controller.js';
import { AnalysisSessions } from './analysis-session-store.js';
import { DatasetController } from './dataset-controller.js';
import { EventBus } from './event-bus.js';
import { ModelSupportLoadController } from './model-support-load-controller.js';
import { ModelSupportLoadPanel } from './model-support-load-panel.js';
import { assessModelSupportLoadReadiness } from './model-support-load-readiness.js';
import { PropertiesPanel } from './properties-panel.js';
import { TreePanel } from './tree-panel.js';
import { ViewportPanel } from './viewport-panel.js';
import { renderWorkspaceLayout } from './workspace-layout.js';
import { WorkspaceState } from './workspace-state.js';

export function bootstrapAnalysisWorkspace(rootElement) {
  if (!rootElement) throw new Error('Application root #root was not found.');

  WorkspaceState.clearDataset();
  AnalysisSessions.clear();
  AnalysisLedger.clear();
  renderWorkspaceLayout(rootElement);

  const capabilityRegistry = createDefaultAnalysisCapabilityRegistry();
  const datasetController = new DatasetController(EventBus, WorkspaceState);
  const modelSupportLoadController = new ModelSupportLoadController(EventBus, WorkspaceState);
  const sessionController = new AnalysisSessionController(
    EventBus,
    WorkspaceState,
    capabilityRegistry,
    AnalysisSessions,
  );
  const analysisCoordinator = new AnalysisCoordinator(
    EventBus,
    WorkspaceState,
    capabilityRegistry,
    AnalysisSessions,
  );
  const ledgerController = new AnalysisLedgerController(
    EventBus,
    AnalysisLedger,
    rootElement.ownerDocument,
  );
  const treePanel = new TreePanel(rootElement.querySelector('[data-panel="tree"]'), EventBus);
  const viewportPanel = new ViewportPanel(rootElement.querySelector('[data-panel="viewport"]'), EventBus);
  const modelSupportLoadPanel = new ModelSupportLoadPanel(
    rootElement.querySelector('[data-role="model-support-load-summary"]'),
    EventBus,
  );
  const propertiesPanel = new PropertiesPanel(
    rootElement.querySelector('[data-panel="properties"]'),
    EventBus,
    WorkspaceState,
  );
  const controllers = [
    datasetController,
    modelSupportLoadController,
    sessionController,
    analysisCoordinator,
    ledgerController,
    treePanel,
    viewportPanel,
    modelSupportLoadPanel,
    propertiesPanel,
  ];
  controllers.forEach((controller) => controller.init());

  globalThis.EventBus = EventBus;

  return Object.freeze({
    getSnapshot() {
      return WorkspaceState.getSnapshot();
    },
    getModelSupportLoadReadiness() {
      const snapshot = WorkspaceState.getSnapshot();
      return snapshot.status === 'ready' && snapshot.dataset
        ? assessModelSupportLoadReadiness(snapshot.dataset)
        : null;
    },
    getAnalysisSession() {
      return AnalysisSessions.getSnapshot();
    },
    getAnalysisLedger() {
      return AnalysisLedger.getSnapshot();
    },
    getAnalysisCapabilities(targetId) {
      try {
        const entity = WorkspaceState.getEntity(targetId);
        const snapshot = WorkspaceState.getSnapshot();
        if (!entity || snapshot.status !== 'ready') return [];
        return capabilityRegistry.list({
          targetId: entity.entityId,
          entity,
          dataset: snapshot.dataset,
          selectedEntityId: snapshot.selectedEntityId,
          version: snapshot.version,
        });
      } catch {
        return [];
      }
    },
    destroy() {
      [...controllers].reverse().forEach((controller) => controller.destroy());
      AnalysisLedger.clear();
      AnalysisSessions.clear();
      WorkspaceState.clearDataset();
      rootElement.replaceChildren();
    },
  });
}
