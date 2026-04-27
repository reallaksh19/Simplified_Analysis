import React from 'react';
import { useSimpStore } from './store';

export const CalculationsPanel = () => {
  const stats = useSimpStore(state => state.stats);
  const params = useSimpStore(state => state.params);
  const setParams = useSimpStore(state => state.setParams);
  const result = useSimpStore(state => state.result);
  const classification = useSimpStore(state => state.classification);
  const warnings = useSimpStore(state => state.warnings);
  const assumptions = useSimpStore(state => state.assumptions);

  const ratio = stats.ratio || 0;
  const status = result?.status || 'INVALID';
  const statusColor = status === 'FAIL' ? '#d32f2f' : status === 'MARGINAL' ? '#b45309' : status === 'PASS' ? '#2e7d32' : '#475569';
  const statusText = status === 'FAIL' ? 'FAIL (Ratio > 1.0)' : status === 'MARGINAL' ? 'MARGINAL' : status === 'PASS' ? 'PASS / SCREENING SAFE' : 'Awaiting Valid Data';

  return (
    <div className="flex flex-col gap-6 p-6 h-full text-slate-200" style={{ width: '360px', background: '#111827', overflowY: 'auto' }}>

      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-700">Process Parameters</h3>
        <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Temperature Change, deltaT (°C)</label>
              <input type="number" step="0.1" value={params.deltaT} onChange={(e) => setParams({ deltaT: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Outer Diameter, OD (mm)</label>
              <input type="number" step="0.01" value={params.od} onChange={(e) => setParams({ od: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Young's Modulus, E (MPa)</label>
              <input type="number" value={params.E} onChange={(e) => setParams({ E: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Expansion Coeff, Alpha (mm/mm/°C)</label>
              <input type="number" step="0.00000001" value={params.alpha} onChange={(e) => setParams({ alpha: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Allowable Stress, Sa (MPa)</label>
              <input type="number" step="0.1" value={params.Sa} onChange={(e) => setParams({ Sa: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" />
            </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-700">2D Screening Classification</h3>
        <div className="text-sm text-slate-300 space-y-2">
          <div className="flex justify-between"><span>Geometry Type:</span><strong>{classification?.geometryType || 'UNKNOWN'}</strong></div>
          <div className="flex justify-between"><span>Confidence:</span><strong>{Math.round((classification?.confidence || 0) * 100)}%</strong></div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-700">Flexibility Analysis</h3>
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center"><span className="text-slate-400">Gen. Leg (Lgen):</span> <strong className="font-mono">{stats.genLeg.toFixed(1)} mm</strong></div>
          <div className="flex justify-between items-center"><span className="text-slate-400">Abs. Leg (Labs):</span> <strong className="font-mono">{stats.absLeg.toFixed(1)} mm</strong></div>
          <div className="flex justify-between items-center"><span className="text-slate-400">Expansion (dx):</span> <strong className="font-mono">{stats.dx.toFixed(2)} mm</strong></div>
          <hr className="border-slate-700 border-dashed my-2" />
          <div className="flex justify-between items-center"><span className="text-slate-400">Required Length:</span> <strong className="font-mono">{stats.Lreq.toFixed(1)} mm</strong></div>
          <div className="flex justify-between items-center"><span className="text-slate-400">Actual Stress:</span> <strong className="font-mono">{stats.Scalc.toFixed(2)} MPa</strong></div>
          <div className="flex justify-between items-center"><span className="text-slate-400">Allowable Stress:</span> <strong className="font-mono">{params.Sa.toFixed(2)} MPa</strong></div>
        </div>
      </div>

      {(warnings.length > 0 || assumptions.length > 0) && (
        <div>
          <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-3">Warnings / Assumptions</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc pl-4">
            {warnings.slice(0, 4).map((warning, index) => <li key={`w-${index}`}>{typeof warning === 'string' ? warning : warning.message}</li>)}
            {assumptions.slice(0, 4).map((assumption, index) => <li key={`a-${index}`}>{assumption}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-auto p-4 rounded-lg text-center font-bold text-lg" style={{ backgroundColor: statusColor }}>
        {statusText}<br />
        <span style={{ fontSize: '11px', fontWeight: 400 }}>Ratio: {ratio.toFixed(3)}</span>
      </div>

    </div>
  );
};
