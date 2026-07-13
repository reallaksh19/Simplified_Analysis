import './index.css';
import './workspace/workspace.css';
import { bootstrapAnalysisWorkspace } from './workspace/bootstrap.js';

const applicationRoot = document.getElementById('root');
const workspace = bootstrapAnalysisWorkspace(applicationRoot);

globalThis.AnalysisWorkspace = workspace;

if (import.meta.hot) {
  import.meta.hot.dispose(() => workspace.destroy());
}
