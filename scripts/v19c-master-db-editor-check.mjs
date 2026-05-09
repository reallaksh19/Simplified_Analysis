import fs from 'node:fs';
function fail(m){ console.error(`V19C check failed: ${m}`); process.exit(1); }
for (const f of ['src/data/masterDbOverrides.js','src/masterDb/MasterDbEditorTab.jsx','src/masterDb/MasterDbValidationPanel.jsx','src/App.jsx','src/components/TopNav.jsx','scripts/v19c-master-db-editor-behavior-test.mjs']) if(!fs.existsSync(f)) fail(`Missing ${f}`);
const editor=fs.readFileSync('src/masterDb/MasterDbEditorTab.jsx','utf8');
for (const t of ['master-db-editor-tab','master-db-component-weight-table','master-db-flange-dimension-table','master-db-b169-table','master-db-import-export-panel']) if(!editor.includes(t)) fail(`editor missing ${t}`);
const app=fs.readFileSync('src/App.jsx','utf8');
if(!app.includes('MasterDbEditorTab') || !app.includes("activeTab === 'master-db'")) fail('App must render Master DB tab');
console.log('V19C master DB editor static check passed.');
