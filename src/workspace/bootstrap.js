import { createDefaultAnalysisCapabilityRegistry } from './analysis-capabilities.js';
import { AnalysisCoordinator } from './analysis-coordinator.js';
import { AnalysisLedgerController } from './analysis-ledger-controller.js';
import { AnalysisLedger } from './analysis-ledger-store.js';
import { AnalysisSessionController } from './analysis-session-controller.js';
import { AnalysisSessions } from './analysis-session-store.js';
import { ApplicationShellController } from './application-shell-controller.js';
import { ApplicationShellStyles } from './application-shell-styles.js';
import { DatasetController } from './dataset-controller.js';
import { EventBus } from './event-bus.js';
import { ModelCalculationController } from './model-calculation-controller.js';
import { ModelCalculationPanel } from './model-calculation-panel.js';
import { ModelCalculationStore } from './model-calculation-store.js';
import { ModelLoadController } from './model-load-controller.js';
import { ModelLoadPanel } from './model-load-panel.js';
import { ModelLoadStore } from './model-load-store.js';
import { ModelSupportLoadController } from './model-support-load-controller.js';
import { ModelSupportLoadPanel } from './model-support-load-panel.js';
import { assessModelSupportLoadReadiness } from './model-support-load-readiness.js';
import { PropertiesPanel } from './properties-panel.js';
import { ReportsConsumerPanel } from './reports-consumer-panel.js';
import { SharedModelController } from './shared-model-controller.js';
import { SharedModelPanel } from './shared-model-panel.js';
import { SupportLoadScreeningController } from './support-load-screening-controller.js';
import { SupportLoadScreeningPanel } from './support-load-screening-panel.js';
import { SupportLoadScreeningStore } from './support-load-screening-store.js';
import { SupportRestraintController } from './support-restraint-controller.js';
import { SupportRestraintPanel } from './support-restraint-panel.js';
import { SupportRestraintStore } from './support-restraint-store.js';
import { TopologyController } from './topology-controller.js';
import { TopologyPanel } from './topology-panel.js';
import { TopologyStore } from './topology-store.js';
import { TreePanel } from './tree-panel.js';
import { VerticalBeamController } from './vertical-beam-controller.js';
import { VerticalBeamPanel } from './vertical-beam-panel.js';
import { VerticalBeamStore } from './vertical-beam-store.js';
import { ViewportPanel } from './viewport-panel.js';
import { WorkspaceConsumerController } from './workspace-consumer-controller.js';
import { renderWorkspaceLayout } from './workspace-layout.js';
import { WorkspaceState } from './workspace-state.js';

export function bootstrapAnalysisWorkspace(rootElement) {
  if (!rootElement) throw new Error('Application root #root was not found.');
  clearRuntimeState();
  renderWorkspaceLayout(rootElement);

  const capabilityRegistry = createDefaultAnalysisCapabilityRegistry();
  const controllers = buildControllers(rootElement, capabilityRegistry);
  const consumerController = new WorkspaceConsumerController(EventBus, createConsumerReaders());
  controllers.push(
    new ApplicationShellStyles(rootElement.ownerDocument),
    consumerController,
    new ApplicationShellController(rootElement, EventBus, consumerController),
    new ReportsConsumerPanel(rootElement.querySelector('[data-role="reports-view"]'), EventBus, consumerController),
  );
  controllers.forEach((controller) => controller.init());
  globalThis.EventBus = EventBus;

  return Object.freeze({
    getSnapshot: () => WorkspaceState.getSnapshot(),
    getSharedModel: () => readyDataset()?.sharedModel || null,
    getTopologyGraph: () => TopologyStore.getGraph(),
    getTopologyAudit: () => TopologyStore.getAudit(),
    getSupportAttachmentModel: () => SupportRestraintStore.getAttachmentModel(),
    getSupportAttachmentAudit: () => SupportRestraintStore.getAttachmentAudit(),
    getRestraintCapabilityModel: () => SupportRestraintStore.getRestraintModel(),
    getRestraintCapabilityAudit: () => SupportRestraintStore.getRestraintAudit(),
    getLoadCaseSet: () => ModelLoadStore.getLoadCaseSet(),
    getLoadPrimitiveSet: () => ModelLoadStore.getLoadPrimitiveSet(),
    getModelLoadReadinessAudit: () => ModelLoadStore.getReadinessAudit(),
    getVerticalLoadPathModel: () => SupportLoadScreeningStore.getPathModel(),
    getSupportLoadScreening: () => SupportLoadScreeningStore.getScreening(),
    getSupportLoadScreeningAudit: () => SupportLoadScreeningStore.getAudit(),
    getFlexuralPropertyProjection: () => VerticalBeamStore.getFlexuralProjection(),
    getVerticalBeamModel: () => VerticalBeamStore.getBeamModel(),
    getVerticalBeamSolution: () => VerticalBeamStore.getSolution(),
    getVerticalBeamSolverAudit: () => VerticalBeamStore.getAudit(),
    getModelCalculationLedger: () => ModelCalculationStore.getLedger(),
    getActiveModelCalculationPackage: () => ModelCalculationStore.getActivePackage(),
    getActiveModelCalculationReport: () => ModelCalculationStore.getActiveReport(),
    getWorkspaceConsumerContext: () => consumerController.getContext(),
    listWorkspaceConsumers: () => consumerController.listConsumers(),
    getWorkspaceConsumerReadiness: (consumerId) => consumerController.getReadiness(consumerId),
    getApplicationViewState: () => consumerController.getViewState(),
    activateApplicationView: (viewId) => consumerController.activate(viewId),
    getModelSupportLoadReadiness: () => readyDataset() ? assessModelSupportLoadReadiness(readyDataset()) : null,
    getAnalysisSession: () => AnalysisSessions.getSnapshot(),
    getAnalysisLedger: () => AnalysisLedger.getSnapshot(),
    getAnalysisCapabilities: (targetId) => getCapabilities(targetId, capabilityRegistry),
    destroy() {
      [...controllers].reverse().forEach((controller) => controller.destroy());
      clearRuntimeState(); rootElement.replaceChildren();
    },
  });
}

