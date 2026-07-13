import { assertViewportRenderModel } from './viewport-render-model.js';
import { buildCanvasProjection, pickViewportItem } from './viewport-hit-test.js';

const DEVICE_PIXEL_RATIO_LIMIT = 2;
const MAX_POINTER_TRAVEL_PX = 5;

export class Canvas2DViewportBackend {
  constructor() {
    this.hostElement = null;
    this.canvas = null;
    this.context = null;
    this.model = null;
    this.selectedEntityId = '';
    this.resizeObserver = null;
    this.selectionRequestHandler = null;
    this.pointerStart = null;
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
  }

  mount(hostElement) {
    if (!hostElement) throw new TypeError('Canvas viewport requires a host element.');
    this.hostElement = hostElement;
    this.canvas = hostElement.ownerDocument.createElement('canvas');
    this.canvas.className = 'viewport-canvas';
    this.canvas.dataset.viewportBackend = 'canvas2d';
    this.canvas.setAttribute('aria-label', 'Read-only model viewport');
    this.context = this.canvas.getContext('2d');
    if (!this.context) throw new Error('Canvas 2D context is unavailable.');

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointerup', this.handlePointerUp);
    hostElement.replaceChildren(this.canvas);
    hostElement.dataset.viewportBackend = 'canvas2d';

    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(hostElement);
    }
    this.resize();
  }

  setSelectionRequestHandler(callback) {
    if (callback !== null && typeof callback !== 'function') {
      throw new TypeError('Canvas viewport selection handler must be a function or null.');
    }
    this.selectionRequestHandler = callback;
  }

  renderModel(model) {
    assertViewportRenderModel(model);
    this.model = model;
    this.selectedEntityId = '';
    this.updateHostMetadata();
    this.draw();
  }

  clear() {
    this.model = null;
    this.selectedEntityId = '';
    this.pointerStart = null;
    this.updateHostMetadata();
    this.draw();
  }

  setSelection(entityId) {
    this.selectedEntityId = String(entityId || '');
    this.updateHostMetadata();
    this.draw();
  }

  fitView() {
    this.markViewCommand('fit');
    this.draw();
  }

  resetView() {
    this.markViewCommand('reset');
    this.draw();
  }

  resize() {
    if (!this.canvas || !this.hostElement || !this.context) return;
    const width = Math.max(this.hostElement.clientWidth, 1);
    const height = Math.max(this.hostElement.clientHeight, 1);
    const ratio = Math.min(globalThis.devicePixelRatio || 1, DEVICE_PIXEL_RATIO_LIMIT);
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.draw();
  }

  handlePointerDown(event) {
    if (event.button !== 0) return;
    this.pointerStart = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }

  handlePointerUp(event) {
    const start = this.pointerStart;
    this.pointerStart = null;
    if (!start || event.button !== 0 || start.pointerId !== event.pointerId || !this.model) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > MAX_POINTER_TRAVEL_PX) return;

    const rect = this.canvas.getBoundingClientRect();
    const entityId = pickViewportItem(this.model, rect.width, rect.height, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
    if (!entityId) return;

    this.hostElement.dataset.lastPickEntityId = entityId;
    this.selectionRequestHandler?.(entityId);
  }

  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.canvas?.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas?.removeEventListener('pointerup', this.handlePointerUp);
    this.canvas?.remove();
    this.canvas = null;
    this.context = null;
    this.model = null;
    this.pointerStart = null;
    this.selectionRequestHandler = null;
    if (this.hostElement) clearHostMetadata(this.hostElement);
    this.hostElement = null;
  }

  draw() {
    if (!this.context || !this.canvas) return;
    const width = parseFloat(this.canvas.style.width) || 1;
    const height = parseFloat(this.canvas.style.height) || 1;
    this.context.clearRect(0, 0, width, height);
    if (!this.model || this.model.items.length === 0) return;

    const projection = buildCanvasProjection(this.model, width, height);
    this.model.items.forEach((item) => this.drawItem(item, projection));
  }

  drawItem(item, projection) {
    const selected = item.entityId === this.selectedEntityId;
    const color = selected ? '#fbbf24' : categoryColor(item.category);
    this.context.strokeStyle = color;
    this.context.fillStyle = color;
    this.context.lineWidth = selected ? 4 : 2;

    if (item.kind === 'segment') {
      const start = projection(item.start);
      const end = projection(item.end);
      this.context.beginPath();
      this.context.moveTo(start.x, start.y);
      this.context.lineTo(end.x, end.y);
      this.context.stroke();
      return;
    }

    const center = projection(item.center);
    this.context.beginPath();
    this.context.arc(center.x, center.y, selected ? 6 : 4, 0, Math.PI * 2);
    this.context.fill();
  }

  updateHostMetadata() {
    if (!this.hostElement) return;
    this.hostElement.dataset.renderableCount = String(this.model?.summary.renderableCount || 0);
    this.hostElement.dataset.skippedCount = String(this.model?.summary.skippedCount || 0);
    this.hostElement.dataset.selectedEntityId = this.selectedEntityId;
  }

  markViewCommand(command) {
    if (this.hostElement) this.hostElement.dataset.viewCommand = command;
    if (this.canvas) this.canvas.dataset.viewCommand = command;
  }
}

function clearHostMetadata(hostElement) {
  delete hostElement.dataset.viewportBackend;
  delete hostElement.dataset.renderableCount;
  delete hostElement.dataset.skippedCount;
  delete hostElement.dataset.selectedEntityId;
  delete hostElement.dataset.lastPickEntityId;
}

function categoryColor(category) {
  if (category === 'support') return '#f97316';
  if (category === 'pipe') return '#60a5fa';
  return '#a78bfa';
}
