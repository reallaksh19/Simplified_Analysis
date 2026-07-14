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
import { SharedModelController } from './shared-model-controller.js';
import { SharedModelPanel } from './shared-model-panel.js';
import { SupportRestraintController } from './support-restraint-controller.js';
import { SupportRestraintPanel } from './support-restraint-panel.js';
import { SupportRestraintStore } from './support-restraint-store.js';
import { TopologyController } from './topology-controller.js';
import { TopologyPanel } from './topology-panel.js';
import { TopologyStore } from './topology-store.js';
import { TreePanel } from './tree-panel.js';
import { ViewportPanel } from './viewport-panel.js';
import { renderWorkspaceLayout } from './workspace-layout.js';
import { WorkspaceState } from './workspace-state.js';

export function bootstrapAnalysisWorkspace(rootElement) {
  if (!rootElement) throw new Error('Application root #root was not found.');

  WorkspaceState.clearDataset();
  AnalysisSessions.clear();
  AnalysisLedger.clear();
  TopologyStore.clear();
  SupportRestraintStore.clear();
  renderWorkspaceLayout(rootElement);

  const capabilityRegistry = createDefaultAnalysisCapabilityRegistry();
  const datasetController = new DatasetController(EventBus, WorkspaceState);
  const sharedModelController = new SharedModelController(EventBus, WorkspaceState, rootElement.ownerDocument);
  const topologyController = new TopologyController(EventBus, TopologyStore, rootElement.ownerDocument);
  const supportRestraintController = new SupportRestraintController(
    EventBus,
    SupportRestraintStore,
    TopologyStore,
    rootElement.ownerDocument,
  );
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
  const sharedModelPanel = new SharedModelPanel(
    rootElement.querySelector('[data-role="shared-model-summary"]'),
    EventBus,
  );
  const topologyPanel = new TopologyPanel(
    rootElement.querySelector('[data-role="topology-summary"]'),
    EventBus,
  );
  const supportRestraintPanel = new SupportRestraintPanel(
    rootElement.querySelector('[data-role="support-restraint-summary"]'),
    EventBus,
  );
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
    sharedModelController,
    topologyController,
    supportRestraintController,
    modelSupportLoadController,
    sessionController,
    analysisCoordinator,
    ledgerController,
    treePanel,
    viewportPanel,
    sharedModelPanel,
    topologyPanel,
    supportRestraintPanel,
    modelSupportLoadPanel,
    propertiesPanel,
  ];
  controllers.forEach((controller) => controller.init());

  globalThis.EventBus = EventBus;

  return Object.freeze({
    getSnapshot() {
      return WorkspaceState.getSnapshot();
    },
    getSharedModel() {
      const snapshot = WorkspaceState.getSnapshot();
      return snapshot.status === 'ready' ? snapshot.dataset?.sharedModel || null : null;
    },
    getTopologyGraph() {
      return TopologyStore.getGraph();
    },
    getTopologyAudit() {
      return TopologyStore.getAudit();
    },
    getSupportAttachmentModel() {
      return SupportRestraintStore.getAttachmentModel();
    },
    getSupportAttachmentAudit() {
      return SupportRestraintStore.getAttachmentAudit();
    },
    getRestraintCapabilityModel() {
      return SupportRestraintStore.getRestraintModel();
    },
    getRestraintCapabilityAudit() {
      return SupportRestraintStore.getRestraintAudit();
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
      SupportRestraintStore.clear();
      TopologyStore.clear();
      AnalysisLedger.clear();
      AnalysisSessions.clear();
      WorkspaceState.clearDataset();
      rootElement.replaceChildren();
    },
  });
}
