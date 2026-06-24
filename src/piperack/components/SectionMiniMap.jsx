import React from 'react';
import { usePipeRackStore } from '../store/usePipeRackStore';

// An SVG-based MiniMap plotting the X positions relative to the beam center
// This is exactly the "Plan View Thumbnail" requested in the engineering report.

export default function SectionMiniMap({ layout, width_mm, svgW = 460 }) {
    const lines = usePipeRackStore(state => state.lines);

    if (!layout || layout.length === 0) return (
        <div style={{ color: '#64748b', fontSize: '10px', padding: '16px', textAlign: 'center' }}>No lines on this tier.</div>
    );

    const svgH = 160;
    const padding = 15;
    const drawW = svgW - (padding * 2);

    // Scale X-coordinates from Real world (mm) to SVG pixels
    const { structuralSettings } = usePipeRackStore.getState();
    const maxRealW = width_mm || structuralSettings.beamWidth_mm || 5000;
    const scale = drawW / maxRealW;

    // Sort layout purely for dimension calculation without using hooks
    const sortedLayout = layout ? [...layout].sort((a, b) => a.x_mm - b.x_mm) : [];

    return (
        <svg width={svgW} height={svgH} style={{ background: '#020617', borderRadius: '4px', display: 'block', margin: '0 auto' }}>
            {/* Draw Column Bounds */}
            <rect x={padding} y={0} width={4} height={svgH} fill="#1e293b" />
            <rect x={padding + drawW - 2} y={0} width={4} height={svgH} fill="#1e293b" />
            <text x={padding + drawW / 2} y={15} fill="#475569" fontSize="9" textAnchor="middle" fontWeight="bold">Centerline</text>

            {/* Draw Dimensions */}
            {sortedLayout.map((pipe, index) => {
                const currentRealX = pipe.x_mm + (maxRealW / 2); // 0-based mm from left column
                const prevRealX = index === 0 ? 0 : sortedLayout[index - 1].x_mm + (maxRealW / 2);

                const distance_mm = (currentRealX - prevRealX).toFixed(0);

                const svgPrevX = index === 0 ? padding : padding + (drawW / 2) + (sortedLayout[index - 1].x_mm * scale);
                const svgCurrentX = padding + (drawW / 2) + (pipe.x_mm * scale);
                const midX = (svgPrevX + svgCurrentX) / 2;

                return (
                    <g key={`dim-left-${pipe.id}`}>
                        <line x1={svgPrevX + 2} y1={svgH - 24} x2={svgCurrentX - 2} y2={svgH - 24} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1={svgPrevX + 2} y1={svgH - 26} x2={svgPrevX + 2} y2={svgH - 22} stroke="#475569" strokeWidth="1" />
                        <line x1={svgCurrentX - 2} y1={svgH - 26} x2={svgCurrentX - 2} y2={svgH - 22} stroke="#475569" strokeWidth="1" />
                        <text x={midX} y={svgH - 28} fill="#64748b" fontSize="7" textAnchor="middle">{distance_mm}mm</text>
                    </g>
                );
            })}

            {/* Render Final Dimension to Right Column */}
            {sortedLayout.length > 0 && (() => {
                const lastPipe = sortedLayout[sortedLayout.length - 1];
                const lastRealX = lastPipe.x_mm + (maxRealW / 2);
                const distance_mm = (maxRealW - lastRealX).toFixed(0);

                const svgLastX = padding + (drawW / 2) + (lastPipe.x_mm * scale);
                const endX = padding + drawW;
                const midX = (svgLastX + endX) / 2;

                return (
                    <g key="dim-right-end">
                        <line x1={svgLastX + 2} y1={svgH - 24} x2={endX - 2} y2={svgH - 24} stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                        <line x1={svgLastX + 2} y1={svgH - 26} x2={svgLastX + 2} y2={svgH - 22} stroke="#475569" strokeWidth="1" />
                        <line x1={endX - 2} y1={svgH - 26} x2={endX - 2} y2={svgH - 22} stroke="#475569" strokeWidth="1" />
                        <text x={midX} y={svgH - 28} fill="#64748b" fontSize="7" textAnchor="middle">{distance_mm}mm</text>
                    </g>
                );
            })()}

            {/* Draw Pipes and Future Space as objects moving across the plan view */}
            {sortedLayout.map((pipe) => {
                const svgX = padding + (drawW / 2) + (pipe.x_mm * scale);

                if (pipe.isFutureSlot) {
                    const rectW = pipe.gapWidth_mm * scale;
                    return (
                        <g key={pipe.id}>
                            <rect
                                x={svgX - rectW / 2}
                                y={25}
                                width={rectW}
                                height={svgH - 60}
                                fill="rgba(59, 130, 246, 0.1)"
                                stroke="#3b82f6"
                                strokeDasharray="4,4"
                                strokeWidth="1"
                            />
                            <text x={svgX} y={svgH / 2} fill="#3b82f6" fontSize="8" textAnchor="middle" fontWeight="bold">FUTURE</text>
                            <text x={svgX} y={svgH - 10} fill="#3b82f6" fontSize="9" textAnchor="middle">{pipe.gapWidth_mm}mm</text>
                        </g>
                    );
                }

                const lineData = lines.find(l => l.id === (pipe.lineId || pipe.id));
                const strokeColor = lineData?.color || '#38bdf8';
                const lineW = Math.max(1, pipe.OD_in * 25.4 * scale);

                const tooltipText = lineData ? `${lineData.id}: NPS ${lineData.sizeNps} ${lineData.service} ${lineData.material}` : pipe.id;

                const is3DLoop = lineData?.is3DLoop;
                const loopDir = lineData?.loopDir || 'North'; // Default North

                // Determine U-Shape Path
                let pathData = '';
                if (is3DLoop) {
                    // Loop dimensions in pixels
                    const loopWidth = 40; // How far out it goes
                    const loopLength = (svgH - 35) - 25; // Full length of rack
                    const startY = 25;
                    const endY = svgH - 35;

                    if (loopDir === 'North') {
                        // Loop extends "Up" on the screen (lower Y values)
                        pathData = `M ${svgX} ${endY} L ${svgX} ${endY - loopLength * 0.2} L ${svgX - loopWidth} ${endY - loopLength * 0.2} L ${svgX - loopWidth} ${startY + loopLength * 0.2} L ${svgX} ${startY + loopLength * 0.2} L ${svgX} ${startY}`;
                    } else {
                        // Loop extends "Down" on the screen (higher Y values)
                        pathData = `M ${svgX} ${endY} L ${svgX} ${endY - loopLength * 0.8} L ${svgX - loopWidth} ${endY - loopLength * 0.8} L ${svgX - loopWidth} ${startY + loopLength * 0.8} L ${svgX} ${startY + loopLength * 0.8} L ${svgX} ${startY}`;
                    }
                }

                return (
                    <g key={pipe.id}>
                        <title>{tooltipText}</title>

                        {/* 3D Loop Representation (U-shape outside the rack) */}
                        {is3DLoop ? (
                            <path
                                d={pathData}
                                fill="none"
                                stroke={strokeColor}
                                strokeWidth={Math.max(3, lineW)}
                                strokeLinejoin="round"
                                opacity={0.9}
                            />
                        ) : (
                            <line x1={svgX} y1={25} x2={svgX} y2={svgH - 35} stroke={strokeColor} strokeWidth={Math.max(3, lineW)} opacity={0.9} />
                        )}

                        <text x={svgX} y={svgH - 10} fill="#94a3b8" fontSize="10" textAnchor="middle" fontWeight="bold">{pipe.id}</text>
                    </g>
                );
            })}
        </svg>
    );
}
