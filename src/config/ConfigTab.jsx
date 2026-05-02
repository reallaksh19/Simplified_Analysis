/**
 * ConfigTab.jsx — App configuration, version watermark, inline session log viewer.
 */

import React, { useState, useEffect } from 'react';
import { VersionBadge } from './VersionBadge';
import { sessionLog } from '../utils/logger';

const styles = {
    wrapper: { flex: 1, padding: '2rem', color: '#cbd5e1', fontFamily: 'sans-serif', overflowY: 'auto' },
    heading: { fontSize: 20, fontWeight: 700, color: '#f1f5f9', marginBottom: '1.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' },
    card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, padding: '1.25rem', marginBottom: '1rem', maxWidth: 720 },
    cardLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
    cardValue: { fontSize: 14, color: '#e2e8f0' },
    logBox: { background: '#020617', borderRadius: 6, padding: 12, maxHeight: 360, overflowY: 'auto', fontFamily: 'monospace', fontSize: 12 },
    logEntry: { borderBottom: '1px solid #1e293b', padding: '6px 0' },
    logTs: { color: '#475569', marginRight: 8 },
    logLevel: (level) => ({
        marginRight: 8, fontWeight: 700,
        color: level === 'error' ? '#f87171' : level === 'warn' ? '#fbbf24' : level === 'info' ? '#60a5fa' : '#6b7280',
    }),
    logCtx: { color: '#818cf8', marginRight: 8 },
    logMsg: { color: '#d1d5db' },
    logData: { color: '#6b7280', marginLeft: 16, whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
    refreshBtn: { marginTop: 12, padding: '6px 14px', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #1e40af', borderRadius: 5, cursor: 'pointer', fontSize: 12 },
};

// Deep Architect Format Helper
const renderLogData = (data) => {
    if (!data) return null;

    if (typeof data === 'object' && data !== null) {
        // Specifically format known objects structurally
        if (Array.isArray(data)) {
            return (
                <div style={{ marginTop: 8, padding: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}>
                    <div style={{ color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', marginBottom: 4 }}>[Array — {data.length} items]</div>
                    {data.map((item, idx) => (
                        <div key={idx} style={{ padding: '2px 0', borderBottom: idx < data.length - 1 ? '1px dashed #334155' : 'none' }}>
                            <span style={{ color: '#38bdf8' }}>[{idx}]</span> {JSON.stringify(item)}
                        </div>
                    ))}
                </div>
            );
        } else if (data.segments || data.plane || data.name) {
             // Handle Geometry Batch format explicitly for human readability
             return (
                <div style={{ marginTop: 8, padding: 8, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 4 }}>
                     <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 4, marginBottom: 8 }}>
                         <span style={{ color: '#94a3b8' }}>Batch Name:</span> <span style={{ color: '#e2e8f0' }}>{data.name}</span>
                         <span style={{ color: '#94a3b8' }}>Target Plane:</span> <span style={{ color: '#e2e8f0' }}>{data.plane}</span>
                         <span style={{ color: '#94a3b8' }}>Segment Count:</span> <span style={{ color: '#e2e8f0' }}>{data.segments?.length}</span>
                     </div>
                     {data.segments && data.segments.length > 0 && (
                         <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, color: '#cbd5e1' }}>
                             <thead>
                                 <tr style={{ borderBottom: '1px solid #334155', textAlign: 'left' }}>
                                     <th>ID</th>
                                     <th>Start (x,y,z)</th>
                                     <th>End (x,y,z)</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {data.segments.slice(0, 5).map(seg => (
                                     <tr key={seg.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                         <td style={{ color: '#38bdf8' }}>{seg.id}</td>
                                         <td>[{seg.start2D?.[0]?.toFixed(1)}, {seg.start2D?.[1]?.toFixed(1)}, {seg.start2D?.[2]?.toFixed(1)}]</td>
                                         <td>[{seg.end2D?.[0]?.toFixed(1)}, {seg.end2D?.[1]?.toFixed(1)}, {seg.end2D?.[2]?.toFixed(1)}]</td>
                                     </tr>
                                 ))}
                                 {data.segments.length > 5 && (
                                     <tr><td colSpan="3" style={{ textAlign: 'center', color: '#64748b', fontStyle: 'italic', paddingTop: 4 }}>... +{data.segments.length - 5} more segments</td></tr>
                                 )}
                             </tbody>
                         </table>
                     )}
                </div>
             );
        }
    }

    // Fallback for standard objects
    return <div style={styles.logData}>{JSON.stringify(data, null, 2)}</div>;
};

export function ConfigTab() {
    // Force refresh when user clicks "Refresh Log"
    const [tick, setTick] = useState(0);
    const entries = sessionLog.slice().reverse(); // newest first

    return (
        <div style={styles.wrapper}>
            <div style={styles.heading}>Configuration</div>

            <div style={styles.card}>
                <div style={styles.cardLabel}>Application</div>
                <div style={styles.cardValue}>Simplified Calc Suite</div>
            </div>

            <div style={styles.card}>
                <div style={styles.cardLabel}>Session Log — {entries.length} entries</div>
                <div style={styles.logBox}>
                    {entries.length === 0 && <span style={{ color: '#475569' }}>No log entries yet. Run a calculation to see logs here.</span>}
                    {entries.map((e, i) => (
                        <div key={i} style={styles.logEntry}>
                            <span style={styles.logTs}>{e.ts.slice(11, 19)}</span>
                            <span style={styles.logLevel(e.level)}>[{e.level.toUpperCase()}]</span>
                            <span style={styles.logCtx}>[{e.context}]</span>
                            <span style={styles.logMsg}>{e.message}</span>
                            {e.data && renderLogData(e.data)}
                        </div>
                    ))}
                </div>
                <button style={styles.refreshBtn} onClick={() => setTick(t => t + 1)}>⟳ Refresh Log</button>
            </div>

            <VersionBadge />
        </div>
    );
}
