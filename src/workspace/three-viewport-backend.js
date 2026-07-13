import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { assertViewportRenderModel } from './viewport-render-model.js';

const SELECTED_COLOR = 0xfbbf24;

export class ThreeViewportBackend {
  constructor() {
    this.hostElement = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.modelGroup = null;
    this.objects = new Map();
    this.model = null;
    this.selectedEntityId = '';
    this.resizeObserver = null;
    this.animationFrame = 0;
  }

  mount(hostElement) {
    if (!hostElement) throw new TypeError('Three viewport requires a host element.');
    this.hostElement = hostElement;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x020711, 1);
    this.renderer.domElement.className = 'viewport-canvas';
    this.renderer.domElement.dataset.viewportBackend = 'webgl';
    this.renderer.domElement.setAttribute('aria-label', 'Read-only WebGL model viewport');

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10000);
    this.camera.up.set(0, 1, 0);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener('change', () => this.renderOnce());

    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.25));
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 2, 3);
    this.scene.add(light);

    hostElement.replaceChildren(this.renderer.domElement);
    hostElement.dataset.viewportBackend = 'webgl';
    if (typeof ResizeObserver === 'function') {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(hostElement);
    }
    this.resize();
    this.startAnimation();
  }

  renderModel(model) {
    assertViewportRenderModel(model);
    this.clearSceneObjects();
    this.model = model;
    this.selectedEntityId = '';
    const markerRadius = Math.max(model.bounds.radius * 0.018, 0.5);

    model.items.forEach((item) => {
      const object = item.kind === 'segment'
        ? createLine(item)
        : createMarker(item, markerRadius);
      object.userData.entityId = item.entityId;
      object.userData.baseColor = object.material.color.getHex();
      object.userData.baseScale = object.scale.x;
      this.objects.set(item.entityId, object);
      this.modelGroup.add(object);
    });

    this.updateHostMetadata();
    this.fitView();
  }

  clear() {
    this.clearSceneObjects();
    this.model = null;
    this.selectedEntityId = '';
    this.updateHostMetadata();
    this.renderOnce();
  }

  setSelection(entityId) {
    this.selectedEntityId = String(entityId || '');
    this.objects.forEach((object, id) => {
      const selected = id === this.selectedEntityId;
      object.material.color.setHex(selected ? SELECTED_COLOR : object.userData.baseColor);
      if (object.isMesh) {
        object.scale.setScalar(selected ? object.userData.baseScale * 1.5 : object.userData.baseScale);
      }
    });
    this.updateHostMetadata();
    this.renderOnce();
  }

  fitView() {
    if (!this.model || !this.camera || !this.controls) return;
    const { center, radius } = this.model.bounds;
    const distance = Math.max(radius * 2.8, 10);
    this.camera.near = Math.max(distance / 10000, 0.01);
    this.camera.far = Math.max(distance * 100, 1000);
    this.camera.position.set(
      center.x + distance * 0.9,
      center.y + distance * 0.65,
      center.z + distance,
    );
    this.camera.updateProjectionMatrix();
    this.controls.target.set(center.x, center.y, center.z);
    this.controls.update();
    this.markViewCommand('fit');
    this.renderOnce();
  }

  resetView() {
    this.fitView();
    this.markViewCommand('reset');
  }

  resize() {
    if (!this.renderer || !this.camera || !this.hostElement) return;
    const width = Math.max(this.hostElement.clientWidth, 1);
    const height = Math.max(this.hostElement.clientHeight, 1);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }

  destroy() {
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = 0;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.controls?.dispose();
    this.clearSceneObjects();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss?.();
    this.renderer?.domElement.remove();
    if (this.hostElement) {
      delete this.hostElement.dataset.viewportBackend;
      delete this.hostElement.dataset.renderableCount;
      delete this.hostElement.dataset.skippedCount;
      delete this.hostElement.dataset.selectedEntityId;
    }
    this.hostElement = null;
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.controls = null;
    this.modelGroup = null;
    this.model = null;
    this.objects.clear();
  }

  clearSceneObjects() {
    if (!this.modelGroup) return;
    [...this.modelGroup.children].forEach((object) => {
      this.modelGroup.remove(object);
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
      else object.material?.dispose?.();
    });
    this.objects.clear();
  }

  updateHostMetadata() {
    if (!this.hostElement) return;
    this.hostElement.dataset.renderableCount = String(this.model?.summary.renderableCount || 0);
    this.hostElement.dataset.skippedCount = String(this.model?.summary.skippedCount || 0);
    this.hostElement.dataset.selectedEntityId = this.selectedEntityId;
  }

  markViewCommand(command) {
    if (this.hostElement) this.hostElement.dataset.viewCommand = command;
    if (this.renderer) this.renderer.domElement.dataset.viewCommand = command;
  }

  startAnimation() {
    const animate = () => {
      this.animationFrame = requestAnimationFrame(animate);
      this.controls?.update();
      this.renderOnce();
    };
    animate();
  }

  renderOnce() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

function createLine(item) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    vector(item.start),
    vector(item.end),
  ]);
  return new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: categoryColor(item.category) }),
  );
}

function createMarker(item, radius) {
  const geometry = new THREE.SphereGeometry(radius, 16, 12);
  const material = new THREE.MeshStandardMaterial({ color: categoryColor(item.category) });
  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(vector(item.center));
  return marker;
}

function vector(point) {
  return new THREE.Vector3(point.x, point.y, point.z);
}

function categoryColor(category) {
  if (category === 'support') return 0xf97316;
  if (category === 'pipe') return 0x60a5fa;
  return 0xa78bfa;
}
