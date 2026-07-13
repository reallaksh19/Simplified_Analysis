import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { PropertiesPanel } from './properties-panel.js';
import { TreePanel } from './tree-panel.js';
import { ViewportPanel } from './viewport-panel.js';
import { renderWorkspaceLayout } from './workspace-layout.js';

export function bootstrapAnalysisWorkspace(rootElement) {
  if (!rootElement) throw new Error('Application root #root was not found.');

  renderWorkspaceLayout(rootElement);

  const treePanel = new TreePanel(rootElement.querySelector('[data-panel="tree"]'));
  const viewportPanel = new ViewportPanel(rootElement.querySelector('[data-panel="viewport"]'));
  const propertiesPanel = new PropertiesPanel(rootElement.querySelector('[data-panel="properties"]'));
  const controllers = [treePanel, viewportPanel, propertiesPanel];

  controllers.forEach((controller) => controller.init());

  globalThis.EventBus = EventBus;
  EventBus.publish(EVENT_TOPICS.DATASET_LOADED, {
    datasetId: 'MOCK-RVM-001',
    nodeCount: 3,
  });

  return Object.freeze({
    destroy() {
      [...controllers].reverse().forEach((controller) => controller.destroy());
      rootElement.replaceChildren();
    },
  });
}
