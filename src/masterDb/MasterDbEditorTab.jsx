import React, { useMemo, useState } from 'react';
import { getComponentWeightMasterRows } from '../data/componentWeightMasterDb.js';
import { getFlangeDimensionalRows } from '../data/flangeDimensionalMasterDb.js';
import { getB169FittingDimensionalRows } from '../data/b169FittingDimensionalMasterDb.js';
import { addComponentWeightOverride, addFlangeDimensionalOverride, clearMasterDbOverrides, exportMasterDbOverridesJson, importMasterDbOverridesJson, getMasterDbOverrides } from '../data/masterDbOverrides.js';
import MasterDbValidationPanel from './MasterDbValidationPanel.jsx';
import MasterDbBulkToolsPanel from './MasterDbBulkToolsPanel.jsx';

const input = { background: '#0f172a', border: '1px solid #334155', color: '#f8fafc', borderRadius: 4, padding: '5px 7px', fontSize: 12 };
const button = { border: '1px solid #38bdf8', background: '#082f49', color: '#e0f2fe', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: 12 };
const th = { textAlign: 'left', color: '#93c5fd', borderBottom: '1px solid #334155', padding: 6 };
const td = { borderBottom: '1px solid #1e293b', padding: 6 };
function Table({ rows, columns, testId }) { return <div style={{ overflow: 'auto', maxHeight: 280 }}><table data-testid={testId} style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}><thead><tr>{columns.map((col)=><th key={col.key} style={th}>{col.label}</th>)}</tr></thead><tbody>{rows.slice(0,200).map((row)=><tr key={row.id}>{columns.map((col)=><td key={col.key} style={td}>{row[col.key] ?? '—'}</td>)}</tr>)}</tbody></table></div>; }
export default function MasterDbEditorTab() {
  const [active, setActive] = useState('component'); const [filter, setFilter] = useState(''); const [importText, setImportText] = useState(''); const [version, setVersion] = useState(0);
  const [componentForm, setComponentForm] = useState({ componentType:'VALVE', typeDesc:'Flanged Swing check Valve', dn:200, nps:8, ratingClass:300, rfFaceToFace_mm:495, rfRtjWeight_kg:142 });
  const [flangeForm, setFlangeForm] = useState({ dn:200, nps:8, ratingClass:300, flangeType:'WN', faceType:'RF', thickness_mm:41.3, gasketAllowance_mm:3 });
  const text = filter.toLowerCase();
  const componentRows = useMemo(() => getComponentWeightMasterRows().filter((row)=>!text || JSON.stringify(row).toLowerCase().includes(text)), [filter, version]);
  const flangeRows = useMemo(() => getFlangeDimensionalRows().filter((row)=>!text || JSON.stringify(row).toLowerCase().includes(text)), [filter, version]);
  const b169Rows = useMemo(() => getB169FittingDimensionalRows().filter((row)=>!text || JSON.stringify(row).toLowerCase().includes(text)), [filter, version]);
  const overrides = getMasterDbOverrides();
  return <div data-testid="master-db-editor-tab" style={{ height:'100%', overflow:'auto', background:'#020617', color:'#cbd5e1', padding:14, fontSize:12 }}>
    <h2 style={{ color:'#e0f2fe' }}>Master DB Editor</h2>
    <div>Legacy and seed rows are read-only. Project override rows are searched first.</div>
    <div style={{ display:'flex', gap:8, margin:'12px 0', flexWrap:'wrap' }}>
      <button data-testid="master-db-tab-component-weight" style={button} onClick={()=>setActive('component')}>Component Weight / F-F</button>
      <button data-testid="master-db-tab-flange-dimensions" style={button} onClick={()=>setActive('flange')}>Flange Dimensions</button>
      <button data-testid="master-db-tab-b169" style={button} onClick={()=>setActive('b169')}>B16.9 Fittings</button>
      <input data-testid="master-db-filter" style={input} placeholder="Filter..." value={filter} onChange={(e)=>setFilter(e.target.value)} />
    </div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, minmax(0,1fr))', gap:8, marginBottom:10 }}><div>Component rows: {componentRows.length}</div><div>Flange rows: {flangeRows.length}</div><div>B16.9 rows: {b169Rows.length}</div><div>Overrides: {overrides.componentWeightRows.length + overrides.flangeDimensionalRows.length + overrides.b169FittingRows.length}</div></div>
    {active === 'component' && <div data-testid="master-db-component-weight-editor"><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>{Object.keys(componentForm).map((key)=><input key={key} style={input} placeholder={key} value={componentForm[key] ?? ''} onChange={(e)=>setComponentForm({ ...componentForm, [key]: e.target.value })} />)}<button data-testid="master-db-add-component-weight-row" style={button} onClick={()=>{ addComponentWeightOverride(componentForm); setVersion(version+1); }}>Add Override</button></div><Table testId="master-db-component-weight-table" rows={componentRows} columns={[{key:'id',label:'ID'},{key:'componentType',label:'Type'},{key:'dn',label:'DN'},{key:'ratingClass',label:'Class'},{key:'typeDesc',label:'Desc'},{key:'rfFaceToFace_mm',label:'RF F/F'},{key:'rfRtjWeight_kg',label:'kg'},{key:'source',label:'Source'}]} /></div>}
    {active === 'flange' && <div data-testid="master-db-flange-dimension-editor"><div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:8 }}>{Object.keys(flangeForm).map((key)=><input key={key} style={input} placeholder={key} value={flangeForm[key] ?? ''} onChange={(e)=>setFlangeForm({ ...flangeForm, [key]: e.target.value })} />)}<button data-testid="master-db-add-flange-dimension-row" style={button} onClick={()=>{ addFlangeDimensionalOverride(flangeForm); setVersion(version+1); }}>Add Override</button></div><Table testId="master-db-flange-dimension-table" rows={flangeRows} columns={[{key:'id',label:'ID'},{key:'dn',label:'DN'},{key:'ratingClass',label:'Class'},{key:'flangeType',label:'Flange'},{key:'faceType',label:'Face'},{key:'thickness_mm',label:'Thick'},{key:'gasketAllowance_mm',label:'Gasket'},{key:'source',label:'Source'}]} /></div>}
    {active === 'b169' && <Table testId="master-db-b169-table" rows={b169Rows} columns={[{key:'id',label:'ID'},{key:'fittingType',label:'Type'},{key:'headerDn',label:'Header DN'},{key:'branchDn',label:'Branch DN'},{key:'fromDn',label:'From DN'},{key:'toDn',label:'To DN'},{key:'length_mm',label:'Length'},{key:'runC2E_mm',label:'Run C2E'},{key:'branchC2E_mm',label:'Branch C2E'},{key:'source',label:'Source'}]} />}
    <MasterDbValidationPanel />
      <MasterDbBulkToolsPanel />
    <div data-testid="master-db-import-export-panel" style={{ border:'1px solid #334155', borderRadius:8, padding:10, marginTop:12 }}><button data-testid="master-db-export-overrides" style={button} onClick={()=>setImportText(exportMasterDbOverridesJson())}>Export Overrides</button><button data-testid="master-db-import-overrides" style={{...button, marginLeft:8}} onClick={()=>{ importMasterDbOverridesJson(importText); setVersion(version+1); }}>Import Overrides</button><button data-testid="master-db-clear-overrides" style={{...button, marginLeft:8, borderColor:'#ef4444', background:'#450a0a'}} onClick={()=>{ clearMasterDbOverrides(); setVersion(version+1); }}>Clear Overrides</button><textarea style={{...input, width:'100%', minHeight:150, marginTop:8, fontFamily:'monospace'}} value={importText} onChange={(e)=>setImportText(e.target.value)} /></div>
  </div>;
}