function buildControllers(root, registry) {
  const doc = root.ownerDocument;
  return [
    new DatasetController(EventBus, WorkspaceState),
    new SharedModelController(EventBus, WorkspaceState, doc),
    new TopologyController(EventBus, TopologyStore, doc),
    new SupportRestraintController(EventBus, SupportRestraintStore, TopologyStore, doc),
    new ModelLoadController(EventBus, ModelLoadStore, doc),
    new SupportLoadScreeningController(EventBus, SupportLoadScreeningStore, doc),
    new VerticalBeamController(EventBus, VerticalBeamStore, doc),
    new ModelCalculationController(EventBus, ModelCalculationStore, doc),
    new ModelSupportLoadController(EventBus, WorkspaceState),
    new AnalysisSessionController(EventBus, WorkspaceState, registry, AnalysisSessions),
    new AnalysisCoordinator(EventBus, WorkspaceState, registry, AnalysisSessions),
    new AnalysisLedgerController(EventBus, AnalysisLedger, doc),
    new TreePanel(root.querySelector('[data-panel="tree"]'), EventBus),
    new ViewportPanel(root.querySelector('[data-panel="viewport"]'), EventBus),
    new SharedModelPanel(root.querySelector('[data-role="shared-model-summary"]'), EventBus),
    new TopologyPanel(root.querySelector('[data-role="topology-summary"]'), EventBus),
    new SupportRestraintPanel(root.querySelector('[data-role="support-restraint-summary"]'), EventBus),
    new ModelLoadPanel(root.querySelector('[data-role="model-load-summary"]'), EventBus),
    new SupportLoadScreeningPanel(root.querySelector('[data-role="support-load-screening-summary"]'), EventBus),
    new VerticalBeamPanel(root.querySelector('[data-role="vertical-beam-summary"]'), EventBus),
    new ModelCalculationPanel(root.querySelector('[data-role="model-calculation-summary"]'), EventBus),
    new ModelSupportLoadPanel(root.querySelector('[data-role="model-support-load-summary"]'), EventBus),
    new PropertiesPanel(root.querySelector('[data-panel="properties"]'), EventBus, WorkspaceState),
  ];
}

function createConsumerReaders() {
  return { getSnapshot: () => WorkspaceState.getSnapshot(), contractReaders: {
    sharedModel: () => readyDataset()?.sharedModel || null,
    topologyGraph: () => TopologyStore.getGraph(), topologyAudit: () => TopologyStore.getAudit(),
    supportAttachmentModel: () => SupportRestraintStore.getAttachmentModel(), supportAttachmentAudit: () => SupportRestraintStore.getAttachmentAudit(),
    restraintCapabilityModel: () => SupportRestraintStore.getRestraintModel(), restraintCapabilityAudit: () => SupportRestraintStore.getRestraintAudit(),
    loadCaseSet: () => ModelLoadStore.getLoadCaseSet(), loadPrimitiveSet: () => ModelLoadStore.getLoadPrimitiveSet(), modelLoadReadinessAudit: () => ModelLoadStore.getReadinessAudit(),
    verticalLoadPathModel: () => SupportLoadScreeningStore.getPathModel(), supportLoadScreening: () => SupportLoadScreeningStore.getScreening(), supportLoadScreeningAudit: () => SupportLoadScreeningStore.getAudit(),
    flexuralPropertyProjection: () => VerticalBeamStore.getFlexuralProjection(), verticalBeamModel: () => VerticalBeamStore.getBeamModel(), verticalBeamSolution: () => VerticalBeamStore.getSolution(), verticalBeamSolverAudit: () => VerticalBeamStore.getAudit(),
    modelCalculationLedger: () => ModelCalculationStore.getLedger(), activeModelCalculationPackage: () => ModelCalculationStore.getActivePackage(), activeModelCalculationReport: () => ModelCalculationStore.getActiveReport(),
  } };
}
function readyDataset() { const snapshot = WorkspaceState.getSnapshot(); return snapshot.status === 'ready' ? snapshot.dataset : null; }
function getCapabilities(targetId, registry) {
  try { const entity = WorkspaceState.getEntity(targetId), snapshot = WorkspaceState.getSnapshot(); if (!entity || snapshot.status !== 'ready') return []; return registry.list({ targetId: entity.entityId, entity, dataset: snapshot.dataset, selectedEntityId: snapshot.selectedEntityId, version: snapshot.version }); } catch { return []; }
}
function clearRuntimeState() {
  WorkspaceState.clearDataset(); AnalysisSessions.clear(); AnalysisLedger.clear(); TopologyStore.clear(); SupportRestraintStore.clear(); ModelLoadStore.clear(); SupportLoadScreeningStore.clear(); VerticalBeamStore.clear(); ModelCalculationStore.clear();
}