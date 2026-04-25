import React, { useEffect, useState } from 'react';
import { usePipeRackStore } from '../store/usePipeRackStore';
import { useAppStore } from '../../store/appStore';
import { generateSectionLayout } from '../solver/AdvancedLayoutSolver';
import { formatUnit } from '../../calc-extended/utils/units';
import SectionCanvas from './SectionCanvas';
import SectionMiniMap from './SectionMiniMap';

const styles = {
    overlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: '#020617', zIndex: 1000, display: 'flex', flexDirection: 'column' },
    header: { padding: '16px 24px', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' },
    closeBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' },
    main: { flex: 1, display: 'flex', overflow: 'hidden' },
    leftPanel: { width: '300px', background: '#0f172a', borderRight: '1px solid #1e293b', padding: '16px', overflowY: 'auto' },
    viewport: { flex: 1, position: 'relative', background: '#000', display: 'flex', flexDirection: 'row' },
    miniMapContainer: { width: '480px', background: '#0f172a', borderLeft: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', overflowY: 'auto' }
};

export default function SectionCreatorTab() {
    const { isSectionCreatorOpen, toggleSectionCreator, lines, globalSettings, structuralSettings, setSectionLayout, movePipeTier, addTier, logStream } = usePipeRackStore();
    const unitSystem = useAppStore(s => s.unitSystem);
    const [terminalOpen, setTerminalOpen] = useState(true);
    const [summaryOpen, setSummaryOpen] = useState(true);
    const [spacingOpen, setSpacingOpen] = useState(true);
    const [smartWeightsOpen, setSmartWeightsOpen] = useState(true);
    const [pipeMetadataOpen, setPipeMetadataOpen] = useState(true);
    const [tierConfigOpen, setTierConfigOpen] = useState(true);
    const [miscConfigOpen, setMiscConfigOpen] = useState(true);
    const [isMeasureMode, setIsMeasureMode] = useState(false);

    // Plan View Collapsible & Resizable State
    const [planViewOpen, setPlanViewOpen] = useState(true);
    const [planViewWidth, setPlanViewWidth] = useState(480);
    const [isResizingPlan, setIsResizingPlan] = useState(false);

    // Sync active drag interactions across SectionView to PlanView live without full solver re-runs
    const [liveDragState, setLiveDragState] = useState(null);

    // Derive sectionLayout dynamically
    const sectionLayout = React.useMemo(() => {
        if (!isSectionCreatorOpen) return null;
        const layout = generateSectionLayout(lines, globalSettings, structuralSettings);
        if (liveDragState) {
            layout.layout = layout.layout.map(l =>
                l.id === liveDragState.id ? { ...l, x_mm: liveDragState.x_mm } : l
            );
        }
        return layout;
    }, [isSectionCreatorOpen, lines, globalSettings, structuralSettings, liveDragState]);

    // Update store safely without React render phase warnings
    useEffect(() => {
        if (isSectionCreatorOpen && sectionLayout) {
            setSectionLayout(sectionLayout);

            // Dispatch calculation logs to terminal
            if (sectionLayout.logs && sectionLayout.logs.length > 0) {
                // To avoid completely spamming the log stream on every drag,
                // we only push logs if they differ from the most recent ones.
                const storeState = usePipeRackStore.getState();
                const currentLogs = storeState.logStream || [];
                const lastLog = currentLogs.length > 0 ? currentLogs[currentLogs.length - 1] : null;
                const newLastLog = sectionLayout.logs[sectionLayout.logs.length - 1];

                if (lastLog !== newLastLog) {
                    sectionLayout.logs.forEach(log => storeState.pushLog(log));
                }
            }
        }
    }, [isSectionCreatorOpen, sectionLayout, setSectionLayout]);

    if (!isSectionCreatorOpen) return null;

    // Handle resizer drag
    useEffect(() => {
        if (!isResizingPlan) return;

        const handleMouseMove = (e) => {
            // Document width minus mouse X gives the width from the right edge
            const newWidth = document.body.clientWidth - e.clientX;
            // Clamp width between 300px and 800px
            setPlanViewWidth(Math.max(300, Math.min(800, newWidth)));
        };
        const handleMouseUp = () => setIsResizingPlan(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizingPlan]);

    return (
        <div style={{ ...styles.overlay, cursor: isResizingPlan ? 'col-resize' : 'default' }}>
            <div style={styles.main}>
                <div style={styles.leftPanel}>
                    {/* 1. Pipe Metadata */}
                    <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', marginBottom: pipeMetadataOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setPipeMetadataOpen(!pipeMetadataOpen)}>
                        <span>≡</span> Pipe Metadata <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{pipeMetadataOpen ? '▼' : '▶'}</span>
                    </div>
                    {pipeMetadataOpen && (
                        <>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                                {lines.map((line) => (
                                    <div key={line.id} style={{ background: '#1e293b', padding: '8px', borderRadius: '4px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #334155', borderLeft: `4px solid ${line.color || '#38bdf8'}`, flexDirection: 'column' }}>

                                        {/* Compact Label View */}
                                        <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <button onClick={() => movePipeTier(line.id, 1)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px' }}>▲</button>

                                            <div style={{ flex: 1, padding: '0 8px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontWeight: 'bold', color: line.color || '#38bdf8', fontSize: '11px' }}>{line.id}</span>
                                                <span style={{ color: '#cbd5e1', fontSize: '10px' }}>| {line.sizeNps}" {line.service ? line.service.split('-')[0] : 'Utility'}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>| {line.material}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>| T={Math.round((line.tOperate - 32) * (5/9))}°C</span>
                                                <span style={{ color: '#94a3b8', fontSize: '10px' }}>| Ins={line.insulationThk || 0}mm</span>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>| Guide=</span>
                                                    <input type="number" style={{ background: '#020617', color: '#fff', border: '1px solid #334155', padding: '0 2px', fontSize: '10px', width: '30px', height: '16px' }} value={line.guide_mm || 0} onChange={(e) => usePipeRackStore.getState().updateLine(line.id, 'guide_mm', Number(e.target.value))} />
                                                    <span style={{ color: '#94a3b8', fontSize: '10px' }}>mm</span>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    <span style={{ color: '#cbd5e1', fontSize: '10px' }}>| Stagger</span>
                                                    <input type="checkbox" checked={line.stagger ?? true} onChange={(e) => usePipeRackStore.getState().updateLine(line.id, 'stagger', e.target.checked)} style={{ accentColor: '#38bdf8', width: '10px', height: '10px' }} />
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center', marginTop: '2px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                        <span style={{ color: '#f59e0b', fontSize: '10px', fontWeight: 'bold' }}>3D Loop</span>
                                                        <input type="checkbox" checked={line.is3DLoop ?? false} onChange={(e) => usePipeRackStore.getState().updateLine(line.id, 'is3DLoop', e.target.checked)} style={{ accentColor: '#f59e0b', width: '10px', height: '10px' }} />
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ color: '#94a3b8', fontSize: '10px' }}>Loop Dir:</span>
                                                        <select style={{ background: '#020617', color: '#fff', border: '1px solid #334155', padding: '0 2px', fontSize: '9px', height: '16px' }} value={line.loopDir || 'North'} onChange={(e) => usePipeRackStore.getState().updateLine(line.id, 'loopDir', e.target.value)}>
                                                            <option value="North">North</option>
                                                            <option value="South">South</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <button onClick={() => movePipeTier(line.id, -1)} style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '10px' }}>▼</button>
                                        </div>

                                    </div>
                                ))}
                            </div>
                            <button onClick={() => usePipeRackStore.getState().addLine()} style={{ width: '100%', background: '#38bdf8', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer', padding: '10px', fontSize: '13px', fontWeight: 'bold', marginBottom: '24px' }}>+ Add Pipe</button>
                        </>
                    )}

                    {/* 2. Tier Configuration */}
                    <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', marginBottom: tierConfigOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setTierConfigOpen(!tierConfigOpen)}>
                        <span>🏗️</span> Tier Configuration <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{tierConfigOpen ? '▼' : '▶'}</span>
                    </div>
                    {tierConfigOpen && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>No. of Tiers:</span>
                                <input type="number" min="1" max="5" style={{ width: '60px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={structuralSettings.numTiers || 3} onChange={(e) => usePipeRackStore.getState().updateStructuralSetting('numTiers', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Tier-1 Level (mm):</span>
                                <input type="number" style={{ width: '80px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={structuralSettings.tierElevations_mm?.[1] || 4600} onChange={(e) => usePipeRackStore.getState().updateTierElevation(1, Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Tier Diff (mm):</span>
                                <input type="number" style={{ width: '80px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={3000} readOnly />
                            </div>
                        </>
                    )}

                    {/* 3. Misc */}
                    <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', marginBottom: miscConfigOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setMiscConfigOpen(!miscConfigOpen)}>
                        <span>🧩</span> Misc <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{miscConfigOpen ? '▼' : '▶'}</span>
                    </div>
                    {miscConfigOpen && (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Future Space (%):</span>
                                <input type="number" style={{ width: '60px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={structuralSettings.futureSpacePct || 20} onChange={(e) => usePipeRackStore.getState().updateStructuralSetting('futureSpacePct', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Gusset Gap (mm):</span>
                                <input type="number" style={{ width: '60px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={structuralSettings.gussetGap_mm || 100} onChange={(e) => usePipeRackStore.getState().updateStructuralSetting('gussetGap_mm', Number(e.target.value))} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '12px', alignItems: 'center' }}>
                                <span style={{ color: '#94a3b8' }}>Default Spacing (mm):</span>
                                <input type="number" style={{ width: '60px', background: '#0f172a', color: '#fff', border: '1px solid #334155', padding: '4px', borderRadius: '4px' }} value={75} readOnly />
                            </div>
                        </>
                    )}

                    {/* 4. Smart Tier Weights */}
                    <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', marginBottom: smartWeightsOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setSmartWeightsOpen(!smartWeightsOpen)}>
                        <span>⚖️</span> Smart Tier Weights <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{smartWeightsOpen ? '▼' : '▶'}</span>
                    </div>
                    {smartWeightsOpen && (
                        <>
                            <div style={{ fontSize: '10px', color: '#a3e635', marginBottom: '8px', fontStyle: 'italic', background: '#1e293b', padding: '6px', borderRadius: '4px', border: '1px solid #334155' }}>
                                Order = (NPS / Size Div) * (Temp / Temp Div)
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Size Div</div>
                                    <input type="number" style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '11px' }} value={10} readOnly />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Temp Div</div>
                                    <input type="number" style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '11px' }} value={240} readOnly />
                                </div>
                            </div>
                            <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
                                <button onClick={() => usePipeRackStore.getState().applySmartTierFix()} style={{ flex: 1, background: '#f59e0b', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', padding: '6px', fontSize: '11px', fontWeight: 'bold' }}>⚡ Smart Tier Fix</button>
                            </div>
                        </>
                    )}

                    {/* 5. Spacing Ruleset */}
                    <div style={{ color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', marginBottom: spacingOpen ? '16px' : '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setSpacingOpen(!spacingOpen)}>
                        <span>⚙️</span> Spacing Ruleset <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{spacingOpen ? '▼' : '▶'}</span>
                    </div>
                    {spacingOpen && (
                        <>
                            <div style={{ fontSize: '10px', color: '#a3e635', marginBottom: '8px', fontStyle: 'italic', background: '#1e293b', padding: '6px', borderRadius: '4px', border: '1px solid #334155' }}>
                                S_pipe = PhysGap + FlgAllow + Bowing + StdGap
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontSize: '10px' }}>
                                <input type="checkbox" checked={true} readOnly style={{ accentColor: '#38bdf8', width: '12px', height: '12px' }} />
                                <span style={{ color: '#cbd5e1' }}>Use Fluor Guided Rules</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Base Gap (mm)</div>
                                    <input type="number" style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '11px' }} value={75} readOnly />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Bowing Mult.</div>
                                    <input type="number" step="0.05" style={{ width: '100%', background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '4px 6px', fontSize: '11px' }} value={structuralSettings.bowingMultiplier ?? 0.15} onChange={(e) => usePipeRackStore.getState().updateStructuralSetting('bowingMultiplier', Number(e.target.value))} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div style={styles.viewport}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 24px', color: '#38bdf8', fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                            Section View (Y-Z Plane)
                        </div>
                        <div style={{ flex: 1, position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setIsMeasureMode(!isMeasureMode)}
                                    style={{ background: isMeasureMode ? '#f59e0b' : '#334155', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                                >
                                    {isMeasureMode ? '📏 Exit Measure Mode' : '📏 Measure Distance'}
                                </button>
                                <button style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }} onClick={() => toggleSectionCreator(false)}>Close Designer</button>
                            </div>
                            <SectionCanvas
                                isMeasureMode={isMeasureMode}
                                layout={sectionLayout?.layout}
                                width_mm={sectionLayout?.width_mm}
                                cantilever_mm={sectionLayout?.cantilever_mm}
                                tiers={sectionLayout?.tiers || {}}
                                onLiveDrag={(id, x_mm) => setLiveDragState(id ? {id, x_mm} : null)}
                            />
                        </div>

                        {/* Split Bottom Area */}
                        <div style={{ display: 'flex', height: Math.max(terminalOpen ? 250 : 34, summaryOpen ? 250 : 34) + 'px', borderTop: '1px solid #1e293b', transition: '0.2s ease', background: '#020617', flexShrink: 0 }}>
                            {/* Calculation Terminal */}
                            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', borderRight: '1px solid #1e293b' }}>
                                <div style={{ background: '#0f172a', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', cursor: 'pointer', borderBottom: '1px solid #1e293b', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setTerminalOpen(!terminalOpen)}>
                                    <span style={{ color: '#38bdf8' }}>&gt;_</span> Calculation Terminal <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{terminalOpen ? '▼' : '▶'}</span>
                                </div>
                                {terminalOpen && (
                                    <div style={{ overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '11px', padding: '12px' }}>
                                        {logStream.slice().map((log, i) => (
                                            <div key={i} style={{ color: log.includes('FAIL') ? '#ef4444' : (log.includes('WARN') ? '#facc15' : '#a3e635'), padding: '2px 0', lineHeight: '1.4' }}>
                                                {log}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Smart Tier Summary */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ background: '#0f172a', padding: '8px 16px', fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => setSummaryOpen(!summaryOpen)}>
                                    <span>⊞</span> Smart Tier Summary <span style={{ marginLeft: 'auto', fontSize: '10px' }}>{summaryOpen ? '▼' : '▶'}</span>
                                </div>
                                {summaryOpen && (
                                    <div style={{ overflowY: 'auto', flex: 1, padding: '0' }}>
                                        <table style={{ width: '100%', fontSize: '11px', textAlign: 'left', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ color: '#cbd5e1', borderBottom: '1px solid #334155' }}>
                                                    <th style={{ padding: '8px 16px', fontWeight: 'normal' }}>Line ID</th>
                                                    <th style={{ padding: '8px 16px', fontWeight: 'normal' }}>Size Weight</th>
                                                    <th style={{ padding: '8px 16px', fontWeight: 'normal' }}>Temp Weight</th>
                                                    <th style={{ padding: '8px 16px', fontWeight: 'normal' }}>Total (Order)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {lines.map((l) => (
                                                    <tr key={l.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                                        <td style={{ padding: '8px 16px', color: '#fff' }}>{l.id}</td>
                                                        <td style={{ padding: '8px 16px', color: '#fff' }}>{(l.sizeNps / 10).toFixed(2)}</td>
                                                        <td style={{ padding: '8px 16px', color: '#fff' }}>{(((l.tOperate - 32) * (5/9)) / 240).toFixed(2)}</td>
                                                        <td style={{ padding: '8px 16px', color: '#fff' }}>{l.loop_order?.toFixed(2) || '0.00'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Resizer Handle */}
                    {planViewOpen && (
                        <div
                            style={{ width: '6px', background: isResizingPlan ? '#38bdf8' : '#1e293b', cursor: 'col-resize', transition: 'background 0.2s ease', zIndex: 10 }}
                            onMouseDown={() => setIsResizingPlan(true)}
                        />
                    )}

                    {/* Plan View mapped dynamically */}
                    <div style={{
                        ...styles.miniMapContainer,
                        width: planViewOpen ? `${planViewWidth}px` : '40px',
                        overflowX: 'hidden',
                        transition: isResizingPlan ? 'none' : 'width 0.3s ease'
                    }}>
                        <div style={{ color: '#38bdf8', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            {planViewOpen ? (
                                <>
                                    <span>🗺️ Plan View</span>
                                    <button onClick={() => setPlanViewOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '16px' }}>→</button>
                                </>
                            ) : (
                                <button onClick={() => setPlanViewOpen(true)} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '16px', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                                    ← Plan View
                                </button>
                            )}
                        </div>

                        {planViewOpen && Object.keys(sectionLayout?.tiers || {}).map(tierNum => {
                            const tierLayout = (sectionLayout?.layout || []).filter(l => l.tier === parseInt(tierNum, 10));
                            return (
                                <div key={`minimap-tier-${tierNum}`} style={{ marginBottom: '16px', width: '100%', overflowX: 'auto' }}>
                                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Tier {tierNum}</div>
                                    {tierLayout.length > 0 ? (
                                        <SectionMiniMap
                                            layout={tierLayout}
                                            width_mm={sectionLayout?.width_mm}
                                            svgW={Math.max(460, planViewWidth - 30)}
                                        />
                                    ) : (
                                        <div style={{ fontSize: '10px', color: '#475569', textAlign: 'center', padding: '16px 0', border: '1px dashed #334155', borderRadius: '4px' }}>
                                            No lines on this tier.
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
