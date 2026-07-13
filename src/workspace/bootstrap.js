import { createDefaultAnalysisCapabilityRegistry } from './analysis-capabilities.js';
import { AnalysisCoordinator } from './analysis-coordinator.js';
import { AnalysisSessionController } from './analysis-session-controller.js';
import { AnalysisSessions } from './analysis-session-store.js';
import { DatasetController } from './dataset-controller.js';
import { EventBus } from './event-bus.js';
import { PropertiesPanel } from './properties-panel.js';
import { TreePanel } from './tree-panel.js';
import { ViewportPanel } from './viewport-panel.js';
import { renderWorkspaceLayout } from './workspace-layout.js';
import { WorkspaceState } from './workspace-state.js';

export function bootstrapAnalysisWorkspace(rootElement) {
  if (!rootElement) throw new Error('Application root #root was not found.');

  WorkspaceState.clearDataset();
  AnalysisSessions.clear();
  renderWorkspaceLayout(rootElement);

  const capabilityRegistry = createDefaultAnalysisCapabilityRegistry();
  const datasetController = new DatasetController(EventBus, WorkspaceState);
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
  const treePanel = new TreePanel(rootElement.querySelector('[data-panel="tree"]'), EventBus);
  const viewportPanel = new ViewportPanel(rootElement.querySelector('[data-panel="viewport"]'), EventBus);
  const propertiesPanel = new PropertiesPanel(
    rootElement.querySelector('[data-panel="properties"]'),
    EventBus,
    WorkspaceState,
  );
  const controllers = [
    datasetController,
    sessionController,
    analysisCoordinator,
    treePanel,
    viewportPanel,
    propertiesPanel,
  ];
  controllers.forEach((controller) => controller.init());

  globalThis.EventBus = EventBus;

  return Object.freeze({
    getSnapshot() {
      return WorkspaceState.getSnapshot();
    },
    getAnalysisSession() {
      return AnalysisSessions.getSnapshot();
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
      AnalysisSessions.clear();
      WorkspaceState.clearDataset();
      rootElement.replaceChildren();
    },
  });
}
