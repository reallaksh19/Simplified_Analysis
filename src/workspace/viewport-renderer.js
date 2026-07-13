import { Canvas2DViewportBackend } from './canvas2d-viewport-backend.js';
import { ThreeViewportBackend } from './three-viewport-backend.js';

export class ViewportRenderer {
  constructor(backendPreference = globalThis.__WORKSPACE_VIEWPORT_BACKEND__ || 'auto') {
    this.backendPreference = backendPreference;
    this.backend = null;
    this.backendName = 'unmounted';
    this.hostElement = null;
    this.lastError = null;
  }

  mount(hostElement) {
    if (!hostElement) throw new TypeError('ViewportRenderer requires a host element.');
    if (this.backend) return;
    this.hostElement = hostElement;

    if (this.backendPreference === 'canvas2d') {
      this.mountCanvasBackend();
      return;
    }

    try {
      const backend = new ThreeViewportBackend();
      backend.mount(hostElement);
      this.backend = backend;
      this.backendName = 'webgl';
    } catch (error) {
      this.lastError = error;
      this.backend?.destroy?.();
      this.backend = null;
      this.mountCanvasBackend();
      hostElement.dataset.viewportFallback = 'true';
    }
  }

  renderModel(model) {
    this.requireBackend().renderModel(model);
  }

  clear() {
    this.requireBackend().clear();
  }

  setSelection(entityId) {
    this.requireBackend().setSelection(entityId);
  }

  fitView() {
    this.requireBackend().fitView();
  }

  resetView() {
    this.requireBackend().resetView();
  }

  resize() {
    this.requireBackend().resize();
  }

  destroy() {
    this.backend?.destroy();
    this.backend = null;
    this.backendName = 'destroyed';
    if (this.hostElement) {
      delete this.hostElement.dataset.viewportFallback;
      this.hostElement.replaceChildren();
    }
    this.hostElement = null;
  }

  mountCanvasBackend() {
    const backend = new Canvas2DViewportBackend();
    backend.mount(this.hostElement);
    this.backend = backend;
    this.backendName = 'canvas2d';
  }

  requireBackend() {
    if (!this.backend) throw new Error('ViewportRenderer is not mounted.');
    return this.backend;
  }
}
