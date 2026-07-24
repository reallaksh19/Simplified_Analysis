import { createReferenceExampleModel, solveContinuumModel } from '../core/element-fea/index.js';
import { downloadElementFeaResult, ElementFeaConsumerView } from './element-fea-consumer-view.js';

export class ElementFeaConsumerController {
  constructor(rootElement, documentRef = rootElement?.ownerDocument) {
    this.documentRef = documentRef;
    this.view = new ElementFeaConsumerView(rootElement, documentRef);
    this.result = null;
    this.handlers = Object.freeze({
      loadExample: () => this.loadExample(),
      run: () => this.run(),
      exportResult: () => this.exportResult(),
      clear: () => this.clear(),
    });
  }

  init() { this.view.init(this.handlers); }

  loadExample() {
    this.result = null;
    this.view.setInput(createReferenceExampleModel());
    this.view.renderEmpty();
  }

  run() {
    try {
      const model = JSON.parse(this.view.getInput());
      this.result = solveContinuumModel(model);
      this.view.renderResult(this.result);
    } catch (error) {
      this.result = null;
      this.view.renderError(error);
    }
  }

  exportResult() {
    if (this.result?.status !== 'QUALIFIED') return;
    downloadElementFeaResult(this.documentRef, this.result);
  }

  clear() { this.result = null; this.view.clear(); }
  getResult() { return this.result; }
  destroy() { this.result = null; this.view.destroy(); }
}
