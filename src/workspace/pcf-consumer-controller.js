import {
  createPcfIntakeSource,
  createPcfReviewExport,
  createPcfReviewModel,
  createPcfWorkspacePackage,
  pcfSourceTextHash,
} from '../core/pcf-intake/index.js';
import { EventBus } from './event-bus.js';
import { EVENT_TOPICS } from './event-topics.js';
import { PcfConsumerView } from './pcf-consumer-view.js';

export class PcfConsumerController {
  constructor(rootElement, eventBus = EventBus) {
    this.rootElement = rootElement;
    this.eventBus = eventBus;
    this.documentRef = rootElement?.ownerDocument || globalThis.document;
    this.view = new PcfConsumerView(rootElement);
    this.state = initialState();
    this.source = null;
    this.reviewModel = null;
    this.unsubscribeCallbacks = [];
    this.objectUrl = null;
  }

  init() {
    if (this.unsubscribeCallbacks.length) return;
    this.view.init({
      onTextChanged: (value) => this.stageText(value),
      onFileSelected: (file) => this.stageFile(file),
      onParse: () => this.parse(),
      onCancel: () => this.cancel(),
      onAdopt: () => this.adopt(),
      onExport: (format) => this.export(format),
    });
    this.unsubscribeCallbacks = [
      this.eventBus.subscribe(EVENT_TOPICS.DATASET_LOADED, ({ datasetId }) => this.handleDatasetLoaded(datasetId)),
      this.eventBus.subscribe(EVENT_TOPICS.DATASET_LOAD_FAILED, ({ message }) => this.handleDatasetFailed(message)),
    ];
    this.render();
  }

  stageText(sourceText, sourceName = this.state.sourceName) {
    const normalized = typeof sourceText === 'string' ? sourceText.replace(/\r\n?/g, '\n') : '';
    const changed = normalized !== this.state.sourceText || sourceName !== this.state.sourceName;
    this.state = { ...this.state, sourceText: normalized, sourceName, phase: normalized ? 'STAGED' : 'EMPTY', message: normalized ? 'Source staged. Parse explicitly to build review evidence.' : 'Select a PCF file or paste PCF text.' };
    if (changed) this.invalidateReview();
    this.render();
  }

  async stageFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      this.stageText(text, file.name || 'staged-intake.pcf');
    } catch (error) {
      this.setFailure('PCF_FILE_READ_FAILED', error);
    }
  }

  parse() {
    try {
      this.source = createPcfIntakeSource({ sourceText: this.state.sourceText, sourceName: this.state.sourceName });
      this.reviewModel = createPcfReviewModel(this.source);
      this.state = {
        ...this.state,
        phase: this.source.adoption.allowed ? 'REVIEW_READY' : 'REVIEW_BLOCKED',
        message: this.source.adoption.allowed
          ? 'PCF review is ready. The Workspace dataset is unchanged until explicit adoption.'
          : `PCF review is blocked by ${this.source.adoption.blockers.length} adoption condition(s).`,
        failureCode: null,
      };
    } catch (error) {
      this.setFailure('PCF_PARSE_FAILED', error, false);
    }
    this.render();
    return this.reviewModel;
  }

  cancel() {
    this.invalidateReview();
    this.state = initialState();
    this.view.resetFileInput();
    this.render();
  }

  adopt() {
    try {
      if (!this.source || !this.reviewModel) throw new TypeError('Parse and review a PCF source before adoption.');
      if (this.source.sourceTextHash !== pcfSourceTextHash(this.state.sourceText)) throw staleSourceError();
      const rawPackage = createPcfWorkspacePackage(this.source);
      this.state = { ...this.state, phase: 'ADOPTION_REQUESTED', message: 'Workspace adoption requested.', failureCode: null };
      this.render();
      this.eventBus.publish(EVENT_TOPICS.DATASET_LOAD_REQUESTED, {
        rawPackage,
        sourceName: this.source.sourceName,
      });
    } catch (error) {
      this.setFailure(error.code || 'PCF_ADOPTION_BLOCKED', error);
    }
  }

  export(format) {
    try {
      if (!this.reviewModel) throw new TypeError('Parse a PCF source before export.');
      const artifact = createPcfReviewExport(this.reviewModel, format);
      this.download(artifact);
      this.state = { ...this.state, message: `Exported ${artifact.filename}.`, failureCode: null };
      this.render();
      return artifact;
    } catch (error) {
      this.setFailure('PCF_EXPORT_FAILED', error);
      return null;
    }
  }

  handleDatasetLoaded(datasetId) {
    if (this.state.phase !== 'ADOPTION_REQUESTED') return;
    this.state = { ...this.state, phase: 'ADOPTED', message: `PCF intake adopted as Workspace dataset ${datasetId}.`, failureCode: null };
    this.render();
  }

  handleDatasetFailed(message) {
    if (this.state.phase !== 'ADOPTION_REQUESTED') return;
    this.state = { ...this.state, phase: 'REVIEW_READY', message: `Workspace adoption failed: ${message}`, failureCode: 'PCF_WORKSPACE_ADOPTION_FAILED' };
    this.render();
  }

  invalidateReview() {
    this.source = null;
    this.reviewModel = null;
  }

  setFailure(code, error, render = true) {
    this.state = {
      ...this.state,
      phase: 'ERROR',
      failureCode: code,
      message: error instanceof Error ? error.message : String(error),
    };
    if (render) this.render();
  }

  download(artifact) {
    if (!this.documentRef || typeof Blob === 'undefined' || typeof URL === 'undefined') return;
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(new Blob([artifact.content], { type: artifact.mediaType }));
    const anchor = this.documentRef.createElement('a');
    anchor.href = this.objectUrl;
    anchor.download = artifact.filename;
    anchor.hidden = true;
    this.documentRef.body?.append(anchor);
    anchor.click();
    anchor.remove();
    const url = this.objectUrl;
    this.objectUrl = null;
    queueMicrotask(() => URL.revokeObjectURL(url));
  }

  render() {
    this.view.render({ ...this.state, reviewModel: this.reviewModel });
  }

  getSource() { return this.source; }
  getReviewModel() { return this.reviewModel; }

  destroy() {
    this.unsubscribeCallbacks.forEach((unsubscribe) => unsubscribe());
    this.unsubscribeCallbacks = [];
    if (this.objectUrl && typeof URL !== 'undefined') URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
    this.source = null;
    this.reviewModel = null;
    this.view.destroy();
    this.rootElement = null;
  }
}

function initialState() {
  return {
    sourceName: '',
    sourceText: '',
    phase: 'EMPTY',
    message: 'Select a PCF file or paste PCF text.',
    failureCode: null,
  };
}

function staleSourceError() {
  const error = new TypeError('The staged PCF text changed after parsing. Parse the current text before adoption.');
  error.code = 'PCF_STAGED_SOURCE_STALE';
  return error;
}
