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
  renderWorkspaceLayout(rootElement);

  const datasetController = new DatasetController(EventBus, WorkspaceState);
  const treePanel = new TreePanel(rootElement.querySelector('[data-panel="tree"]'), EventBus);
  const viewportPanel = new ViewportPanel(rootElement.querySelector('[data-panel="viewport"]'), EventBus);
  const propertiesPanel = new PropertiesPanel(
    rootElement.querySelector('[data-panel="properties"]'),
    EventBus,
    WorkspaceState,
  );
  const controllers = [datasetController, treePanel, viewportPanel, propertiesPanel];
  controllers.forEach((controller) => controller.init());

  globalThis.EventBus = EventBus;

  return Object.freeze({
    getSnapshot() {
      return WorkspaceState.getSnapshot();
    },
    destroy() {
      [...controllers].reverse().forEach((controller) => controller.destroy());
      WorkspaceState.clearDataset();
      rootElement.replaceChildren();
    },
  });
}
